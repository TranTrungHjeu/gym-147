const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
// Import routes
const routes = require('./routes');

// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('./lib/prisma');

// Create Express app
const app = express();

// Trust proxy - Required when behind reverse proxy (Nginx gateway)
// This allows Express to correctly handle X-Forwarded-* headers
// Only trust first proxy (more secure than trusting all)
// Set to specific number or IP ranges in production
if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
  // In production or when explicitly enabled, trust first proxy
  app.set('trust proxy', 1);
} else {
  // In development, don't trust proxy unless explicitly set
  app.set('trust proxy', false);
}

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// CORS configuration for Socket.IO
// Allow all origins in development, including web platform
// Use '*' directly in development for better compatibility
const socketCorsConfig =
  process.env.NODE_ENV === 'production'
    ? {
        origin: (origin, callback) => {
          const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
          if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: false,
        allowedHeaders: ['*'],
      }
    : {
        origin: '*', // Allow all origins in development
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: false,
        allowedHeaders: ['*'],
      };

const io = new Server(server, {
  cors: socketCorsConfig,
  allowEIO3: true, // Allow Engine.IO v3 clients
  transports: ['websocket', 'polling'], // Allow both transports
  pingTimeout: 60000,
  pingInterval: 25000,
  // Additional CORS handling
  allowRequest: (req, callback) => {
    // Always allow in development, check origin in production
    if (process.env.NODE_ENV === 'production') {
      const origin = req.headers.origin;
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    } else {
      callback(null, true); // Allow all in development
    }
  },
});

// Make io accessible globally
global.io = io;

// Add middleware to handle CORS headers for Socket.IO requests
io.engine.on('headers', (headers, req) => {
  const origin = req.headers.origin;

  let corsOrigin = '*';

  if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (origin && allowedOrigins.includes(origin)) {
      corsOrigin = origin;
    } else if (!origin) {
      // Allow requests without origin (mobile apps, etc.)
      corsOrigin = '*';
    }
  } else {
    // In development, always allow all origins
    if (origin) {
      corsOrigin = origin;
    } else {
      corsOrigin = '*';
    }
  }

  // Always set CORS headers
  headers['Access-Control-Allow-Origin'] = corsOrigin;
  headers['Access-Control-Allow-Credentials'] = 'false';
  headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';
  headers['Access-Control-Expose-Headers'] = '*';
  headers['Access-Control-Max-Age'] = '86400'; // 24 hours

  // Log for debugging in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SOCKET] Socket.IO engine headers:', {
      origin: origin || 'none',
      setOrigin: corsOrigin,
    });
  }
});

// Socket.IO connection handling
io.on('connection', socket => {
  console.log('[SUCCESS] Client connected:', socket.id);

  // Subscribe to user-specific notifications (for queue, etc.)
  socket.on('subscribe:user', user_id => {
    socket.join(`user:${user_id}`);
    console.log(`[USER] Client ${socket.id} subscribed to user:${user_id}`);
  });

  // Unsubscribe from user notifications
  socket.on('unsubscribe:user', user_id => {
    socket.leave(`user:${user_id}`);
    console.log(`[USER] Client ${socket.id} unsubscribed from user:${user_id}`);
  });

  // Subscribe to equipment updates
  socket.on('subscribe:equipment', equipment_id => {
    socket.join(`equipment:${equipment_id}`);
    console.log(`[SOCKET] Client ${socket.id} subscribed to equipment:${equipment_id}`);
  });

  // Unsubscribe from equipment updates
  socket.on('unsubscribe:equipment', equipment_id => {
    socket.leave(`equipment:${equipment_id}`);
    console.log(`[SOCKET] Client ${socket.id} unsubscribed from equipment:${equipment_id}`);
  });

  // Subscribe to admin notifications (for admin/super admin users)
  socket.on('subscribe:admin', () => {
    socket.join('admin');
    console.log(`[ADMIN] Client ${socket.id} subscribed to admin room`);
  });

  // Unsubscribe from admin notifications
  socket.on('unsubscribe:admin', () => {
    socket.leave('admin');
    console.log(`[ADMIN] Client ${socket.id} unsubscribed from admin room`);
  });

  socket.on('disconnect', () => {
    console.log('[ERROR] Client disconnected:', socket.id);
  });
});

