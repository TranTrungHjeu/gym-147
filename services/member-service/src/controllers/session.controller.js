const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SessionController {
  // ==================== GYM SESSION TRACKING ====================

  // Get member's gym sessions
  async getMemberSessions(req, res) {
    try {
      const { id: memberId } = req.params; // Must be Member.id (not user_id)
      const { page = 1, limit = 10, start_date, end_date } = req.query;
      const skip = (page - 1) * limit;

      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      // memberId must be Member.id (not user_id)
      // Schema: GymSession.member_id references Member.id
      const where = { member_id: memberId };
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
      const { id: memberId } = req.params; // Must be Member.id (not user_id)

      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      // memberId must be Member.id (not user_id)
      // Schema: GymSession.member_id references Member.id
      const session = await prisma.gymSession.findFirst({
        where: {
          member_id: memberId,
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
      const { id: memberId } = req.params; // Must be Member.id (not user_id)
      const { entry_method = 'MANUAL', entry_gate } = req.body;

      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      // memberId must be Member.id (not user_id)
      // Schema: GymSession.member_id references Member.id

      // Check member exists and access
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: {
          id: true,
          access_enabled: true,
          membership_status: true,
        },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      if (!member.access_enabled) {
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

      // Check if member has active session
      const activeSession = await prisma.gymSession.findFirst({
        where: {
          member_id: memberId,
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

      const session = await prisma.gymSession.create({
        data: {
          member_id: memberId,
          entry_method,
          entry_gate,
        },
      });

      console.log('✅ Gym session created:', {
        sessionId: session.id,
        memberId: session.member_id,
        entry_time: session.entry_time,
        entry_method: session.entry_method,
        entry_gate: session.entry_gate,
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
      const { id: memberId } = req.params; // Must be Member.id (not user_id)
      const { exit_method = 'MANUAL', exit_gate, session_rating, notes } = req.body;

      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      // memberId must be Member.id (not user_id)
      // Schema: GymSession.member_id references Member.id

      // Find active session
      const activeSession = await prisma.gymSession.findFirst({
        where: {
          member_id: memberId,
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

      console.log('🔍 Looking for equipment usage in session:', {
        sessionId: activeSession.id,
        memberId,
        entry_time: activeSession.entry_time,
        exit_time: exitTime,
        duration_minutes: duration,
      });

      // Calculate total calories from equipment usage in this session
      const equipmentUsages = await prisma.equipmentUsage.findMany({
        where: {
          session_id: activeSession.id, // Filter by session_id
          calories_burned: {
            not: null, // Only count equipment with calories recorded
          },
        },
        select: {
          id: true,
          calories_burned: true,
          duration: true,
          start_time: true,
          end_time: true,
          equipment: {
            select: {
              name: true,
              category: true,
            },
          },
        },
      });

      console.log('📋 Found equipment usages:', {
        count: equipmentUsages.length,
        usages: equipmentUsages.map(u => ({
          id: u.id,
          equipment: u.equipment.name,
          category: u.equipment.category,
          calories: u.calories_burned,
          duration: u.duration,
          start: u.start_time,
          end: u.end_time,
        })),
      });

      // Sum calories from all equipment used during session
      const totalCaloriesFromEquipment = equipmentUsages.reduce(
        (sum, usage) => sum + (usage.calories_burned || 0),
        0
      );

      // ONLY use equipment calories - no fallback estimation
      // If no equipment was used, calories = 0
      const calories_burned = totalCaloriesFromEquipment;

      console.log('🔥 Calories calculation:', {
        sessionId: activeSession.id,
        equipmentUsages: equipmentUsages.length,
        equipmentDetails: equipmentUsages.map(u => ({
          name: u.equipment.name,
          category: u.equipment.category,
          calories: u.calories_burned,
        })),
        totalCaloriesFromEquipment,
        finalCalories: calories_burned,
        noEquipmentUsed: equipmentUsages.length === 0,
      });

      // Generate accurate notes based on final calculated calories
      const generatedNotes = await this.generateSessionNotes(
        calories_burned,
        duration,
        memberId,
        equipmentUsages
      );

      // Use generated notes if mobile app didn't provide custom notes
      const finalNotes = notes || generatedNotes;

      console.log('📝 Session notes:', {
        fromMobileApp: !!notes,
        generated: !notes,
        finalNotes: finalNotes.substring(0, 100) + '...',
      });

      const session = await prisma.gymSession.update({
        where: { id: activeSession.id },
        data: {
          exit_time: exitTime,
          duration,
          exit_method,
          exit_gate,
          calories_burned,
          session_rating,
          notes: finalNotes,
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
      const { id: memberId } = req.params; // Must be Member.id (not user_id)
      const { period = '30' } = req.query; // days

      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      // memberId must be Member.id (not user_id)
      // Schema: GymSession.member_id references Member.id
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const [totalSessions, totalDuration, totalCalories, avgSessionDuration, recentSessions] =
        await Promise.all([
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
              duration: { not: null },
            },
            _sum: { duration: true },
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
          prisma.gymSession.findMany({
            where: {
              member_id: memberId,
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
      const { id: memberId } = req.params; // Must be Member.id (not user_id)
      const { period = 'week' } = req.query;

      console.log('🔍 getCaloriesData called with:', { memberId, period });

      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      // memberId must be Member.id (not user_id)
      // Schema: GymSession.member_id references Member.id

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
          member_id: memberId,
          entry_time: {
            gte: startDate,
          },
        },
        orderBy: {
          entry_time: 'asc',
        },
      });

      console.log(`🔥 Found ${sessions.length} sessions with calories for member ${memberId}`);

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

      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      // memberId must be Member.id (not user_id)
      // Schema: GymSession.member_id references Member.id

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
          member_id: memberId,
          entry_time: {
            gte: startDate,
          },
        },
        orderBy: {
          entry_time: 'asc',
        },
      });

      console.log(`📊 Found ${sessions.length} sessions for member ${memberId}`);

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

  // Generate session notes with accurate data
  async generateSessionNotes(calories, duration, memberId, equipmentUsages = []) {
    try {
      // Fetch member profile for personalized notes
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: {
          weight: true,
          height: true,
          body_fat_percent: true,
        },
      });

      if (!member) {
        return `Completed ${duration} minute workout session. Burned ${calories} kcal.`;
      }

      const { weight, height, body_fat_percent } = member;
      const bmi = weight && height ? (weight / (height / 100) ** 2).toFixed(1) : null;

      // Calculate percentage of daily calories (based on 2000 kcal/day average)
      const dailyCaloriePercentage = ((calories / 2000) * 100).toFixed(1);

      // Generate personalized notes
      let notes = `Completed ${duration} minute workout session. Burned ${calories} kcal (${dailyCaloriePercentage}% of daily intake).`;

      if (bmi) {
        notes += `\nCurrent BMI: ${bmi}`;
      }

      if (body_fat_percent) {
        notes += `, Body Fat: ${body_fat_percent}%`;
      }

      // Add fitness level assessment based on average intensity
      if (duration > 0) {
        const avgCaloriesPerMin = calories / duration;
        let intensity = 'Light';
        if (avgCaloriesPerMin >= 10) {
          intensity = 'High';
        } else if (avgCaloriesPerMin >= 7) {
          intensity = 'Moderate';
        }
        notes += `\nIntensity: ${intensity} (${avgCaloriesPerMin.toFixed(1)} kcal/min)`;
      }

      // Add equipment details if available
      if (equipmentUsages.length > 0) {
        const equipmentSummary = equipmentUsages
          .map(u => `${u.equipment.name} (${u.calories_burned} kcal)`)
          .join(', ');
        notes += `\n\nEquipment used: ${equipmentSummary}`;
      }

      return notes;
    } catch (error) {
      console.error('Generate session notes error:', error);
      return `Completed ${duration} minute workout session. Burned ${calories} kcal.`;
    }
  }
}

module.exports = new SessionController();
