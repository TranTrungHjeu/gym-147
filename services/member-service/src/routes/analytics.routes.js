const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

// ==================== ANALYTICS ROUTES ====================

// Get member analytics
router.get('/analytics/members', (req, res) => analyticsController.getMemberAnalytics(req, res));

// Get equipment analytics
router.get('/analytics/equipment', (req, res) =>
  analyticsController.getEquipmentAnalytics(req, res)
);

// Get session analytics
router.get('/analytics/sessions', (req, res) => analyticsController.getSessionAnalytics(req, res));

// Get health analytics
router.get('/analytics/health', (req, res) => analyticsController.getHealthAnalytics(req, res));

// Get achievement analytics
router.get('/analytics/achievements', (req, res) =>
  analyticsController.getAchievementAnalytics(req, res)
);

// ==================== DASHBOARD ROUTES ====================

// Get comprehensive dashboard data (admin view)
router.get('/analytics/dashboard', (req, res) => analyticsController.getDashboardData(req, res));

// Get member-specific dashboard data
router.get('/analytics/member-dashboard', (req, res) =>
  analyticsController.getMemberDashboardData(req, res)
);

// ==================== REPORT ROUTES ====================

// Generate membership report
router.get('/reports/membership', (req, res) =>
  analyticsController.generateMembershipReport(req, res)
);

// Generate usage report
router.get('/reports/usage', (req, res) => analyticsController.generateUsageReport(req, res));

// Generate health report
router.get('/reports/health', (req, res) => analyticsController.generateHealthReport(req, res));

module.exports = router;
