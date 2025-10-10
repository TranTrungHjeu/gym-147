const { Router } = require('express');
const { memberRoutes } = require('./members.routes.js');

const router = Router();

// Root endpoint - Service info
router.get('/', (req, res) => {
  res.json({
    service: 'member-service',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'GET /health - Health check',
      'GET /api/members - Get all members with pagination',
      'GET /api/members/stats - Get member statistics',
      'GET /api/members/:id - Get member by ID',
      'POST /api/members - Create new member',
      'PUT /api/members/:id - Update member',
      'DELETE /api/members/:id - Deactivate member',
      'GET /api/members/:id/memberships - Get member memberships',
      'POST /api/members/:id/memberships - Create membership for member',
      'GET /api/members/:id/access-logs - Get member access logs',
      'POST /api/members/:id/checkin - Member check-in',
      'POST /api/members/:id/checkout - Member check-out',
    ],
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    service: 'member-service',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Member API routes - direct access
router.use('/', memberRoutes);

// Keep API prefix for backward compatibility
router.use('/api', memberRoutes);

module.exports = { routes: router };
