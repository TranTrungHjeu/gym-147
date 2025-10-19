const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

// ==================== HEALTH METRICS ROUTES ====================

// Get member's health metrics
router.get('/members/:id/health-metrics', (req, res) =>
  healthController.getMemberHealthMetrics(req, res)
);

// Record health metric
router.post('/members/:id/health-metrics', (req, res) =>
  healthController.recordHealthMetric(req, res)
);

// Bulk record health metrics
router.post('/members/:id/health-metrics/bulk', (req, res) =>
  healthController.bulkRecordHealthMetrics(req, res)
);

// Get health trends
router.get('/members/:id/health-trends', (req, res) => healthController.getHealthTrends(req, res));

// Get health summary
router.get('/members/:id/health-summary', (req, res) =>
  healthController.getHealthSummary(req, res)
);

module.exports = router;
