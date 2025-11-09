const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

// Import routes
const routes = require('./routes');

// Initialize Prisma
const prisma = new PrismaClient();

// Create Express app
const app = express();

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Make io accessible globally
global.io = io;

// Socket.IO connection handling
io.on('connection', socket => {
  console.log('✅ Client connected:', socket.id);

  // Subscribe to user-specific notifications (for queue, etc.)
  socket.on('subscribe:user', user_id => {
    socket.join(`user:${user_id}`);
    console.log(`👤 Client ${socket.id} subscribed to user:${user_id}`);
  });

  // Unsubscribe from user notifications
  socket.on('unsubscribe:user', user_id => {
    socket.leave(`user:${user_id}`);
    console.log(`👤 Client ${socket.id} unsubscribed from user:${user_id}`);
  });

  // Subscribe to equipment updates
  socket.on('subscribe:equipment', equipment_id => {
    socket.join(`equipment:${equipment_id}`);
    console.log(`📡 Client ${socket.id} subscribed to equipment:${equipment_id}`);
  });

  // Unsubscribe from equipment updates
  socket.on('unsubscribe:equipment', equipment_id => {
    socket.leave(`equipment:${equipment_id}`);
    console.log(`📡 Client ${socket.id} unsubscribed from equipment:${equipment_id}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// ==================== MIDDLEWARE SETUP ====================

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : process.env.NODE_ENV === 'production'
    ? [] // Production: must specify allowed origins
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
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
const { errorHandler, notFoundHandler } = require('../../../packages/shared-middleware/src/error.middleware.js');
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

// ==================== GRACEFUL SHUTDOWN ====================

// Graceful shutdown handler
const gracefulShutdown = async signal => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Stop queue cleanup cron job
    const { stopQueueCleanupJob } = require('./jobs/queue-cleanup.job');
    stopQueueCleanupJob();
    console.log('Queue cleanup cron job stopped.');

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

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`
🚀 Member Service is running!
📍 Server: http://${HOST}:${PORT}
🔌 WebSocket: ws://${HOST}:${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Health Check: http://${HOST}:${PORT}/health
📚 API Docs: http://${HOST}:${PORT}/api-docs
⏰ Started at: ${new Date().toISOString()}
  `);
});

// ==================== DATABASE CONNECTION TEST ====================

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection established successfully');

    // Test a simple query
    const memberCount = await prisma.member.count();
    console.log(`📊 Current member count: ${memberCount}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
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
    console.log('🔍 Checking for expired equipment usage sessions...');

    // Create mock req/res objects for internal call
    const mockReq = {};
    const mockRes = {
      json: data => {
        if (data.data && data.data.stopped > 0) {
          console.log(`⏱️ Auto-stopped ${data.data.stopped} expired session(s)`);
        }
      },
      status: () => mockRes,
    };

    await equipmentController.autoStopExpiredSessions(mockReq, mockRes);
  } catch (error) {
    console.error('❌ Error in auto-stop interval:', error);
  }
}, AUTO_STOP_INTERVAL);

console.log(`⏰ Auto-stop service started (interval: ${AUTO_STOP_INTERVAL / 60000} minutes)`);

// ==================== QUEUE CLEANUP CRON JOB ====================

// Start queue cleanup cron job (runs every 2 minutes)
const { startQueueCleanupJob, stopQueueCleanupJob } = require('./jobs/queue-cleanup.job');
startQueueCleanupJob();

module.exports = app;
