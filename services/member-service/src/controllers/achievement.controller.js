const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AchievementController {
  /**
   * Get all achievements
   */
  async getAllAchievements(req, res) {
    try {
      const achievements = await prisma.achievement.findMany({
        orderBy: { unlocked_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Achievements retrieved successfully',
        data: achievements,
      });
    } catch (error) {
      console.error('Get achievements error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get achievement by ID
   */
  async getAchievementById(req, res) {
    try {
      console.log('📌 getAchievementById called with ID:', req.params.id);
      const { id } = req.params;
      const achievement = await prisma.achievement.findUnique({
        where: { id },
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              membership_number: true,
            },
          },
        },
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
        data: achievement,
      });
    } catch (error) {
      console.error('Get achievement error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get achievement summary
   */
  async getAchievementSummary(req, res) {
    try {
      const [totalAchievements, unlockedAchievements, recentAchievements] = await Promise.all([
        prisma.achievement.count(),
        prisma.achievement.count({
          where: { unlocked_at: { not: null } },
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
      ]);

      res.json({
        success: true,
        message: 'Achievement summary retrieved successfully',
        data: {
          totalAchievements: Number(totalAchievements),
          unlockedAchievements: Number(unlockedAchievements),
          recentAchievements,
        },
      });
    } catch (error) {
      console.error('Get achievement summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get member achievements
   */
  async getMemberAchievements(req, res) {
    try {
      const { id } = req.params;
      const achievements = await prisma.achievement.findMany({
        where: { member_id: id },
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Member achievements retrieved successfully',
        data: achievements,
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

  /**
   * Unlock achievement
   */
  async unlockAchievement(req, res) {
    try {
      const { id } = req.params;
      const { memberId } = req.body;

      const achievement = await prisma.achievement.update({
        where: { id },
        data: {
          unlocked_at: new Date(),
          member_id: memberId,
        },
      });

      res.json({
        success: true,
        message: 'Achievement unlocked successfully',
        data: achievement,
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

  /**
   * Get achievement leaderboard
   */
  async getAchievementLeaderboard(req, res) {
    try {
      const { period, limit } = req.query;
      const leaderboardLimit = parseInt(limit) || 50;

      // Build date filter based on period
      const dateFilter = this.getPeriodFilter(period || 'monthly');

      // Get aggregated points per member
      const membersWithPoints = await prisma.achievement.groupBy({
        by: ['member_id'],
        _sum: {
          points: true,
        },
        _count: {
          id: true,
        },
        where: dateFilter,
        orderBy: {
          _sum: {
            points: 'desc',
          },
        },
        take: leaderboardLimit,
      });

      // Get member details for each entry
      const leaderboardWithDetails = await Promise.all(
        membersWithPoints.map(async (entry, index) => {
          const member = await prisma.member.findUnique({
            where: { id: entry.member_id },
            select: {
              id: true,
              full_name: true,
              profile_photo: true,
              membership_type: true,
            },
          });

          return {
            rank: index + 1,
            memberId: entry.member_id,
            memberName: member?.full_name || 'Unknown',
            avatarUrl: member?.profile_photo || null,
            membershipType: member?.membership_type || 'BASIC',
            points: entry._sum.points || 0,
            achievements: entry._count.id || 0,
            workouts: 0, // Will be calculated separately if needed
            isCurrentUser: false, // Will be set by frontend
          };
        })
      );

      res.json({
        success: true,
        message: 'Leaderboard retrieved successfully',
        data: leaderboardWithDetails,
      });
    } catch (error) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get user rank in leaderboard
   */
  async getUserRank(req, res) {
    try {
      const { userId } = req.params;
      const { period } = req.query;

      console.log('🔍 getUserRank called with userId:', userId, 'period:', period);

      // Find member by user_id first (since frontend sends identity service user_id)
      const member = await prisma.member.findUnique({
        where: { user_id: userId },
        select: {
          id: true,
          full_name: true,
          profile_photo: true,
          membership_type: true,
        },
      });

      console.log('👤 Member found:', member ? 'YES ✅' : 'NO ❌');
      if (member) {
        console.log('   Member ID:', member.id);
        console.log('   Name:', member.full_name);
      }

      if (!member) {
        console.log('❌ Returning 404 - Member not found');
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      const memberId = member.id;

      // Build date filter based on period
      const dateFilter = this.getPeriodFilter(period || 'monthly');

      // Get user's total points
      const userPoints = await prisma.achievement.aggregate({
        _sum: {
          points: true,
        },
        _count: {
          id: true,
        },
        where: {
          member_id: memberId,
          ...dateFilter,
        },
      });

      const totalPoints = userPoints._sum.points || 0;
      const achievementsCount = userPoints._count.id || 0;

      // Get users with more points (to calculate rank)
      const usersAbove = await prisma.achievement.groupBy({
        by: ['member_id'],
        _sum: {
          points: true,
        },
        where: dateFilter,
        having: {
          points: {
            _sum: {
              gt: totalPoints,
            },
          },
        },
      });

      const rank = usersAbove.length + 1;

      res.json({
        success: true,
        message: 'User rank retrieved successfully',
        data: {
          rank,
          memberId: memberId,
          memberName: member.full_name,
          avatarUrl: member.profile_photo,
          membershipType: member.membership_type,
          points: totalPoints,
          achievements: achievementsCount,
          workouts: 0, // Will be calculated separately if needed
          isCurrentUser: true,
        },
      });
    } catch (error) {
      console.error('Get user rank error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get member achievement summary
   */
  async getMemberAchievementSummary(req, res) {
    try {
      const { id } = req.params;

      const [totalPoints, totalAchievements, recentAchievements, categories] = await Promise.all([
        // Total points
        prisma.achievement.aggregate({
          _sum: {
            points: true,
          },
          where: {
            member_id: id,
          },
        }),
        // Total achievements
        prisma.achievement.count({
          where: {
            member_id: id,
          },
        }),
        // Recent achievements
        prisma.achievement.findMany({
          where: {
            member_id: id,
          },
          orderBy: {
            unlocked_at: 'desc',
          },
          take: 10,
        }),
        // Achievements by category
        prisma.achievement.groupBy({
          by: ['category'],
          _count: {
            id: true,
          },
          where: {
            member_id: id,
          },
        }),
      ]);

      res.json({
        success: true,
        message: 'Member achievement summary retrieved successfully',
        data: {
          total_points: totalPoints._sum.points || 0,
          total_achievements: totalAchievements,
          recent_achievements: recentAchievements,
          categories: categories.map(cat => ({
            category: cat.category,
            count: cat._count.id,
          })),
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

  /**
   * Create achievement
   */
  async createAchievement(req, res) {
    try {
      const { id } = req.params;
      const { title, description, category, points, badge_icon } = req.body;

      const achievement = await prisma.achievement.create({
        data: {
          member_id: id,
          title,
          description,
          category,
          points: points || 0,
          badge_icon: badge_icon || null,
        },
      });

      res.json({
        success: true,
        message: 'Achievement created successfully',
        data: achievement,
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

  /**
   * Delete achievement
   */
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

  /**
   * Check and award achievements
   */
  async checkAndAwardAchievements(req, res) {
    try {
      const { id } = req.params;

      // Get member's stats
      const [gymSessions, totalCalories, equipmentUsage] = await Promise.all([
        prisma.gymSession.count({
          where: { member_id: id },
        }),
        prisma.gymSession.aggregate({
          _sum: {
            calories_burned: true,
          },
          where: { member_id: id },
        }),
        prisma.equipmentUsage.count({
          where: { member_id: id },
        }),
      ]);

      const newAchievements = [];

      // Check for "First Visit" achievement
      if (gymSessions === 1) {
        const exists = await prisma.achievement.findFirst({
          where: {
            member_id: id,
            title: 'First Visit',
          },
        });

        if (!exists) {
          const achievement = await prisma.achievement.create({
            data: {
              member_id: id,
              title: 'First Visit',
              description: 'Completed your first gym session',
              category: 'ATTENDANCE',
              points: 10,
              badge_icon: '🎉',
            },
          });
          newAchievements.push(achievement);
        }
      }

      // Check for "Gym Regular" achievement (10 visits)
      if (gymSessions >= 10) {
        const exists = await prisma.achievement.findFirst({
          where: {
            member_id: id,
            title: 'Gym Regular',
          },
        });

        if (!exists) {
          const achievement = await prisma.achievement.create({
            data: {
              member_id: id,
              title: 'Gym Regular',
              description: 'Completed 10 gym sessions',
              category: 'ATTENDANCE',
              points: 50,
              badge_icon: '💪',
            },
          });
          newAchievements.push(achievement);
        }
      }

      // Check for "Calorie Burner" achievement (1000 calories)
      if ((totalCalories._sum.calories_burned || 0) >= 1000) {
        const exists = await prisma.achievement.findFirst({
          where: {
            member_id: id,
            title: 'Calorie Burner',
          },
        });

        if (!exists) {
          const achievement = await prisma.achievement.create({
            data: {
              member_id: id,
              title: 'Calorie Burner',
              description: 'Burned 1000 calories in total',
              category: 'FITNESS',
              points: 75,
              badge_icon: '🔥',
            },
          });
          newAchievements.push(achievement);
        }
      }

      // Check for "Equipment Explorer" achievement (tried 5 different equipment)
      const uniqueEquipment = await prisma.equipmentUsage.groupBy({
        by: ['equipment_id'],
        where: {
          member_id: id,
        },
      });

      if (uniqueEquipment.length >= 5) {
        const exists = await prisma.achievement.findFirst({
          where: {
            member_id: id,
            title: 'Equipment Explorer',
          },
        });

        if (!exists) {
          const achievement = await prisma.achievement.create({
            data: {
              member_id: id,
              title: 'Equipment Explorer',
              description: 'Used 5 different equipment types',
              category: 'FITNESS',
              points: 30,
              badge_icon: '🏋️',
            },
          });
          newAchievements.push(achievement);
        }
      }

      res.json({
        success: true,
        message: `Checked achievements. ${newAchievements.length} new achievements awarded.`,
        data: {
          new_achievements: newAchievements,
          total_unlocked: newAchievements.length,
        },
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

  /**
   * Helper: Get period filter for queries
   */
  getPeriodFilter(period) {
    const now = new Date();
    let startDate;

    switch (period.toLowerCase()) {
      case 'weekly':
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'alltime':
      case 'all_time':
        return {}; // No date filter
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return {
      unlocked_at: {
        gte: startDate,
      },
    };
  }
}

module.exports = new AchievementController();
