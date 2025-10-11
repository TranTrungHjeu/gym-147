const express = require('express');
const { DashboardController } = require('../controllers/dashboard.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { requireRole } = require('../middleware/role.middleware.js');

const router = express.Router();
const dashboardController = new DashboardController();

// Apply authentication to all dashboard routes
router.use(authMiddleware);

/**
 * @route GET /dashboard/super-admin-stats
 * @desc Get Super Admin dashboard statistics
 * @access Super Admin only
 */
router.get(
  '/super-admin-stats',
  requireRole(['SUPER_ADMIN']),
  dashboardController.getSuperAdminStats
);

/**
 * @route GET /dashboard/admin-stats
 * @desc Get Admin dashboard statistics
 * @access Admin and Super Admin
 */
router.get(
  '/admin-stats',
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  dashboardController.getAdminStats
);

/**
 * @route GET /dashboard/user-stats
 * @desc Get user statistics by role
 * @access Admin and Super Admin
 */
router.get('/user-stats', requireRole(['ADMIN', 'SUPER_ADMIN']), dashboardController.getUserStats);

/**
 * @route GET /dashboard/recent-activities
 * @desc Get recent system activities
 * @access Admin and Super Admin
 */
router.get(
  '/recent-activities',
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  dashboardController.getRecentActivities
);

module.exports = router;