// ==================== MIDDLEWARE SETUP ====================

// CORS configuration for Express
// In production, ALLOWED_ORIGINS must be set
// In development, use safe defaults with warning
let allowedOrigins = [];
if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
} else if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'ALLOWED_ORIGINS environment variable is required in production. ' +
      'Please set it in your .env file (comma-separated list of allowed origins).'
  );
} else {
  // Development fallback with warning
  console.warn(
    '[WARN] ALLOWED_ORIGINS not set, using development defaults. Set ALLOWED_ORIGINS in .env for production.'
  );
  allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081',
  ];
}

// Handle CORS for Socket.IO polling requests (MUST be before helmet)
// This middleware ensures CORS headers are set for all Socket.IO requests
app.use('/socket.io', (req, res, next) => {
  const origin = req.headers.origin;

  // Always set CORS headers for Socket.IO requests
  let corsOrigin = '*';

  if (process.env.NODE_ENV === 'production') {
    // In production, only allow specific origins
    if (origin && allowedOrigins.includes(origin)) {
      corsOrigin = origin;
    } else if (!origin) {
      // Allow requests without origin (mobile apps, etc.)
      corsOrigin = '*';
    }
  } else {
    // In development, always allow all origins
    if (origin) {
      corsOrigin = origin;
    } else {
      corsOrigin = '*';
    }
  }

  // Always set CORS headers
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Expose-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Log for debugging in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SOCKET] Socket.IO CORS:', {
      origin: origin || 'none',
      setOrigin: corsOrigin,
      method: req.method,
      path: req.path,
    });
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Security middleware
// Configure helmet to allow CORS for Socket.IO
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    // Allow CORS for Socket.IO
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", '*'], // Allow Socket.IO connections
      },
    },
  })
);

// CORS configuration for Express API routes
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, inter-service calls, etc.)
      if (!origin) return callback(null, true);

      // In development, allow all origins for easier debugging and inter-service communication
      if (process.env.NODE_ENV !== 'production') {
        // Log the origin for debugging if DEBUG_CORS is set
        if (process.env.DEBUG_CORS) {
          console.log('CORS: Allowing origin in development:', origin);
        }
        return callback(null, true);
      }

      // In production, check against allowed origins
      if (allowedOrigins.includes(origin)) {
        // Return the specific origin (not true) to avoid duplication
        callback(null, origin);
      } else {
        console.log('CORS: Origin not allowed:', origin);
        console.log('CORS: Allowed origins:', allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Rate limiting
// Note: trust proxy must be set before rate limiter to handle X-Forwarded-For headers
const limiterConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  // Disable trust proxy validation to prevent warning
  // We're using trust proxy: 1 (only first proxy) which is more secure than trust proxy: true
  // This prevents the ValidationError about trust proxy bypassing rate limiting
  validate: {
    trustProxy: false, // Always disable validation to prevent warning
  },
};

const limiter = rateLimit(limiterConfig);
app.use(limiter);

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== REQUEST LOGGING ====================

// Custom request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });

  next();
});

// ==================== ERROR HANDLING MIDDLEWARE ====================

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  // Prisma errors
  if (err.code && err.code.startsWith('P')) {
    return res.status(400).json({
      success: false,
      message: 'Database error occurred',
      data: null,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      data: null,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    data: null,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// ==================== ROUTES ====================

// Mount routes
app.use('/', routes);

// Error handling middleware (must be after routes)
const {
  errorHandler,
  notFoundHandler,
} = require('../../../packages/shared-middleware/src/error.middleware.js');
app.use(notFoundHandler);
app.use(errorHandler);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Member Service API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      docs: '/api-docs',
      members: '/members',
      sessions: '/sessions',
      equipment: '/equipment',
      health_metrics: '/health-metrics',
      workouts: '/workout-plans',
      achievements: '/achievements',
      notifications: '/notifications',
      analytics: '/analytics',
    },
  });
});

