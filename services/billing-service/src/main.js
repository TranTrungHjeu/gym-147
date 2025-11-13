require('dotenv').config();
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Trust proxy - Required when behind reverse proxy (Nginx gateway)
// This allows Express to correctly handle X-Forwarded-* headers
app.set('trust proxy', true);

// Middleware
app.use(express.json());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
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
try {
  const { billingRoutes } = require('./routes/billing.routes.js');
  const bankTransferRoutes = require('./routes/bankTransfer.routes.js');
  console.log('✅ Routes imported successfully');

  // Use routes
  app.use('/', billingRoutes);
  app.use('/bank-transfers', bankTransferRoutes);
  console.log('✅ Routes registered successfully');
} catch (error) {
  console.error('❌ Error importing routes:', error.message);
}

// Error handling middleware (must be after routes)
const { errorHandler, notFoundHandler } = require('../../../packages/shared-middleware/src/error.middleware.js');
app.use(notFoundHandler);
app.use(errorHandler);

// Scheduled jobs
const cron = require('node-cron');
const revenueReportService = require('./services/revenue-report.service.js');

// Generate revenue report daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('🔄 Generating daily revenue report...');
  try {
    const result = await revenueReportService.generateYesterdayReport();
    if (result.success) {
      console.log(`✅ Revenue report generated successfully (${result.isNew ? 'new' : 'updated'})`);
    } else {
      console.error('❌ Failed to generate revenue report:', result.error);
    }
  } catch (error) {
    console.error('❌ Error generating revenue report:', error);
  }
});

console.log('✅ Scheduled jobs initialized');

const port = process.env.PORT || 3004;
const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => {
  console.log(`billing-service listening on port ${port}`);
});
