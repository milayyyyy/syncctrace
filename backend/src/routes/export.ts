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

// POST /api/export — create export job
exportRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = ExportRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }
  try {
    // ensure audit result exists
    const audit = await prisma.auditResult.findUnique({ where: { id: parsed.data.auditResultId } });
    if (!audit) {
      res.status(404).json({ error: 'AuditResult not found' });
      return;
    }

    // create ExportJob record
    const job = await prisma.exportJob.create({
      data: {
        userId: req.user!.id,
        auditResultId: parsed.data.auditResultId,
        format: parsed.data.format,
        status: 'COMPLETED',
        completedAt: new Date(),
        // fileUrl will point to a static exports folder served by the app
        fileUrl: `/exports/${parsed.data.auditResultId}-${Date.now()}.${parsed.data.format.toLowerCase()}`,
      },
    });

    res.status(201).json({
      message: 'Export job created',
      jobId: job.id,
      format: job.format,
      status: job.status,
    });
  } catch (err) {
    console.error('Export create error:', err);
    res.status(500).json({ error: 'Failed to create export job' });
  }
});

// GET /api/export — list export jobs for the current user
exportRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const jobs = await prisma.exportJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ jobs });
  } catch (err) {
    console.error('Export list error:', err);
    res.status(500).json({ error: 'Failed to list export jobs' });
  }
});

// GET /api/export/:jobId — check job status / get download URL
exportRouter.get('/:jobId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { jobId } = req.params;
  try {
    const job = await prisma.exportJob.findUnique({ where: { id: jobId } });
    if (!job) {
      res.status(404).json({ error: 'Export job not found' });
      return;
    }

    res.json({
      jobId: job.id,
      status: job.status,
      format: job.format,
      fileUrl: job.fileUrl,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (err) {
    console.error('Export get error:', err);
    res.status(500).json({ error: 'Failed to fetch export job' });
  }
});
