const { Router } = require('express');
const trainerController = require('../controllers/trainer.controller.js');
const certificationController = require('../controllers/certification.controller.js');

const router = Router();

// ==================== TRAINER ROUTES ====================
router.get('/', (req, res) => trainerController.getAllTrainers(req, res));

// Get trainers for notification (public endpoint, no auth - for bulk notification system)
// Support both GET (with filters) and POST (with trainer_ids)
router.get('/for-notification', (req, res) =>
  trainerController.getTrainersForNotification(req, res)
);
router.post('/for-notification', (req, res) =>
  trainerController.getTrainersForNotification(req, res)
);

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
router.post('/user/:user_id/reviews/:attendance_id/reply', (req, res) =>
  trainerController.replyToReview(req, res)
);
router.post('/user/:user_id/reviews/:attendance_id/report', (req, res) =>
  trainerController.reportReview(req, res)
);
router.get('/user/:user_id/certifications', (req, res) =>
  trainerController.getTrainerCertifications(req, res)
);
router.get('/user/:user_id/available-categories', (req, res) =>
  trainerController.getAvailableCategories(req, res)
);
router.post('/user/:user_id/avatar', (req, res) => trainerController.uploadAvatar(req, res));

// Trainer Certification routes (must be BEFORE /:id route to avoid route conflicts)
// These routes use /trainers/:trainerId/... pattern
// Note: Routes with specific patterns (like /certifications) must come before generic routes (like /:id)
router.get('/:trainerId/certifications', (req, res, next) => {
  console.log('[SUCCESS] GET /trainers/:trainerId/certifications route matched');
  console.log('[LOCATION] Request params:', req.params);
  console.log('[LOCATION] Request query:', req.query);
  certificationController.getTrainerCertifications(req, res, next);
});
router.post('/:trainerId/certifications', (req, res, next) => {
  console.log('[SUCCESS] POST /trainers/:trainerId/certifications route matched');
  console.log('[LOCATION] Request params:', req.params);
  console.log('[LOCATION] Request body:', req.body);
  console.log('[LOCATION] TrainerId from params:', req.params.trainerId);
  certificationController.createCertification(req, res, next);
});
router.post('/:trainerId/upload-certificate', certificationController.uploadCertificateToS3);
router.post('/:trainerId/presigned-url', certificationController.generatePresignedUrl);
router.get('/:trainerId/available-categories', certificationController.getAvailableCategories);
router.get('/:trainerId/categories/:category/access', certificationController.checkCategoryAccess);

// Basic trainer routes (/:id must be after specific routes like /:trainerId/certifications)
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
router.post('/:id/sync-specializations', (req, res) =>
  trainerController.syncTrainerSpecializations(req, res)
);

router.delete('/user/:user_id', (req, res) => trainerController.deleteTrainerByUserId(req, res));
router.delete('/:id', (req, res) => trainerController.deleteTrainer(req, res));

module.exports = router;
