const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievement.controller');

// ==================== ACHIEVEMENT ROUTES ====================

// DEBUG: List all routes
router.get('/achievements/debug-routes', (req, res) => {
  const routes = [];
  router.stack.forEach(middleware => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods);
      routes.push({
        method: methods[0].toUpperCase(),
        path: middleware.route.path,
      });
    }
  });
  res.json({
    success: true,
    message: 'Achievement routes loaded',
    timestamp: new Date().toISOString(),
    routes,
  });
});

// Get all achievements
router.get('/achievements', (req, res) => achievementController.getAllAchievements(req, res));

// ==================== SPECIFIC ACHIEVEMENT ROUTES ====================
// IMPORTANT: These must come BEFORE /achievements/:id to avoid route conflicts

// Get achievement summary (global)
router.get('/achievements/summary', (req, res) =>
  achievementController.getAchievementSummary(req, res)
);

// Get achievement leaderboard
router.get('/achievements/leaderboard', (req, res) =>
  achievementController.getAchievementLeaderboard(req, res)
);

// Get user rank in leaderboard
router.get('/achievements/leaderboard/user/:userId', (req, res) =>
  achievementController.getUserRank(req, res)
);

// Get member's achievement summary
router.get('/members/:id/achievements/summary', (req, res) =>
  achievementController.getMemberAchievementSummary(req, res)
);

// ==================== MEMBER ACHIEVEMENTS ROUTES ====================

// Get member's achievements
router.get('/members/:id/achievements', (req, res) =>
  achievementController.getMemberAchievements(req, res)
);

// Create achievement
router.post('/members/:id/achievements', (req, res) =>
  achievementController.createAchievement(req, res)
);

// Check and award achievements
router.post('/members/:id/achievements/check', (req, res) =>
  achievementController.checkAndAwardAchievements(req, res)
);

// ==================== SINGLE ACHIEVEMENT ROUTES ====================
// IMPORTANT: Wildcard routes must come LAST

// Get achievement by ID
router.get('/achievements/:id', (req, res) => achievementController.getAchievementById(req, res));

// Unlock achievement
router.put('/achievements/:id/unlock', (req, res) =>
  achievementController.unlockAchievement(req, res)
);

// Delete achievement
router.delete('/achievements/:id', (req, res) => achievementController.deleteAchievement(req, res));

module.exports = router;
