const { PrismaClient } = require('@prisma/client');

// Tạo Prisma client instance cho Member Service
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Kết nối với database
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to Member database successfully');
  } catch (error) {
    console.error('❌ Failed to connect to Member database:', error);
    process.exit(1);
  }
}

// Đóng kết nối khi thoát
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('🔌 Disconnected from Member database');
});

module.exports = { prisma, connectDatabase };