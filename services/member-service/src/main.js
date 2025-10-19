const express = require('express');
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

// ==================== MIDDLEWARE SETUP ====================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

const server = app.listen(PORT, HOST, () => {
  console.log(`
🚀 Member Service is running!
📍 Server: http://${HOST}:${PORT}
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

module.exports = app;
