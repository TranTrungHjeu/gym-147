require('dotenv').config();
const cors = require('cors');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const server = http.createServer(app);

// Trust proxy - Required when behind reverse proxy (Nginx gateway)
// This allows Express to correctly handle X-Forwarded-* headers
app.set('trust proxy', true);

// CORS configuration for Socket.IO
let socketIOOrigins = [];
if (process.env.ALLOWED_ORIGINS) {
  socketIOOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
} else if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'ALLOWED_ORIGINS environment variable is required in production. ' +
      'Please set it in your .env file (comma-separated list of allowed origins).'
  );
} else {
  console.warn(
    'WARNING: ALLOWED_ORIGINS not set, using development defaults. Set ALLOWED_ORIGINS in .env for production.'
  );
  socketIOOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081',
  ];
}

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? socketIOOrigins : '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Make io accessible globally
global.io = io;

// Socket.IO connection handling
io.on('connection', socket => {
  console.log(`[SUCCESS] Billing service: Client connected: ${socket.id}`);

  // Subscribe to user-specific notifications
  socket.on('subscribe:user', user_id => {
    socket.join(`user:${user_id}`);
    console.log(`[USER] Billing service: Client ${socket.id} subscribed to user:${user_id}`);
  });

  // Unsubscribe from user notifications
  socket.on('unsubscribe:user', user_id => {
    socket.leave(`user:${user_id}`);
    console.log(`[USER] Billing service: Client ${socket.id} unsubscribed from user:${user_id}`);
  });

  // Subscribe to admin notifications
  socket.on('subscribe:admin', () => {
    socket.join('admin');
    console.log(`[ADMIN] Billing service: Client ${socket.id} subscribed to admin room`);
  });

  // Unsubscribe from admin notifications
  socket.on('unsubscribe:admin', () => {
    socket.leave('admin');
    console.log(`[ADMIN] Billing service: Client ${socket.id} unsubscribed from admin room`);
  });

  socket.on('disconnect', () => {
    console.log(`[ERROR] Billing service: Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(express.json());

// CORS configuration
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
    'WARNING: ALLOWED_ORIGINS not set, using development defaults. Set ALLOWED_ORIGINS in .env for production.'
  );
  allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081',
  ];
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // In development, allow all origins for easier debugging
      if (process.env.NODE_ENV !== 'production') {
        // Log the origin for debugging
        console.log('CORS: Allowing origin in development:', origin);
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

app.use(helmet());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Billing service is healthy',
    data: {
      service: 'billing-service',
      status: 'running',
      timestamp: new Date().toISOString(),
    },
  });
});

// Import routes
const { billingRoutes } = require('./routes/billing.routes.js');
const bankTransferRoutes = require('./routes/bankTransfer.routes.js');
console.log('[SUCCESS] Routes imported successfully');

// Use routes (mounted at root - gateway will forward /billing/* here)
app.use('/', billingRoutes);
app.use('/bank-transfers', bankTransferRoutes);
console.log('[SUCCESS] Routes registered successfully');

// Error handling middleware (must be after routes)
const {
  errorHandler,
  notFoundHandler,
} = require('../../../packages/shared-middleware/src/error.middleware.js');
app.use(notFoundHandler);
app.use(errorHandler);

// Scheduled jobs
const cron = require('node-cron');

// Start cache warming job (runs every hour)
const cacheWarmingJob = require('./jobs/cache-warming.job');
cacheWarmingJob.startScheduled();

// Start subscription expiration job (runs daily at 1 AM)
const subscriptionExpirationJob = require('./jobs/subscription-expiration.job');
subscriptionExpirationJob.startExpirationJob();

const revenueReportService = require('./services/revenue-report.service.js');

// Generate revenue report daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('[REFRESH] Generating daily revenue report...');
  try {
    const result = await revenueReportService.generateYesterdayReport();
    if (result.success) {
      console.log(
        `[SUCCESS] Revenue report generated successfully (${result.isNew ? 'new' : 'updated'})`
      );
    } else {
      console.error('[ERROR] Failed to generate revenue report:', result.error);
    }
  } catch (error) {
    console.error('[ERROR] Error generating revenue report:', error);
  }
});

console.log('[SUCCESS] Scheduled jobs initialized');

const port = process.env.PORT || 3004;
const host = process.env.HOST || '0.0.0.0';
server.listen(port, host, () => {
  console.log(`billing-service listening on port ${port}`);
  console.log(`WebSocket server initialized`);
});
