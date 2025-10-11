const express = require('express');
const { AnalyticsController } = require('../controllers/analytics.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { requireAdmin } = require('../middleware/role.middleware.js');

const router = express.Router();
const analyticsController = new AnalyticsController();

// Analytics routes
router.get('/access-stats', authMiddleware, (req, res) =>
  analyticsController.getAccessStats(req, res)
);
router.get('/login-history', authMiddleware, (req, res) =>
  analyticsController.getLoginHistory(req, res)
);
router.get('/failed-attempts', authMiddleware, (req, res) =>
  analyticsController.getFailedAttempts(req, res)
);
router.get('/device-activity', authMiddleware, (req, res) =>
  analyticsController.getDeviceActivity(req, res)
);

// Audit logging routes
router.get('/audit-logs', authMiddleware, (req, res) => analyticsController.getAuditLogs(req, res));
router.get('/user-actions', authMiddleware, (req, res) =>
  analyticsController.getUserActions(req, res)
);

// Admin-only routes
router.get('/admin-actions', authMiddleware, requireAdmin, (req, res) =>
  analyticsController.getAdminActions(req, res)
);

module.exports = { analyticsRoutes: router };
