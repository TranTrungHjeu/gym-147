const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AchievementController {
  /**
   * Get all achievements
   */
  async getAllAchievements(req, res) {
    try {
      const achievements = await prisma.achievement.findMany({
        orderBy: { created_at: 'desc' },
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
}

module.exports = new AchievementController();