// ==================== CRON JOBS ====================

// Start auto-expire redemptions job
const { startExpireJob, stopExpireJob } = require('./jobs/expire-redemptions.job');
startExpireJob();

// Start expiration notification job
const {
  startExpirationNotificationJob,
  stopExpirationNotificationJob,
} = require('./jobs/reward-expiration-notification.job');
startExpirationNotificationJob();

// ==================== GRACEFUL SHUTDOWN ====================

// Graceful shutdown handler
const gracefulShutdown = async signal => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Stop notification worker
    const { notificationWorker } = require('./workers/notification.worker.js');
    await notificationWorker.stop();
    console.log('Notification worker stopped.');

    // Stop queue cleanup cron job
    const { stopQueueCleanupJob } = require('./jobs/queue-cleanup.job');
    stopQueueCleanupJob();
    console.log('Queue cleanup cron job stopped.');

    // Stop reward expiration jobs
    stopExpireJob();
    stopExpirationNotificationJob();

    // Close Prisma connection
    await prisma.$disconnect();
    console.log('Prisma connection closed.');

    // Close server
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ==================== NOTIFICATION WORKER ====================

// Start notification worker (async)
(async () => {
  try {
    const { notificationWorker } = require('./workers/notification.worker.js');
    await notificationWorker.start();
  } catch (error) {
    console.error('[ERROR] Failed to start notification worker:', error);
  }
})();

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`
       Member Service is running!
       Server: http://${HOST}:${PORT}
       WebSocket: ws://${HOST}:${PORT}
       Environment: ${process.env.NODE_ENV || 'development'}
       Health Check: http://${HOST}:${PORT}/health
       API Docs: http://${HOST}:${PORT}/api-docs
       Started at: ${new Date().toISOString()}
         `);
});

// ==================== DATABASE CONNECTION TEST ====================

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('[SUCCESS] Database connection established successfully');

    // Test a simple query
    const memberCount = await prisma.member.count();
    console.log(`[DATA] Current member count: ${memberCount}`);
  } catch (error) {
    console.error('[ERROR] Database connection failed:', error);
    process.exit(1);
  }
}

// Run database connection test
testDatabaseConnection();

// ==================== AUTO-STOP EXPIRED SESSIONS ====================

// Auto-stop expired equipment usage sessions every 10 minutes
const equipmentController = require('./controllers/equipment.controller');
const AUTO_STOP_INTERVAL = 10 * 60 * 1000; // 10 minutes

setInterval(async () => {
  try {
    console.log('[SEARCH] Checking for expired equipment usage sessions...');

    // Create mock req/res objects for internal call
    const mockReq = {};
    const mockRes = {
      json: data => {
        if (data.data && data.data.stopped > 0) {
          console.log(`[TIMER] Auto-stopped ${data.data.stopped} expired session(s)`);
        }
      },
      status: () => mockRes,
    };

    await equipmentController.autoStopExpiredSessions(mockReq, mockRes);
  } catch (error) {
    console.error('[ERROR] Error in auto-stop interval:', error);
  }
}, AUTO_STOP_INTERVAL);

console.log(`[TIMER] Auto-stop service started (interval: ${AUTO_STOP_INTERVAL / 60000} minutes)`);

// ==================== QUEUE CLEANUP CRON JOB ====================

// Start queue cleanup cron job (runs every 2 minutes)
const { startQueueCleanupJob, stopQueueCleanupJob } = require('./jobs/queue-cleanup.job');
startQueueCleanupJob();

// ==================== CACHE WARMING JOB ====================

// Start cache warming job (runs every hour)
const cacheWarmingJob = require('./jobs/cache-warming.job');
cacheWarmingJob.startScheduled();

module.exports = app;
