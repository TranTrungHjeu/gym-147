const express = require('express');
const { SystemController } = require('../controllers/system.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { requireAdmin, requireSuperAdmin } = require('../middleware/role.middleware.js');

const router = express.Router();
const systemController = new SystemController();

// System management routes (public for health check)
router.get('/health-check', (req, res) => systemController.healthCheck(req, res));
router.get('/health', (req, res) => systemController.healthCheck(req, res)); // Alias
router.get('/health/detailed', (req, res) => systemController.healthCheck(req, res)); // Detailed health check

// Admin-only routes
router.get('/stats', authMiddleware, requireAdmin, (req, res) =>
  systemController.getSystemStats(req, res)
);

// Super Admin-only routes
router.get('/maintenance-mode', authMiddleware, requireAdmin, (req, res) =>
  systemController.getMaintenanceMode(req, res)
);
router.post('/maintenance-mode', authMiddleware, requireSuperAdmin, (req, res) =>
  systemController.enableMaintenanceMode(req, res)
);
router.delete('/maintenance-mode', authMiddleware, requireSuperAdmin, (req, res) =>
  systemController.disableMaintenanceMode(req, res)
);

module.exports = { systemRoutes: router };
