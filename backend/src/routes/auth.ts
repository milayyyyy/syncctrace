import { Router, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

export const authRouter = Router();

// Stricter rate limit for auth mutation endpoints (sync/signup)
const authMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests. Please wait before trying again.' },
});

const SyncSchema = z.object({
  role: z.enum(['STUDENT', 'FACULTY']),
  name: z.string().min(1).max(100),
  avatarUrl: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.union([z.string().url(), z.null()]).optional(),
  ),
});

// POST /api/auth/sync — verify Supabase JWT, upsert user in DB, return profile
authRouter.post('/sync', authMutationLimiter, authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = SyncSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  try {
    const { role, name, avatarUrl } = parsed.data;
    const { id: supabaseId, email } = req.user!;

    // Check if user already exists with a different role
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.role !== role) {
      const roleLabel = existing.role === 'STUDENT' ? 'Student' : 'Adviser';
      res.status(403).json({
        error: 'ROLE_MISMATCH',
        role: existing.role,
        message: `Account already existed as ${roleLabel}.`,
      });
      return;
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: { name, avatarUrl: avatarUrl ?? undefined },
      create: { id: supabaseId, email, name, role, avatarUrl: avatarUrl ?? null },
    });

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Auth sync error:', err);
    const code = (err as { code?: string })?.code;
    const message =
      code === 'P1001' || code === 'P1000'
        ? 'Database unreachable. Check DATABASE_URL on Vercel (use Supabase pooler, port 6543).'
        : 'Failed to sync user';
    res.status(500).json({ error: message, code });
  }
});

// GET /api/auth/me — return current user profile
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('Auth me error:', err);
    const code = (err as { code?: string })?.code;
    const message =
      code === 'P1001' || code === 'P1000'
        ? 'Database unreachable. Check DATABASE_URL on Vercel.'
        : code === 'P2021'
          ? 'Database schema is not migrated. Run Prisma migrations for this database.'
          : 'Internal server error';
    res.status(500).json({ error: message, code });
  }
});
