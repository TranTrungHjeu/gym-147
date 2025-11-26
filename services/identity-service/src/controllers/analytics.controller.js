const { prisma } = require('../lib/prisma.js');

class AnalyticsController {
  /**
   * Get access statistics
   */
  async getAccessStats(req, res) {
    try {
      const userId = req.user.id;
      const { period = '30d' } = req.query;

      let startDate;
      switch (period) {
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get access statistics
      const stats = await prisma.accessLog.groupBy({
        by: ['success', 'access_type'],
        where: {
          user_id: userId,
          timestamp: { gte: startDate },
        },
        _count: true,
      });

      // Get login history
      const loginHistory = await prisma.accessLog.findMany({
        where: {
          user_id: userId,
          access_type: 'LOGIN',
          timestamp: { gte: startDate },
        },
        select: {
          success: true,
          timestamp: true,
          device_info: true,
          ip_address: true,
          location: true,
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });

      // Get failed attempts
      const failedAttempts = await prisma.accessLog.count({
        where: {
          user_id: userId,
          success: false,
          timestamp: { gte: startDate },
        },
      });

      // Get device activity
      const deviceActivity = await prisma.accessLog.groupBy({
        by: ['device_info'],
        where: {
          user_id: userId,
          timestamp: { gte: startDate },
        },
        _count: true,
        _max: { timestamp: true },
      });

      res.json({
        success: true,
        message: 'Access statistics retrieved successfully',
        data: {
          period,
          stats,
          loginHistory,
          failedAttempts,
          deviceActivity,
        },
      });
    } catch (error) {
      console.error('Get access stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get login history
   */
  async getLoginHistory(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const skip = (page - 1) * limit;

      const loginHistory = await prisma.accessLog.findMany({
        where: {
          user_id: userId,
          access_type: 'LOGIN',
        },
        select: {
          id: true,
          success: true,
          timestamp: true,
          device_info: true,
          ip_address: true,
          location: true,
          failure_reason: true,
        },
        orderBy: { timestamp: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
      });

      const total = await prisma.accessLog.count({
        where: {
          user_id: userId,
          access_type: 'LOGIN',
        },
      });

      res.json({
        success: true,
        message: 'Login history retrieved successfully',
        data: {
          loginHistory,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Get login history error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get failed attempts
   */
  async getFailedAttempts(req, res) {
    try {
      const userId = req.user.id;
      const { period = '24h' } = req.query;

      let startDate;
      switch (period) {
        case '1h':
          startDate = new Date(Date.now() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      }

      const failedAttempts = await prisma.accessLog.findMany({
        where: {
          user_id: userId,
          success: false,
          timestamp: { gte: startDate },
        },
        select: {
          id: true,
          access_type: true,
          timestamp: true,
          device_info: true,
          ip_address: true,
          failure_reason: true,
        },
        orderBy: { timestamp: 'desc' },
      });

      res.json({
        success: true,
        message: 'Failed attempts retrieved successfully',
        data: {
          period,
          failedAttempts,
          count: failedAttempts.length,
        },
      });
    } catch (error) {
      console.error('Get failed attempts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get device activity
   */
  async getDeviceActivity(req, res) {
    try {
      const userId = req.user.id;

      const deviceActivity = await prisma.accessLog.groupBy({
        by: ['device_info', 'ip_address'],
        where: {
          user_id: userId,
        },
        _count: true,
        _max: { timestamp: true },
        _min: { timestamp: true },
      });

      res.json({
        success: true,
        message: 'Device activity retrieved successfully',
        data: { deviceActivity },
      });
    } catch (error) {
      console.error('Get device activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, action, startDate, endDate } = req.query;

      const skip = (page - 1) * limit;

      const where = {
        user_id: userId,
      };

      if (action) {
        where.action = action;
      }

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }

      const auditLogs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
      });

      const total = await prisma.auditLog.count({ where });

      res.json({
        success: true,
        message: 'Audit logs retrieved successfully',
        data: {
          auditLogs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get user actions
   */
  async getUserActions(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const skip = (page - 1) * limit;

      // Define what constitutes "user actions" vs general audit logs
      // For now, we'll fetch all logs for the user
      const userActions = await prisma.auditLog.findMany({
        where: {
          user_id: userId,
        },
        orderBy: { timestamp: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
      });

      const total = await prisma.auditLog.count({
        where: {
          user_id: userId,
        },
      });

      res.json({
        success: true,
        message: 'User actions retrieved successfully',
        data: {
          userActions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Get user actions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get admin actions (Admin only)
   */
  async getAdminActions(req, res) {
    try {
      const { page = 1, limit = 20, adminId } = req.query;

      const skip = (page - 1) * limit;

      const where = {};
      if (adminId) {
        where.user_id = adminId;
      }

      // Filter for users with ADMIN or SUPER_ADMIN role
      // This requires a join or a separate query if we want to be strict
      // For now, assuming the caller passes an adminId or we filter by known admin actions

      const adminActions = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              first_name: true,
              last_name: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
      });

      const total = await prisma.auditLog.count({ where });

      res.json({
        success: true,
        message: 'Admin actions retrieved successfully',
        data: {
          adminActions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Get admin actions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = { AnalyticsController };
