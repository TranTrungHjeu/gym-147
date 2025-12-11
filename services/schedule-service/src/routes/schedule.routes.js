const { Router } = require('express');
const scheduleController = require('../controllers/schedule.controller.js');
const attendanceController = require('../controllers/attendance.controller.js');

const router = Router();

// ==================== SCHEDULE ROUTES ====================
// Specific routes must come before parameterized routes
router.get('/filter-options', (req, res) => scheduleController.getScheduleFilterOptions(req, res));
router.get('/upcoming', (req, res) => scheduleController.getUpcomingSchedules(req, res));
router.get('/stats', (req, res) => scheduleController.getScheduleStats(req, res));
router.get('/date/:date', (req, res) => scheduleController.getSchedulesByDate(req, res));

// QR Code route - must be before /:id route
router.post('/:schedule_id/qr-code', (req, res) =>
  attendanceController.generateScheduleQRCode(req, res)
);

router.get('/', (req, res) => scheduleController.getAllSchedules(req, res));
router.get('/:id', (req, res) => scheduleController.getScheduleById(req, res));
router.post('/', (req, res) => scheduleController.createSchedule(req, res));
router.put('/:id', (req, res) => scheduleController.updateSchedule(req, res));
router.delete('/:id', (req, res) => scheduleController.deleteSchedule(req, res));

module.exports = router;
