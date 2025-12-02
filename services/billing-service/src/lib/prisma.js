// Ensure dotenv is loaded before Prisma Client initialization
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

// Prisma Client with connection pool configuration
// Connection pool settings are configured via DATABASE_URL connection string parameters:
// ?connection_limit=10&pool_timeout=20&connect_timeout=10
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Connection state tracking
let isConnected = false;
let connectionRetries = 0;
const MAX_CONNECTION_RETRIES = 5;
const CONNECTION_RETRY_DELAY = 2000; // 2 seconds

async function connectDatabase() {
  try {
    await prisma.$connect();
    isConnected = true;
    connectionRetries = 0;
    console.log('[SUCCESS] Connected to Billing database successfully');

    // Test connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    console.log('[SUCCESS] Database connection verified');
  } catch (error) {
    isConnected = false;
    connectionRetries++;

    console.error(
      `[ERROR] Failed to connect to Billing database (attempt ${connectionRetries}/${MAX_CONNECTION_RETRIES}):`,
      error.message
    );

    // Retry connection if not exceeded max retries
    if (connectionRetries < MAX_CONNECTION_RETRIES) {
      console.log(`[RETRY] Retrying database connection in ${CONNECTION_RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, CONNECTION_RETRY_DELAY));
      return connectDatabase();
    }

    console.error('[FATAL] Max connection retries exceeded. Exiting...');
    process.exit(1);
  }
}

/**
 * Check database connection health
 */
async function checkConnectionHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    if (!isConnected) {
      console.log('[INFO] Database connection restored');
      isConnected = true;
      connectionRetries = 0;
    }
    return true;
  } catch (error) {
    isConnected = false;
    console.warn('[WARNING] Database connection health check failed:', error.message);
    return false;
  }
}

/**
 * Reconnect to database if connection is lost
 */
async function reconnectDatabase() {
  if (isConnected) {
    return true;
  }

  try {
    console.log('[INFO] Attempting to reconnect to database...');
    await prisma.$disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await connectDatabase();
    return true;
  } catch (error) {
    console.error('[ERROR] Failed to reconnect to database:', error.message);
    return false;
  }
}

async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('[SUCCESS] Disconnected from Billing database');
  } catch (error) {
    console.error('[ERROR] Error disconnecting from Billing database:', error);
  }
}

// Connect on startup
connectDatabase();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[SHUTDOWN] Shutting down Billing service...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[SHUTDOWN] Received SIGTERM, shutting down Billing service...');
  await disconnectDatabase();
  process.exit(0);
});

// Periodic health check (every 30 seconds)
if (process.env.NODE_ENV !== 'test') {
  setInterval(async () => {
    await checkConnectionHealth();
  }, 30000);
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
  checkConnectionHealth,
  reconnectDatabase,
  get isConnected() {
    return isConnected;
  },
};
