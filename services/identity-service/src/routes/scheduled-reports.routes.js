const { Router } = require('express');
const scheduledReportsController = require('../controllers/scheduled-reports.controller.js');

const router = Router();

// ==================== SCHEDULED REPORTS ROUTES ====================
router.get('/', scheduledReportsController.getScheduledReports);
router.get('/:id', scheduledReportsController.getScheduledReport);
router.post('/', scheduledReportsController.createScheduledReport);
router.put('/:id', scheduledReportsController.updateScheduledReport);
router.delete('/:id', scheduledReportsController.deleteScheduledReport);
router.post('/:id/run', scheduledReportsController.runScheduledReport);

module.exports = { scheduledReportsRoutes: router };

