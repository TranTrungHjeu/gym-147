const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challenge.controller.js');

// Challenge routes
router.post('/challenges', (req, res) => challengeController.createChallenge(req, res));
router.get('/challenges', (req, res) => challengeController.getChallenges(req, res));
router.get('/challenges/:id', (req, res) => challengeController.getChallengeById(req, res));
router.post('/challenges/:challengeId/join', (req, res) => challengeController.joinChallenge(req, res));
router.post('/challenges/:challengeId/progress', (req, res) => challengeController.updateProgress(req, res));
router.get('/members/:id/challenges', (req, res) => challengeController.getMemberChallenges(req, res));
router.get('/challenges/leaderboard', (req, res) => challengeController.getChallengeLeaderboard(req, res));

module.exports = router;

