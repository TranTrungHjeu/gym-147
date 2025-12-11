const express = require('express');
const router = express.Router();

// Import all route modules
const membersRoutes = require('./members.routes');
const sessionsRoutes = require('./sessions.routes');
const equipmentRoutes = require('./equipments.routes');
const healthRoutes = require('./health.routes');
const workoutsRoutes = require('./workouts.routes');
const achievementsRoutes = require('./achievements.routes');
// const notificationsRoutes = require('./notifications.routes'); // Removed - notifications now in identity service
const analyticsRoutes = require('./analytics.routes');
const queueRoutes = require('./queue.routes');
const streaksRoutes = require('./streaks.routes');
const challengesRoutes = require('./challenges.routes');
const pointsRoutes = require('./points.routes');
const rewardsRoutes = require('./rewards.routes');
const aiRoutes = require('./ai.routes');
// Guest passes routes removed - not needed

// ==================== HEALTH CHECK ROUTE ====================

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Member Service is running',
    timestamp: new Date().toISOString(),
    service: 'member-service',
    version: '1.0.0',
  });
});

// ==================== API DOCUMENTATION ROUTE ====================

// API documentation endpoint
router.get('/api-docs', (req, res) => {
  res.json({
    success: true,
    message: 'Member Service API Documentation',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      members: {
        base: '/members',
        endpoints: [
          'GET /members - Get all members with pagination',
          'GET /members/:id - Get member by ID',
          'GET /members/user/:user_id - Get member by user_id',
          'POST /members - Create new member',
          'PUT /members/:id - Update member',
          'PUT /members/user/:user_id - Update member by user_id',
          'DELETE /members/:id - Delete member',
          'GET /members/:id/memberships - Get member memberships',
          'POST /members/:id/memberships - Create membership',
          'POST /members/:id/rfid - Generate RFID tag',
          'POST /members/:id/qr-code - Generate QR code',
          'PUT /members/:id/access - Toggle access',
        ],
      },
      sessions: {
        base: '/sessions',
        endpoints: [
          'GET /members/:id/sessions - Get member sessions',
          'GET /members/:id/sessions/current - Get current session',
          'POST /members/:id/sessions/entry - Record entry',
          'POST /members/:id/sessions/exit - Record exit',
          'GET /members/:id/sessions/stats - Get session stats',
          'GET /sessions/active - Get all active sessions',
          'GET /sessions/analytics - Get session analytics',
        ],
      },
      equipment: {
        base: '/equipment',
        endpoints: [
          'GET /equipment - Get all equipment',
          'GET /equipment/:id - Get equipment by ID',
          'POST /equipment - Create equipment',
          'PUT /equipment/:id - Update equipment',
          'GET /members/:id/equipment-usage - Get member usage',
          'POST /members/:id/equipment/start - Start usage',
          'POST /members/:id/equipment/stop - Stop usage',
          'GET /members/:id/equipment-usage/stats - Get usage stats',
          'GET /equipment/:id/maintenance - Get maintenance logs',
          'POST /equipment/:id/maintenance - Create maintenance log',
        ],
      },
      health: {
        base: '/health-metrics',
        endpoints: [
          'GET /members/:id/health-metrics - Get health metrics',
          'POST /members/:id/health-metrics - Record metric',
          'POST /members/:id/health-metrics/bulk - Bulk record',
          'GET /members/:id/health-trends - Get health trends',
          'GET /members/:id/health-summary - Get health summary',
        ],
      },
      workouts: {
        base: '/workout-plans',
        endpoints: [
          'GET /members/:id/workout-plans - Get member plans',
          'GET /workout-plans/:id - Get plan by ID',
          'POST /members/:id/workout-plans - Create plan',
          'PUT /workout-plans/:id - Update plan',
          'PUT /workout-plans/:id/activate - Activate plan',
          'DELETE /workout-plans/:id - Delete plan',
          'POST /members/:id/workout-plans/ai - Generate AI plan',
          'GET /members/:id/workout-recommendations - Get recommendations',
        ],
      },
      achievements: {
        base: '/achievements',
        endpoints: [
          'GET /members/:id/achievements - Get member achievements',
          'GET /achievements/:id - Get achievement by ID',
          'POST /members/:id/achievements - Create achievement',
          'PUT /achievements/:id/unlock - Unlock achievement',
          'DELETE /achievements/:id - Delete achievement',
          'POST /members/:id/achievements/check - Check achievements',
          'GET /achievements/leaderboard - Get leaderboard',
          'GET /members/:id/achievements/summary - Get summary',
        ],
      },
      analytics: {
        base: '/analytics',
        endpoints: [
          'GET /analytics/members - Get member analytics',
          'GET /analytics/equipment - Get equipment analytics',
          'GET /analytics/sessions - Get session analytics',
          'GET /analytics/health - Get health analytics',
          'GET /analytics/achievements - Get achievement analytics',
          'GET /analytics/dashboard - Get dashboard data',
          'GET /reports/membership - Generate membership report',
          'GET /reports/usage - Generate usage report',
          'GET /reports/health - Generate health report',
        ],
      },
      queue: {
        base: '/queue',
        endpoints: [
          'POST /queue/join - Join equipment queue',
          'POST /queue/leave - Leave equipment queue',
          'GET /queue/position/:equipment_id - Get my queue position',
          'GET /queue/equipment/:equipment_id - Get all people in queue',
        ],
      },
    },
  });
});
router.use('/', pointsRoutes);
router.use('/', rewardsRoutes);
// Guest passes route removed - not needed
router.use('/', streaksRoutes);
router.use('/', challengesRoutes);
router.use('/', sessionsRoutes);
router.use('/', equipmentRoutes);
router.use('/', healthRoutes);
router.use('/', workoutsRoutes);
router.use('/', achievementsRoutes);
router.use('/', analyticsRoutes);
router.use('/queue', queueRoutes);
router.use('/ai', aiRoutes);
router.use('/', membersRoutes);
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
