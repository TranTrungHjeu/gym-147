const { Router } = require('express');
const adminController = require('../controllers/admin.controller.js');

const router = Router();

// ==================== ADMIN ROUTES ====================
router.get('/admin/room-change-requests', (req, res) =>
  adminController.getRoomChangeRequests(req, res)
);
router.put('/admin/room-change-requests/:id/approve', (req, res) =>
  adminController.approveRoomChange(req, res)
);
router.put('/admin/room-change-requests/:id/reject', (req, res) =>
  adminController.rejectRoomChange(req, res)
);
router.get('/admin/dashboard-stats', (req, res) => adminController.getDashboardStats(req, res));

module.exports = router;
