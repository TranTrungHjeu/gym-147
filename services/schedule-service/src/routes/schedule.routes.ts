import { Router } from 'express';
import { ScheduleController } from '../controllers/schedule.controller.js';

const router = Router();
const scheduleController = new ScheduleController();

// Class routes
router.get('/classes', (req, res) => scheduleController.getAllClasses(req, res));
router.get('/classes/:id', (req, res) => scheduleController.getClassById(req, res));
router.post('/classes', (req, res) => scheduleController.createClass(req, res));
router.put('/classes/:id', (req, res) => scheduleController.updateClass(req, res));
router.delete('/classes/:id', (req, res) => scheduleController.deleteClass(req, res));

// Schedule routes
router.get('/schedules', (req, res) => scheduleController.getSchedules(req, res));
router.get('/schedules/:id', (req, res) => scheduleController.getScheduleById(req, res));
router.post('/schedules', (req, res) => scheduleController.createSchedule(req, res));
router.put('/schedules/:id', (req, res) => scheduleController.updateSchedule(req, res));

// Booking routes
router.get('/bookings', (req, res) => scheduleController.getBookings(req, res));
router.get('/bookings/:id', (req, res) => scheduleController.getBookingById(req, res));
router.post('/bookings', (req, res) => scheduleController.createBooking(req, res));
router.put('/bookings/:id', (req, res) => scheduleController.updateBooking(req, res));
router.delete('/bookings/:id', (req, res) => scheduleController.cancelBooking(req, res));

export default router;
