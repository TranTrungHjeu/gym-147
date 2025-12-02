// Ensure dotenv is loaded before Prisma Client initialization
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

// Log DATABASE_URL for debugging (mask password)
if (process.env.DATABASE_URL) {
  const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
  console.log('[CONFIG] DATABASE_URL:', maskedUrl);
} else {
  console.warn('[WARNING] DATABASE_URL is not set!');
}

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('[SUCCESS] Connected to Member database successfully');
  } catch (error) {
    console.error('[ERROR] Failed to connect to Member database:', error);
    process.exit(1);
  }
}

process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('[DISCONNECT] Disconnected from Member database');
});

module.exports = { prisma, connectDatabase };
