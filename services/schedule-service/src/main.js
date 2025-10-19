require('dotenv').config();
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { routes } = require('./routes/index.js');
const { connectDatabase } = require('./lib/prisma.js');
const cronService = require('./services/cron.service.js');
const autoCheckoutService = require('./services/auto-checkout.service.js');
const autoStatusUpdateService = require('./services/auto-status-update.service.js');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Routes
app.use('/', routes);

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

const port = process.env.PORT || 3003;

// Connect to database and start server
async function startServer() {
  await connectDatabase();

  // Start auto-update cron job (every 1 minute)
  cronService.startAutoUpdateCron(1);

  // Start auto check-out service (every 1 minute)
  autoCheckoutService.start();

  server.listen(port, () => {
    console.log(`🚀 Schedule service listening on port ${port}`);
    console.log(`🔌 WebSocket server initialized`);
    console.log(`⏰ Auto-update cron job started (every 1 minute)`);
    console.log(`🕐 Auto check-out service started (every 1 minute)`);
  });
}

startServer().catch(error => {
  console.error('Failed to start schedule service:', error);
  process.exit(1);
});
