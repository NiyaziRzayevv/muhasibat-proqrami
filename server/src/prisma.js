let prisma;

try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  console.log('[prisma] PrismaClient initialized successfully');
} catch (err) {
  console.error('[prisma] FAILED to initialize PrismaClient:', err.message);
  console.error('[prisma] Full error:', err);
  // Create a dummy prisma that throws helpful errors
  prisma = new Proxy({}, {
    get(_, prop) {
      if (prop === '$disconnect' || prop === 'then') return () => Promise.resolve();
      return () => { throw new Error(`Prisma not available: ${err.message}`); };
    }
  });
}

module.exports = { prisma };
