const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class HealthController {
  /**
   * Get health trends
   */
  async getHealthTrends(req, res) {
    try {
      const { memberId } = req.params;
      const { period = '30', metricType } = req.query;

      // Validate period parameter
      const periodDays = parseInt(period);
      if (isNaN(periodDays) || periodDays <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid period parameter',
        });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      // Build where clause
      const whereClause = {
        member_id: memberId,
        recorded_at: { gte: startDate },
      };

      // Add metric type filter if provided
      if (metricType && metricType !== 'undefined') {
        whereClause.metric_type = metricType;
      }

      const trends = await prisma.healthMetric.findMany({
        where: whereClause,
        orderBy: { recorded_at: 'asc' },
        select: {
          value: true,
          recorded_at: true,
          metric_type: true,
        },
      });

      res.json({
        success: true,
        message: 'Health trends retrieved successfully',
        data: trends,
      });
    } catch (error) {
      console.error('Get health trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get member health metrics
   */
  async getMemberHealthMetrics(req, res) {
    try {
      const { memberId } = req.params;
      const { metricType, startDate, endDate, limit = 50, offset = 0 } = req.query;

      const where = { member_id: memberId };
      if (metricType) where.metric_type = metricType;
      if (startDate) where.recorded_at = { ...where.recorded_at, gte: new Date(startDate) };
      if (endDate) where.recorded_at = { ...where.recorded_at, lte: new Date(endDate) };

      const metrics = await prisma.healthMetric.findMany({
        where,
        orderBy: { recorded_at: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      });

      res.json({
        success: true,
        message: 'Health metrics retrieved successfully',
        data: metrics,
      });
    } catch (error) {
      console.error('Get member health metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get health metrics
   */
  async getHealthMetrics(req, res) {
    try {
      const { metricType, startDate, endDate, limit = 50, offset = 0 } = req.query;

      const where = {};
      if (metricType) where.metric_type = metricType;
      if (startDate) where.recorded_at = { ...where.recorded_at, gte: new Date(startDate) };
      if (endDate) where.recorded_at = { ...where.recorded_at, lte: new Date(endDate) };

      const metrics = await prisma.healthMetric.findMany({
        where,
        orderBy: { recorded_at: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      });

      res.json({
        success: true,
        message: 'Health metrics retrieved successfully',
        data: metrics,
      });
    } catch (error) {
      console.error('Get health metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Record health metric
   */
  async recordHealthMetric(req, res) {
    try {
      const { memberId, metricType, value, notes } = req.body;

      const metric = await prisma.healthMetric.create({
        data: {
          member_id: memberId,
          metric_type: metricType,
          value: parseFloat(value),
          notes,
          recorded_at: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Health metric recorded successfully',
        data: metric,
      });
    } catch (error) {
      console.error('Record health metric error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get health summary
   */
  async getHealthSummary(req, res) {
    try {
      const { memberId } = req.query;

      const [latestWeight, latestBodyFat, weightTrend, bodyFatTrend] = await Promise.all([
        prisma.healthMetric.findFirst({
          where: { member_id: memberId, metric_type: 'WEIGHT' },
          orderBy: { recorded_at: 'desc' },
        }),
        prisma.healthMetric.findFirst({
          where: { member_id: memberId, metric_type: 'BODY_FAT' },
          orderBy: { recorded_at: 'desc' },
        }),
        prisma.healthMetric.findMany({
          where: { member_id: memberId, metric_type: 'WEIGHT' },
          orderBy: { recorded_at: 'desc' },
          take: 7,
        }),
        prisma.healthMetric.findMany({
          where: { member_id: memberId, metric_type: 'BODY_FAT' },
          orderBy: { recorded_at: 'desc' },
          take: 7,
        }),
      ]);

      res.json({
        success: true,
        message: 'Health summary retrieved successfully',
        data: {
          latestWeight,
          latestBodyFat,
          weightTrend,
          bodyFatTrend,
        },
      });
    } catch (error) {
      console.error('Get health summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new HealthController();
