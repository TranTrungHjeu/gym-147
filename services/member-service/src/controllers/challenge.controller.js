const challengeService = require('../services/challenge.service.js');

class ChallengeController {
  /**
   * Create a new challenge
   */
  async createChallenge(req, res) {
    try {
      const challengeData = req.body;
      const result = await challengeService.createChallenge(challengeData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Challenge created successfully',
        data: result.challenge,
      });
    } catch (error) {
      console.error('Create challenge error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get all challenges
   */
  async getChallenges(req, res) {
    try {
      const { type, category, is_active } = req.query;
      const filters = {};

      if (type) filters.type = type;
      if (category) filters.category = category;
      if (is_active !== undefined) filters.is_active = is_active === 'true';

      const result = await challengeService.getChallenges(filters);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Challenges retrieved successfully',
        data: result.challenges,
      });
    } catch (error) {
      console.error('Get challenges error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get challenge by ID
   */
  async getChallengeById(req, res) {
    try {
      const { id } = req.params;
      const result = await challengeService.getChallengeById(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Challenge retrieved successfully',
        data: result.challenge,
      });
    } catch (error) {
      console.error('Get challenge by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Join a challenge
   */
  async joinChallenge(req, res) {
    try {
      const { challengeId } = req.params;
      const { memberId } = req.body;
      const member_id = memberId || req.user?.member_id || req.body.member_id;

      if (!member_id) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      const result = await challengeService.joinChallenge(challengeId, member_id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Joined challenge successfully',
        data: result.progress,
      });
    } catch (error) {
      console.error('Join challenge error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Update challenge progress
   */
  async updateProgress(req, res) {
    try {
      const { challengeId } = req.params;
      const { memberId, increment = 1 } = req.body;
      const member_id = memberId || req.user?.member_id || req.body.member_id;

      if (!member_id) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      const result = await challengeService.updateProgress(challengeId, member_id, increment);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: result.completed
          ? 'Challenge completed!'
          : 'Progress updated successfully',
        data: {
          progress: result.progress,
          completed: result.completed,
          wasNewlyCompleted: result.wasNewlyCompleted,
        },
      });
    } catch (error) {
      console.error('Update challenge progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get member's challenges
   */
  async getMemberChallenges(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.query;

      const result = await challengeService.getMemberChallenges(id, { status });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Member challenges retrieved successfully',
        data: result.challenges,
      });
    } catch (error) {
      console.error('Get member challenges error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get challenge leaderboard
   */
  async getChallengeLeaderboard(req, res) {
    try {
      const { limit = 10, period = 'alltime' } = req.query;
      const result = await challengeService.getChallengeLeaderboard(
        parseInt(limit),
        period
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Challenge leaderboard retrieved successfully',
        data: result.leaderboard,
      });
    } catch (error) {
      console.error('Get challenge leaderboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new ChallengeController();

