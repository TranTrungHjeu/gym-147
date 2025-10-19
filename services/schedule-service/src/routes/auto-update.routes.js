const { Router } = require('express');
const autoUpdateController = require('../controllers/auto-update.controller.js');

const router = Router();

// ==================== AUTO-UPDATE ROUTES ====================
router.post('/trigger', (req, res) => autoUpdateController.triggerAutoUpdate(req, res));
router.get('/stats', (req, res) => autoUpdateController.getStatusStats(req, res));
router.get('/pending', (req, res) => autoUpdateController.getSchedulesNeedingUpdate(req, res));
router.put('/schedule/:id/status', (req, res) => autoUpdateController.updateScheduleStatus(req, res));

module.exports = router;

