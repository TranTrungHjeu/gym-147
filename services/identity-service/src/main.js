require('dotenv').config();
const cors = require('cors');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const morgan = require('morgan');
const { routes } = require('./routes/index.js');
const { connectDatabase } = require('./lib/prisma.js');
const { OTPService } = require('./services/otp.service.js');
const { AuthController } = require('./controllers/auth.controller.js');
const { notificationWorker } = require('./workers/notification.worker.js');

const app = express();

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? (process.env.ALLOWED_ORIGINS?.split(',') || [])
      : '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: false,
  },
  transports: ['websocket', 'polling'],
});

// Make io accessible globally
global.io = io;

// Socket.IO connection handling
io.on('connection', socket => {
  console.log(`[SUCCESS] Identity service: Client connected: ${socket.id}`);

  // Subscribe to user-specific notifications
  socket.on('subscribe:user', user_id => {
    socket.join(`user:${user_id}`);
    console.log(`[USER] Identity service: Client ${socket.id} subscribed to user:${user_id}`);
  });

  // Unsubscribe from user notifications
  socket.on('unsubscribe:user', user_id => {
    socket.leave(`user:${user_id}`);
    console.log(`[USER] Identity service: Client ${socket.id} unsubscribed from user:${user_id}`);
  });

  // Chat events
  socket.on('chat:typing', data => {
    const { receiver_id, is_typing } = data;
    if (receiver_id) {
      socket.to(`user:${receiver_id}`).emit('chat:typing', {
        sender_id: socket.userId,
        is_typing,
      });
    }
  });

  socket.on('chat:read', data => {
    const { message_ids } = data;
    // Handle read receipts
    if (message_ids && message_ids.length > 0) {
      socket.broadcast.emit('chat:messages:read', {
        message_ids,
        read_by: socket.userId,
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[ERROR] Identity service: Client disconnected: ${socket.id}`);
  });
});

// Trust proxy - Required when behind reverse proxy (Nginx gateway)
// This allows Express to correctly handle X-Forwarded-* headers
app.set('trust proxy', true);

// Global service instances for graceful shutdown
let otpService = null;
let authController = null;

async function startServer() {
  try {
    await connectDatabase();
    console.log('Database connected successfully');
    console.log('Loading env from:', process.env.NODE_ENV);
    // Initialize OTP service and start cleanup job
    otpService = new OTPService();
    otpService.startCleanupJob();

    // Initialize Auth controller and start password reset cleanup job
    authController = new AuthController();
    authController.startPasswordResetCleanupJob();

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
          // Allow requests with no origin (mobile apps, Postman, inter-service calls, etc.)
          if (!origin) return callback(null, true);

          // In development, allow all origins for easier debugging and inter-service communication
          if (process.env.NODE_ENV !== 'production') {
            // Log the origin for debugging
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

    app.use(helmet());
    app.use(morgan('dev'));

    // Maintenance mode check (before routes)
    const { checkMaintenanceMode } = require('./middleware/maintenance.middleware.js');
    app.use(checkMaintenanceMode);

    app.use('/', routes);

    // Error handling middleware (must be after routes)
    const {
      errorHandler,
      notFoundHandler,
    } = require('../../../packages/shared-middleware/src/error.middleware.js');
          app.use(notFoundHandler);
          app.use(errorHandler);

          // Start notification worker
          await notificationWorker.start();

          const port = process.env.PORT || 3001;
          const host = process.env.HOST || '0.0.0.0';
          server.listen(port, host, () => {
            console.log(`identity-service listening on port ${port}`);
          });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT. Graceful shutdown...');
  if (otpService) {
    otpService.stopCleanupJob();
  }
  if (authController) {
    authController.stopPasswordResetCleanupJob();
  }
  await notificationWorker.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM. Graceful shutdown...');
  if (otpService) {
    otpService.stopCleanupJob();
  }
  if (authController) {
    authController.stopPasswordResetCleanupJob();
  }
  await notificationWorker.stop();
  process.exit(0);
});
