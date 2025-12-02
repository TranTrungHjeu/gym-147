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

// Modify DATABASE_URL to include search_path if not already present
let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && !databaseUrl.includes('search_path')) {
  const separator = databaseUrl.includes('?') ? '&' : '?';
  databaseUrl = `${databaseUrl}${separator}search_path=schedule_schema,public`;
  // Update process.env for this process
  process.env.DATABASE_URL = databaseUrl;
}

// Create base Prisma client
const basePrisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

// Extend Prisma client to ensure search_path is set for all queries
// This is critical for connection pool where connections may not have search_path set
// Note: Prisma may generate queries with schema prefix (schedule_schema.schedules)
// but PostgreSQL still needs search_path to resolve the schema correctly
const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ operation, model, args, query }) {
      // Set search_path before each query to ensure tables are found
      // This must be done for every query because connection pool may reuse connections
      // without the correct search_path
      try {
        // Use SET SESSION to ensure it persists for the entire session
        // This works better than SET LOCAL (which only works in transactions)
        // and SET (which might not persist across connection pool reuse)
        await basePrisma.$executeRawUnsafe('SET SESSION search_path TO schedule_schema, public');
      } catch (setError) {
        // If SET SESSION fails, try SET as fallback
        try {
          await basePrisma.$executeRawUnsafe('SET search_path TO schedule_schema, public');
        } catch (fallbackError) {
          // Ignore errors - search_path might already be set or connection might be in a bad state
          // Log only if it's a real error (not expected cases)
          if (
            !fallbackError.message?.includes('already set') &&
            !fallbackError.message?.includes('current transaction') &&
            !fallbackError.message?.includes('cannot change') &&
            !fallbackError.message?.includes('permission denied')
          ) {
            console.warn('[WARNING] Could not set search_path:', fallbackError.message);
          }
        }
      }
      return query(args);
    },
  },
});

async function connectDatabase() {
  try {
    await prisma.$connect();

    // search_path is now set in DATABASE_URL connection string
    // This ensures all connections automatically use schedule_schema
    console.log('[SUCCESS] Connected to Schedule database successfully');
    console.log('[CONFIG] Using search_path=schedule_schema,public from connection string');

    // Verify schedules table exists in schedule_schema
    try {
      // Check in schedule_schema
      const scheduleSchemaCheck = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'schedule_schema' 
        AND table_name = 'schedules'
        LIMIT 1
      `;

      // Check in public schema
      const publicSchemaCheck = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schedules'
        LIMIT 1
      `;

      if (scheduleSchemaCheck && scheduleSchemaCheck.length > 0) {
        console.log('[CONFIG] Verified: schedules table exists in schedule_schema ✓');
      } else if (publicSchemaCheck && publicSchemaCheck.length > 0) {
        console.error('========================================');
        console.error(
          '[CRITICAL ERROR] schedules table found in public schema, but not in schedule_schema!'
        );
        console.error(
          '[CRITICAL ERROR] Migration 20250130000001_move_tables_to_schedule_schema has not run.'
        );
        console.error('[CRITICAL ERROR]');
        console.error('[CRITICAL ERROR] To fix this, run:');
        console.error('[CRITICAL ERROR]   cd services/schedule-service');
        console.error('[CRITICAL ERROR]   npx prisma migrate deploy');
        console.error('[CRITICAL ERROR]');
        console.error('[CRITICAL ERROR] Or run the check script:');
        console.error('[CRITICAL ERROR]   node scripts/check-and-fix-schema.js');
        console.error('========================================');
      } else {
        console.error('========================================');
        console.error('[CRITICAL ERROR] schedules table not found in any schema!');
        console.error('[CRITICAL ERROR]');
        console.error('[CRITICAL ERROR] To fix this, run:');
        console.error('[CRITICAL ERROR]   cd services/schedule-service');
        console.error('[CRITICAL ERROR]   npx prisma migrate deploy');
        console.error('========================================');
      }
    } catch (checkError) {
      console.warn('[WARNING] Could not verify table location:', checkError.message);
    }
  } catch (error) {
    console.error('[ERROR] Failed to connect to Schedule database:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('[DISCONNECT] Disconnected from Schedule database');
});

module.exports = { prisma, connectDatabase };
