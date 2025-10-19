const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AchievementController {
  // ==================== ACHIEVEMENT MANAGEMENT ====================

  // Get member's achievements
  async getMemberAchievements(req, res) {
    try {
      const { id } = req.params;
      const { category, unlocked_only = false } = req.query;

      const where = { member_id: id };
      if (category) where.category = category;
      if (unlocked_only === 'true') {
        where.unlocked_at = { not: null };
      }

      const achievements = await prisma.achievement.findMany({
        where,
        orderBy: { unlocked_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Member achievements retrieved successfully',
        data: { achievements },
      });
    } catch (error) {
      console.error('Get member achievements error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get achievement by ID
  async getAchievementById(req, res) {
    try {
      const { id } = req.params;

      const achievement = await prisma.achievement.findUnique({
        where: { id },
      });

      if (!achievement) {
        return res.status(404).json({
          success: false,
          message: 'Achievement not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Achievement retrieved successfully',
        data: { achievement },
      });
    } catch (error) {
      console.error('Get achievement by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Create achievement
  async createAchievement(req, res) {
    try {
      const { id } = req.params;
      const { title, description, category, points, badge_icon } = req.body;

      // Validate required fields
      if (!title || !description || !category || !points) {
        return res.status(400).json({
          success: false,
          message: 'Title, description, category, and points are required',
          data: null,
        });
      }

      // Validate category
      const validCategories = [
        'FITNESS',
        'ATTENDANCE',
        'STREAK',
        'MILESTONE',
        'CHALLENGE',
        'SOCIAL',
        'HEALTH',
      ];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid achievement category',
          data: null,
        });
      }

      const achievement = await prisma.achievement.create({
        data: {
          member_id: id,
          title,
          description,
          category,
          points: parseInt(points),
          badge_icon,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Achievement created successfully',
        data: { achievement },
      });
    } catch (error) {
      console.error('Create achievement error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Unlock achievement
  async unlockAchievement(req, res) {
    try {
      const { id } = req.params;

      const achievement = await prisma.achievement.findUnique({
        where: { id },
      });

      if (!achievement) {
        return res.status(404).json({
          success: false,
          message: 'Achievement not found',
          data: null,
        });
      }

      if (achievement.unlocked_at) {
        return res.status(400).json({
          success: false,
          message: 'Achievement is already unlocked',
          data: null,
        });
      }

      const unlockedAchievement = await prisma.achievement.update({
        where: { id },
        data: { unlocked_at: new Date() },
      });

      res.json({
        success: true,
        message: 'Achievement unlocked successfully',
        data: { achievement: unlockedAchievement },
      });
    } catch (error) {
      console.error('Unlock achievement error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Delete achievement
  async deleteAchievement(req, res) {
    try {
      const { id } = req.params;

      await prisma.achievement.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Achievement deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete achievement error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== ACHIEVEMENT SYSTEM ====================

  // Check and award achievements
  async checkAndAwardAchievements(req, res) {
    try {
      const { id } = req.params;

      const achievements = await this.processAchievementChecks(id);

      res.json({
        success: true,
        message: 'Achievement checks completed',
        data: { newAchievements: achievements },
      });
    } catch (error) {
      console.error('Check and award achievements error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Process achievement checks for a member
  async processAchievementChecks(memberId) {
    const newAchievements = [];

    // Get member's data for achievement checks
    const memberData = await this.getMemberDataForAchievements(memberId);

    // Check various achievement types
    const achievementChecks = [
      this.checkAttendanceAchievements(memberId, memberData),
      this.checkStreakAchievements(memberId, memberData),
      this.checkFitnessAchievements(memberId, memberData),
      this.checkMilestoneAchievements(memberId, memberData),
      this.checkHealthAchievements(memberId, memberData),
    ];

    const results = await Promise.all(achievementChecks);

    for (const achievements of results) {
      newAchievements.push(...achievements);
    }

    return newAchievements;
  }

  // Get member data needed for achievement checks
  async getMemberDataForAchievements(memberId) {
    const [
      totalSessions,
      recentSessions,
      totalDuration,
      totalCalories,
      equipmentUsage,
      healthMetrics,
      currentStreak,
      longestStreak,
    ] = await Promise.all([
      prisma.gymSession.count({
        where: { member_id: memberId },
      }),
      prisma.gymSession.findMany({
        where: { member_id: memberId },
        orderBy: { entry_time: 'desc' },
        take: 30,
      }),
      prisma.gymSession.aggregate({
        where: { member_id: memberId },
        _sum: { duration: true },
      }),
      prisma.gymSession.aggregate({
        where: { member_id: memberId },
        _sum: { calories_burned: true },
      }),
      prisma.equipmentUsage.count({
        where: { member_id: memberId },
      }),
      prisma.healthMetric.findMany({
        where: { member_id: memberId },
        orderBy: { recorded_at: 'desc' },
        take: 10,
      }),
      this.calculateCurrentStreak(memberId),
      this.calculateLongestStreak(memberId),
    ]);

    return {
      totalSessions,
      recentSessions,
      totalDuration: totalDuration._sum.duration || 0,
      totalCalories: totalCalories._sum.calories_burned || 0,
      equipmentUsage,
      healthMetrics,
      currentStreak,
      longestStreak,
    };
  }

  // Check attendance-based achievements
  async checkAttendanceAchievements(memberId, memberData) {
    const newAchievements = [];

    // First visit
    if (memberData.totalSessions === 1) {
      const achievement = await this.createAchievementIfNotExists(memberId, {
        title: 'First Steps',
        description: 'Completed your first gym session',
        category: 'ATTENDANCE',
        points: 10,
        badge_icon: '🎯',
      });
      if (achievement) newAchievements.push(achievement);
    }

    // 10 sessions
    if (memberData.totalSessions === 10) {
      const achievement = await this.createAchievementIfNotExists(memberId, {
        title: 'Getting Started',
        description: 'Completed 10 gym sessions',
        category: 'ATTENDANCE',
        points: 25,
        badge_icon: '💪',
      });
      if (achievement) newAchievements.push(achievement);
    }

    // 50 sessions
    if (memberData.totalSessions === 50) {
      const achievement = await this.createAchievementIfNotExists(memberId, {
        title: 'Dedicated Member',
        description: 'Completed 50 gym sessions',
        category: 'ATTENDANCE',
        points: 100,
        badge_icon: '🏆',
      });
      if (achievement) newAchievements.push(achievement);
    }

    // 100 sessions
    if (memberData.totalSessions === 100) {
      const achievement = await this.createAchievementIfNotExists(memberId, {
        title: 'Century Club',
        description: 'Completed 100 gym sessions',
        category: 'MILESTONE',
        points: 250,
        badge_icon: '💯',
      });
      if (achievement) newAchievements.push(achievement);
    }

    return newAchievements;
  }

  // Check streak-based achievements
  async checkStreakAchievements(memberId, memberData) {
    const newAchievements = [];

    // 3-day streak
    if (memberData.currentStreak >= 3) {
      const achievement = await this.createAchievementIfNotExists(memberId, {
        title: 'Three Day Warrior',
        description: 'Maintained a 3-day gym streak',
        category: 'STREAK',
        points: 15,
        badge_icon: '🔥',
      });
      if (achievement) newAchievements.push(achievement);
    }

    // 7-day streak
    if (memberData.currentStreak >= 7) {
      const achievement = await this.createAchievementIfNotExists(memberId, {
        title: 'Week Warrior',
        description: 'Maintained a 7-day gym streak',
        category: 'STREAK',
        points: 50,
        badge_icon: '⚡',
      });
      if (achievement) newAchievements.push(achievement);
    }

    // 30-day streak
    if (memberData.currentStreak >= 30) {
      const achievement = await this.createAchievementIfNotExists(memberId, {
        title: 'Monthly Master',
        description: 'Maintained a 30-day gym streak',
        category: 'STREAK',
        points: 200,
        badge_icon: '👑',
      });
      if (achievement) newAchievements.push(achievement);
    }

    return newAchievements;
  }

  // Check fitness-based achievements
  async checkFitnessAchievements(memberId, memberData) {
    const newAchievements = [];

    // 1000 calories burned
    if (memberData.totalCalories >= 1000) {
      const achievement = await this.createAchievementIfNotExists(memberId, {
        title: 'Calorie Crusher',
        description: 'Burned 1,000 calories at the gym',
        category: 'FITNESS',
        points: 30,
        badge_icon: '🔥',
      });
      if (achievement) newAchievements.push(achievement);
    }

    // 10,000 calories burned
    if (memberData.totalCalories >= 10000) {
      const achievement = await this.createAchievementIfNotExists(memberId, {
        title: 'Calorie King/Queen',
        description: 'Burned 10,000 calories at the gym',
        category: 'FITNESS',
        points: 150,
        badge_icon: '👑',
      });
      if (achievement) newAchievements.push(achievement);
    }

    // 100 hours total
    if (memberData.totalDuration >= 6000) {
      // 6000 minutes = 100 hours
      const achievement = await this.createAchievementIfNotExists(memberId, {
        title: 'Century Hours',
        description: 'Spent 100 hours at the gym',
        category: 'FITNESS',
        points: 200,
        badge_icon: '⏰',
      });
      if (achievement) newAchievements.push(achievement);
    }

    return newAchievements;
  }

  // Check milestone achievements
  async checkMilestoneAchievements(memberId, memberData) {
    const newAchievements = [];

    // 1 month membership
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { created_at: true },
    });

    if (member) {
      const daysSinceJoined = Math.floor((new Date() - member.created_at) / (1000 * 60 * 60 * 24));

      if (daysSinceJoined >= 30) {
        const achievement = await this.createAchievementIfNotExists(memberId, {
          title: 'One Month Strong',
          description: 'Been a member for 1 month',
          category: 'MILESTONE',
          points: 50,
          badge_icon: '📅',
        });
        if (achievement) newAchievements.push(achievement);
      }

      if (daysSinceJoined >= 365) {
        const achievement = await this.createAchievementIfNotExists(memberId, {
          title: 'One Year Champion',
          description: 'Been a member for 1 year',
          category: 'MILESTONE',
          points: 500,
          badge_icon: '🎂',
        });
        if (achievement) newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  // Check health-based achievements
  async checkHealthAchievements(memberId, memberData) {
    const newAchievements = [];

    // Check for weight loss achievement
    const weightMetrics = memberData.healthMetrics.filter(m => m.metric_type === 'WEIGHT');
    if (weightMetrics.length >= 2) {
      const latestWeight = weightMetrics[0].value;
      const oldestWeight = weightMetrics[weightMetrics.length - 1].value;
      const weightLoss = oldestWeight - latestWeight;

      if (weightLoss >= 5) {
        // 5kg weight loss
        const achievement = await this.createAchievementIfNotExists(memberId, {
          title: 'Weight Loss Warrior',
          description: 'Lost 5kg or more',
          category: 'HEALTH',
          points: 100,
          badge_icon: '⚖️',
        });
        if (achievement) newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  // Create achievement if it doesn't already exist
  async createAchievementIfNotExists(memberId, achievementData) {
    const existingAchievement = await prisma.achievement.findFirst({
      where: {
        member_id: memberId,
        title: achievementData.title,
      },
    });

    if (!existingAchievement) {
      const achievement = await prisma.achievement.create({
        data: {
          member_id: memberId,
          ...achievementData,
          unlocked_at: new Date(),
        },
      });
      return achievement;
    }

    return null;
  }

  // Calculate current streak
  async calculateCurrentStreak(memberId) {
    const sessions = await prisma.gymSession.findMany({
      where: { member_id: memberId },
      orderBy: { entry_time: 'desc' },
    });

    if (sessions.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of sessions) {
      const sessionDate = new Date(session.entry_time);
      sessionDate.setHours(0, 0, 0, 0);

      if (sessionDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (sessionDate.getTime() === currentDate.getTime() - 24 * 60 * 60 * 1000) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  // Calculate longest streak
  async calculateLongestStreak(memberId) {
    const sessions = await prisma.gymSession.findMany({
      where: { member_id: memberId },
      orderBy: { entry_time: 'asc' },
    });

    if (sessions.length === 0) return 0;

    let longestStreak = 0;
    let currentStreak = 1;
    let lastDate = new Date(sessions[0].entry_time);
    lastDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < sessions.length; i++) {
      const currentDate = new Date(sessions[i].entry_time);
      currentDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        currentStreak++;
      } else if (daysDiff > 1) {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }

      lastDate = currentDate;
    }

    return Math.max(longestStreak, currentStreak);
  }

  // ==================== LEADERBOARD ====================

  // Get achievement leaderboard
  async getAchievementLeaderboard(req, res) {
    try {
      const { category, limit = 10 } = req.query;

      const where = {
        unlocked_at: { not: null },
      };
      if (category) where.category = category;

      const leaderboard = await prisma.achievement.groupBy({
        by: ['member_id'],
        where,
        _sum: { points: true },
        _count: { id: true },
        orderBy: { _sum: { points: 'desc' } },
        take: parseInt(limit),
      });

      // Get member details for leaderboard
      const memberIds = leaderboard.map(item => item.member_id);
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

      const leaderboardWithMembers = leaderboard.map(item => ({
        member: memberMap[item.member_id],
        totalPoints: item._sum.points || 0,
        totalAchievements: item._count.id || 0,
      }));

      res.json({
        success: true,
        message: 'Achievement leaderboard retrieved successfully',
        data: { leaderboard: leaderboardWithMembers },
      });
    } catch (error) {
      console.error('Get achievement leaderboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get member's achievement summary
  async getMemberAchievementSummary(req, res) {
    try {
      const { id } = req.params;

      const [totalAchievements, totalPoints, achievementsByCategory, recentAchievements] =
        await Promise.all([
          prisma.achievement.count({
            where: {
              member_id: id,
              unlocked_at: { not: null },
            },
          }),
          prisma.achievement.aggregate({
            where: {
              member_id: id,
              unlocked_at: { not: null },
            },
            _sum: { points: true },
          }),
          prisma.achievement.groupBy({
            by: ['category'],
            where: {
              member_id: id,
              unlocked_at: { not: null },
            },
            _count: { id: true },
            _sum: { points: true },
          }),
          prisma.achievement.findMany({
            where: {
              member_id: id,
              unlocked_at: { not: null },
            },
            orderBy: { unlocked_at: 'desc' },
            take: 5,
          }),
        ]);

      res.json({
        success: true,
        message: 'Achievement summary retrieved successfully',
        data: {
          summary: {
            totalAchievements,
            totalPoints: totalPoints._sum.points || 0,
            achievementsByCategory,
            recentAchievements,
          },
        },
      });
    } catch (error) {
      console.error('Get member achievement summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new AchievementController();
