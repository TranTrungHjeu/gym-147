const { Router } = require('express');
const { authRoutes } = require('./auth.routes.js');

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    service: 'identity-service', 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
router.use('/auth', authRoutes);

module.exports = { routes: router };