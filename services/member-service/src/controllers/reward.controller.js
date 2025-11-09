const rewardService = require('../services/reward.service.js');

class RewardController {
  /**
   * Create a new reward (Admin only)
   */
  async createReward(req, res) {
    try {
      const rewardData = req.body;
      const result = await rewardService.createReward(rewardData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Reward created successfully',
        data: result.reward,
      });
    } catch (error) {
      console.error('Create reward error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get all available rewards
   */
  async getRewards(req, res) {
    try {
      const { category, min_points, max_points } = req.query;
      const filters = {};

      if (category) filters.category = category;
      if (min_points) filters.min_points = parseInt(min_points);
      if (max_points) filters.max_points = parseInt(max_points);

      const result = await rewardService.getRewards(filters);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Rewards retrieved successfully',
        data: result.rewards,
      });
    } catch (error) {
      console.error('Get rewards error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get reward by ID
   */
  async getRewardById(req, res) {
    try {
      const { id } = req.params;
      const result = await rewardService.getRewardById(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Reward retrieved successfully',
        data: result.reward,
      });
    } catch (error) {
      console.error('Get reward by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Redeem a reward
   */
  async redeemReward(req, res) {
    try {
      const { rewardId } = req.params;
      const { memberId } = req.body;
      const member_id = memberId || req.user?.member_id || req.body.member_id;

      if (!member_id) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      const result = await rewardService.redeemReward(member_id, rewardId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: result.required
            ? {
                required: result.required,
                current: result.current,
              }
            : null,
        });
      }

      res.json({
        success: true,
        message: 'Reward redeemed successfully',
        data: result.redemption,
      });
    } catch (error) {
      console.error('Redeem reward error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get member's redemption history
   */
  async getMemberRedemptions(req, res) {
    try {
      const { id } = req.params;
      const { status, limit, offset } = req.query;

      const result = await rewardService.getMemberRedemptions(id, {
        status,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Redemption history retrieved successfully',
        data: result.redemptions,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Get member redemptions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Verify redemption code
   */
  async verifyCode(req, res) {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Redemption code is required',
          data: null,
        });
      }

      const result = await rewardService.verifyCode(code);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Code verified successfully',
        data: result.redemption,
      });
    } catch (error) {
      console.error('Verify code error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new RewardController();

