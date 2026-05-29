import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

export const exportRouter = Router();
exportRouter.use(authenticate);

const ExportRequestSchema = z.object({
  auditResultId: z.string().uuid(),
  format: z.enum(['PDF', 'JSON', 'CSV']),
});

async function canAccessAudit(userId: string, auditResultId: string): Promise<boolean> {
  const audit = await prisma.auditResult.findUnique({
    where: { id: auditResultId },
    select: {
      group: {
        select: {
          advisorId: true,
          members: { where: { id: userId }, select: { id: true }, take: 1 },
        },
      },
    },
  });
  if (!audit) return false;
  return audit.group.advisorId === userId || audit.group.members.length > 0;
}

// GET /api/export - list current user's export history
exportRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const jobs = await prisma.exportJob.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        auditResult: {
          select: {
            id: true,
            auditedAt: true,
            group: { select: { id: true, name: true, projectTitle: true } },
          },
        },
      },
    });
    res.json({ jobs });
  } catch (err) {
    console.error('GET /export error:', err);
    res.status(500).json({ error: 'Failed to fetch export history.' });
  }
});

// POST /api/export - create a completed export job record
exportRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = ExportRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const { auditResultId, format } = parsed.data;
    const allowed = await canAccessAudit(req.user!.id, auditResultId);
    if (!allowed) {
      res.status(404).json({ error: 'Audit result not found.' });
      return;
    }

    const job = await prisma.exportJob.create({
      data: {
        userId: req.user!.id,
        auditResultId,
        format,
        status: 'COMPLETED',
        completedAt: new Date(),
        fileUrl: null,
      },
    });

    res.status(201).json({ job });
  } catch (err) {
    console.error('POST /export error:', err);
    res.status(500).json({ error: 'Failed to create export job.' });
  }
});

// GET /api/export/:jobId - check job status
exportRouter.get('/:jobId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { jobId } = req.params;
  try {
    const job = await prisma.exportJob.findFirst({
      where: { id: jobId, userId: req.user!.id },
      include: {
        auditResult: {
          select: {
            id: true,
            auditedAt: true,
            group: { select: { id: true, name: true, projectTitle: true } },
          },
        },
      },
    });
    if (!job) {
      res.status(404).json({ error: 'Export job not found.' });
      return;
    }
    res.json({ job });
  } catch (err) {
    console.error('GET /export/:jobId error:', err);
    res.status(500).json({ error: 'Failed to fetch export job.' });
  }
});
