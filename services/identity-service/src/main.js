require('dotenv').config();
const cors = require('cors');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const { routes } = require('./routes/index.js');
const { connectDatabase } = require('./lib/prisma.js');
const { OTPService } = require('./services/otp.service.js');
const { AuthController } = require('./controllers/auth.controller.js');
const { notificationWorker } = require('./workers/notification.worker.js');

const app = express();

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// Log all incoming requests to debug Socket.IO connections
server.on('request', (req, res) => {
  if (req.url && req.url.includes('socket.io')) {
    console.log('[HTTP] Socket.IO request:', req.method, req.url, {
      headers: req.headers,
    });
  }
});

// Initialize Socket.IO with proper CORS and connection handling
const socketCorsConfig =
  process.env.NODE_ENV === 'production'
    ? {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
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
    console.log('[SOCKET.IO] allowRequest called:', {
      url: req.url,
      method: req.method,
      origin: req.headers.origin,
      headers: req.headers,
    });

    // Always allow in development, check origin in production
    if (process.env.NODE_ENV === 'production') {
      const origin = req.headers.origin;
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      if (!origin || allowedOrigins.includes(origin)) {
        console.log('[SOCKET.IO] allowRequest: allowing connection');
        callback(null, true);
      } else {
        console.log('[CORS] Socket.IO connection rejected:', origin);
        callback(new Error('Not allowed by CORS'), false);
      }
    } else {
      console.log('[SOCKET.IO] allowRequest: allowing connection (development)');
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

  headers['Access-Control-Allow-Origin'] = corsOrigin;
  headers['Access-Control-Allow-Credentials'] = 'false';
  headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
  headers['Access-Control-Allow-Headers'] = '*';
});

// Socket.IO authentication middleware (optional - verify token if provided)
// Note: Similar to NotificationContext, we allow connection without token
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const query = socket.handshake.query;
    const headers = socket.handshake.headers;

    console.log(`[AUTH] Socket connection attempt: ${socket.id}`, {
      hasToken: !!token,
      query: query,
      origin: headers.origin,
      userAgent: headers['user-agent'],
      remoteAddress: socket.handshake.address,
    });

    // If no token provided, allow connection (same as NotificationContext)
    if (!token) {
      console.log(`[AUTH] Socket connection without token: ${socket.id} - allowing connection`);
      return next();
    }

    // Verify token if provided
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[AUTH] JWT_SECRET is not set');
      // Allow connection even if JWT_SECRET is missing (for development)
      return next();
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      // Attach user info to socket for later use
      socket.userId = decoded.userId || decoded.id || decoded.sub;
      socket.userRole = decoded.role;
      console.log(
        `[AUTH] Socket authenticated: ${socket.id}, userId: ${socket.userId}, role: ${socket.userRole}`
      );
      next();
    } catch (error) {
      // If token is invalid, still allow connection but log warning
      // This allows the app to work even if token expires
      console.log(`[AUTH] Socket connection with invalid token: ${socket.id}`, error.message);
      next();
    }
  } catch (error) {
    console.error('[AUTH] Socket authentication error:', error);
    // Allow connection even on error (graceful degradation)
    next();
  }
});

// Socket.IO connection handling
io.on('connection', socket => {
  try {
    console.log(
      `[SUCCESS] Identity service: Client connected: ${socket.id}, userId: ${
        socket.userId || 'unknown'
      }, transport: ${socket.conn.transport.name}`
    );

    // Subscribe to user-specific notifications
    socket.on('subscribe:user', user_id => {
      try {
        socket.join(`user:${user_id}`);
        console.log(`[USER] Identity service: Client ${socket.id} subscribed to user:${user_id}`);
      } catch (error) {
        console.error(`[ERROR] Failed to subscribe user ${user_id}:`, error);
      }
    });

    // Unsubscribe from user notifications
    socket.on('unsubscribe:user', user_id => {
      try {
        socket.leave(`user:${user_id}`);
        console.log(
          `[USER] Identity service: Client ${socket.id} unsubscribed from user:${user_id}`
        );
      } catch (error) {
        console.error(`[ERROR] Failed to unsubscribe user ${user_id}:`, error);
      }
    });

    // Subscribe to admin room for support messages
    socket.on('subscribe:admin', () => {
      try {
        socket.join('admin');
        const adminRoom = io.sockets.adapter.rooms.get('admin');
        const adminCount = adminRoom ? adminRoom.size : 0;
        console.log(
          `[ADMIN] Identity service: Client ${socket.id} subscribed to admin room (total: ${adminCount} admins)`
        );
      } catch (error) {
        console.error(`[ERROR] Failed to subscribe admin:`, error);
      }
    });

    // Unsubscribe from admin room
    socket.on('unsubscribe:admin', () => {
      try {
        socket.leave('admin');
        console.log(`[ADMIN] Identity service: Client ${socket.id} unsubscribed from admin room`);
      } catch (error) {
        console.error(`[ERROR] Failed to unsubscribe admin:`, error);
      }
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

    socket.on('disconnect', reason => {
      console.log(
        `[DISCONNECT] Identity service: Client disconnected: ${socket.id}, reason: ${reason}`
      );
    });

    socket.on('error', error => {
      console.error(`[ERROR] Identity service: Socket error for ${socket.id}:`, error);
    });

    // Handle connection errors
    socket.conn.on('error', error => {
      console.error(`[ERROR] Identity service: Connection error for ${socket.id}:`, error);
    });

    // Handle upgrade errors
    socket.conn.on('upgradeError', error => {
      console.error(`[ERROR] Identity service: Upgrade error for ${socket.id}:`, error);
    });
  } catch (error) {
    console.error(`[ERROR] Identity service: Error in connection handler for ${socket.id}:`, error);
    console.error(`[ERROR] Stack trace:`, error.stack);
  }
});

// Handle server-level errors
io.engine.on('connection_error', err => {
  console.error('[ERROR] Socket.IO engine connection error:', err);
  console.error('[ERROR] Error details:', {
    message: err.message,
    description: err.description,
    context: err.context,
    type: err.type,
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

    // Body parsing middleware with increased limit for face registration (base64 images can be large)
    app.use(express.json({ limit: '20mb' }));
    app.use(express.urlencoded({ extended: true, limit: '20mb' }));

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

    // Scheduled reports job removed - not needed

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

// Global error handlers to prevent crashes
process.on('uncaughtException', error => {
  console.error('[FATAL] Uncaught Exception:', error);
  console.error('[FATAL] Stack:', error.stack);

  // Log error details for debugging
  if (error.message && error.message.includes('face')) {
    console.error('[FATAL] Face recognition related error detected');
  }

  // Don't exit immediately - let the process try to recover
  // In production, you might want to exit here, but for now we'll log and continue
  console.error('[FATAL] Process will continue but may be in unstable state');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise);
  console.error('[FATAL] Reason:', reason);

  // Log error details for debugging
  if (reason && reason.message && reason.message.includes('face')) {
    console.error('[FATAL] Face recognition related promise rejection detected');
  }

  // Don't exit - just log the error
  console.error('[FATAL] Unhandled rejection logged, process continues');
});

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

  // Scheduled reports job removed - not needed

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

  // Scheduled reports job removed - not needed

  process.exit(0);
});
