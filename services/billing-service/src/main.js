require('dotenv').config();
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    data: null,
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    data: null,
  });
});

const port = process.env.PORT || 3004;
app.listen(port, () => {
  console.log(`billing-service listening on port ${port}`);
});
