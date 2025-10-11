const { Router } = require('express');
const scheduleController = require('../controllers/schedule.controller.js');

const router = Router();

// Class routes
router.get('/classes', (req, res) => scheduleController.getAllClasses(req, res));
router.post('/classes', (req, res) => scheduleController.createClass(req, res));

// Schedule routes
router.get('/schedules', (req, res) => scheduleController.getSchedules(req, res));
router.post('/schedules', (req, res) => scheduleController.createSchedule(req, res));

// Instructor routes
router.get('/instructors', (req, res) => scheduleController.getInstructors(req, res));
router.post('/instructors', (req, res) => scheduleController.createInstructor(req, res));

// Room routes
router.get('/rooms', (req, res) => scheduleController.getRooms(req, res));
router.post('/rooms', (req, res) => scheduleController.createRoom(req, res));

// Utility routes
router.post('/sample-data', (req, res) => scheduleController.createSampleData(req, res));
router.get('/stats', (req, res) => scheduleController.getStats(req, res));

module.exports = router;
