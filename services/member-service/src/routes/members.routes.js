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

// Get member profile statistics (MUST be before /profile route)
// Support both /profile/stats (via gateway) and /members/profile/stats (direct access)
router.get('/profile/stats', (req, res) => {
  console.log('[SUCCESS] Route matched: GET /profile/stats');
  memberController.getProfileStats(req, res);
});
router.get('/members/profile/stats', (req, res) => {
  console.log('[SUCCESS] Route matched: GET /members/profile/stats');
  memberController.getProfileStats(req, res);
});

// Get current member profile (static route - must be before dynamic routes)
// Support both /profile (via gateway) and /members/profile (direct access)
// IMPORTANT: This route must be registered BEFORE any dynamic routes like /:id
router.get('/profile', (req, res) => {
  console.log('[SUCCESS] Route matched: GET /profile', req.originalUrl, req.path);
  memberController.getCurrentMemberProfile(req, res);
});
router.get('/members/profile', (req, res) => {
  console.log('[SUCCESS] Route matched: GET /members/profile', req.originalUrl, req.path);
  memberController.getCurrentMemberProfile(req, res);
});

// Update current member profile (static route - must be before dynamic routes)
// Support both /profile (via gateway) and /members/profile (direct access)
router.put('/profile', (req, res) => memberController.updateCurrentMemberProfile(req, res));
router.put('/members/profile', (req, res) => memberController.updateCurrentMemberProfile(req, res));

// Toggle AI Class Recommendations (Premium feature)
// MUST be before /members/:id route to avoid being matched as :id = "preferences"
// Support both /preferences/ai-class-recommendations (via gateway) and /members/preferences/ai-class-recommendations (direct access)
router.put('/preferences/ai-class-recommendations', (req, res) =>
  memberController.toggleAIClassRecommendations(req, res)
);
router.put('/members/preferences/ai-class-recommendations', (req, res) =>
  memberController.toggleAIClassRecommendations(req, res)
);

// Upload avatar (static route - must be before dynamic routes)
// Support both /avatar/upload (via gateway) and /members/avatar/upload (direct access)
router.post('/avatar/upload', (req, res) => memberController.uploadAvatar(req, res));
router.post('/members/avatar/upload', (req, res) => memberController.uploadAvatar(req, res));

// Onboarding tracking (static routes - must be before dynamic routes)
// Support both /onboarding/* (via gateway) and /members/onboarding/* (direct access)
router.get('/onboarding/status', (req, res) => memberController.getOnboardingStatus(req, res));
router.get('/members/onboarding/status', (req, res) =>
  memberController.getOnboardingStatus(req, res)
);
router.patch('/onboarding/progress', (req, res) =>
  memberController.updateOnboardingProgress(req, res)
);
router.patch('/members/onboarding/progress', (req, res) =>
  memberController.updateOnboardingProgress(req, res)
);

// Get member by user_id (static route - must be before :id)
// Support both /user/:user_id (via gateway) and /members/user/:user_id (direct access)
router.get('/user/:user_id', (req, res) => memberController.getMemberByUserId(req, res));
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

// Get members for notification (public endpoint, no auth - for bulk notification system)
// Support both GET (with filters) and POST (with member_ids)
router.get('/api/members/for-notification', (req, res) =>
  memberController.getMembersForNotification(req, res)
);
router.post('/api/members/for-notification', (req, res) =>
  memberController.getMembersForNotification(req, res)
);

// Update member (dynamic route - must be after static routes like /members/preferences/*)
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

// ==================== ADMIN NOTIFICATION ROUTES ====================

// Send system announcement (Admin only)
router.post('/admin/announcements', (req, res) =>
  memberController.sendSystemAnnouncement(req, res)
);

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
// Support both /sessions (via gateway) and /members/sessions (direct access)
router.get('/sessions', (req, res) => memberController.getMemberSessions(req, res));
router.get('/members/sessions', (req, res) => memberController.getMemberSessions(req, res));

// Get current session (must be before :sessionId route)
// Support both /sessions/current (via gateway) and /members/sessions/current (direct access)
router.get('/sessions/current', (req, res) => memberController.getCurrentSession(req, res));
router.get('/members/sessions/current', (req, res) => memberController.getCurrentSession(req, res));

// Record gym entry
// Support both /sessions/entry (via gateway) and /members/sessions/entry (direct access)
router.post('/sessions/entry', (req, res) => memberController.recordGymEntry(req, res));
router.post('/members/sessions/entry', (req, res) => memberController.recordGymEntry(req, res));

// Record gym exit
// Support both /sessions/exit (via gateway) and /members/sessions/exit (direct access)
router.post('/sessions/exit', (req, res) => memberController.recordGymExit(req, res));
router.post('/members/sessions/exit', (req, res) => memberController.recordGymExit(req, res));

// Get session statistics
// Support both /sessions/stats (via gateway) and /members/sessions/stats (direct access)
router.get('/sessions/stats', (req, res) => memberController.getSessionStats(req, res));
router.get('/members/sessions/stats', (req, res) => memberController.getSessionStats(req, res));

// Get session details with equipment usage (must be after specific routes)
// Support both /sessions/:sessionId (via gateway) and /members/sessions/:sessionId (direct access)
router.get('/sessions/:sessionId', (req, res) => memberController.getSessionDetails(req, res));
router.get('/members/sessions/:sessionId', (req, res) =>
  memberController.getSessionDetails(req, res)
);

module.exports = router;
