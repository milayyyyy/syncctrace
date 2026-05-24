import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
export const projectsRouter = Router();
projectsRouter.use(authenticate);

// Faculty creates a group — only a section label is needed; code is auto-generated
const CreateProjectSchema = z.object({
  sectionName: z.string().min(1).max(50),
});

// Student joins a group — code + optional project title (sets the group title if not yet named)
const JoinProjectSchema = z.object({
  teamCode: z.string().min(1).max(20),
  projectTitle: z.string().max(200).optional(),
});

function generateTeamCode(sectionName: string): string {
  const prefix = sectionName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'GRP';
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${suffix}`;
}

const auditInclude = {
  orderBy: { auditedAt: 'desc' as const },
  take: 1,
  include: {
    traceLinks: { include: { upstream: true, downstream: true } },
    gaps: true,
  },
};

const groupInclude = {
  members: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
  artifacts: {
    select: { id: true, type: true, url: true, fileName: true, uploadedAt: true, updatedAt: true },
    orderBy: { uploadedAt: 'desc' as const },
  },
  auditResults: auditInclude,
};

// GET /api/projects — list groups the user belongs to or advises
projectsRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const groups = await prisma.facultyGroup.findMany({
      where: user?.role === 'FACULTY'
        ? { advisorId: userId }
        : { members: { some: { id: userId } } },
      include: groupInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ groups });
  } catch (err) {
    console.error('GET /projects error:', err);
    res.status(500).json({ error: 'Failed to fetch groups.' });
  }
});

// POST /api/projects — faculty creates a new group with an auto-generated code
projectsRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = CreateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }
  const userId = req.user!.id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'FACULTY') {
    res.status(403).json({ error: 'Only faculty can create groups.' });
    return;
  }

  const { sectionName } = parsed.data;
  // Retry once if the generated code collides
  for (let attempt = 0; attempt < 5; attempt++) {
    const teamCode = generateTeamCode(sectionName);
    try {
      const group = await prisma.facultyGroup.create({
        data: {
          name: sectionName,
          projectTitle: '', // students set this when they join
          teamCode,
          advisorId: userId,
        },
        include: groupInclude,
      });
      res.status(201).json({ group });
      return;
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr.code === 'P2002' && attempt < 4) continue; // retry on collision
      console.error('POST /projects error:', err);
      res.status(500).json({ error: 'Failed to create group.' });
      return;
    }
  }
});

// POST /api/projects/join — student joins a group using the team code
projectsRouter.post('/join', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = JoinProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Team code is required.' });
    return;
  }
  const userId = req.user!.id;
  const { teamCode, projectTitle } = parsed.data;
  try {
    const group = await prisma.facultyGroup.findUnique({
      where: { teamCode },
      include: groupInclude,
    });
    if (!group) {
      res.status(404).json({ error: 'Invalid team code. Please check with your adviser.' });
      return;
    }
    const alreadyMember = group.members.some((m) => m.id === userId);

    // Determine whether to set the project title:
    // only applied if the group has no title yet and the student provides one
    const titleToSet = !group.projectTitle && projectTitle ? projectTitle.trim() : undefined;

    if (alreadyMember && !titleToSet) {
      res.json({ group }); // idempotent — nothing to update
      return;
    }

    const updated = await prisma.facultyGroup.update({
      where: { id: group.id },
      data: {
        ...(alreadyMember ? {} : { members: { connect: { id: userId } } }),
        ...(titleToSet ? { projectTitle: titleToSet } : {}),
      },
      include: groupInclude,
    });
    res.json({ group: updated });
  } catch (err) {
    console.error('POST /projects/join error:', err);
    res.status(500).json({ error: 'Failed to join group.' });
  }
});

// GET /api/projects/:id — get single group with latest audit
projectsRouter.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const group = await prisma.facultyGroup.findUnique({
      where: { id },
      include: groupInclude,
    });
    if (!group) {
      res.status(404).json({ error: 'Group not found.' });
      return;
    }
    res.json({ group });
  } catch (err) {
    console.error('GET /projects/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch group.' });
  }
});

// GET /api/projects — list groups the user belongs to or advises
projectsRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const groups = await prisma.facultyGroup.findMany({
      where: user?.role === 'FACULTY'
        ? { advisorId: userId }
        : { members: { some: { id: userId } } },
      include: groupInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ groups });
  } catch (err) {
    console.error('GET /projects error:', err);
    res.status(500).json({ error: 'Failed to fetch groups.' });
  }
});

// POST /api/projects — create a new group
projectsRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = CreateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }
  const { title, teamCode, adviserId, memberEmails } = parsed.data;
  const userId = req.user!.id;
  try {
    const memberUsers = memberEmails.length > 0
      ? await prisma.user.findMany({ where: { email: { in: memberEmails } }, select: { id: true } })
      : [];
    const memberIds = [...new Set([userId, ...memberUsers.map((m) => m.id)])];

    const group = await prisma.facultyGroup.create({
      data: {
        name: title,
        projectTitle: title,
        teamCode,
        advisorId: adviserId,
        members: { connect: memberIds.map((id) => ({ id })) },
      },
      include: groupInclude,
    });
    res.status(201).json({ group });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr.code === 'P2002') {
      res.status(409).json({ error: 'Team code already exists. Choose a different code.' });
      return;
    }
    console.error('POST /projects error:', err);
    res.status(500).json({ error: 'Failed to create group.' });
  }
});

// GET /api/projects/:id — get single group with latest audit
projectsRouter.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const group = await prisma.facultyGroup.findUnique({
      where: { id },
      include: groupInclude,
    });
    if (!group) {
      res.status(404).json({ error: 'Group not found.' });
      return;
    }
    res.json({ group });
  } catch (err) {
    console.error('GET /projects/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch group.' });
  }
});
