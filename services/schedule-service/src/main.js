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

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'],
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
    socket.join(`user:${user_id}`);
    console.log(`Socket ${socket.id} subscribed to user:${user_id}`);
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

// Middleware
app.use(express.json());
app.use(cors());

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
    console.log(`Schedule service listening on port ${port}`);
    console.log(`WebSocket server initialized`);
    console.log(`Auto-update cron job started (every 1 minute)`);
    console.log(`Auto check-out service started (every 1 minute)`);
  });
}

startServer().catch(error => {
  console.error('Failed to start schedule service:', error);
  process.exit(1);
});
