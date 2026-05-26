import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

/** Reuse one client per serverless instance (Vercel). */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.VERCEL || process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
