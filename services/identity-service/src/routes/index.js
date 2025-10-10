const { Router } = require('express');
const { authRoutes } = require('./auth.routes.js');

const router = Router();

// Root endpoint
router.get('/', (req, res) => {
  res.json({
    service: 'identity-service',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'GET /health - Health check',
      'POST /auth/login - User login',
      'POST /auth/register - User registration',
      'GET /auth/profile - Get user profile (requires auth)',
      'POST /auth/logout - User logout (requires auth)',
    ],
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    service: 'identity-service',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Auth routes
router.use('/auth', authRoutes);

module.exports = { routes: router };
