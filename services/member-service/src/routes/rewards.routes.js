const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/reward.controller.js');

// Static routes (must be before dynamic routes with params)
router.post('/rewards', (req, res) => rewardController.createReward(req, res));
router.get('/rewards', (req, res) => rewardController.getRewards(req, res));
router.post('/rewards/verify-code', (req, res) => rewardController.verifyCode(req, res));
router.get('/rewards/stats', (req, res) => rewardController.getRewardStats(req, res));
router.get('/analytics/rewards/redemption-trend', (req, res) => rewardController.getRedemptionTrend(req, res));
router.post('/rewards/image/upload', (req, res) => rewardController.uploadRewardImage(req, res));

// Dynamic routes with params (must be after static routes)
router.get('/rewards/:id', (req, res) => rewardController.getRewardById(req, res));
router.put('/rewards/:id', (req, res) => rewardController.updateReward(req, res));
router.delete('/rewards/:id', (req, res) => rewardController.deleteReward(req, res));
router.post('/rewards/:rewardId/redeem', (req, res) => rewardController.redeemReward(req, res));
router.get('/rewards/recommendations/:memberId', (req, res) =>
  rewardController.getRecommendedRewards(req, res)
);
router.get('/rewards/qr-code/:code', (req, res) => rewardController.generateQRCode(req, res));

// Member routes
router.get('/members/:id/rewards', (req, res) => rewardController.getMemberRedemptions(req, res));

// Redemption routes (Admin)
router.get('/redemptions', (req, res) => rewardController.getAllRedemptions(req, res));
router.post('/redemptions/:id/refund', (req, res) => rewardController.refundRedemption(req, res));
router.put('/redemptions/:id/mark-used', (req, res) => rewardController.markAsUsed(req, res));

module.exports = router;

