const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salary.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

/**
 * Salary Routes
 */

// Trainer routes (authenticated)
router.post('/request', authenticateToken, salaryController.createSalaryRequest);
router.get('/my-statistics', authenticateToken, salaryController.getMySalaryStatistics);
router.get('/statistics/:trainer_id', authenticateToken, salaryController.getTrainerSalaryStatistics);

// Admin routes (authenticated + role check)
router.get('/requests', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), salaryController.getAllSalaryRequests);
router.get('/statistics', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), salaryController.getAllTrainersSalaryStatistics);

module.exports = router;

