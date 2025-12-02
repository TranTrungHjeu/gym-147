const challengeService = require('../services/challenge.service.js');

class ChallengeController {
  /**
   * Helper function to decode JWT token and get user info
   */
  getUserFromToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    try {
      const token = authHeader.split(' ')[1];
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return null;
      }

      // Decode JWT payload
      let payloadBase64 = tokenParts[1];
      while (payloadBase64.length % 4) {
        payloadBase64 += '=';
      }

      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      return {
        id: payload.userId || payload.id,
        role: payload.role,
      };
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  }

  /**
   * Create a new challenge
   * Only SUPER_ADMIN and ADMIN can create challenges
   */
  async createChallenge(req, res) {
    try {
      // [SUCCESS] Check authentication - Decode JWT token
      const user = this.getUserFromToken(req);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Authentication required',
          data: null,
        });
      }

      // [SUCCESS] Check authorization - Only SUPER_ADMIN and ADMIN
      const userRole = user.role;
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only SUPER_ADMIN and ADMIN can create challenges',
          data: null,
        });
      }

      const challengeData = {
        ...req.body,
        created_by: user.id, // Auto-set from JWT token
      };
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

  /**
   * Update challenge
   * Only SUPER_ADMIN and ADMIN can update challenges
   */
  async updateChallenge(req, res) {
    try {
      // [SUCCESS] Check authentication
      const user = this.getUserFromToken(req);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Authentication required',
          data: null,
        });
      }

      // [SUCCESS] Check authorization - Only SUPER_ADMIN and ADMIN
      const userRole = user.role;
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only SUPER_ADMIN and ADMIN can update challenges',
          data: null,
        });
      }

      const { id } = req.params;
      const updateData = req.body;
      const result = await challengeService.updateChallenge(id, updateData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Challenge updated successfully',
        data: result.challenge,
      });
    } catch (error) {
      console.error('Update challenge error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Delete challenge
   * Only SUPER_ADMIN and ADMIN can delete challenges
   */
  async deleteChallenge(req, res) {
    try {
      // [SUCCESS] Check authentication
      const user = this.getUserFromToken(req);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Authentication required',
          data: null,
        });
      }

      // [SUCCESS] Check authorization - Only SUPER_ADMIN and ADMIN
      const userRole = user.role;
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only SUPER_ADMIN and ADMIN can delete challenges',
          data: null,
        });
      }

      const { id } = req.params;
      const result = await challengeService.deleteChallenge(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Challenge deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete challenge error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new ChallengeController();

