require('dotenv').config();
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const { routes } = require('./routes/index.js');
const { connectDatabase } = require('./lib/prisma.js');
const cronService = require('./services/cron.service.js');
const autoCheckoutService = require('./services/auto-checkout.service.js');
const autoStatusUpdateService = require('./services/auto-status-update.service.js');

const app = express();
const server = http.createServer(app);

// CORS configuration for Socket.IO and Express
// In production, ALLOWED_ORIGINS must be set
// In development, use safe defaults with warning
let socketIOOrigins = [];
if (process.env.ALLOWED_ORIGINS) {
  socketIOOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
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
  socketIOOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081',
  ];
}

// Initialize Socket.IO with CORS from environment
const io = new Server(server, {
  cors: {
    origin: socketIOOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['polling', 'websocket'], // Try polling first
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Make io accessible globally for notifications
global.io = io;

// Socket.IO connection handling
io.on('connection', socket => {
  console.log(`Socket connected: ${socket.id}`);

  // Subscribe to user-specific notifications (for trainers, admins, etc.)
  socket.on('subscribe:user', user_id => {
    const roomName = `user:${user_id}`;
    socket.join(roomName);
    const room = io.sockets.adapter.rooms.get(roomName);
    const socketCount = room ? room.size : 0;
    console.log(
      `[EMIT] Socket ${socket.id} subscribed to ${roomName} (total: ${socketCount} socket(s) in room)`
    );
  });

  // Unsubscribe from user notifications
  socket.on('unsubscribe:user', user_id => {
    socket.leave(`user:${user_id}`);
    console.log(`Socket ${socket.id} unsubscribed from user:${user_id}`);
  });

  // Subscribe to schedule updates
  socket.on('subscribe:schedule', schedule_id => {
    socket.join(`schedule:${schedule_id}`);
    console.log(`Socket ${socket.id} subscribed to schedule:${schedule_id}`);
  });

  // Unsubscribe from schedule updates
  socket.on('unsubscribe:schedule', schedule_id => {
    socket.leave(`schedule:${schedule_id}`);
    console.log(`Socket ${socket.id} unsubscribed from schedule:${schedule_id}`);
  });

  socket.on('disconnect', reason => {
    console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
  });

  socket.on('error', error => {
    console.error(`Socket error: ${socket.id}`, error);
  });
});

// Trust proxy - Required when behind reverse proxy (Nginx gateway)
// This allows Express to correctly handle X-Forwarded-* headers
app.set('trust proxy', true);

// Middleware
app.use(express.json({ limit: '15mb' })); // Increased limit for avatar uploads (base64 can be large)
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// CORS configuration for Express (reuse from Socket.IO setup above)
const allowedOrigins = socketIOOrigins;

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

// Configure helmet to allow WebSocket connections
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for WebSocket
    crossOriginEmbedderPolicy: false,
  })
);
app.use(morgan('dev'));

// Routes
app.use('/', routes);

// Error handling middleware (must be after routes)
const {
  errorHandler,
  notFoundHandler,
} = require('../../../packages/shared-middleware/src/error.middleware.js');
app.use(notFoundHandler);
app.use(errorHandler);

const port = process.env.PORT || 3003;

// Connect to database and start server
async function startServer() {
  await connectDatabase();

  // Start auto-update cron job (every 1 minute)
  cronService.startAutoUpdateCron(1);

  // Start auto check-out service (every 1 minute)
  autoCheckoutService.start();

  // IMPROVEMENT: Start booking reminder cron job (every 1 minute)
  cronService.startBookingReminderCron();

  // IMPROVEMENT: Start auto-cancel warning cron job (every 1 hour)
  cronService.startAutoCancelWarningCron();

  // Start auto-cancel low participants cron job
  // TC-AUTO-CANCEL-013: Optimized to run 3 times per day (9:00 AM, 2:00 PM, 6:00 PM)
  // Can be configured via environment variables
  const autoCancelScheduleTimes = process.env.AUTO_CANCEL_SCHEDULE_TIMES
    ? process.env.AUTO_CANCEL_SCHEDULE_TIMES.split(',').map(t => t.trim())
    : ['09:00', '14:00', '18:00']; // Default: 9:00 AM, 2:00 PM, 6:00 PM
  const useAutoCancelInterval = process.env.AUTO_CANCEL_USE_INTERVAL === 'true';
  const autoCancelIntervalMinutes = parseInt(process.env.AUTO_CANCEL_INTERVAL_MINUTES || '60');
  
  cronService.startAutoCancelLowParticipantsCron(
    autoCancelScheduleTimes,
    useAutoCancelInterval,
    autoCancelIntervalMinutes
  );

  const host = process.env.HOST || '0.0.0.0';
  server.listen(port, host, () => {
    console.log(`Schedule service listening on port ${port}`);
    console.log(`WebSocket server initialized`);
    console.log(`Auto-update cron job started (every 1 minute)`);
    console.log(`Auto check-out service started (every 1 minute)`);
    console.log(`Booking reminder cron job started (every 1 minute)`);
    console.log(`Auto-cancel warning cron job started (every 1 hour)`);
    if (useAutoCancelInterval) {
      console.log(`Auto-cancel low participants cron job started (TEST MODE: every ${autoCancelIntervalMinutes} minutes)`);
    } else {
      console.log(`Auto-cancel low participants cron job started (PRODUCTION MODE: daily at ${autoCancelScheduleTimes.join(', ')} GMT+7)`);
    }

    // Start certification expiry warning cron job
    // Can be configured via environment variables
    const expiryWarningHour = parseInt(process.env.CERTIFICATION_EXPIRY_WARNING_HOUR || '9');
    const expiryWarningMinutes = parseInt(process.env.CERTIFICATION_EXPIRY_WARNING_MINUTES || '0');
    const expiryWarningDays = parseInt(process.env.CERTIFICATION_EXPIRY_WARNING_DAYS || '30');
    // Production mode: Run daily at specified time (default: 9:00 AM)
    // Test mode: Set CERTIFICATION_EXPIRY_WARNING_INTERVAL_SECONDS env var to run at interval (e.g., 5 for every 5 seconds)
    const expiryWarningIntervalSeconds = process.env.CERTIFICATION_EXPIRY_WARNING_INTERVAL_SECONDS
      ? parseInt(process.env.CERTIFICATION_EXPIRY_WARNING_INTERVAL_SECONDS)
      : null; // Production mode: null = daily schedule at specified hour

    // If interval is set, use test mode (run at interval), otherwise use daily schedule
    cronService.startCertificationExpiryWarningCron(
      expiryWarningHour,
      expiryWarningMinutes,
      expiryWarningDays,
      expiryWarningIntervalSeconds
    );

    // Start cache warming job (runs every hour)
    const cacheWarmingJob = require('./jobs/cache-warming.job');
    cacheWarmingJob.startScheduled();
  });
}

startServer().catch(error => {
  console.error('Failed to start schedule service:', error);
  process.exit(1);
});
