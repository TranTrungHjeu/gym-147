const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/points.controller.js');

// Points routes
router.get('/members/:id/points/balance', (req, res) => pointsController.getBalance(req, res));
router.get('/members/:id/points/history', (req, res) => pointsController.getHistory(req, res));
router.get('/points/leaderboard', (req, res) => pointsController.getTopMembersByPoints(req, res));
// Internal API for other services to award points
router.post('/members/:id/points/award', (req, res) => pointsController.awardPoints(req, res));

module.exports = router;

