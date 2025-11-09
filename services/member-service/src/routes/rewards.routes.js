const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/reward.controller.js');

// Reward routes
router.post('/rewards', (req, res) => rewardController.createReward(req, res));
router.get('/rewards', (req, res) => rewardController.getRewards(req, res));
router.get('/rewards/:id', (req, res) => rewardController.getRewardById(req, res));
router.post('/rewards/:rewardId/redeem', (req, res) => rewardController.redeemReward(req, res));
router.get('/members/:id/rewards', (req, res) => rewardController.getMemberRedemptions(req, res));
router.post('/rewards/verify-code', (req, res) => rewardController.verifyCode(req, res));

module.exports = router;

