const { Router } = require('express');
const { MemberController } = require('../controllers/member.controller.js');

const router = Router();
const memberController = new MemberController();

// Member CRUD routes
router.get('/members', (req, res) => memberController.getAllMembers(req, res));
router.get('/members/stats', (req, res) => memberController.getMemberStats(req, res));
router.get('/members/:id', (req, res) => memberController.getMemberById(req, res));
router.post('/members', (req, res) => memberController.createMember(req, res));
router.put('/members/:id', (req, res) => memberController.updateMember(req, res));
router.delete('/members/:id', (req, res) => memberController.deleteMember(req, res));

// Member membership management
router.get('/members/:id/memberships', (req, res) =>
  memberController.getMemberMemberships(req, res)
);
router.post('/members/:id/memberships', (req, res) => memberController.createMembership(req, res));

// Member access logs
router.get('/members/:id/access-logs', (req, res) =>
  memberController.getMemberAccessLogs(req, res)
);

// Check-in/Check-out
router.post('/members/:id/checkin', (req, res) => memberController.memberCheckIn(req, res));
router.post('/members/:id/checkout', (req, res) => memberController.memberCheckOut(req, res));

module.exports = { memberRoutes: router };
