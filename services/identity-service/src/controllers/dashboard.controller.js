const { prisma } = require('../lib/prisma.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { requireRole } = require('../middleware/role.middleware.js');
class DashboardController {
  /**
   * Get Super Admin dashboard statistics
   */
  async getSuperAdminStats(req, res) {
    try {
      // Get user counts by role]
      const userStats = await prisma.user.groupBy({
        by: ['role'],
        _count: true,
      });

      // Get recent registrations (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentRegistrations = await prisma.user.count({
        where: {
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      });

      // Get active sessions (last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeSessions = await prisma.session.count({
        where: {
          last_used_at: {
            gte: twentyFourHoursAgo,
          },
        },
      });

      // Get total users
      const totalUsers = await prisma.user.count();

      // Format stats
      const stats = {
        totalUsers,
        totalAdmins: 0,
        totalTrainers: 0,
        totalMembers: 0,
        recentRegistrations,
        activeSessions,
      };

      // Map role counts
      userStats.forEach(stat => {
        switch (stat.role) {
          case 'SUPER_ADMIN':
            // Don't count super admin in total
            break;
          case 'ADMIN':
            stats.totalAdmins = stat._count;
            break;
          case 'TRAINER':
            stats.totalTrainers = stat._count;
            break;
          case 'MEMBER':
            stats.totalMembers = stat._count;
            break;
        }
      });

      res.json({
        success: true,
        message: 'Super Admin dashboard stats retrieved successfully',
        data: stats,
      });
    } catch (error) {
      console.error('Get Super Admin stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get Admin dashboard statistics
   */
  async getAdminStats(req, res) {
    try {
      // Get trainer count
      const totalTrainers = await prisma.user.count({
        where: {
          role: 'TRAINER',
        },
      });

      // Get member count
      const totalMembers = await prisma.user.count({
        where: {
          role: 'MEMBER',
        },
      });

      // Get recent member registrations (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentMemberRegistrations = await prisma.user.count({
        where: {
          role: 'MEMBER',
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      });

      // Get active member sessions (last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeMemberSessions = await prisma.session.count({
        where: {
          last_used_at: {
            gte: twentyFourHoursAgo,
          },
          user: {
            role: 'MEMBER',
          },
        },
      });

      const stats = {
        totalTrainers,
        totalMembers,
        recentMemberRegistrations,
        activeMemberSessions,
        // Placeholder for equipment count (would come from equipment service)
        totalEquipment: 0,
      };

      res.json({
        success: true,
        message: 'Admin dashboard stats retrieved successfully',
        data: stats,
      });
    } catch (error) {
      console.error('Get Admin stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get user statistics by role
   */
  async getUserStats(req, res) {
    try {
      const userStats = await prisma.user.groupBy({
        by: ['role'],
        _count: true,
      });

      // Get recent registrations by role (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentStats = await prisma.user.groupBy({
        by: ['role'],
        where: {
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
        _count: true,
      });

      // Format response
      const formattedStats = userStats.map(stat => {
        const recent = recentStats.find(r => r.role === stat.role);
        return {
          role: stat.role,
          count: stat._count,
          recentRegistrations: recent ? recent._count : 0,
        };
      });

      res.json({
        success: true,
        message: 'User statistics retrieved successfully',
        data: formattedStats,
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get recent activities
   */
  async getRecentActivities(req, res) {
    try {
      const { limit = 10 } = req.query;

      // Get recent user registrations
      const recentRegistrations = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
          created_at: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: parseInt(limit),
      });

      // Get recent login activities
      const recentLogins = await prisma.accessLog.findMany({
        where: {
          access_type: 'LOGIN',
          success: true,
        },
        select: {
          id: true,
          user_id: true,
          timestamp: true,
          device_info: true,
          ip_address: true,
          user: {
            select: {
              first_name: true,
              last_name: true,
              role: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: parseInt(limit),
      });

      // Format activities
      const activities = [
        ...recentRegistrations.map(user => ({
          id: `reg_${user.id}`,
          type: 'REGISTRATION',
          user: {
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
          },
          timestamp: user.created_at,
          description: `New ${user.role.toLowerCase()} registered`,
        })),
        ...recentLogins.map(login => ({
          id: `login_${login.id}`,
          type: 'LOGIN',
          user: {
            name: `${login.user.first_name} ${login.user.last_name}`,
            role: login.user.role,
          },
          timestamp: login.timestamp,
          description: `Logged in from ${login.device_info || 'Unknown device'}`,
        })),
      ];

      // Sort by timestamp and limit
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      activities.splice(parseInt(limit));

      res.json({
        success: true,
        message: 'Recent activities retrieved successfully',
        data: activities,
      });
    } catch (error) {
      console.error('Get recent activities error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get all trainers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTrainers(req, res) {
    try {
      const trainers = await prisma.user.findMany({
        where: {
          role: 'TRAINER',
          is_active: true,
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          role: true,
          is_active: true,
          email_verified: true,
          phone_verified: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      res.json({
        success: true,
        message: 'Trainers retrieved successfully',
        data: {
          users: trainers,
        },
      });
    } catch (error) {
      console.error('Get trainers error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = { DashboardController };
