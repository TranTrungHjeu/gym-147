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

// Prisma Client with connection pool configuration
// Connection pool settings are configured via DATABASE_URL connection string parameters:
// ?connection_limit=5&pool_timeout=20&connect_timeout=10
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
  datasources: {
    db: {
      url: databaseUrl,
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
 * Uses a lightweight check that doesn't create new connections
 */
async function checkConnectionHealth() {
  // Skip health check if we're already connected to avoid unnecessary queries
  if (isConnected) {
    return true;
  }

  try {
    // Use a simple query with timeout to check connection
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 2000)),
    ]);

    if (!isConnected) {
      console.log('[INFO] Database connection restored');
      isConnected = true;
      connectionRetries = 0;
    }
    return true;
  } catch (error) {
    // Only log if it's a real connection error, not timeout
    if (!error.message.includes('timeout')) {
      isConnected = false;
      console.warn('[WARNING] Database connection health check failed:', error.message);
    }
    return false;
  }
}

/**
 * Reconnect to database if connection is lost
 * IMPORTANT: Do NOT disconnect/reconnect as it creates new connections
 * Instead, just try to use the existing connection pool
 */
let isReconnecting = false;

async function reconnectDatabase() {
  // Prevent multiple simultaneous reconnection attempts
  if (isReconnecting) {
    return false;
  }

  if (isConnected) {
    return true;
  }

  isReconnecting = true;

  try {
    console.log('[INFO] Attempting to reconnect to database...');

    // Don't disconnect - Prisma manages its own connection pool
    // Just try to use the connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      isConnected = true;
      connectionRetries = 0;
      console.log('[SUCCESS] Database connection restored');
      isReconnecting = false;
      return true;
    } catch (error) {
      // If query fails, the connection pool will handle reconnection automatically
      // Don't force disconnect/connect as it creates more connections
      console.warn(
        '[WARNING] Connection check failed, Prisma will handle reconnection:',
        error.message
      );
      isReconnecting = false;
      return false;
    }
  } catch (error) {
    console.error('[ERROR] Failed to reconnect to database:', error.message);
    isReconnecting = false;
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

// Periodic health check (every 60 seconds to reduce connection overhead)
// Only check if we think we're disconnected
if (process.env.NODE_ENV !== 'test') {
  setInterval(async () => {
    // Only run health check if we think we're disconnected
    // This prevents creating unnecessary connections
    if (!isConnected) {
      await checkConnectionHealth();
    }
  }, 60000); // Increased to 60 seconds to reduce overhead
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
