const { Router } = require('express');
const attendanceController = require('../controllers/attendance.controller.js');

const router = Router();

// Check-in management routes
router.post('/schedules/:schedule_id/check-in/enable', (req, res) =>
  attendanceController.enableCheckIn(req, res)
);

router.post('/schedules/:schedule_id/check-in/disable', (req, res) =>
  attendanceController.disableCheckIn(req, res)
);

// Member self check-in/check-out routes
router.post('/schedules/:schedule_id/attendance/check-in', (req, res) =>
  attendanceController.memberCheckIn(req, res)
);

router.post('/schedules/:schedule_id/attendance/check-out', (req, res) =>
  attendanceController.memberCheckOut(req, res)
);

// Trainer manual check-in/check-out routes
router.post('/schedules/:schedule_id/attendance/:member_id/check-in', (req, res) =>
  attendanceController.trainerCheckInMember(req, res)
);

router.post('/schedules/:schedule_id/attendance/:member_id/check-out', (req, res) =>
  attendanceController.trainerCheckOutMember(req, res)
);

// Trainer bulk operations
router.post('/schedules/:schedule_id/attendance/checkout-all', (req, res) =>
  attendanceController.trainerCheckOutAll(req, res)
);

// Status and info routes
router.get('/schedules/:schedule_id/check-in/status', (req, res) =>
  attendanceController.getCheckInStatus(req, res)
);

module.exports = router;
