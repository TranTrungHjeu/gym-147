const { Router } = require('express');
const { memberRoutes } = require('./member.routes.js');

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    service: 'member-service', 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Member routes
router.use('/members', memberRoutes);

module.exports = { routes: router };