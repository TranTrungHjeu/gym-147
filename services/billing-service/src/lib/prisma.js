const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('Connected to Billing database successfully');
  } catch (error) {
    console.error('Failed to connect to Billing database:', error);
    process.exit(1);
  }
}

async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Disconnected from Billing database');
  } catch (error) {
    console.error('❌ Error disconnecting from Billing database:', error);
  }
}

// Connect on startup
connectDatabase();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Billing service...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down Billing service...');
  await disconnectDatabase();
  process.exit(0);
});

module.exports = { prisma, connectDatabase, disconnectDatabase };
