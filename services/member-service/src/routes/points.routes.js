const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/points.controller.js');

// Points routes
router.get('/members/:id/points/balance', (req, res) => pointsController.getBalance(req, res));
router.get('/members/:id/points/history', (req, res) => pointsController.getHistory(req, res));
router.get('/points/leaderboard', (req, res) => pointsController.getTopMembersByPoints(req, res));

module.exports = router;

