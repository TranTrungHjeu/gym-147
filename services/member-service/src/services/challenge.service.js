// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');
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
      // [SUCCESS] Fix: Use transaction to prevent race condition
      return await prisma.$transaction(async (tx) => {
        // 1. Get challenge to validate it's active and in date range
        const challenge = await tx.challenge.findUnique({
          where: { id: challengeId },
        });

        if (!challenge) {
          return { success: false, error: 'Challenge not found' };
        }

        if (!challenge.is_active) {
          return { success: false, error: 'Challenge is not active' };
        }

        // Validate challenge date range
        const now = new Date();
        if (now < challenge.start_date || now > challenge.end_date) {
          return { success: false, error: 'Challenge is not in date range' };
        }

        // 2. Get current progress
        const progress = await tx.challengeProgress.findUnique({
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

        // 3. Calculate new value
        const newValue = progress.current_value + increment;
        const isCompleted = newValue >= progress.target_value;
        const wasCompleted = progress.completed;

        // 4. Update progress atomically
        const updated = await tx.challengeProgress.update({
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

        // 5. If completed, award points and send notification (outside transaction)
        // Note: pointsService.awardPoints has its own transaction, so we call it after
        const wasNewlyCompleted = isCompleted && !wasCompleted;

        if (wasNewlyCompleted) {
          // Update Redis leaderboard for all periods
          const cacheService = require('./cache.service');
          const periods = ['weekly', 'monthly', 'yearly', 'alltime'];
          
          // Get current completed challenges count for this member
          const completedCount = await tx.challengeProgress.count({
            where: {
              member_id: memberId,
              completed: true,
            },
          });

          // Update leaderboard for all periods
          for (const period of periods) {
            const leaderboardKey = `leaderboard:challenge:${period}`;
            await cacheService.addToLeaderboard(leaderboardKey, memberId, completedCount);
          }

          // Award points (has its own transaction)
          if (updated.challenge.reward_points > 0) {
            pointsService
              .awardPoints(
                memberId,
                updated.challenge.reward_points,
                'CHALLENGE',
                challengeId,
                `Completed challenge: ${updated.challenge.title}`
              )
              .catch((err) => {
                console.error('Failed to award challenge points:', err);
              });
          }

          // Send notification (async, don't wait)
          notificationService
            .sendNotification({
              memberId,
              type: 'ACHIEVEMENT',
              title: 'Challenge Completed!',
              message: `Congratulations! You completed: ${updated.challenge.title}`,
              data: {
                challenge_id: challengeId,
                points: updated.challenge.reward_points,
              },
            })
            .catch((err) => {
              console.error('Failed to send challenge completion notification:', err);
            });
        }

        return {
          success: true,
          progress: updated,
          completed: isCompleted,
          wasNewlyCompleted,
        };
      });
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
   * Uses Redis Sorted Sets for caching and fast retrieval
   * @param {number} limit - Number of top members
   * @param {string} period - Period: 'weekly', 'monthly', 'yearly', 'alltime'
   * @returns {Promise<Object>} Challenge leaderboard
   */
  async getChallengeLeaderboard(limit = 10, period = 'alltime') {
    try {
      const cacheService = require('./cache.service');
      const leaderboardKey = `leaderboard:challenge:${period}`;

      // Try to get from Redis cache first
      let cachedLeaderboard = await cacheService.getLeaderboard(leaderboardKey, limit, false);
      
      if (cachedLeaderboard && cachedLeaderboard.length > 0) {
        // Get member details for cached leaderboard
        const memberIds = cachedLeaderboard.map(item => item.memberId);
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

        const result = cachedLeaderboard.map(item => ({
          rank: item.rank,
          memberId: item.memberId,
          memberName: memberMap[item.memberId]?.full_name || 'Unknown',
          avatarUrl: memberMap[item.memberId]?.profile_photo || null,
          membershipType: memberMap[item.memberId]?.membership_type || 'BASIC',
          completedChallenges: Math.floor(item.score) || 0,
          isCurrentUser: false, // Will be set by frontend
        }));

        console.log(`[SUCCESS] Retrieved leaderboard from Redis cache (period: ${period})`);
        return { success: true, leaderboard: result };
      }

      // Cache miss - fetch from database
      console.log(`[STATS] Cache miss - fetching leaderboard from database (period: ${period})`);
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
        take: limit * 2, // Get more to populate cache
      });

      // Update Redis cache with all results
      for (const item of completedChallenges) {
        await cacheService.addToLeaderboard(
          leaderboardKey,
          item.member_id,
          item._count.id || 0
        );
      }

      // Set TTL based on period (shorter TTL for more dynamic periods)
      const ttl = period === 'weekly' ? 3600 : period === 'monthly' ? 7200 : 86400; // 1h, 2h, 24h
      await cacheService.setLeaderboardTTL(leaderboardKey, ttl);

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

      const result = completedChallenges.slice(0, limit).map((item, index) => ({
        rank: index + 1,
        memberId: item.member_id,
        memberName: memberMap[item.member_id]?.full_name || 'Unknown',
        avatarUrl: memberMap[item.member_id]?.profile_photo || null,
        membershipType: memberMap[item.member_id]?.membership_type || 'BASIC',
        completedChallenges: item._count.id || 0,
        isCurrentUser: false, // Will be set by frontend
      }));

      console.log(`[SUCCESS] Fetched and cached leaderboard (period: ${period})`);
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

  /**
   * Auto-update progress for FITNESS challenges
   * Called when member completes workout or burns calories
   * @param {string} memberId - Member ID
   * @param {number} calories - Calories burned (for calorie-based challenges)
   * @param {number} workouts - Number of workouts completed (for workout-based challenges)
   */
  async autoUpdateFitnessChallenges(memberId, calories = 0, workouts = 0) {
    try {
      // Get active challenges of type FITNESS
      const challenges = await prisma.challenge.findMany({
        where: {
          is_active: true,
          category: 'FITNESS',
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
          let increment = 0;

          // Check target_unit to determine how to update
          if (challenge.target_unit === 'calories' && calories > 0) {
            // Calorie-based challenge: add calories
            increment = calories;
          } else if (
            (challenge.target_unit === 'sessions' || challenge.target_unit === 'workouts') &&
            workouts > 0
          ) {
            // Workout/session-based challenge: increment by 1 per workout
            increment = workouts;
          } else if (
            !challenge.target_unit &&
            challenge.target_value > 1000 &&
            calories > 0
          ) {
            // If no target_unit but high target_value, assume it's calories
            increment = calories;
          } else if (
            !challenge.target_unit &&
            challenge.target_value <= 100 &&
            workouts > 0
          ) {
            // If no target_unit but low target_value, assume it's workout count
            increment = workouts;
          }

          if (increment > 0) {
            await this.updateProgress(challenge.id, memberId, increment);
          }
        }
      }
    } catch (error) {
      console.error('Auto-update fitness challenges error:', error);
    }
  }

  /**
   * Auto-update progress for EQUIPMENT challenges
   * Called when member uses equipment
   * @param {string} memberId - Member ID
   * @param {number} equipmentCount - Number of equipment used (for count-based challenges)
   * @param {number} durationMinutes - Duration in minutes (for duration-based challenges)
   */
  async autoUpdateEquipmentChallenges(memberId, equipmentCount = 0, durationMinutes = 0) {
    try {
      // Get active challenges of type EQUIPMENT
      const challenges = await prisma.challenge.findMany({
        where: {
          is_active: true,
          category: 'EQUIPMENT',
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
          let increment = 0;

          // Check target_unit to determine how to update
          if (challenge.target_unit === 'equipment' || challenge.target_unit === 'count') {
            // Count-based challenge: increment by 1 per equipment use
            increment = equipmentCount > 0 ? equipmentCount : 1;
          } else if (
            challenge.target_unit === 'minutes' ||
            challenge.target_unit === 'duration'
          ) {
            // Duration-based challenge: add duration
            increment = durationMinutes > 0 ? durationMinutes : 0;
          } else if (!challenge.target_unit) {
            // If no target_unit, default to count
            increment = equipmentCount > 0 ? equipmentCount : 1;
          }

          if (increment > 0) {
            await this.updateProgress(challenge.id, memberId, increment);
          }
        }
      }
    } catch (error) {
      console.error('Auto-update equipment challenges error:', error);
    }
  }

  /**
   * Update challenge
   * @param {string} challengeId - Challenge ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated challenge
   */
  async updateChallenge(challengeId, updateData) {
    try {
      const challenge = await prisma.challenge.update({
        where: { id: challengeId },
        data: {
          ...(updateData.title && { title: updateData.title }),
          ...(updateData.description && { description: updateData.description }),
          ...(updateData.type && { type: updateData.type }),
          ...(updateData.category && { category: updateData.category }),
          ...(updateData.target_value !== undefined && { target_value: updateData.target_value }),
          ...(updateData.target_unit !== undefined && { target_unit: updateData.target_unit }),
          ...(updateData.reward_points !== undefined && { reward_points: updateData.reward_points }),
          ...(updateData.start_date && { start_date: new Date(updateData.start_date) }),
          ...(updateData.end_date && { end_date: new Date(updateData.end_date) }),
          ...(updateData.is_active !== undefined && { is_active: updateData.is_active }),
          ...(updateData.is_public !== undefined && { is_public: updateData.is_public }),
          ...(updateData.max_participants !== undefined && { max_participants: updateData.max_participants }),
        },
      });

      return { success: true, challenge };
    } catch (error) {
      console.error('Update challenge error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete challenge
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteChallenge(challengeId) {
    try {
      await prisma.challenge.delete({
        where: { id: challengeId },
      });

      return { success: true };
    } catch (error) {
      console.error('Delete challenge error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ChallengeService();

