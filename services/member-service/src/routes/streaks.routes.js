const express = require('express');
const router = express.Router();
const streakController = require('../controllers/streak.controller.js');

// Streak routes
router.get('/members/:id/streak', (req, res) => streakController.getStreak(req, res));
router.post('/members/:id/streak/update', (req, res) => streakController.updateStreak(req, res));
router.get('/streaks/top', (req, res) => streakController.getTopStreaks(req, res));

module.exports = router;

