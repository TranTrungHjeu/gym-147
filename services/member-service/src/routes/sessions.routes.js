const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');

// ==================== GYM SESSION ROUTES ====================

// Get member's gym sessions
router.get('/members/:id/sessions', (req, res) => sessionController.getMemberSessions(req, res));

// Get current active session
router.get('/members/:id/sessions/current', (req, res) =>
  sessionController.getCurrentSession(req, res)
);

// Record gym entry
router.post('/members/:id/sessions/entry', (req, res) => sessionController.recordEntry(req, res));

// Record gym exit
router.post('/members/:id/sessions/exit', (req, res) => sessionController.recordExit(req, res));

// Get session statistics
router.get('/members/:id/sessions/stats', (req, res) =>
  sessionController.getSessionStats(req, res)
);

// Get workout frequency for charts
router.get('/members/:id/workout-frequency', (req, res) =>
  sessionController.getWorkoutFrequency(req, res)
);

// Get calories data for charts
router.get('/members/:id/calories-data', (req, res) =>
  sessionController.getCaloriesData(req, res)
);

// Get session details with equipment usage
router.get('/sessions/:sessionId', (req, res) => {
  const memberController = require('../controllers/member.controller');
  memberController.getSessionDetails(req, res);
});

// ==================== GLOBAL SESSION ROUTES ====================

// Get all active sessions
router.get('/sessions/active', (req, res) => sessionController.getActiveSessions(req, res));

// Get session analytics
router.get('/sessions/analytics', (req, res) => sessionController.getSessionAnalytics(req, res));

module.exports = router;
