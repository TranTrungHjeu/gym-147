const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const notificationService = require('./notification.service.js');
const pointsService = require('./points.service.js');

/**
 * Challenge Service
 * Manages challenges, member participation, and progress tracking
 */
class ChallengeService {
  /**
   * Create a new challenge
   * @param {Object} challengeData - Challenge data
   * @returns {Promise<Object>} Created challenge
   */
  async createChallenge(challengeData) {
    try {
      const {
        title,
        description,
        type,
        category,
        target_value,
        target_unit,
        reward_points,
        start_date,
        end_date,
        is_public,
        max_participants,
        created_by,
      } = challengeData;

      const challenge = await prisma.challenge.create({
        data: {
          title,
          description,
          type,
          category,
          target_value,
          target_unit,
          reward_points: reward_points || 0,
          start_date: new Date(start_date),
          end_date: new Date(end_date),
          is_public: is_public !== false,
          max_participants,
          created_by,
        },
      });

      return { success: true, challenge };
    } catch (error) {
      console.error('Create challenge error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all active challenges
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Challenges list
   */
  async getChallenges(filters = {}) {
    try {
      const { type, category, is_active = true } = filters;

      const where = {
        is_active,
      };

      if (type) where.type = type;
      if (category) where.category = category;

      const challenges = await prisma.challenge.findMany({
        where,
        include: {
          progress: {
            select: {
              member_id: true,
              current_value: true,
              completed: true,
            },
          },
          _count: {
            select: {
              progress: true,
            },
          },
        },
        orderBy: {
          start_date: 'desc',
        },
      });

      return { success: true, challenges };
    } catch (error) {
      console.error('Get challenges error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get challenge by ID
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Object>} Challenge details
   */
  async getChallengeById(challengeId) {
    try {
      const challenge = await prisma.challenge.findUnique({
        where: { id: challengeId },
        include: {
          progress: {
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
            orderBy: [
              { current_value: 'desc' },
              { completed: 'desc' },
            ],
          },
          _count: {
            select: {
              progress: true,
            },
          },
        },
      });

      if (!challenge) {
        return { success: false, error: 'Challenge not found' };
      }

      return { success: true, challenge };
    } catch (error) {
      console.error('Get challenge by ID error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Join a challenge
   * @param {string} challengeId - Challenge ID
   * @param {string} memberId - Member ID
   * @returns {Promise<Object>} Join result
   */
  async joinChallenge(challengeId, memberId) {
    try {
      // Check if challenge exists and is active
      const challenge = await prisma.challenge.findUnique({
        where: { id: challengeId },
        include: {
          progress: true,
        },
      });

      if (!challenge) {
        return { success: false, error: 'Challenge not found' };
      }

      if (!challenge.is_active) {
        return { success: false, error: 'Challenge is not active' };
      }

      // Check if challenge has started
      if (new Date() < new Date(challenge.start_date)) {
        return { success: false, error: 'Challenge has not started yet' };
      }

      // Check if challenge has ended
      if (new Date() > new Date(challenge.end_date)) {
        return { success: false, error: 'Challenge has ended' };
      }

      // Check max participants
      if (challenge.max_participants && challenge.progress.length >= challenge.max_participants) {
        return { success: false, error: 'Challenge is full' };
      }

      // Check if already joined
      const existing = await prisma.challengeProgress.findUnique({
        where: {
          challenge_id_member_id: {
            challenge_id: challengeId,
            member_id: memberId,
          },
        },
      });

      if (existing) {
        return { success: false, error: 'Already joined this challenge' };
      }

      // Join challenge
      const progress = await prisma.challengeProgress.create({
        data: {
          challenge_id: challengeId,
          member_id: memberId,
          target_value: challenge.target_value,
          current_value: 0,
          completed: false,
        },
      });

      // Send notification
      await notificationService.sendNotification({
        memberId,
        type: 'CHALLENGE',
        title: 'Challenge Joined!',
        message: `You joined the challenge: ${challenge.title}`,
        data: {
          challenge_id: challengeId,
        },
      });

      return { success: true, progress };
    } catch (error) {
      console.error('Join challenge error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update challenge progress
   * @param {string} challengeId - Challenge ID
   * @param {string} memberId - Member ID
   * @param {number} increment - Value to add to progress
   * @returns {Promise<Object>} Updated progress
   */
  async updateProgress(challengeId, memberId, increment = 1) {
    try {
      const progress = await prisma.challengeProgress.findUnique({
        where: {
          challenge_id_member_id: {
            challenge_id: challengeId,
            member_id: memberId,
          },
        },
        include: {
          challenge: true,
        },
      });

      if (!progress) {
        return { success: false, error: 'Not joined this challenge' };
      }

      if (progress.completed) {
        return { success: true, progress, alreadyCompleted: true };
      }

      const newValue = progress.current_value + increment;
      const isCompleted = newValue >= progress.target_value;

      const updated = await prisma.challengeProgress.update({
        where: {
          challenge_id_member_id: {
            challenge_id: challengeId,
            member_id: memberId,
          },
        },
        data: {
          current_value: newValue,
          completed: isCompleted,
          completed_at: isCompleted ? new Date() : null,
        },
        include: {
          challenge: true,
        },
      });

      // If completed, award points and send notification
      if (isCompleted && !progress.completed) {
        // Award points
        if (updated.challenge.reward_points > 0) {
          await pointsService.awardPoints(
            memberId,
            updated.challenge.reward_points,
            'CHALLENGE',
            challengeId,
            `Completed challenge: ${updated.challenge.title}`
          );
        }

        // Send notification
        await notificationService.sendNotification({
          memberId,
          type: 'ACHIEVEMENT',
          title: 'Challenge Completed!',
          message: `Congratulations! You completed: ${updated.challenge.title}`,
          data: {
            challenge_id: challengeId,
            points: updated.challenge.reward_points,
          },
        });
      }

      return {
        success: true,
        progress: updated,
        completed: isCompleted,
        wasNewlyCompleted: isCompleted && !progress.completed,
      };
    } catch (error) {
      console.error('Update challenge progress error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get member's challenges
   * @param {string} memberId - Member ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Member challenges
   */
  async getMemberChallenges(memberId, filters = {}) {
    try {
      const { status } = filters; // 'active', 'completed', 'all'

      const where = {
        member_id: memberId,
      };

      if (status === 'completed') {
        where.completed = true;
      } else if (status === 'active') {
        where.completed = false;
      }

      const progressList = await prisma.challengeProgress.findMany({
        where,
        include: {
          challenge: true,
        },
        orderBy: {
          updated_at: 'desc',
        },
      });

      return { success: true, challenges: progressList };
    } catch (error) {
      console.error('Get member challenges error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get challenge leaderboard (completion rate)
   * @param {number} limit - Number of top members
   * @param {string} period - Period: 'weekly', 'monthly', 'yearly', 'alltime'
   * @returns {Promise<Object>} Challenge leaderboard
   */
  async getChallengeLeaderboard(limit = 10, period = 'alltime') {
    try {
      const { getPeriodFilter } = require('../utils/leaderboard.util.js');
      const dateFilter = getPeriodFilter(period);

      // Get completed challenges grouped by member
      const completedChallenges = await prisma.challengeProgress.groupBy({
        by: ['member_id'],
        _count: {
          id: true,
        },
        where: {
          completed: true,
          completed_at: period === 'alltime' ? undefined : dateFilter,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: limit,
      });

      // Get member details
      const memberIds = completedChallenges.map(item => item.member_id);
      const members = await prisma.member.findMany({
        where: { id: { in: memberIds } },
        select: {
          id: true,
          full_name: true,
          membership_number: true,
          profile_photo: true,
          membership_type: true,
        },
      });

      const memberMap = {};
      members.forEach(m => {
        memberMap[m.id] = m;
      });

      const result = completedChallenges.map((item, index) => ({
        rank: index + 1,
        memberId: item.member_id,
        memberName: memberMap[item.member_id]?.full_name || 'Unknown',
        avatarUrl: memberMap[item.member_id]?.profile_photo || null,
        membershipType: memberMap[item.member_id]?.membership_type || 'BASIC',
        completedChallenges: item._count.id || 0,
        isCurrentUser: false, // Will be set by frontend
      }));

      return { success: true, leaderboard: result };
    } catch (error) {
      console.error('Get challenge leaderboard error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto-update progress for attendance challenges
   * Called when member has gym session
   * @param {string} memberId - Member ID
   * @param {string} challengeType - Challenge type filter
   */
  async autoUpdateAttendanceChallenges(memberId, challengeType = 'ATTENDANCE') {
    try {
      // Get active challenges of type ATTENDANCE
      const challenges = await prisma.challenge.findMany({
        where: {
          is_active: true,
          category: challengeType,
          start_date: { lte: new Date() },
          end_date: { gte: new Date() },
        },
      });

      // Update progress for each challenge member joined
      for (const challenge of challenges) {
        const progress = await prisma.challengeProgress.findUnique({
          where: {
            challenge_id_member_id: {
              challenge_id: challenge.id,
              member_id: memberId,
            },
          },
        });

        if (progress && !progress.completed) {
          // Increment by 1 (one session)
          await this.updateProgress(challenge.id, memberId, 1);
        }
      }
    } catch (error) {
      console.error('Auto-update attendance challenges error:', error);
    }
  }
}

module.exports = new ChallengeService();

