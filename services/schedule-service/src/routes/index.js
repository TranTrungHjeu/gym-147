const { Router } = require('express');
const trainerRoutes = require('./trainer.routes.js');
const classRoutes = require('./class.routes.js');
const roomRoutes = require('./room.routes.js');
const scheduleRoutes = require('./schedule.routes.js');
const bookingRoutes = require('./booking.routes.js');
const attendanceRoutes = require('./attendance.routes.js');
const certificationRoutes = require('./certification.routes.js');
const notificationRoutes = require('./notification.routes.js');
const utilityRoutes = require('./utility.routes.js');
const autoUpdateRoutes = require('./auto-update.routes.js');
const favoriteRoutes = require('./favorite.routes.js');
const adminRoutes = require('./admin.routes.js');

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
        notifications: '/notifications',
        autoUpdate: '/auto-update',
        stats: '/stats',
        sampleData: '/sample-data',
      },
    },
  });
});

// Mount all route modules
router.use('/trainers', trainerRoutes);
router.use('/classes', classRoutes);
router.use('/rooms', roomRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/bookings', bookingRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/auto-update', autoUpdateRoutes);
router.use('/', certificationRoutes); // Certification routes (includes /certifications, /admin/certifications, etc.)
router.use('/', notificationRoutes); // Notification routes
router.use('/', utilityRoutes); // Health, stats, sample-data
router.use('/', favoriteRoutes); // Favorite routes
router.use('/', adminRoutes); // Admin routes

const routes = router;
module.exports = { routes };
