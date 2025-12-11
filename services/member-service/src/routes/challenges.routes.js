const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challenge.controller.js');

// Challenge routes
// IMPORTANT: Specific routes (like /leaderboard) must be defined BEFORE parameterized routes (like /:id)
// Otherwise Express will match /challenges/leaderboard to /challenges/:id with id="leaderboard"

router.post('/challenges', (req, res) => challengeController.createChallenge(req, res));
router.get('/challenges', (req, res) => challengeController.getChallenges(req, res));
router.get('/challenges/leaderboard', (req, res) =>
  challengeController.getChallengeLeaderboard(req, res)
);
router.get('/challenges/:id', (req, res) => challengeController.getChallengeById(req, res));
router.put('/challenges/:id', (req, res) => challengeController.updateChallenge(req, res));
router.delete('/challenges/:id', (req, res) => challengeController.deleteChallenge(req, res));
router.post('/challenges/:challengeId/join', (req, res) =>
  challengeController.joinChallenge(req, res)
);
router.post('/challenges/:challengeId/progress', (req, res) =>
  challengeController.updateProgress(req, res)
);
router.get('/members/:id/challenges', (req, res) =>
  challengeController.getMemberChallenges(req, res)
);

module.exports = router;
