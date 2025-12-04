// Ensure dotenv is loaded before Prisma Client initialization
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

// Parse DATABASE_URL to add connection pool parameters if not present
let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && !databaseUrl.includes('connection_limit')) {
  try {
    const url = new URL(databaseUrl);
    // Set connection limit to 5 to prevent max clients error
    // This is conservative but safe for Railway/Supabase Session mode
    url.searchParams.set('connection_limit', '5');
    url.searchParams.set('pool_timeout', '20');
    url.searchParams.set('connect_timeout', '10');
    databaseUrl = url.toString();
    console.log('[INFO] Added connection pool parameters to DATABASE_URL');
  } catch (error) {
    // If URL parsing fails, append parameters manually
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl = `${databaseUrl}${separator}connection_limit=5&pool_timeout=20&connect_timeout=10`;
    console.log('[INFO] Appended connection pool parameters to DATABASE_URL');
  }
}

const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
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
