const express = require('express');
const { NotificationController } = require('../controllers/notification.controller.js');
const { BulkNotificationController } = require('../controllers/bulk-notification.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { requireStaff, requireAdmin } = require('../middleware/role.middleware.js');

const router = express.Router();
const notificationController = new NotificationController();
const bulkNotificationController = new BulkNotificationController();

// Notification system routes
router.put('/preferences', authMiddleware, (req, res) =>
  notificationController.setNotificationPreferences(req, res)
);

// Create notification (for service-to-service calls - no auth required)
// Other services can call this to create notifications
router.post('/', (req, res) => notificationController.createNotification(req, res));

// Get notifications (requires auth)
router.get('/', authMiddleware, (req, res) => notificationController.getNotifications(req, res));

// Get unread count (can be called with or without auth)
router.get('/unread-count/:userId', (req, res) =>
  notificationController.getUnreadCount(req, res)
);

// Mark notification as read (requires auth)
router.put('/:notificationId/read', authMiddleware, (req, res) =>
  notificationController.markNotificationRead(req, res)
);

// Mark all notifications as read (requires auth)
router.put('/read-all', authMiddleware, (req, res) =>
  notificationController.markAllNotificationsRead(req, res)
);

// Delete notification (requires auth)
router.delete('/:notificationId', authMiddleware, (req, res) =>
  notificationController.deleteNotification(req, res)
);

// Bulk operations (requires auth)
router.delete('/bulk', authMiddleware, (req, res) =>
  notificationController.bulkDeleteNotifications(req, res)
);
router.put('/bulk/read', authMiddleware, (req, res) =>
  notificationController.bulkMarkNotificationsRead(req, res)
);

// Metrics (requires auth)
router.get('/metrics', authMiddleware, (req, res) =>
  notificationController.getNotificationMetrics(req, res)
);

// Bulk notification operations (requires staff: ADMIN, SUPER_ADMIN, TRAINER)
router.post(
  '/bulk/members',
  authMiddleware,
  requireStaff,
  (req, res) => bulkNotificationController.sendBulkNotificationToMembers(req, res)
);

router.post(
  '/bulk/trainers',
  authMiddleware,
  requireStaff,
  (req, res) => bulkNotificationController.sendBulkNotificationToTrainers(req, res)
);

// Notification history (requires admin: ADMIN, SUPER_ADMIN)
router.get(
  '/history',
  authMiddleware,
  requireAdmin,
  (req, res) => bulkNotificationController.getNotificationHistory(req, res)
);

module.exports = { notificationRoutes: router };
