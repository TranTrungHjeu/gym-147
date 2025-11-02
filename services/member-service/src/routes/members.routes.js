const express = require('express');
const router = express.Router();
const memberController = require('../controllers/member.controller');
const achievementController = require('../controllers/achievement.controller');
const healthController = require('../controllers/health.controller');

// ==================== MEMBER CRUD ROUTES ====================

// Get all members with pagination and filters
router.get('/members', (req, res) => memberController.getAllMembers(req, res));

// Debug endpoint (static route - must be before dynamic routes)
router.get('/debug/database', (req, res) => memberController.debugDatabase(req, res));

// Get current member profile (static route - must be before dynamic routes)
router.get('/members/profile', (req, res) => memberController.getCurrentMemberProfile(req, res));

// Update current member profile (static route - must be before dynamic routes)
router.put('/members/profile', (req, res) => memberController.updateCurrentMemberProfile(req, res));

// Upload avatar (static route - must be before dynamic routes)
router.post('/members/avatar/upload', (req, res) => memberController.uploadAvatar(req, res));

// Get member by user_id (static route - must be before :id)
router.get('/members/user/:user_id', (req, res) => memberController.getMemberByUserId(req, res));

// Get member by ID (dynamic route)
router.get('/members/:id', (req, res) => memberController.getMemberById(req, res));

// Create new member
router.post('/members', (req, res) => memberController.createMember(req, res));

// Create member with user (called from Billing Service after payment)
router.post('/members/create-with-user', (req, res) =>
  memberController.createMemberWithUser(req, res)
);

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

// Create membership by user_id (for cross-service integration)
router.post('/members/user/:user_id/memberships', (req, res) =>
  memberController.createMembershipByUserId(req, res)
);

// ==================== ACCESS CONTROL ROUTES ====================

// Generate RFID tag
router.post('/members/:id/rfid', (req, res) => memberController.generateRFIDTag(req, res));

// Generate QR code
router.post('/members/:id/qr-code', (req, res) => memberController.generateQRCode(req, res));

// Toggle access
router.put('/members/:id/access', (req, res) => memberController.toggleAccess(req, res));

// ==================== MEMBER-SCOPED ACHIEVEMENT ROUTES ====================

// Get member achievements
router.get('/members/:id/achievements', (req, res) =>
  achievementController.getMemberAchievements(req, res)
);

// ==================== HEALTH ROUTES ====================

// Get health trends
router.get('/health/trends/:metricType', (req, res) => healthController.getHealthTrends(req, res));

// Get health metrics
router.get('/health/metrics', (req, res) => healthController.getHealthMetrics(req, res));

// Record health metric
router.post('/health/metrics', (req, res) => healthController.recordHealthMetric(req, res));

// Get health summary
router.get('/health/summary', (req, res) => healthController.getHealthSummary(req, res));

// ==================== SESSION ROUTES ====================

// Get member sessions
router.get('/members/sessions', (req, res) => memberController.getMemberSessions(req, res));

// Get current session (must be before :sessionId route)
router.get('/members/sessions/current', (req, res) => memberController.getCurrentSession(req, res));

// Record gym entry
router.post('/members/sessions/entry', (req, res) => memberController.recordGymEntry(req, res));

// Record gym exit
router.post('/members/sessions/exit', (req, res) => memberController.recordGymExit(req, res));

// Get session details with equipment usage (must be after specific routes)
router.get('/members/sessions/:sessionId', (req, res) =>
  memberController.getSessionDetails(req, res)
);

module.exports = router;
