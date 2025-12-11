const { Router } = require('express');
const trainerRoutes = require('./trainer.routes.js');
const classRoutes = require('./class.routes.js');
const roomRoutes = require('./room.routes.js');
const scheduleRoutes = require('./schedule.routes.js');
const bookingRoutes = require('./booking.routes.js');
const attendanceRoutes = require('./attendance.routes.js');
const certificationRoutes = require('./certification.routes.js');
const notificationRoutes = require('./notification.routes.js'); // Proxy to identity-service
const utilityRoutes = require('./utility.routes.js');
const autoUpdateRoutes = require('./auto-update.routes.js');
const favoriteRoutes = require('./favorite.routes.js');
const adminRoutes = require('./admin.routes.js');
const salaryRoutes = require('./salary.routes.js');

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
        trainers: '/trainers',
        classes: '/classes',
        rooms: '/rooms',
        schedules: '/schedules',
        bookings: '/bookings',
        attendance: '/attendance',
        certifications: '/certifications',
        notifications: '/notifications', // Proxy to identity-service
        autoUpdate: '/auto-update',
        stats: '/stats',
        sampleData: '/sample-data',
      },
    },
  });
});

// Mount all route modules
// IMPORTANT: Mount trainer routes FIRST so that specific routes like /:trainerId/certifications are matched before generic routes
// Trainer routes now include certification routes (/:trainerId/certifications) which are defined before /:id route
router.use('/trainers', trainerRoutes);
// Keep certification routes for other endpoints like /certifications, /admin/certifications, /scan-certificate, etc.
router.use('/', certificationRoutes);
router.use('/classes', classRoutes);
router.use('/rooms', roomRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/bookings', bookingRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/auto-update', autoUpdateRoutes);
router.use('/notifications', notificationRoutes); // Proxy to identity-service
router.use('/salary', salaryRoutes); // Salary management routes
router.use('/', utilityRoutes); // Health, stats, sample-data
router.use('/', favoriteRoutes); // Favorite routes
router.use('/', adminRoutes); // Admin routes

const routes = router;
module.exports = { routes };
