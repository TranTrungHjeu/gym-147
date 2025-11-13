require('dotenv').config();
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const { routes } = require('./routes/index.js');
const { connectDatabase } = require('./lib/prisma.js');
const { OTPService } = require('./services/otp.service.js');
const { AuthController } = require('./controllers/auth.controller.js');

const app = express();

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
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : process.env.NODE_ENV === 'production'
      ? []
      : [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:8080',
          'http://localhost:8081',
        ];

    app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (mobile apps, Postman, etc.)
          if (!origin) return callback(null, true);
          
          // Check if origin is in allowed list
          if (allowedOrigins.includes(origin)) {
            // Return the specific origin (not true) to avoid duplication
            callback(null, origin);
          } else {
            // In development, log the origin for debugging
            if (process.env.NODE_ENV !== 'production') {
              console.log('CORS: Origin not allowed:', origin);
              console.log('CORS: Allowed origins:', allowedOrigins);
            }
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
    app.use('/', routes);

    // Error handling middleware (must be after routes)
    const {
      errorHandler,
      notFoundHandler,
    } = require('../../../packages/shared-middleware/src/error.middleware.js');
    app.use(notFoundHandler);
    app.use(errorHandler);

    const port = process.env.PORT || 3001;
    const host = process.env.HOST || '0.0.0.0';
    app.listen(port, host, () => {
      console.log(`identity-service listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Graceful shutdown...');
  if (otpService) {
    otpService.stopCleanupJob();
  }
  if (authController) {
    authController.stopPasswordResetCleanupJob();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Graceful shutdown...');
  if (otpService) {
    otpService.stopCleanupJob();
  }
  if (authController) {
    authController.stopPasswordResetCleanupJob();
  }
  process.exit(0);
});
