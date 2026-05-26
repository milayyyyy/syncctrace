import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

export const usersRouter = Router();
usersRouter.use(authenticate);

// GET /api/users/faculty — list all faculty users for adviser dropdown
usersRouter.get('/faculty', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.user.findMany({
      where: { role: 'FACULTY' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    res.json({ faculty });
  } catch (err) {
    console.error('GET /users/faculty error:', err);
    res.status(500).json({ error: 'Failed to fetch faculty list.' });
  }
});
