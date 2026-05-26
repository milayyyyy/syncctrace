import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { analyzeTraceability, type TraceabilityAnalysis, type EvidencePair } from '../services/openai';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { prisma } from '../lib/prisma';

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

function auditErrorResponse(err: unknown): { status: number; error: string; details: string } {
  const providerStatus = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : String(err);
  const providerRaw = (err as { error?: { metadata?: { raw?: string } } })?.error?.metadata?.raw;

  if (/OPENROUTER_API_KEY/i.test(message)) {
    return {
      status: 500,
      error: 'AI provider is not configured.',
      details: message,
    };
  }

  if (providerStatus === 401 || /401|user not found|unauthorized/i.test(message)) {
    return {
      status: 502,
      error: 'AI provider authentication failed.',
      details: 'Check OPENROUTER_API_KEY in Vercel and make sure the key belongs to an active OpenRouter account.',
    };
  }

  if (providerStatus === 402 || /402|credit|payment|quota/i.test(message)) {
    return {
      status: 502,
      error: 'AI provider quota or credits issue.',
      details: 'Check your OpenRouter account credits and model access.',
    };
  }

  if (providerStatus === 429 || /429|rate limit/i.test(message)) {
    return {
      status: 502,
      error: 'AI provider rate limit reached.',
      details: providerRaw ?? 'Wait a minute and try again, or configure OPENROUTER_MODELS with another model.',
    };
  }

  if (providerStatus && providerStatus >= 500) {
    return {
      status: 502,
      error: 'AI provider is temporarily unavailable.',
      details: providerRaw ?? 'OpenRouter or the selected model returned a server error. Try again shortly.',
    };
  }

  return {
    status: 500,
    error: 'Audit failed.',
    details: message,
  };
}

/** Extract plain text from a PDF buffer using pdf-parse. */
async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    const data = await pdfParse(buffer);
    const text = data.text.trim();
    return text.length > 50 ? text : null;
  } catch {
    return null;
  }
}

/**
 * Try to export a file ID from Google as plain text.
 * Handles native Google Docs (export API) and uploaded Word docs (mammoth).
 */
async function tryGoogleExport(fileId: string): Promise<string | null> {
  // Attempt 1: Native Google Docs text export
  try {
    const exportUrl = `https://docs.google.com/document/d/${fileId}/export?format=txt`;
    const res = await fetch(exportUrl, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
    if (res.ok) {
      const contentType = res.headers.get('content-type') ?? '';
      // Reject HTML responses — those are login/error pages, not actual doc content
      if (!contentType.includes('text/html')) {
        const text = await res.text();
        if (text.trim().length > 50) return text.trim();
      }
    }
  } catch { /* ignore */ }

  // Attempt 2: Alternative Google feeds export endpoint
  try {
    const feedsUrl = `https://docs.google.com/feeds/download/documents/export/Export?id=${fileId}&exportFormat=txt`;
    const res = await fetch(feedsUrl, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
    if (res.ok) {
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html')) {
        const text = await res.text();
        if (text.trim().length > 50) return text.trim();
      }
    }
  } catch { /* ignore */ }

  // Attempt 3: Direct Drive download — handles PDFs, uploaded .docx files via mammoth
  try {
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
    const res = await fetch(downloadUrl, { redirect: 'follow', signal: AbortSignal.timeout(30000) });
    if (res.ok) {
      const contentType = res.headers.get('content-type') ?? '';

      if (contentType.includes('text/plain')) {
        const text = await res.text();
        if (text.trim().length > 50) return text.trim();
      }

      // PDF file — extract text with pdf-parse
      if (contentType.includes('application/pdf')) {
        const buffer = Buffer.from(await res.arrayBuffer());
        const text = await extractPdfText(buffer);
        if (text) return text;
      }

      // Word document — parse with mammoth
      if (
        contentType.includes('wordprocessingml') ||
        contentType.includes('msword')
      ) {
        const buffer = Buffer.from(await res.arrayBuffer());
        try {
          const { value } = await mammoth.extractRawText({ buffer });
          if (value.trim().length > 50) return value.trim();
        } catch { /* not a valid DOCX */ }
      }

      // Unknown binary — try PDF first, then DOCX
      if (contentType.includes('octet-stream')) {
        const buffer = Buffer.from(await res.arrayBuffer());
        const pdfText = await extractPdfText(buffer);
        if (pdfText) return pdfText;
        try {
          const { value } = await mammoth.extractRawText({ buffer });
          if (value.trim().length > 50) return value.trim();
        } catch { /* not a valid DOCX */ }
      }

      // HTML confirmation/virus-scan page from Google — follow confirm token
      if (contentType.includes('text/html')) {
        const html = await res.text();
        const confirmMatch = /[?&]confirm=([0-9A-Za-z_-]+)/.exec(html)
          ?? /name="confirm"\s+value="([^"]+)"/.exec(html);
        if (confirmMatch) {
          const confirmRes = await fetch(
            `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${confirmMatch[1]}`,
            { redirect: 'follow', signal: AbortSignal.timeout(30000) },
          );
          if (confirmRes.ok) {
            const confirmType = confirmRes.headers.get('content-type') ?? '';
            if (confirmType.includes('application/pdf')) {
              const buffer = Buffer.from(await confirmRes.arrayBuffer());
              const text = await extractPdfText(buffer);
              if (text) return text;
            }
            if (confirmType.includes('wordprocessingml') || confirmType.includes('octet-stream')) {
              const buffer = Buffer.from(await confirmRes.arrayBuffer());
              try {
                const { value } = await mammoth.extractRawText({ buffer });
                if (value.trim().length > 50) return value.trim();
              } catch { /* not a valid DOCX */ }
            }
          }
        }
      }
    }
  } catch { /* ignore */ }

  return null;
}

