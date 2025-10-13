const { Router } = require('express');
const scheduleController = require('../controllers/schedule.controller.js');

const router = Router();

// ==================== SCHEDULE ROUTES ====================
router.get('/', (req, res) => scheduleController.getAllSchedules(req, res));
router.get('/:id', (req, res) => scheduleController.getScheduleById(req, res));
router.post('/', (req, res) => scheduleController.createSchedule(req, res));
router.put('/:id', (req, res) => scheduleController.updateSchedule(req, res));
router.delete('/:id', (req, res) => scheduleController.deleteSchedule(req, res));

module.exports = router;
