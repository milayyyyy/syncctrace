import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { analyzeTraceability } from '../services/openai';

const prisma = new PrismaClient();

export const auditRouter = Router();
auditRouter.use(authenticate);

// Pairs to analyze in order: [upstream type, downstream type]
const TRACE_PAIRS: [string, string][] = [
  ['PROPOSAL', 'SRS'],
  ['SRS', 'SDD'],
  ['SRS', 'SPMP'],
  ['SRS', 'STD'],
  ['SDD', 'SOURCE_CODE'],
];

/**
 * Extract plain text from a document URL.
 * Supports Google Docs (export as txt) and GitHub repos (README).
 */
async function extractContent(url: string): Promise<string | null> {
  try {
    // Google Docs
    const gdocsMatch = /\/document\/d\/([a-zA-Z0-9_-]+)/.exec(url);
    if (gdocsMatch) {
      const docId = gdocsMatch[1];
      const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
      const res = await fetch(exportUrl, { signal: AbortSignal.timeout(20000) });
      if (res.ok) {
        const text = await res.text();
        return text.trim() || null;
      }
    }

    // GitHub repo URL
    const githubMatch = /github\.com\/([^/?#]+)\/([^/?#]+)/.exec(url);
    if (githubMatch) {
      const owner = githubMatch[1];
      const repo = githubMatch[2].replace(/\.git$/, '');
      // Fetch README as raw text
      const readmeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/readme`,
        {
          headers: { Accept: 'application/vnd.github.v3.raw' },
          signal: AbortSignal.timeout(20000),
        },
      );
      if (readmeRes.ok) {
        const text = await readmeRes.text();
        return text.trim() || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// POST /api/audit/:groupId — run AI traceability analysis
auditRouter.post('/:groupId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { groupId } = req.params;

  try {
    const artifacts = await prisma.artifact.findMany({
      where: { groupId },
    });

    if (artifacts.length < 2) {
      res.status(400).json({ error: 'At least 2 artifacts are required to run an audit.' });
      return;
    }

    // Auto-extract content for any artifact that doesn't have it yet
    await Promise.all(
      artifacts.map(async (artifact) => {
        if (!artifact.content && artifact.url) {
          const content = await extractContent(artifact.url);
          if (content) {
            await prisma.artifact.update({ where: { id: artifact.id }, data: { content } });
            artifact.content = content;
          }
        }
      }),
    );

    const artifactsWithContent = artifacts.filter(a => a.content);
    if (artifactsWithContent.length < 2) {
      res.status(400).json({
        error: 'Could not extract text from the submitted document URLs. Ensure Google Docs are shared publicly (Anyone with the link can view) and GitHub repos are public.',
      });
      return;
    }

    const byType = Object.fromEntries(artifactsWithContent.map(a => [a.type, a]));

    interface LinkResult {
      up: (typeof artifacts)[0];
      down: (typeof artifacts)[0];
      analysis: Awaited<ReturnType<typeof analyzeTraceability>>;
    }
    const linkResults: LinkResult[] = [];

    for (const [upType, downType] of TRACE_PAIRS) {
      const up = byType[upType];
      const down = byType[downType];
      if (!up?.content || !down?.content) continue;

      const analysis = await analyzeTraceability(
        { id: up.id, type: up.type, content: up.content },
        { id: down.id, type: down.type, content: down.content },
      );
      linkResults.push({ up, down, analysis });
    }

    if (linkResults.length === 0) {
      res.status(400).json({ error: 'No valid artifact pairs found for analysis.' });
      return;
    }

    const overallScore =
      linkResults.reduce((sum, r) => sum + r.analysis.alignmentScore, 0) / linkResults.length;
    let readinessStatus: string;
    if (overallScore >= 80) readinessStatus = 'READY';
    else if (overallScore >= 60) readinessStatus = 'NEEDS_REVISION';
    else readinessStatus = 'CRITICAL_GAPS';

    const auditResult = await prisma.$transaction(async tx => {
      const audit = await tx.auditResult.create({
        data: { groupId, overallScore, readinessStatus },
      });

      for (const { up, down, analysis } of linkResults) {
        const link = await tx.traceabilityLink.create({
          data: {
            upstreamId: up.id,
            downstreamId: down.id,
            alignmentScore: analysis.alignmentScore,
            status: analysis.status,
            evidencePairs: analysis.evidencePairs,
            auditResultId: audit.id,
          },
        });

        for (const gap of analysis.gaps) {
          await tx.gap.create({
            data: {
              auditResultId: audit.id,
              description: gap.description,
              severity: gap.severity,
              affectedArtifacts: [up.type, down.type],
              rootCause: gap.rootCause,
              recommendation: gap.recommendation,
              aiConfidence: gap.aiConfidence,
            },
          });
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _used = link.id;
      }

      return tx.auditResult.findUniqueOrThrow({
        where: { id: audit.id },
        include: { traceLinks: true, gaps: true },
      });
    });

    res.status(201).json({ auditResult });
  } catch (err) {
    console.error('Audit error:', err);
    res.status(500).json({ error: 'Audit failed. Check OPENAI_API_KEY and artifact content.' });
  }
});

// GET /api/audit/:groupId/latest — get most recent audit result
auditRouter.get('/:groupId/latest', async (req: AuthRequest, res: Response): Promise<void> => {
  const { groupId } = req.params;

  try {
    const auditResult = await prisma.auditResult.findFirst({
      where: { groupId },
      orderBy: { auditedAt: 'desc' },
      include: {
        traceLinks: {
          include: { upstream: true, downstream: true },
        },
        gaps: true,
      },
    });
    res.json({ auditResult });
  } catch (err) {
    console.error('Fetch audit error:', err);
    res.status(500).json({ error: 'Failed to fetch audit result.' });
  }
});
