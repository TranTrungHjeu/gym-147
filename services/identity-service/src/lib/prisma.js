const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log(' Connected to Identity database successfully');
  } catch (error) {
    console.error(' Failed to connect to Identity database:', error);
    process.exit(1);
  }
}

process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log(' Disconnected from Identity database');
});

module.exports = { prisma, connectDatabase };
