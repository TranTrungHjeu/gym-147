const express = require('express');
const router = express.Router();
const memberController = require('../controllers/member.controller');

// ==================== MEMBER CRUD ROUTES ====================

// Get all members with pagination and filters
router.get('/members', (req, res) => memberController.getAllMembers(req, res));

// Get member by ID
router.get('/members/:id', (req, res) => memberController.getMemberById(req, res));

// Get member by user_id (for cross-service integration)
router.get('/members/user/:user_id', (req, res) => memberController.getMemberByUserId(req, res));

// Create new member
router.post('/members', (req, res) => memberController.createMember(req, res));

// Get multiple members by user_ids (for cross-service integration)
router.post('/members/batch', (req, res) => memberController.getMembersByIds(req, res));

// Update member
router.put('/members/:id', (req, res) => memberController.updateMember(req, res));

// Update member by user_id (for cross-service integration)
router.put('/members/user/:user_id', (req, res) => memberController.updateMemberByUserId(req, res));

// Delete member
router.delete('/members/:id', (req, res) => memberController.deleteMember(req, res));

// ==================== MEMBERSHIP MANAGEMENT ROUTES ====================

// Get member's memberships
router.get('/members/:id/memberships', (req, res) =>
  memberController.getMemberMemberships(req, res)
);

// Create new membership
router.post('/members/:id/memberships', (req, res) => memberController.createMembership(req, res));

// ==================== ACCESS CONTROL ROUTES ====================

// Generate RFID tag
router.post('/members/:id/rfid', (req, res) => memberController.generateRFIDTag(req, res));

// Generate QR code
router.post('/members/:id/qr-code', (req, res) => memberController.generateQRCode(req, res));

// Toggle access
router.put('/members/:id/access', (req, res) => memberController.toggleAccess(req, res));

module.exports = router;
