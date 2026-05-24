import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const artifactsRouter = Router();
artifactsRouter.use(authenticate);

const ArtifactSubmitSchema = z.object({
  groupId: z.string().uuid(),
  artifacts: z.array(z.object({
    type: z.enum(['PROPOSAL', 'SRS', 'SDD', 'SPMP', 'STD', 'SOURCE_CODE']),
    url: z.string().url(),
    content: z.string().optional(), // extracted text for AI analysis
    fileName: z.string().optional(),
  })).min(1).max(6),
});

// POST /api/artifacts — upsert artifact URLs + extracted text
artifactsRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = ArtifactSubmitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const { groupId, artifacts } = parsed.data;

    const upserted = await Promise.all(
      artifacts.map(({ type, url, content, fileName }) =>
        prisma.artifact.upsert({
          where: { groupId_type: { groupId, type } },
          update: { url, ...(content !== undefined && { content }), ...(fileName !== undefined && { fileName }) },
          create: { groupId, type, url, content, fileName },
        }),
      ),
    );

    res.status(201).json({ message: 'Artifacts saved', artifacts: upserted });
  } catch (err) {
    console.error('Artifact save error:', err);
    res.status(500).json({ error: 'Failed to save artifacts.' });
  }
});

// GET /api/artifacts/:groupId — list artifacts for a group
artifactsRouter.get('/:groupId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { groupId } = req.params;

  try {
    const artifacts = await prisma.artifact.findMany({
      where: { groupId },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        groupId: true,
        type: true,
        url: true,
        fileName: true,
        uploadedAt: true,
        updatedAt: true,
        // omit content from list response (large text)
      },
    });
    res.json({ artifacts });
  } catch (err) {
    console.error('Artifact fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch artifacts.' });
  }
});

// DELETE /api/artifacts/:groupId/:type — remove a single artifact
artifactsRouter.delete('/:groupId/:type', async (req: AuthRequest, res: Response): Promise<void> => {
  const { groupId, type } = req.params;
  const validTypes = ['PROPOSAL', 'SRS', 'SDD', 'SPMP', 'STD', 'SOURCE_CODE'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: 'Invalid artifact type.' });
    return;
  }
  try {
    await prisma.artifact.deleteMany({ where: { groupId, type } });
    res.json({ message: 'Artifact removed.' });
  } catch (err) {
    console.error('Artifact delete error:', err);
    res.status(500).json({ error: 'Failed to remove artifact.' });
  }
});
