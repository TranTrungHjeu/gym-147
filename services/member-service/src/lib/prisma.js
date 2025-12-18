// Ensure dotenv is loaded before Prisma Client initialization
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

// Parse DATABASE_URL to add connection pool parameters if not present
let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && !databaseUrl.includes('connection_limit')) {
  try {
    const url = new URL(databaseUrl);
    // Set connection limit to 10 for better concurrency
    // Increase pool_timeout to 30s to handle cache warming and embedding generation
    url.searchParams.set('connection_limit', '10');
    url.searchParams.set('pool_timeout', '30');
    url.searchParams.set('connect_timeout', '15');
    databaseUrl = url.toString();
    console.log('[INFO] Added connection pool parameters to DATABASE_URL');
  } catch (error) {
    // If URL parsing fails, append parameters manually
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl = `${databaseUrl}${separator}connection_limit=10&pool_timeout=30&connect_timeout=15`;
    console.log('[INFO] Appended connection pool parameters to DATABASE_URL');
  }
}

// Log DATABASE_URL for debugging (mask password)
if (databaseUrl) {
  const maskedUrl = databaseUrl.replace(/:[^:@]+@/, ':****@');
  console.log('[CONFIG] DATABASE_URL:', maskedUrl);
} else {
  console.warn('[WARNING] DATABASE_URL is not set!');
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
