const { Router } = require('express');
const scheduleRoutes = require('./schedule.routes.js');

const router = Router();

// Root route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Schedule Service API',
    data: {
      service: 'schedule-service',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        classes: '/api/classes',
        schedules: '/api/schedules',
        instructors: '/api/instructors',
        rooms: '/api/rooms',
        stats: '/api/stats',
        sampleData: '/api/sample-data',
      },
    },
  });
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Schedule service is healthy',
    data: {
      service: 'schedule-service',
      status: 'running',
      timestamp: new Date().toISOString(),
    },
  });
});

// Schedule routes - mounted directly without /api prefix
router.use('/', scheduleRoutes);

const routes = router;
module.exports = { routes };
