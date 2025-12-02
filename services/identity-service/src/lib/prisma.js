// Ensure dotenv is loaded before Prisma Client initialization
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('[SUCCESS] Connected to Identity database successfully');
  } catch (error) {
    console.error('[ERROR] Failed to connect to Identity database:', error);
    process.exit(1);
  }
}

process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('[DISCONNECT] Disconnected from Identity database');
});

module.exports = { prisma, connectDatabase };
