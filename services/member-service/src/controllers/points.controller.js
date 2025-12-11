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

  /**
   * Award points to member (internal API for other services)
   */
  async awardPoints(req, res) {
    try {
      const { id } = req.params;
      const { points, source, source_id, description } = req.body;

      // Validate required fields
      if (!points || points <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Points must be a positive number',
          data: null,
        });
      }

      if (!source) {
        return res.status(400).json({
          success: false,
          message: 'Source is required',
          data: null,
        });
      }

      // Award points
      const result = await pointsService.awardPoints(
        id,
        points,
        source,
        source_id || null,
        description || null
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error || 'Failed to award points',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Points awarded successfully',
        data: {
          transaction: result.transaction,
          new_balance: result.newBalance,
        },
      });
    } catch (error) {
      console.error('Award points error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new PointsController();

