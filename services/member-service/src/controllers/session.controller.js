const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SessionController {
  // ==================== GYM SESSION TRACKING ====================

  // Get member's gym sessions
  async getMemberSessions(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, start_date, end_date } = req.query;
      const skip = (page - 1) * limit;

      const where = { member_id: id };
      if (start_date || end_date) {
        where.entry_time = {};
        if (start_date) where.entry_time.gte = new Date(start_date);
        if (end_date) where.entry_time.lte = new Date(end_date);
      }

      const [sessions, total] = await Promise.all([
        prisma.gymSession.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          orderBy: { entry_time: 'desc' },
        }),
        prisma.gymSession.count({ where }),
      ]);

      res.json({
        success: true,
        message: 'Member sessions retrieved successfully',
        data: {
          sessions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Get member sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get current active session
  async getCurrentSession(req, res) {
    try {
      const { id } = req.params;

      const session = await prisma.gymSession.findFirst({
        where: {
          member_id: id,
          exit_time: null,
        },
        orderBy: { entry_time: 'desc' },
      });

      if (!session) {
        return res.json({
          success: true,
          message: 'No active session found',
          data: { session: null },
        });
      }

      res.json({
        success: true,
        message: 'Current session retrieved successfully',
        data: { session },
      });
    } catch (error) {
      console.error('Get current session error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Record gym entry
  async recordEntry(req, res) {
    try {
      const { id } = req.params;
      const { entry_method = 'MANUAL', entry_gate } = req.body;

      // Check if member has active session
      const activeSession = await prisma.gymSession.findFirst({
        where: {
          member_id: id,
          exit_time: null,
        },
      });

      if (activeSession) {
        return res.status(400).json({
          success: false,
          message: 'Member already has an active session',
          data: null,
        });
      }

      // Check member access
      const member = await prisma.member.findUnique({
        where: { id },
        select: { access_enabled: true, membership_status: true },
      });

      if (!member || !member.access_enabled) {
        return res.status(403).json({
          success: false,
          message: 'Member access is disabled',
          data: null,
        });
      }

      if (member.membership_status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          message: 'Member membership is not active',
          data: null,
        });
      }

      const session = await prisma.gymSession.create({
        data: {
          member_id: id,
          entry_method,
          entry_gate,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Gym entry recorded successfully',
        data: { session },
      });
    } catch (error) {
      console.error('Record entry error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Record gym exit
  async recordExit(req, res) {
    try {
      const { id } = req.params;
      const { exit_method = 'MANUAL', exit_gate, session_rating, notes } = req.body;

      // Find active session
      const activeSession = await prisma.gymSession.findFirst({
        where: {
          member_id: id,
          exit_time: null,
        },
        orderBy: { entry_time: 'desc' },
      });

      if (!activeSession) {
        return res.status(404).json({
          success: false,
          message: 'No active session found',
          data: null,
        });
      }

      const exitTime = new Date();
      const duration = Math.floor((exitTime - activeSession.entry_time) / (1000 * 60)); // minutes

      // Estimate calories burned (rough calculation: 5-10 calories per minute)
      const calories_burned = Math.floor(duration * 7.5);

      const session = await prisma.gymSession.update({
        where: { id: activeSession.id },
        data: {
          exit_time: exitTime,
          duration,
          exit_method,
          exit_gate,
          calories_burned,
          session_rating,
          notes,
        },
      });

      res.json({
        success: true,
        message: 'Gym exit recorded successfully',
        data: { session },
      });
    } catch (error) {
      console.error('Record exit error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get all active sessions
  async getActiveSessions(req, res) {
    try {
      const sessions = await prisma.gymSession.findMany({
        where: { exit_time: null },
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              membership_number: true,
              profile_photo: true,
            },
          },
        },
        orderBy: { entry_time: 'desc' },
      });

      res.json({
        success: true,
        message: 'Active sessions retrieved successfully',
        data: { sessions },
      });
    } catch (error) {
      console.error('Get active sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get session statistics
  async getSessionStats(req, res) {
    try {
      const { id } = req.params;
      const { period = '30' } = req.query; // days

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const [totalSessions, totalDuration, totalCalories, avgSessionDuration, recentSessions] =
        await Promise.all([
          prisma.gymSession.count({
            where: {
              member_id: id,
              entry_time: { gte: startDate },
            },
          }),
          prisma.gymSession.aggregate({
            where: {
              member_id: id,
              entry_time: { gte: startDate },
              duration: { not: null },
            },
            _sum: { duration: true },
          }),
          prisma.gymSession.aggregate({
            where: {
              member_id: id,
              entry_time: { gte: startDate },
              calories_burned: { not: null },
            },
            _sum: { calories_burned: true },
          }),
          prisma.gymSession.aggregate({
            where: {
              member_id: id,
              entry_time: { gte: startDate },
              duration: { not: null },
            },
            _avg: { duration: true },
          }),
          prisma.gymSession.findMany({
            where: {
              member_id: id,
              entry_time: { gte: startDate },
            },
            orderBy: { entry_time: 'desc' },
            take: 10,
          }),
        ]);

      res.json({
        success: true,
        message: 'Session statistics retrieved successfully',
        data: {
          stats: {
            totalSessions,
            totalDuration: totalDuration._sum.duration || 0,
            totalCalories: totalCalories._sum.calories_burned || 0,
            avgSessionDuration: Math.round(avgSessionDuration._avg.duration || 0),
          },
          recentSessions,
        },
      });
    } catch (error) {
      console.error('Get session stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get overall session analytics
  async getSessionAnalytics(req, res) {
    try {
      const { period = '30' } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const [totalActiveMembers, totalSessions, avgSessionDuration, peakHours, dailyStats] =
        await Promise.all([
          prisma.member.count({
            where: {
              gym_sessions: {
                some: {
                  entry_time: { gte: startDate },
                },
              },
            },
          }),
          prisma.gymSession.count({
            where: { entry_time: { gte: startDate } },
          }),
          prisma.gymSession.aggregate({
            where: {
              entry_time: { gte: startDate },
              duration: { not: null },
            },
            _avg: { duration: true },
          }),
          // Get peak hours (simplified)
          prisma.gymSession.groupBy({
            by: ['entry_time'],
            where: { entry_time: { gte: startDate } },
            _count: { id: true },
          }),
          // Daily stats for the period
          prisma.$queryRaw`
          SELECT 
            DATE(entry_time) as date,
            COUNT(*) as sessions,
            AVG(duration) as avg_duration,
            SUM(calories_burned) as total_calories
          FROM gym_sessions 
          WHERE entry_time >= ${startDate}
          GROUP BY DATE(entry_time)
          ORDER BY date DESC
        `,
        ]);

      res.json({
        success: true,
        message: 'Session analytics retrieved successfully',
        data: {
          analytics: {
            totalActiveMembers,
            totalSessions,
            avgSessionDuration: Math.round(avgSessionDuration._avg.duration || 0),
            peakHours: peakHours.slice(0, 5), // Top 5 peak hours
            dailyStats,
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

  // Get calories burned data for charts
  async getCaloriesData(req, res) {
    try {
      const { id: memberId } = req.params;
      const { period = 'week' } = req.query;

      console.log('🔍 getCaloriesData called with:', { memberId, period });

      // Convert user_id to member_id if needed
      let actualMemberId = memberId;

      if (memberId) {
        const memberByUserId = await prisma.member.findUnique({
          where: { user_id: memberId },
          select: { id: true },
        });

        if (memberByUserId) {
          actualMemberId = memberByUserId.id;
          console.log(`🔄 Converted user_id ${memberId} → member_id ${actualMemberId}`);
        }
      }

      // Calculate date range and labels
      let startDate = new Date();
      let labels = [];

      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          labels.push(date.toISOString().split('T')[0]);
        }
      } else if (period === 'month') {
        startDate.setDate(startDate.getDate() - 30);
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      } else if (period === 'year') {
        // Only show last 6 months (or less if current month < 6)
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth(); // 0-11
        const monthsToShow = Math.min(currentMonth + 1, 6); // +1 because month is 0-indexed

        startDate.setMonth(startDate.getMonth() - monthsToShow);
        for (let i = monthsToShow - 1; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          labels.push(date.toISOString().substring(0, 7));
        }
      }

      // Get gym sessions with calories
      const sessions = await prisma.gymSession.findMany({
        where: {
          member_id: actualMemberId,
          entry_time: {
            gte: startDate,
          },
        },
        orderBy: {
          entry_time: 'asc',
        },
      });

      console.log(
        `🔥 Found ${sessions.length} sessions with calories for member ${actualMemberId}`
      );

      // Group calories by period
      const caloriesMap = {};

      if (period === 'week') {
        sessions.forEach(session => {
          const dateKey = session.entry_time.toISOString().split('T')[0];
          caloriesMap[dateKey] = (caloriesMap[dateKey] || 0) + (session.calories_burned || 0);
        });
      } else if (period === 'month') {
        sessions.forEach(session => {
          const daysDiff = Math.floor((new Date() - session.entry_time) / (1000 * 60 * 60 * 24));
          const weekIndex = Math.floor(daysDiff / 7);
          if (weekIndex < 4) {
            const weekKey = `Week ${4 - weekIndex}`;
            caloriesMap[weekKey] = (caloriesMap[weekKey] || 0) + (session.calories_burned || 0);
          }
        });
      } else if (period === 'year') {
        sessions.forEach(session => {
          const monthKey = session.entry_time.toISOString().substring(0, 7);
          caloriesMap[monthKey] = (caloriesMap[monthKey] || 0) + (session.calories_burned || 0);
        });
      }

      // Build data array
      const data = labels.map(label => Math.round(caloriesMap[label] || 0));

      console.log('🔥 Calories data:', { labels, data });

      res.json({
        success: true,
        message: 'Calories data retrieved successfully',
        data: {
          labels,
          datasets: [
            {
              data,
              label: 'Calories',
            },
          ],
          period,
          totalCalories: data.reduce((a, b) => a + b, 0),
        },
      });
    } catch (error) {
      console.error('Get calories data error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get workout frequency for charts
  async getWorkoutFrequency(req, res) {
    try {
      const { id: memberId } = req.params;
      const { period = 'week' } = req.query;

      console.log('🔍 getWorkoutFrequency called with:', { memberId, period });

      // Convert user_id to member_id if needed
      let actualMemberId = memberId;

      if (memberId) {
        const memberByUserId = await prisma.member.findUnique({
          where: { user_id: memberId },
          select: { id: true },
        });

        if (memberByUserId) {
          actualMemberId = memberByUserId.id;
          console.log(`🔄 Converted user_id ${memberId} → member_id ${actualMemberId}`);
        }
      }

      // Calculate date range based on period
      let startDate = new Date();
      let groupBy = 'day';
      let labels = [];

      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
        groupBy = 'day';
        // Get last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          labels.push(date.toISOString().split('T')[0]);
        }
      } else if (period === 'month') {
        startDate.setDate(startDate.getDate() - 30);
        groupBy = 'week';
        // Get last 4 weeks
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      } else if (period === 'year') {
        startDate.setMonth(startDate.getMonth() - 12);
        groupBy = 'month';
        // Get last 12 months
        for (let i = 11; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          labels.push(date.toISOString().substring(0, 7)); // YYYY-MM
        }
      }

      // Get gym sessions for the period
      const sessions = await prisma.gymSession.findMany({
        where: {
          member_id: actualMemberId,
          entry_time: {
            gte: startDate,
          },
        },
        orderBy: {
          entry_time: 'asc',
        },
      });

      console.log(`📊 Found ${sessions.length} sessions for member ${actualMemberId}`);

      // Group sessions by period
      const frequencyMap = {};

      if (period === 'week') {
        // Group by day
        sessions.forEach(session => {
          const dateKey = session.entry_time.toISOString().split('T')[0];
          frequencyMap[dateKey] = (frequencyMap[dateKey] || 0) + 1;
        });
      } else if (period === 'month') {
        // Group by week
        sessions.forEach(session => {
          const daysDiff = Math.floor((new Date() - session.entry_time) / (1000 * 60 * 60 * 24));
          const weekIndex = Math.floor(daysDiff / 7);
          if (weekIndex < 4) {
            const weekKey = `Week ${4 - weekIndex}`;
            frequencyMap[weekKey] = (frequencyMap[weekKey] || 0) + 1;
          }
        });
      } else if (period === 'year') {
        // Group by month
        sessions.forEach(session => {
          const monthKey = session.entry_time.toISOString().substring(0, 7);
          frequencyMap[monthKey] = (frequencyMap[monthKey] || 0) + 1;
        });
      }

      // Build data array matching labels
      const data = labels.map(label => frequencyMap[label] || 0);

      console.log('📊 Workout frequency data:', { labels, data });

      res.json({
        success: true,
        message: 'Workout frequency retrieved successfully',
        data: {
          labels,
          datasets: [
            {
              data,
              label: 'Workouts',
            },
          ],
          period,
          totalWorkouts: sessions.length,
        },
      });
    } catch (error) {
      console.error('Get workout frequency error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new SessionController();
