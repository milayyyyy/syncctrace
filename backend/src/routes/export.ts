import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';

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
  // TODO: create ExportJob in Prisma, generate file
  res.status(202).json({
    message: 'Export job created',
    jobId: 'mock-job-id',
    format: parsed.data.format,
  });
});

// GET /api/export/:jobId — check job status / get download URL
exportRouter.get('/:jobId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { jobId } = req.params;
  // TODO: query Prisma
  res.json({ jobId, status: 'DONE', fileUrl: `/exports/${jobId}.pdf` });
});