/**
 * Extract plain text from a document URL.
 * Supports Google Docs, Google Drive file links, and GitHub repos (README).
 */
async function extractContent(url: string): Promise<string | null> {
  try {
    // Google Docs native URL: docs.google.com/document/d/{id}
    const gdocsMatch = /\/document\/d\/([a-zA-Z0-9_-]+)/.exec(url);
    if (gdocsMatch) {
      return await tryGoogleExport(gdocsMatch[1]);
    }

    // Google Drive shared file URL: drive.google.com/file/d/{id}/view
    const gdriveMatch = /drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/.exec(url);
    if (gdriveMatch) {
      return await tryGoogleExport(gdriveMatch[1]);
    }

    // drive.google.com/uc?id={id} or uc?export=...&id={id}
    const gdriveUcMatch = /[?&]id=([a-zA-Z0-9_-]+)/.exec(url);
    if (url.includes('drive.google.com') && gdriveUcMatch) {
      return await tryGoogleExport(gdriveUcMatch[1]);
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
      const missing = artifacts.filter(a => !a.content).map(a => a.type);
      res.status(400).json({
        error: 'Insufficient text content extracted.',
        details: `Could not extract text from: ${missing.join(', ')}. Ensure Google Docs are 'Anyone with the link can view' and GitHub repos are public.`
      });
      return;
    }

    const byType = Object.fromEntries(artifactsWithContent.map(a => [a.type, a]));

    interface AnalysisWork {
      up: (typeof artifacts)[0];
      down: (typeof artifacts)[0];
      reusedData?: TraceabilityAnalysis;
    }
    const plan: AnalysisWork[] = [];

    // Identify which pairs need new analysis vs reuse
    for (const [upType, downType] of TRACE_PAIRS) {
      const up = byType[upType];
      const down = byType[downType];
      if (!up?.content || !down?.content) continue;

      // Look for the most recent link for this EXACT pair of artifacts
      const latestLink = await prisma.traceabilityLink.findFirst({
        where: {
          upstreamId: up.id,
          downstreamId: down.id,
        },
        orderBy: { createdAt: 'desc' },
        include: { auditResult: { include: { gaps: true } } }
      });

      // A link is fresh if it was created AFTER both artifacts were last updated
      const isFresh = latestLink && 
        new Date(latestLink.createdAt) > new Date(up.updatedAt) && 
        new Date(latestLink.createdAt) > new Date(down.updatedAt);

      if (isFresh) {
        // Find gaps belonging to this specific link in that audit
        const relevantGaps = latestLink.auditResult?.gaps.filter(g => 
          g.affectedArtifacts.includes(up.type as any) && 
          g.affectedArtifacts.includes(down.type as any)
        ) || [];

        plan.push({
          up, down,
          reusedData: {
            alignmentScore: latestLink.alignmentScore,
            status: latestLink.status as 'PASS' | 'WARN' | 'FAIL',
            evidencePairs: (latestLink.evidencePairs as unknown as EvidencePair[]) ?? [],
            gaps: relevantGaps.map(g => ({
              description: g.description,
              severity: g.severity,
              rootCause: g.rootCause,
              recommendation: g.recommendation,
              aiConfidence: g.aiConfidence
            })),
            summary: `Reused traceability analysis for ${up.type} → ${down.type}.`,
          }
        });
      } else {
        plan.push({ up, down });
      }
    }

    if (plan.length === 0) {
      res.status(400).json({ 
        error: 'No valid sequential pairs found.', 
        details: 'Traceability follows a specific sequence (e.g., Proposal → SRS, SRS → SDD). To run analysis, ensure you have adjacent artifacts from the project lifecycle.'
      });
      return;
    }

    // Execute analysis sequentially to stay within Groq free-tier TPM (12k/min).
    // Each call uses ~1,500 tokens; a 10-second gap keeps burst usage under the limit.
    // On 429 rate-limit errors, wait 30 s then retry once.
    async function analyzeWithRetry(
      up: (typeof artifacts)[0],
      down: (typeof artifacts)[0],
      attempt = 1
    ): Promise<any> {
      const call = () => {
        console.log(`[AI] [Attempt ${attempt}] Starting analysis: ${up.type} ➔ ${down.type} (${up.content!.length + down.content!.length} chars)`);
        return analyzeTraceability(
          { id: up.id, type: up.type, content: up.content! },
          { id: down.id, type: down.type, content: down.content! },
        );
      };
      try {
        const result = await call();
        console.log(`[AI] COMPLETED: ${up.type} ➔ ${down.type}`);
        return result;
      } catch (err: unknown) {
        const status = (err as { status?: number }).status;
        console.error(`[AI] ERROR (${status}) for ${up.type} ➔ ${down.type}:`, err);
        
        if (status === 429 && attempt < 3) {
          const retryAfter = (err as any).error?.metadata?.retry_after_seconds || (30 * attempt);
          console.log(`[AI] Rate limited (429). Waiting ${retryAfter}s before retry ${attempt + 1}/3...`);
          await new Promise(r => setTimeout(r, (retryAfter + 5) * 1000));
          return await analyzeWithRetry(up, down, attempt + 1);
        }
        throw err;
      }
    }

    // Execute analysis sequentially to stay within OpenRouter free-tier rate limits.
    // Parallel calls (Promise.all) often trigger 429 errors on free models.
    const finalResults: Array<(typeof plan)[0] & { analysis: Awaited<ReturnType<typeof analyzeTraceability>> }> = [];
    for (let i = 0; i < plan.length; i++) {
      const item = plan[i];
      if (item.reusedData) {
        finalResults.push({ ...item, analysis: item.reusedData });
        continue;
      }
      const analysis = await analyzeWithRetry(item.up, item.down);
      finalResults.push({ ...item, analysis });
      // 10-second gap between pairs to avoid triggering rate limits on subsequent calls
      if (i < plan.length - 1) {
        await new Promise(r => setTimeout(r, 10000));
      }
    }

    const overallScore =
      finalResults.reduce((sum, r) => sum + r.analysis.alignmentScore, 0) / finalResults.length;
    let readinessStatus: string;
    if (overallScore >= 80) readinessStatus = 'READY';
    else if (overallScore >= 60) readinessStatus = 'NEEDS_REVISION';
    else readinessStatus = 'CRITICAL_GAPS';

    const auditResult = await prisma.$transaction(async tx => {
      const audit = await tx.auditResult.create({
        data: { groupId, overallScore, readinessStatus: readinessStatus as any },
      });

      for (const { up, down, analysis } of finalResults) {
        // Normalize status to uppercase for Prisma enum
        const status = (analysis.status || 'FAIL').toUpperCase() as any;

        await tx.traceabilityLink.create({
          data: {
            upstreamId: up.id,
            downstreamId: down.id,
            alignmentScore: analysis.alignmentScore,
            status: ['PASS', 'WARN', 'FAIL'].includes(status) ? status : 'FAIL',
            evidencePairs: analysis.evidencePairs as any,
            auditResultId: audit.id,
          },
        });

        for (const gap of analysis.gaps) {
          // Ensure severity matches Prisma enum (uppercase)
          const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
          const severity = (gap.severity || 'MEDIUM').toUpperCase();
          const finalSeverity = validSeverities.includes(severity) ? severity : 'MEDIUM';

          await tx.gap.create({
            data: {
              auditResultId: audit.id,
              description: gap.description || 'No description provided',
              severity: finalSeverity as any,
              affectedArtifacts: [up.type, down.type],
              rootCause: gap.rootCause || 'Root cause not determined by AI',
              recommendation: gap.recommendation || 'No recommendation provided',
              aiConfidence: typeof gap.aiConfidence === 'number' ? gap.aiConfidence : 0.5,
            },
          });
        }
      }
      return audit;
    });

    res.status(201).json({ auditResult });
  } catch (err) {
    console.error('Audit error:', err);
    const response = auditErrorResponse(err);
    res.status(response.status).json({ error: response.error, details: response.details });
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

// GET /api/audit/:groupId/debug — verify extraction: shows char count + preview per artifact
auditRouter.get('/:groupId/debug', async (req: AuthRequest, res: Response): Promise<void> => {
  const { groupId } = req.params;
  try {
    const artifacts = await prisma.artifact.findMany({ where: { groupId } });
    const info = artifacts.map(a => ({
      type: a.type,
      url: a.url,
      extracted: !!a.content,
      charCount: a.content?.length ?? 0,
      approxPages: Math.round((a.content?.length ?? 0) / 1500),
      preview: a.content?.slice(0, 300) ?? null,
    }));
    res.json({ artifacts: info });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
