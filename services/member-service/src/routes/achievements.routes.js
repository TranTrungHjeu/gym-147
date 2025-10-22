const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievement.controller');

// ==================== ACHIEVEMENT ROUTES ====================

// Get all achievements
router.get('/achievements', (req, res) => achievementController.getAllAchievements(req, res));

// Get member's achievements
router.get('/members/:id/achievements', (req, res) =>
  achievementController.getMemberAchievements(req, res)
);

// Get achievement by ID
router.get('/achievements/:id', (req, res) => achievementController.getAchievementById(req, res));

// Create achievement
router.post('/members/:id/achievements', (req, res) =>
  achievementController.createAchievement(req, res)
);

// Unlock achievement
router.put('/achievements/:id/unlock', (req, res) =>
  achievementController.unlockAchievement(req, res)
);

// Delete achievement
router.delete('/achievements/:id', (req, res) => achievementController.deleteAchievement(req, res));

// ==================== ACHIEVEMENT SYSTEM ROUTES ====================

// Check and award achievements
router.post('/members/:id/achievements/check', (req, res) =>
  achievementController.checkAndAwardAchievements(req, res)
);

// ==================== LEADERBOARD ROUTES ====================

// Get achievement leaderboard
router.get('/achievements/leaderboard', (req, res) =>
  achievementController.getAchievementLeaderboard(req, res)
);

// Get member's achievement summary
router.get('/members/:id/achievements/summary', (req, res) =>
  achievementController.getMemberAchievementSummary(req, res)
);

module.exports = router;
