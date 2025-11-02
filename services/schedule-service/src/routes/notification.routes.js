const { Router } = require('express');
const notificationController = require('../controllers/notification.controller.js');

const router = Router();

// Get unread notifications for a user
router.get('/notifications/unread/:user_id', (req, res) =>
  notificationController.getUnreadNotifications(req, res)
);

// Get unread count for a user
router.get('/notifications/unread-count/:user_id', (req, res) =>
  notificationController.getUnreadCount(req, res)
);

// Mark a notification as read
router.put('/notifications/:notification_id/read', (req, res) =>
  notificationController.markNotificationAsRead(req, res)
);

// Mark all notifications as read for a user
router.put('/notifications/read-all/:user_id', (req, res) =>
  notificationController.markAllNotificationsAsRead(req, res)
);

// Get all notifications for a user (with pagination)
router.get('/notifications/:user_id', (req, res) =>
  notificationController.getAllNotifications(req, res)
);

// Delete a notification
router.delete('/notifications/:notification_id', (req, res) =>
  notificationController.deleteNotification(req, res)
);

module.exports = router;
