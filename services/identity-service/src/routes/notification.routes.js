const express = require('express');
const { NotificationController } = require('../controllers/notification.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');

const router = express.Router();
const notificationController = new NotificationController();

// Notification system routes
router.put('/preferences', authMiddleware, (req, res) =>
  notificationController.setNotificationPreferences(req, res)
);
router.get('/', authMiddleware, (req, res) => notificationController.getNotifications(req, res));
router.put('/:notificationId/read', authMiddleware, (req, res) =>
  notificationController.markNotificationRead(req, res)
);
router.put('/read-all', authMiddleware, (req, res) =>
  notificationController.markAllNotificationsRead(req, res)
);

module.exports = { notificationRoutes: router };
