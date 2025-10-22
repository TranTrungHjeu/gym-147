const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AnalyticsController {
  // ==================== PHÂN TÍCH THÀNH VIÊN ====================

  // Lấy phân tích thành viên
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
        message: 'Lấy phân tích thành viên thành công',
        data: {
          analytics: {
            totalMembers: Number(totalMembers),
            activeMembers: Number(activeMembers),
            newMembers: Number(newMembers),
            membershipDistribution: membershipDistribution.map(item => ({
              ...item,
              _count: {
                id: Number(item._count.id),
              },
            })),
            memberGrowth,
            period: parseInt(period),
          },
        },
      });
    } catch (error) {
      console.error('Lỗi lấy phân tích thành viên:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ nội bộ',
        data: null,
      });
    }
  }

  // Lấy dữ liệu tăng trưởng thành viên
  async getMemberGrowthData(period) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Lấy đăng ký thành viên hàng ngày
    const dailyGrowth = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_members
      FROM members 
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return dailyGrowth.map(item => ({
      ...item,
      new_members: Number(item.new_members),
    }));
  }

  // ==================== PHÂN TÍCH THIẾT BỊ ====================

  // Lấy phân tích thiết bị
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
        message: 'Lỗi máy chủ nội bộ',
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
        message: 'Lỗi máy chủ nội bộ',
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
        message: 'Lỗi máy chủ nội bộ',
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
        message: 'Lỗi máy chủ nội bộ',
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

  // Get comprehensive dashboard data (admin view)
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
        message: 'Lỗi máy chủ nội bộ',
        data: null,
      });
    }
  }

  // Get member-specific dashboard data
  async getMemberDashboardData(req, res) {
    try {
      // Get user_id from JWT token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'No token provided',
          data: null,
        });
      }

      const token = authHeader.split(' ')[1];
      // Decode JWT token to get user_id (simplified - in production use proper JWT verification)
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const userId = payload.userId;

      // Get member by user_id
      const member = await prisma.member.findUnique({
        where: { user_id: userId },
        select: { id: true, full_name: true, membership_number: true },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      const { period = '30' } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const [memberStats, recentSessions, recentAchievements, healthMetrics, workoutPlans] =
        await Promise.all([
          this.getMemberStatsData(member.id, period),
          this.getMemberRecentSessions(member.id, 5),
          this.getMemberRecentAchievements(member.id, 5),
          this.getMemberHealthMetrics(member.id, period),
          this.getMemberWorkoutPlans(member.id),
        ]);

      res.json({
        success: true,
        message: 'Member dashboard data retrieved successfully',
        data: {
          dashboard: {
            member: {
              id: member.id,
              full_name: member.full_name,
              membership_number: member.membership_number,
            },
            stats: memberStats,
            recentActivity: {
              recentSessions,
              recentAchievements,
            },
            healthMetrics,
            workoutPlans,
            period: parseInt(period),
          },
        },
      });
    } catch (error) {
      console.error('Get member dashboard data error:', error);
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
    console.log('✅ Sử dụng phiên bản truy vấn đã sửa (không null)');

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

  // Member-specific helper methods
  async getMemberStatsData(memberId, period) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const [totalSessions, totalCalories, avgDuration, currentStreak] = await Promise.all([
      prisma.gymSession.count({
        where: {
          member_id: memberId,
          entry_time: { gte: startDate },
        },
      }),
      prisma.gymSession.aggregate({
        where: {
          member_id: memberId,
          entry_time: { gte: startDate },
          calories_burned: { not: null },
        },
        _sum: { calories_burned: true },
      }),
      prisma.gymSession.aggregate({
        where: {
          member_id: memberId,
          entry_time: { gte: startDate },
          duration: { not: null },
        },
        _avg: { duration: true },
      }),
      this.getMemberCurrentStreak(memberId),
    ]);

    return {
      totalSessions,
      totalCalories: totalCalories._sum.calories_burned || 0,
      avgDuration: Math.round(avgDuration._avg.duration || 0),
      currentStreak,
    };
  }

  async getMemberRecentSessions(memberId, limit = 5) {
    return await prisma.gymSession.findMany({
      where: { member_id: memberId },
      orderBy: { entry_time: 'desc' },
      take: limit,
      select: {
        id: true,
        entry_time: true,
        exit_time: true,
        duration: true,
        calories_burned: true,
        session_rating: true,
        entry_method: true,
        exit_method: true,
      },
    });
  }

  async getMemberRecentAchievements(memberId, limit = 5) {
    return await prisma.achievement.findMany({
      where: { member_id: memberId },
      orderBy: { unlocked_at: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        points: true,
        badge_icon: true,
        unlocked_at: true,
      },
    });
  }

  async getMemberHealthMetrics(memberId, period) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const [weight, bodyFat, heartRate] = await Promise.all([
      prisma.healthMetric.findFirst({
        where: {
          member_id: memberId,
          metric_type: 'WEIGHT',
          recorded_at: { gte: startDate },
        },
        orderBy: { recorded_at: 'desc' },
      }),
      prisma.healthMetric.findFirst({
        where: {
          member_id: memberId,
          metric_type: 'BODY_FAT',
          recorded_at: { gte: startDate },
        },
        orderBy: { recorded_at: 'desc' },
      }),
      prisma.healthMetric.findFirst({
        where: {
          member_id: memberId,
          metric_type: 'HEART_RATE',
          recorded_at: { gte: startDate },
        },
        orderBy: { recorded_at: 'desc' },
      }),
    ]);

    return {
      weight: weight?.value || null,
      bodyFat: bodyFat?.value || null,
      heartRate: heartRate?.value || null,
    };
  }

  async getMemberWorkoutPlans(memberId) {
    return await prisma.workoutPlan.findMany({
      where: {
        member_id: memberId,
        is_active: true,
      },
      orderBy: { created_at: 'desc' },
      take: 3,
      select: {
        id: true,
        name: true,
        description: true,
        difficulty: true,
        duration_weeks: true,
        goal: true,
      },
    });
  }

  async getMemberCurrentStreak(memberId) {
    // Calculate current streak of consecutive days with gym sessions
    const sessions = await prisma.gymSession.findMany({
      where: { member_id: memberId },
      orderBy: { entry_time: 'desc' },
      select: { entry_time: true },
    });

    if (sessions.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sessions.length; i++) {
      const sessionDate = new Date(sessions[i].entry_time);
      sessionDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today - sessionDate) / (1000 * 60 * 60 * 24));

      if (daysDiff === streak) {
        streak++;
      } else if (daysDiff === streak + 1) {
        streak++;
        today.setDate(today.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
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
        message: 'Lỗi máy chủ nội bộ',
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
        message: 'Lỗi máy chủ nội bộ',
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
        message: 'Lỗi máy chủ nội bộ',
        data: null,
      });
    }
  }
}

module.exports = new AnalyticsController();
