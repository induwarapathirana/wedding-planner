import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prismaInstance: PrismaClient | undefined;

const isBuildProcess = process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE === 'phase-production-build';

if (isBuildProcess) {
    try {
      prismaInstance = new PrismaClient();
    } catch (e: any) {
      if (e.name === 'PrismaClientInitializationError' || e.message?.includes('PrismaClientOptions')) {
         console.warn("Bypassed Prisma turbopack placeholder bug during build step.");
         prismaInstance = {} as PrismaClient;
      } else {
         throw e;
      }
    }
} else {
    prismaInstance = new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? prismaInstance;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
