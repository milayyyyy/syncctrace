import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { authRouter } from './routes/auth';
import { projectsRouter } from './routes/projects';
import { artifactsRouter } from './routes/artifacts';
import { auditRouter } from './routes/audit';
import { exportRouter } from './routes/export';
import { usersRouter } from './routes/users';
import { prisma } from './lib/prisma';

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
const corsOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'https://synctrace.vercel.app',
].filter((o): o is string => Boolean(o));

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
// General rate limit — generous for a SPA that makes multiple calls per page
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// Stricter limit only for heavy auth mutation endpoints (sync/signup)
const authMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests. Please wait before trying again.' },
});

app.use(generalLimiter);
app.use(express.json({ limit: '2mb' }));

// Vercel backend routePrefix "/api" strips that segment before Express sees the path.
const API_PREFIX = process.env.VERCEL ? '' : '/api';

// Routes
app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/projects`, projectsRouter);
app.use(`${API_PREFIX}/artifacts`, artifactsRouter);
app.use(`${API_PREFIX}/audit`, auditRouter);
app.use(`${API_PREFIX}/export`, exportRouter);
app.use(`${API_PREFIX}/users`, usersRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: true });
  } catch (err) {
    console.error('DB health check failed:', err);
    res.status(503).json({ status: 'error', db: false });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`SyncTrace API running on port ${PORT}`);
});

export default app;
