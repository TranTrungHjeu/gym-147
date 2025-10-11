const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to Schedule database successfully');
  } catch (error) {
    console.error('❌ Failed to connect to Schedule database:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('📤 Disconnected from Schedule database');
});

module.exports = { prisma, connectDatabase };
