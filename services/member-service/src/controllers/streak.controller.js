const streakService = require('../services/streak.service.js');

class StreakController {
  /**
   * Get member streak
   */
  async getStreak(req, res) {
    try {
      const { id } = req.params;
      const result = await streakService.getStreak(id);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Streak retrieved successfully',
        data: result.streak,
      });
    } catch (error) {
      console.error('Get streak error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Update streak (usually called automatically when member has session)
   */
  async updateStreak(req, res) {
    try {
      const { id } = req.params;
      const { sessionDate } = req.body;

      const result = await streakService.updateStreak(
        id,
        sessionDate ? new Date(sessionDate) : new Date()
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
        message: result.milestoneReached
          ? `Streak updated! Milestone reached: ${result.milestoneReached.days} days!`
          : 'Streak updated successfully',
        data: {
          streak: result.streak,
          isNewStreak: result.isNewStreak,
          milestoneReached: result.milestoneReached,
        },
      });
    } catch (error) {
      console.error('Update streak error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get top streaks leaderboard
   */
  async getTopStreaks(req, res) {
    try {
      const { limit = 10, type = 'current' } = req.query;
      const result = await streakService.getTopStreaks(
        parseInt(limit),
        type
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
        message: 'Top streaks retrieved successfully',
        data: result.streaks,
      });
    } catch (error) {
      console.error('Get top streaks error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new StreakController();

