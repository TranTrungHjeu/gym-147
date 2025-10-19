const { Router } = require('express');
const trainerController = require('../controllers/trainer.controller.js');

const router = Router();

// ==================== TRAINER ROUTES ====================
router.get('/', (req, res) => trainerController.getAllTrainers(req, res));
router.get('/user/:user_id', (req, res) => trainerController.getTrainerByUserId(req, res));
router.get('/user/:user_id/stats', (req, res) => trainerController.getTrainerStats(req, res));
router.get('/user/:user_id/classes', (req, res) => trainerController.getTrainerClasses(req, res));
router.get('/user/:user_id/schedule', (req, res) =>
  trainerController.getTrainerScheduleList(req, res)
);
router.get('/user/:user_id/attendance', (req, res) =>
  trainerController.getTrainerAttendance(req, res)
);
router.get('/user/:user_id/bookings', (req, res) =>
  trainerController.getTrainerBookingsList(req, res)
);
router.get('/user/:user_id/reviews', (req, res) =>
  trainerController.getTrainerReviewsList(req, res)
);
router.get('/user/:user_id/ratings', (req, res) => trainerController.getTrainerRatings(req, res));
router.get('/user/:user_id/feedback', (req, res) => trainerController.getTrainerFeedback(req, res));
router.get('/user/:user_id/certifications', (req, res) =>
  trainerController.getTrainerCertifications(req, res)
);
router.get('/user/:user_id/available-categories', (req, res) =>
  trainerController.getAvailableCategories(req, res)
);
router.get('/:id', (req, res) => trainerController.getTrainerById(req, res));
router.post('/', (req, res) => trainerController.createTrainer(req, res));
router.post('/user/:user_id/schedules', (req, res) =>
  trainerController.createTrainerSchedule(req, res)
);

// Trainer schedule management
router.put('/user/:user_id/schedules/:schedule_id', (req, res) =>
  trainerController.updateTrainerSchedule(req, res)
);
router.delete('/user/:user_id/schedules/:schedule_id', (req, res) =>
  trainerController.cancelTrainerSchedule(req, res)
);
router.get('/user/:user_id/schedules/:schedule_id/waitlist-stats', (req, res) =>
  trainerController.getWaitlistStats(req, res)
);
router.post('/user/:user_id/schedules/:schedule_id/request-room-change', (req, res) =>
  trainerController.requestRoomChange(req, res)
);
router.get('/user/:user_id/revenue', (req, res) => trainerController.getTrainerRevenue(req, res));

router.put('/user/:user_id', (req, res) => trainerController.updateTrainerByUserId(req, res));
router.put('/:id', (req, res) => trainerController.updateTrainer(req, res));
router.delete('/user/:user_id', (req, res) => trainerController.deleteTrainerByUserId(req, res));
router.delete('/:id', (req, res) => trainerController.deleteTrainer(req, res));

module.exports = router;
