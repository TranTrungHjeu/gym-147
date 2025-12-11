const { Router } = require('express');
const bookingController = require('../controllers/booking.controller.js');

const router = Router();

// ==================== BOOKING ROUTES ====================
router.get('/', (req, res) => bookingController.getAllBookings(req, res));
router.get('/:id', (req, res) => bookingController.getBookingById(req, res));
router.post('/', (req, res) => bookingController.createBooking(req, res));
router.post('/:id/initiate-payment', (req, res) =>
  bookingController.initiateWaitlistPayment(req, res)
);
router.post('/:id/confirm-payment', (req, res) =>
  bookingController.confirmBookingPayment(req, res)
);
router.put('/:id/cancel', (req, res) => bookingController.cancelBooking(req, res));
router.get('/:id/refund', (req, res) => bookingController.getBookingRefund(req, res));

// Nested routes for schedule bookings
router.get('/schedule/:id', (req, res) => bookingController.getScheduleBookings(req, res));

// Waitlist management routes
router.get('/schedule/:schedule_id/waitlist', (req, res) =>
  bookingController.getWaitlistBySchedule(req, res)
);
router.delete('/:id/waitlist', (req, res) => bookingController.removeFromWaitlist(req, res));
router.post('/:id/promote', (req, res) => bookingController.promoteFromWaitlist(req, res));

// IMPROVEMENT: Cancellation history (must come before less specific route)
router.get('/members/:member_id/cancellation-history', (req, res) =>
  bookingController.getCancellationHistory(req, res)
);

// Member booking history
router.get('/members/:member_id', (req, res) => bookingController.getMemberBookings(req, res));

module.exports = router;
