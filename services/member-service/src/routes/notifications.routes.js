const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');

// ==================== NOTIFICATION ROUTES ====================

// Get member's notifications
router.get('/members/:id/notifications', (req, res) =>
  notificationController.getMemberNotifications(req, res)
);

// Get notification by ID
router.get('/notifications/:id', (req, res) =>
  notificationController.getNotificationById(req, res)
);

// Create notification
router.post('/members/:id/notifications', (req, res) =>
  notificationController.createNotification(req, res)
);

// Mark notification as read
router.put('/notifications/:id/read', (req, res) =>
  notificationController.markNotificationAsRead(req, res)
);

// Mark all notifications as read
router.put('/members/:id/notifications/read-all', (req, res) =>
  notificationController.markAllNotificationsAsRead(req, res)
);

// Delete notification
router.delete('/notifications/:id', (req, res) =>
  notificationController.deleteNotification(req, res)
);

// ==================== SMART NOTIFICATION ROUTES ====================

// Send workout reminder
router.post('/members/:id/notifications/workout-reminder', (req, res) =>
  notificationController.sendWorkoutReminder(req, res)
);

// Send membership alert
router.post('/members/:id/notifications/membership-alert', (req, res) =>
  notificationController.sendMembershipAlert(req, res)
);

// Send achievement notification
router.post('/members/:id/notifications/achievement', (req, res) =>
  notificationController.sendAchievementNotification(req, res)
);

// Send promotional message
router.post('/members/:id/notifications/promotional', (req, res) =>
  notificationController.sendPromotionalMessage(req, res)
);

// ==================== BULK NOTIFICATION ROUTES ====================

// Send bulk notifications
router.post('/notifications/bulk', (req, res) =>
  notificationController.sendBulkNotifications(req, res)
);

// Send notifications to all active members
router.post('/notifications/broadcast', (req, res) =>
  notificationController.sendNotificationToAllActiveMembers(req, res)
);

// ==================== NOTIFICATION TEMPLATE ROUTES ====================

// Get notification templates
router.get('/notifications/templates', (req, res) =>
  notificationController.getNotificationTemplates(req, res)
);

// ==================== NOTIFICATION ANALYTICS ROUTES ====================

// Get notification statistics
router.get('/members/:id/notifications/stats', (req, res) =>
  notificationController.getNotificationStats(req, res)
);

module.exports = router;
