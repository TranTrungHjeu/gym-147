const { Router } = require('express');
const utilityController = require('../controllers/utility.controller.js');

const router = Router();

// ==================== UTILITY ROUTES ====================
router.get('/health', (req, res) => utilityController.checkHealth(req, res));
router.get('/stats', (req, res) => utilityController.getStats(req, res));
router.post('/sample-data', (req, res) => utilityController.createSampleData(req, res));

module.exports = router;
