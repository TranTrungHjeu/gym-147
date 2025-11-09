const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const notificationService = require('./notification.service.js');

/**
 * Daily Streak Service
 * Manages member daily streaks and automatic tracking
 */
class StreakService {
  /**
   * Update streak when member has gym session
   * @param {string} memberId - Member ID
   * @param {Date} sessionDate - Date of gym session
   * @returns {Promise<Object>} Updated streak data
   */
  async updateStreak(memberId, sessionDate = new Date()) {
    try {
      // Normalize session date to start of day
      const sessionDay = new Date(sessionDate);
      sessionDay.setHours(0, 0, 0, 0);

      // Get or create streak record
      let streak = await prisma.dailyStreak.findUnique({
        where: { member_id: memberId },
      });

      if (!streak) {
        // Create new streak record
        streak = await prisma.dailyStreak.create({
          data: {
            member_id: memberId,
            current_streak: 1,
            longest_streak: 1,
            last_activity_date: sessionDay,
            streak_started_at: sessionDay,
          },
        });

        // Award points for first streak
        await this.awardStreakPoints(memberId, 1);

        return {
          success: true,
          streak: streak,
          isNewStreak: true,
          milestoneReached: null,
        };
      }

      // Check if already updated today
      if (streak.last_activity_date) {
        const lastActivityDay = new Date(streak.last_activity_date);
        lastActivityDay.setHours(0, 0, 0, 0);

        if (lastActivityDay.getTime() === sessionDay.getTime()) {
          // Already counted today, no update needed
          return {
            success: true,
            streak: streak,
            isNewStreak: false,
            milestoneReached: null,
          };
        }

        // Calculate days difference
        const daysDiff = Math.floor((sessionDay - lastActivityDay) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          // Consecutive day - increment streak
          const newStreak = streak.current_streak + 1;
          const newLongest = Math.max(newStreak, streak.longest_streak);

          streak = await prisma.dailyStreak.update({
            where: { member_id: memberId },
            data: {
              current_streak: newStreak,
              longest_streak: newLongest,
              last_activity_date: sessionDay,
            },
          });

          // Check for milestones
          const milestone = this.checkMilestone(newStreak);
          if (milestone) {
            await this.handleMilestone(memberId, newStreak, milestone);
          }

          // Award points for maintaining streak
          await this.awardStreakPoints(memberId, newStreak);

          return {
            success: true,
            streak: streak,
            isNewStreak: true,
            milestoneReached: milestone,
          };
        } else if (daysDiff > 1) {
          // Streak broken - reset
          streak = await prisma.dailyStreak.update({
            where: { member_id: memberId },
            data: {
              current_streak: 1,
              last_activity_date: sessionDay,
              streak_started_at: sessionDay,
            },
          });

          // Award points for new streak
          await this.awardStreakPoints(memberId, 1);

          return {
            success: true,
            streak: streak,
            isNewStreak: true,
            streakBroken: true,
            milestoneReached: null,
          };
        }
      } else {
        // First activity after creation
        streak = await prisma.dailyStreak.update({
          where: { member_id: memberId },
          data: {
            current_streak: 1,
            longest_streak: 1,
            last_activity_date: sessionDay,
            streak_started_at: sessionDay,
          },
        });

        await this.awardStreakPoints(memberId, 1);

        return {
          success: true,
          streak: streak,
          isNewStreak: true,
          milestoneReached: null,
        };
      }

      return {
        success: true,
        streak: streak,
        isNewStreak: false,
        milestoneReached: null,
      };
    } catch (error) {
      console.error('Update streak error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get member streak
   * @param {string} memberId - Member ID
   * @returns {Promise<Object>} Streak data
   */
  async getStreak(memberId) {
    try {
      let streak = await prisma.dailyStreak.findUnique({
        where: { member_id: memberId },
      });

      if (!streak) {
        // Create if doesn't exist
        streak = await prisma.dailyStreak.create({
          data: {
            member_id: memberId,
            current_streak: 0,
            longest_streak: 0,
          },
        });
      }

      // Check if streak is still active (not broken)
      if (streak.last_activity_date) {
        const lastActivityDay = new Date(streak.last_activity_date);
        lastActivityDay.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((today - lastActivityDay) / (1000 * 60 * 60 * 24));

        if (daysDiff > 1) {
          // Streak broken, reset
          streak = await prisma.dailyStreak.update({
            where: { member_id: memberId },
            data: {
              current_streak: 0,
            },
          });
        }
      }

      return { success: true, streak };
    } catch (error) {
      console.error('Get streak error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check for streak milestones
   * @param {number} streak - Current streak count
   * @returns {Object|null} Milestone info
   */
  checkMilestone(streak) {
    const milestones = [7, 14, 30, 60, 90, 100, 180, 365];
    if (milestones.includes(streak)) {
      return {
        days: streak,
        points: this.getMilestonePoints(streak),
        message: this.getMilestoneMessage(streak),
      };
    }
    return null;
  }

  /**
   * Get milestone points
   * @param {number} days - Streak days
   * @returns {number} Points
   */
  getMilestonePoints(days) {
    const pointMap = {
      7: 50,
      14: 100,
      30: 250,
      60: 500,
      90: 750,
      100: 1000,
      180: 1500,
      365: 5000,
    };
    return pointMap[days] || 0;
  }

  /**
   * Get milestone message
   * @param {number} days - Streak days
   * @returns {string} Message
   */
  getMilestoneMessage(days) {
    const messages = {
      7: '7 ngày liên tiếp! Bạn đang xây dựng thói quen tốt!',
      14: '2 tuần streak! Bạn đang tiến bộ rất tốt!',
      30: '1 tháng streak! Thành tựu đáng kể!',
      60: '2 tháng streak! Bạn đang duy trì rất tốt!',
      90: '3 tháng streak! Thành tựu xuất sắc!',
      100: '100 ngày streak! Bạn là người kiên trì!',
      180: '6 tháng streak! Thành tựu phi thường!',
      365: '1 năm streak! Bạn là huyền thoại!',
    };
    return messages[days] || `Streak ${days} ngày!`;
  }

  /**
   * Handle milestone achievement
   * @param {string} memberId - Member ID
   * @param {number} streak - Current streak
   * @param {Object} milestone - Milestone info
   */
  async handleMilestone(memberId, streak, milestone) {
    try {
      // Award bonus points
      await this.awardStreakPoints(memberId, streak, milestone.points);

      // Create achievement
      await prisma.achievement.create({
        data: {
          member_id: memberId,
          title: `${streak} Day Streak`,
          description: milestone.message,
          category: 'ATTENDANCE',
          points: milestone.points,
          badge_icon: 'Flame',
        },
      });

      // Send notification
      await notificationService.sendNotification({
        memberId,
        type: 'ACHIEVEMENT',
        title: 'Streak Milestone!',
        message: milestone.message,
        data: {
          streak: streak,
          points: milestone.points,
        },
      });
    } catch (error) {
      console.error('Handle milestone error:', error);
    }
  }

  /**
   * Award points for streak
   * @param {string} memberId - Member ID
   * @param {number} streak - Current streak
   * @param {number} bonusPoints - Bonus points (for milestones)
   */
  async awardStreakPoints(memberId, streak, bonusPoints = 0) {
    try {
      // Base points: 10 points per day of streak (capped at 50 points/day)
      const basePoints = Math.min(streak * 10, 50);
      const totalPoints = basePoints + bonusPoints;

      if (totalPoints > 0) {
        // Get current balance
        const lastTransaction = await prisma.pointsTransaction.findFirst({
          where: { member_id: memberId },
          orderBy: { created_at: 'desc' },
        });

        const currentBalance = lastTransaction ? lastTransaction.balance_after : 0;
        const newBalance = currentBalance + totalPoints;

        // Create transaction
        await prisma.pointsTransaction.create({
          data: {
            member_id: memberId,
            points: totalPoints,
            type: 'EARNED',
            source: 'STREAK',
            description:
              bonusPoints > 0
                ? `Streak ${streak} days + milestone bonus`
                : `Daily streak day ${streak}`,
            balance_after: newBalance,
          },
        });
      }
    } catch (error) {
      console.error('Award streak points error:', error);
    }
  }

  /**
   * Get top streaks with ranking
   * @param {number} limit - Number of top streaks
   * @param {string} type - 'current' or 'longest'
   * @returns {Promise<Object>} Top streaks
   */
  async getTopStreaks(limit = 10, type = 'current') {
    try {
      const orderBy =
        type === 'longest'
          ? [{ longest_streak: 'desc' }, { current_streak: 'desc' }]
          : [{ current_streak: 'desc' }, { longest_streak: 'desc' }];

      const topStreaks = await prisma.dailyStreak.findMany({
        orderBy,
        take: limit,
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              membership_number: true,
              profile_photo: true,
              membership_type: true,
            },
          },
        },
      });

      const result = topStreaks.map((streak, index) => ({
        rank: index + 1,
        memberId: streak.member_id,
        memberName: streak.member?.full_name || 'Unknown',
        membershipNumber: streak.member?.membership_number || null,
        avatarUrl: streak.member?.profile_photo || null,
        membershipType: streak.member?.membership_type || 'BASIC',
        currentStreak: streak.current_streak,
        longestStreak: streak.longest_streak,
        lastActivityDate: streak.last_activity_date,
        streakStartedAt: streak.streak_started_at,
        isCurrentUser: false, // Will be set by frontend
      }));

      return { success: true, streaks: result };
    } catch (error) {
      console.error('Get top streaks error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new StreakService();
