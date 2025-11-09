const pointsService = require('../services/points.service.js');

class PointsController {
  /**
   * Get member points balance
   */
  async getBalance(req, res) {
    try {
      const { id } = req.params;
      const result = await pointsService.getBalance(id);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Points balance retrieved successfully',
        data: result.balance,
      });
    } catch (error) {
      console.error('Get points balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get points transaction history
   */
  async getHistory(req, res) {
    try {
      const { id } = req.params;
      const { type, source, limit, offset } = req.query;

      const result = await pointsService.getHistory(id, {
        type,
        source,
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
        message: 'Points history retrieved successfully',
        data: result.transactions,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Get points history error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get top members by points
   */
  async getTopMembersByPoints(req, res) {
    try {
      const { limit = 10, period = 'alltime' } = req.query;
      const result = await pointsService.getTopMembersByPoints(
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
        message: 'Top members by points retrieved successfully',
        data: result.members,
      });
    } catch (error) {
      console.error('Get top members by points error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new PointsController();

