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

// Global service instances for graceful shutdown
let otpService = null;
let authController = null;

async function startServer() {
  try {
    await connectDatabase();
    console.log('Database connected successfully');

    // Initialize OTP service and start cleanup job
    otpService = new OTPService();
    otpService.startCleanupJob();

    // Initialize Auth controller and start password reset cleanup job
    authController = new AuthController();
    authController.startPasswordResetCleanupJob();

    app.use(express.json());
    app.use(cors());
    app.use(helmet());
    app.use(morgan('dev'));
    app.use('/', routes);

    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    });

    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        data: null,
      });
    });

    const port = process.env.PORT || 3001;
    app.listen(port, () => {
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
