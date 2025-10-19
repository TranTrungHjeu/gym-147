const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AnalyticsController {
  // ==================== MEMBER ANALYTICS ====================

  // Get member analytics
  async getMemberAnalytics(req, res) {
    try {
      const { period = '30' } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const [totalMembers, activeMembers, newMembers, membershipDistribution, memberGrowth] =
        await Promise.all([
          prisma.member.count(),
          prisma.member.count({
            where: {
              membership_status: 'ACTIVE',
              access_enabled: true,
            },
          }),
          prisma.member.count({
            where: {
              created_at: { gte: startDate },
            },
          }),
          prisma.member.groupBy({
            by: ['membership_type'],
            _count: { id: true },
          }),
          this.getMemberGrowthData(period),
        ]);

      res.json({
        success: true,
        message: 'Member analytics retrieved successfully',
        data: {
          analytics: {
            totalMembers,
            activeMembers,
            newMembers,
            membershipDistribution,
            memberGrowth,
            period: parseInt(period),
          },
        },
      });
    } catch (error) {
      console.error('Get member analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get member growth data
  async getMemberGrowthData(period) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get daily member registrations
    const dailyGrowth = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_members
      FROM members 
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return dailyGrowth;
  }

  // ==================== EQUIPMENT ANALYTICS ====================

  // Get equipment analytics
  async getEquipmentAnalytics(req, res) {
    try {
      const { period = '30' } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const [
        totalEquipment,
        availableEquipment,
        inUseEquipment,
        maintenanceRequired,
        equipmentUtilization,
        popularEquipment,
      ] = await Promise.all([
        prisma.equipment.count(),
        prisma.equipment.count({
          where: { status: 'AVAILABLE' },
        }),
        prisma.equipment.count({
          where: { status: 'IN_USE' },
        }),
        prisma.equipment.count({
          where: {
            next_maintenance: { lte: new Date() },
          },
        }),
        this.getEquipmentUtilizationData(startDate),
        this.getPopularEquipmentData(startDate),
      ]);

      res.json({
        success: true,
        message: 'Equipment analytics retrieved successfully',
        data: {
          analytics: {
            totalEquipment,
            availableEquipment,
            inUseEquipment,
            maintenanceRequired,
            equipmentUtilization,
            popularEquipment,
            period: parseInt(period),
          },
        },
      });
    } catch (error) {
      console.error('Get equipment analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get equipment utilization data
  async getEquipmentUtilizationData(startDate) {
    const utilization = await prisma.equipmentUsage.groupBy({
      by: ['equipment_id'],
      where: {
        start_time: { gte: startDate },
      },
      _count: { id: true },
      _sum: { duration: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Get equipment details
    const equipmentIds = utilization.map(item => item.equipment_id);
    const equipment = await prisma.equipment.findMany({
      where: { id: { in: equipmentIds } },
      select: {
        id: true,
        name: true,
        category: true,
        location: true,
      },
    });

    const equipmentMap = {};
    equipment.forEach(eq => {
      equipmentMap[eq.id] = eq;
    });

    return utilization.map(item => ({
      equipment: equipmentMap[item.equipment_id],
      usageCount: item._count.id,
      totalDuration: item._sum.duration || 0,
    }));
  }

  // Get popular equipment data
  async getPopularEquipmentData(startDate) {
    const popular = await prisma.equipmentUsage.groupBy({
      by: ['equipment_id'],
      where: {
        start_time: { gte: startDate },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const equipmentIds = popular.map(item => item.equipment_id);
    const equipment = await prisma.equipment.findMany({
      where: { id: { in: equipmentIds } },
      select: {
        id: true,
        name: true,
        category: true,
      },
    });

    const equipmentMap = {};
    equipment.forEach(eq => {
      equipmentMap[eq.id] = eq;
    });

    return popular.map(item => ({
      equipment: equipmentMap[item.equipment_id],
      usageCount: item._count.id,
    }));
  }

  // ==================== SESSION ANALYTICS ====================

  // Get session analytics
  async getSessionAnalytics(req, res) {
    try {
      const { period = '30' } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const [
        totalSessions,
        activeSessions,
        totalDuration,
        totalCalories,
        averageSessionDuration,
        peakHours,
        dailyStats,
      ] = await Promise.all([
        prisma.gymSession.count({
          where: { entry_time: { gte: startDate } },
        }),
        prisma.gymSession.count({
          where: {
            entry_time: { gte: startDate },
            exit_time: null,
          },
        }),
        prisma.gymSession.aggregate({
          where: {
            entry_time: { gte: startDate },
            duration: { not: null },
          },
          _sum: { duration: true },
        }),
        prisma.gymSession.aggregate({
          where: {
            entry_time: { gte: startDate },
            calories_burned: { not: null },
          },
          _sum: { calories_burned: true },
        }),
        prisma.gymSession.aggregate({
          where: {
            entry_time: { gte: startDate },
            duration: { not: null },
          },
          _avg: { duration: true },
        }),
        this.getPeakHoursData(startDate),
        this.getDailySessionStats(startDate),
      ]);

      res.json({
        success: true,
        message: 'Session analytics retrieved successfully',
        data: {
          analytics: {
            totalSessions,
            activeSessions,
            totalDuration: totalDuration._sum.duration || 0,
            totalCalories: totalCalories._sum.calories_burned || 0,
            averageSessionDuration: Math.round(averageSessionDuration._avg.duration || 0),
            peakHours,
            dailyStats,
            period: parseInt(period),
          },
        },
      });
    } catch (error) {
      console.error('Get session analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get peak hours data
  async getPeakHoursData(startDate) {
    const peakHours = await prisma.$queryRaw`
      SELECT 
        HOUR(entry_time) as hour,
        COUNT(*) as session_count
      FROM gym_sessions 
      WHERE entry_time >= ${startDate}
      GROUP BY HOUR(entry_time)
      ORDER BY session_count DESC
      LIMIT 5
    `;

    return peakHours;
  }

  // Get daily session stats
  async getDailySessionStats(startDate) {
    const dailyStats = await prisma.$queryRaw`
      SELECT 
        DATE(entry_time) as date,
        COUNT(*) as sessions,
        AVG(duration) as avg_duration,
        SUM(calories_burned) as total_calories
      FROM gym_sessions 
      WHERE entry_time >= ${startDate}
      GROUP BY DATE(entry_time)
      ORDER BY date DESC
    `;

    return dailyStats;
  }

  // ==================== HEALTH ANALYTICS ====================

  // Get health analytics
  async getHealthAnalytics(req, res) {
    try {
      const { period = '30' } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const [totalHealthRecords, healthMetricsByType, averageBMI, healthTrends] = await Promise.all(
        [
          prisma.healthMetric.count({
            where: { recorded_at: { gte: startDate } },
          }),
          prisma.healthMetric.groupBy({
            by: ['metric_type'],
            where: { recorded_at: { gte: startDate } },
            _count: { id: true },
            _avg: { value: true },
          }),
          prisma.healthMetric.aggregate({
            where: {
              metric_type: 'BMI',
              recorded_at: { gte: startDate },
            },
            _avg: { value: true },
          }),
          this.getHealthTrendsData(startDate),
        ]
      );

      res.json({
        success: true,
        message: 'Health analytics retrieved successfully',
        data: {
          analytics: {
            totalHealthRecords,
            healthMetricsByType,
            averageBMI: Math.round((averageBMI._avg.value || 0) * 10) / 10,
            healthTrends,
            period: parseInt(period),
          },
        },
      });
    } catch (error) {
      console.error('Get health analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get health trends data
  async getHealthTrendsData(startDate) {
    const trends = await prisma.$queryRaw`
      SELECT 
        metric_type,
        DATE(recorded_at) as date,
        AVG(value) as avg_value
      FROM health_metrics 
      WHERE recorded_at >= ${startDate}
      GROUP BY metric_type, DATE(recorded_at)
      ORDER BY date DESC
    `;

    return trends;
  }

  // ==================== ACHIEVEMENT ANALYTICS ====================

  // Get achievement analytics
  async getAchievementAnalytics(req, res) {
    try {
      const { period = '30' } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const [totalAchievements, achievementsByCategory, topAchievers, achievementTrends] =
        await Promise.all([
          prisma.achievement.count({
            where: { unlocked_at: { gte: startDate } },
          }),
          prisma.achievement.groupBy({
            by: ['category'],
            where: { unlocked_at: { gte: startDate } },
            _count: { id: true },
            _sum: { points: true },
          }),
          this.getTopAchieversData(period),
          this.getAchievementTrendsData(startDate),
        ]);

      res.json({
        success: true,
        message: 'Achievement analytics retrieved successfully',
        data: {
          analytics: {
            totalAchievements,
            achievementsByCategory,
            topAchievers,
            achievementTrends,
            period: parseInt(period),
          },
        },
      });
    } catch (error) {
      console.error('Get achievement analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get top achievers data
  async getTopAchieversData(period) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const topAchievers = await prisma.achievement.groupBy({
      by: ['member_id'],
      where: { unlocked_at: { gte: startDate } },
      _sum: { points: true },
      _count: { id: true },
      orderBy: { _sum: { points: 'desc' } },
      take: 10,
    });

    const memberIds = topAchievers.map(item => item.member_id);
    const members = await prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: {
        id: true,
        full_name: true,
        membership_number: true,
        profile_photo: true,
      },
    });

    const memberMap = {};
    members.forEach(member => {
      memberMap[member.id] = member;
    });

    return topAchievers.map(item => ({
      member: memberMap[item.member_id],
      totalPoints: item._sum.points || 0,
      totalAchievements: item._count.id || 0,
    }));
  }

  // Get achievement trends data
  async getAchievementTrendsData(startDate) {
    const trends = await prisma.$queryRaw`
      SELECT 
        category,
        DATE(unlocked_at) as date,
        COUNT(*) as achievements_unlocked
      FROM achievements 
      WHERE unlocked_at >= ${startDate}
      GROUP BY category, DATE(unlocked_at)
      ORDER BY date DESC
    `;

    return trends;
  }

  // ==================== COMPREHENSIVE DASHBOARD ====================

  // Get comprehensive dashboard data
  async getDashboardData(req, res) {
    try {
      const { period = '30' } = req.query;

      const [
        memberAnalytics,
        sessionAnalytics,
        equipmentAnalytics,
        achievementAnalytics,
        recentActivity,
      ] = await Promise.all([
        this.getMemberAnalyticsData(period),
        this.getSessionAnalyticsData(period),
        this.getEquipmentAnalyticsData(period),
        this.getAchievementAnalyticsData(period),
        this.getRecentActivityData(),
      ]);

      res.json({
        success: true,
        message: 'Dashboard data retrieved successfully',
        data: {
          dashboard: {
            memberAnalytics,
            sessionAnalytics,
            equipmentAnalytics,
            achievementAnalytics,
            recentActivity,
            period: parseInt(period),
          },
        },
      });
    } catch (error) {
      console.error('Get dashboard data error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Helper methods for dashboard data
  async getMemberAnalyticsData(period) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const [totalMembers, activeMembers, newMembers] = await Promise.all([
      prisma.member.count(),
      prisma.member.count({
        where: {
          membership_status: 'ACTIVE',
          access_enabled: true,
        },
      }),
      prisma.member.count({
        where: { created_at: { gte: startDate } },
      }),
    ]);

    return { totalMembers, activeMembers, newMembers };
  }

  async getSessionAnalyticsData(period) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const [totalSessions, activeSessions, totalCalories] = await Promise.all([
      prisma.gymSession.count({
        where: { entry_time: { gte: startDate } },
      }),
      prisma.gymSession.count({
        where: {
          entry_time: { gte: startDate },
          exit_time: null,
        },
      }),
      prisma.gymSession.aggregate({
        where: {
          entry_time: { gte: startDate },
          calories_burned: { not: null },
        },
        _sum: { calories_burned: true },
      }),
    ]);

    return {
      totalSessions,
      activeSessions,
      totalCalories: totalCalories._sum.calories_burned || 0,
    };
  }

  async getEquipmentAnalyticsData(period) {
    const [totalEquipment, availableEquipment, inUseEquipment] = await Promise.all([
      prisma.equipment.count(),
      prisma.equipment.count({
        where: { status: 'AVAILABLE' },
      }),
      prisma.equipment.count({
        where: { status: 'IN_USE' },
      }),
    ]);

    return { totalEquipment, availableEquipment, inUseEquipment };
  }

  async getAchievementAnalyticsData(period) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const [totalAchievements, totalPoints] = await Promise.all([
      prisma.achievement.count({
        where: { unlocked_at: { gte: startDate } },
      }),
      prisma.achievement.aggregate({
        where: { unlocked_at: { gte: startDate } },
        _sum: { points: true },
      }),
    ]);

    return {
      totalAchievements,
      totalPoints: totalPoints._sum.points || 0,
    };
  }

  async getRecentActivityData() {
    const [recentSessions, recentAchievements, recentMembers] = await Promise.all([
      prisma.gymSession.findMany({
        orderBy: { entry_time: 'desc' },
        take: 5,
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              membership_number: true,
            },
          },
        },
      }),
      prisma.achievement.findMany({
        where: { unlocked_at: { not: null } },
        orderBy: { unlocked_at: 'desc' },
        take: 5,
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              membership_number: true,
            },
          },
        },
      }),
      prisma.member.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          id: true,
          full_name: true,
          membership_number: true,
          membership_type: true,
          created_at: true,
        },
      }),
    ]);

    return {
      recentSessions,
      recentAchievements,
      recentMembers,
    };
  }

  // ==================== REPORTS ====================

  // Generate membership report
  async generateMembershipReport(req, res) {
    try {
      const { start_date, end_date, membership_type } = req.query;

      const where = {};
      if (start_date && end_date) {
        where.created_at = {
          gte: new Date(start_date),
          lte: new Date(end_date),
        };
      }
      if (membership_type) {
        where.membership_type = membership_type;
      }

      const members = await prisma.member.findMany({
        where,
        include: {
          memberships: {
            orderBy: { created_at: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              gym_sessions: true,
              achievements: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Membership report generated successfully',
        data: { members },
      });
    } catch (error) {
      console.error('Generate membership report error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Generate usage report
  async generateUsageReport(req, res) {
    try {
      const { start_date, end_date } = req.query;

      const where = {};
      if (start_date && end_date) {
        where.entry_time = {
          gte: new Date(start_date),
          lte: new Date(end_date),
        };
      }

      const sessions = await prisma.gymSession.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              membership_number: true,
              membership_type: true,
            },
          },
        },
        orderBy: { entry_time: 'desc' },
      });

      res.json({
        success: true,
        message: 'Usage report generated successfully',
        data: { sessions },
      });
    } catch (error) {
      console.error('Generate usage report error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Generate health report
  async generateHealthReport(req, res) {
    try {
      const { start_date, end_date, metric_type } = req.query;

      const where = {};
      if (start_date && end_date) {
        where.recorded_at = {
          gte: new Date(start_date),
          lte: new Date(end_date),
        };
      }
      if (metric_type) {
        where.metric_type = metric_type;
      }

      const metrics = await prisma.healthMetric.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              membership_number: true,
            },
          },
        },
        orderBy: { recorded_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Health report generated successfully',
        data: { metrics },
      });
    } catch (error) {
      console.error('Generate health report error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new AnalyticsController();
