// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');
let distributedLock = null;
try {
  distributedLock =
    require('../../../packages/shared-utils/dist/redis-lock.utils.js').distributedLock;
} catch (e) {
  try {
    distributedLock =
      require('../../../packages/shared-utils/src/redis-lock.utils.ts').distributedLock;
  } catch (e2) {
    console.warn(
      '[WARNING] Distributed lock utility not available, reward redemption will use database transactions only'
    );
  }
}
const pointsService = require('./points.service.js');
// Lazy require notificationService to avoid circular dependency
// const notificationService = require('./notification.service.js');
const rewardSocketHelper = require('../utils/reward-socket.helper.js');

/**
 * Reward Service
 * Manages rewards catalog and redemption
 */
class RewardService {
  /**
   * Create a new reward
   * @param {Object} rewardData - Reward data
   * @returns {Promise<Object>} Created reward
   */
  async createReward(rewardData) {
    try {
      const {
        title,
        description,
        category,
        points_cost,
        image_url,
        discount_percent,
        discount_amount,
        reward_type,
        stock_quantity,
        redemption_limit,
        valid_from,
        valid_until,
        terms_conditions,
        created_by,
      } = rewardData;

      // Validate: chỉ được có một trong hai (discount_percent hoặc discount_amount)
      const hasPercent =
        discount_percent !== undefined && discount_percent !== null && discount_percent !== '';
      const hasAmount =
        discount_amount !== undefined && discount_amount !== null && discount_amount !== '';

      if (hasPercent && hasAmount) {
        return {
          success: false,
          error: 'Chỉ được chọn một loại giảm giá: phần trăm HOẶC số tiền, không được có cả hai',
        };
      }

      const reward = await prisma.reward.create({
        data: {
          title,
          description,
          category,
          points_cost,
          image_url,
          discount_percent: hasPercent ? discount_percent : null,
          discount_amount: hasAmount ? parseFloat(discount_amount) : null,
          reward_type,
          stock_quantity,
          redemption_limit,
          valid_from: valid_from ? new Date(valid_from) : new Date(),
          valid_until: valid_until ? new Date(valid_until) : null,
          terms_conditions,
          created_by,
        },
      });

      return { success: true, reward };
    } catch (error) {
      console.error('Create reward error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a reward
   * @param {string} rewardId - Reward ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated reward
   */
  async updateReward(rewardId, updateData) {
    try {
      // Check if reward exists
      const existingReward = await prisma.reward.findUnique({
        where: { id: rewardId },
      });

      if (!existingReward) {
        return { success: false, error: 'Reward not found' };
      }

      // Prepare update data
      const {
        title,
        description,
        category,
        points_cost,
        image_url,
        discount_percent,
        discount_amount,
        reward_type,
        stock_quantity,
        redemption_limit,
        valid_from,
        valid_until,
        terms_conditions,
        is_active,
      } = updateData;

      // Validate: chỉ được có một trong hai (discount_percent hoặc discount_amount)
      const hasPercent =
        discount_percent !== undefined && discount_percent !== null && discount_percent !== '';
      const hasAmount =
        discount_amount !== undefined && discount_amount !== null && discount_amount !== '';

      if (hasPercent && hasAmount) {
        return {
          success: false,
          error: 'Chỉ được chọn một loại giảm giá: phần trăm HOẶC số tiền, không được có cả hai',
        };
      }

      const dataToUpdate = {};

      if (title !== undefined) dataToUpdate.title = title;
      if (description !== undefined) dataToUpdate.description = description;
      if (category !== undefined) dataToUpdate.category = category;
      if (points_cost !== undefined) dataToUpdate.points_cost = points_cost;
      if (image_url !== undefined) dataToUpdate.image_url = image_url;

      // Handle discount fields: clear one when the other is set
      if (discount_percent !== undefined) {
        if (discount_percent !== null && discount_percent !== '') {
          dataToUpdate.discount_percent = discount_percent;
          dataToUpdate.discount_amount = null; // Clear amount when percent is set
        } else {
          dataToUpdate.discount_percent = null;
        }
      }
      if (discount_amount !== undefined) {
        if (discount_amount !== null && discount_amount !== '') {
          // Convert to Decimal if it's a number or string
          dataToUpdate.discount_amount = parseFloat(discount_amount);
          dataToUpdate.discount_percent = null; // Clear percent when amount is set
        } else {
          dataToUpdate.discount_amount = null;
        }
      }
      if (reward_type !== undefined) dataToUpdate.reward_type = reward_type;
      if (stock_quantity !== undefined) {
        dataToUpdate.stock_quantity =
          stock_quantity !== null && stock_quantity !== '' ? parseInt(stock_quantity) : null;
      }
      if (redemption_limit !== undefined) {
        dataToUpdate.redemption_limit =
          redemption_limit !== null && redemption_limit !== '' ? parseInt(redemption_limit) : null;
      }
      if (valid_from !== undefined) {
        dataToUpdate.valid_from = valid_from ? new Date(valid_from) : new Date();
      }
      if (valid_until !== undefined) {
        dataToUpdate.valid_until = valid_until && valid_until !== '' ? new Date(valid_until) : null;
      }
      if (terms_conditions !== undefined) dataToUpdate.terms_conditions = terms_conditions;
      if (is_active !== undefined) dataToUpdate.is_active = is_active;

      // Update reward
      const reward = await prisma.reward.update({
        where: { id: rewardId },
        data: dataToUpdate,
      });

      return { success: true, reward };
    } catch (error) {
      console.error('Update reward error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a reward
   * @param {string} rewardId - Reward ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteReward(rewardId) {
    try {
      // Check if reward exists
      const existingReward = await prisma.reward.findUnique({
        where: { id: rewardId },
      });

      if (!existingReward) {
        return { success: false, error: 'Reward not found' };
      }

      // Check if reward has active redemptions
      const activeRedemptions = await prisma.rewardRedemption.count({
        where: {
          reward_id: rewardId,
          status: { in: ['PENDING', 'ACTIVE'] },
        },
      });

      if (activeRedemptions > 0) {
        return {
          success: false,
          error: `Cannot delete reward with ${activeRedemptions} active redemption(s). Please refund or cancel them first.`,
        };
      }

      // Delete reward
      await prisma.reward.delete({
        where: { id: rewardId },
      });

      return { success: true };
    } catch (error) {
      console.error('Delete reward error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all available rewards
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Rewards list
   */
  async getRewards(filters = {}) {
    try {
      const {
        category,
        is_active = true,
        min_points,
        max_points,
        limit = 100,
        offset = 0,
      } = filters;

      const now = new Date();

      // Build base conditions
      const baseConditions = {
        is_active: true,
        valid_from: { lte: now },
      };

      if (category) baseConditions.category = category;
      if (min_points !== undefined) baseConditions.points_cost = { gte: min_points };
      if (max_points !== undefined) {
        baseConditions.points_cost = {
          ...baseConditions.points_cost,
          lte: max_points,
        };
      }

      // Check validity dates: valid_from <= now AND (valid_until >= now OR valid_until IS NULL)
      // Build where clause properly for Prisma
      const where = {
        is_active: true,
        valid_from: { lte: now },
      };

      // Add category filter if provided
      if (category) where.category = category;

      // Add points cost filter if provided
      if (min_points !== undefined || max_points !== undefined) {
        where.points_cost = {};
        if (min_points !== undefined) where.points_cost.gte = min_points;
        if (max_points !== undefined) where.points_cost.lte = max_points;
      }

      // Parse and limit pagination parameters
      const parsedLimit = Math.min(parseInt(limit) || 100, 200); // Max 200 per page
      const parsedOffset = Math.max(parseInt(offset) || 0, 0);

      // Query rewards first, then filter valid_until in JavaScript
      // This avoids Prisma OR complexity with nullable fields
      // Add pagination to prevent loading too many records
      const allRewards = await prisma.reward.findMany({
        where,
        include: {
          _count: {
            select: {
              redemptions: true,
            },
          },
        },
        orderBy: {
          points_cost: 'asc',
        },
        take: parsedLimit,
        skip: parsedOffset,
      });

      // Filter by valid_until: valid_until >= now OR valid_until IS NULL
      const validRewards = allRewards.filter(reward => {
        if (reward.valid_until === null) return true; // No expiration
        return new Date(reward.valid_until) >= now; // Not expired
      });

      // Filter out rewards with no stock
      const availableRewards = validRewards.filter(reward => {
        if (reward.stock_quantity === null) return true; // Unlimited
        const redeemedCount = reward._count.redemptions || 0;
        return redeemedCount < reward.stock_quantity;
      });

      // Get total count for pagination (before filtering)
      const total = await prisma.reward.count({ where });

      return {
        success: true,
        rewards: availableRewards,
        pagination: {
          total,
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: parsedOffset + parsedLimit < total,
        },
      };
    } catch (error) {
      console.error('Get rewards error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get reward by ID
   * @param {string} rewardId - Reward ID
   * @returns {Promise<Object>} Reward details
   */
  async getRewardById(rewardId) {
    try {
      const reward = await prisma.reward.findUnique({
        where: { id: rewardId },
        include: {
          _count: {
            select: {
              redemptions: true,
            },
          },
        },
      });

      if (!reward) {
        return { success: false, error: 'Reward not found' };
      }

      // Check if still available
      const now = new Date();
      const isAvailable =
        reward.is_active &&
        reward.valid_from <= now &&
        (reward.valid_until === null || reward.valid_until >= now) &&
        (reward.stock_quantity === null ||
          (reward._count.redemptions || 0) < reward.stock_quantity);

      return { success: true, reward: { ...reward, is_available: isAvailable } };
    } catch (error) {
      console.error('Get reward by ID error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Redeem a reward
   * @param {string} memberId - Member ID
   * @param {string} rewardId - Reward ID
   * @returns {Promise<Object>} Redemption result
   */
  async redeemReward(memberId, rewardId) {
    // Acquire distributed lock for reward redemption
    let lockAcquired = false;
    let lockId = null;

    if (distributedLock) {
      const lockResult = await distributedLock.acquire('reward', rewardId, {
        ttl: 30, // 30 seconds
        retryAttempts: 3,
        retryDelay: 100,
      });

      if (!lockResult.acquired) {
        throw new Error('Reward redemption đang được xử lý, vui lòng thử lại sau');
      }

      lockAcquired = true;
      lockId = lockResult.lockId;
    }

    try {
      // [SUCCESS] Use transaction to prevent race condition
      const result = await prisma.$transaction(async tx => {
        // 1. Get reward with redemption count (lock for update)
        const reward = await tx.reward.findUnique({
          where: { id: rewardId },
          include: {
            _count: {
              select: {
                redemptions: {
                  where: {
                    status: { in: ['PENDING', 'ACTIVE', 'USED'] },
                  },
                },
              },
            },
          },
        });

        // 2. Validate reward exists and is active
        if (!reward) {
          return { success: false, error: 'Reward not found' };
        }

        const now = new Date();
        const isAvailable =
          reward.is_active &&
          reward.valid_from <= now &&
          (reward.valid_until === null || reward.valid_until >= now);

        if (!isAvailable) {
          return { success: false, error: 'Reward is not available' };
        }

        // 3. Check stock (atomic)
        if (reward.stock_quantity !== null) {
          const redeemedCount = reward._count?.redemptions || 0;
          if (redeemedCount >= reward.stock_quantity) {
            return { success: false, error: 'Reward out of stock' };
          }
        }

        // 4. Check member points balance (atomic)
        const balanceResult = await pointsService.getBalance(memberId);
        if (!balanceResult.success) {
          return { success: false, error: 'Failed to check points balance' };
        }

        if (balanceResult.balance.current < reward.points_cost) {
          return {
            success: false,
            error: 'INSUFFICIENT_POINTS',
            message: `Bạn cần ${reward.points_cost} points. Hiện tại bạn có ${balanceResult.balance.current} points.`,
            required: reward.points_cost,
            current: balanceResult.balance.current,
            shortfall: reward.points_cost - balanceResult.balance.current,
          };
        }

        // 5. Check redemption limit per member (atomic)
        if (reward.redemption_limit) {
          const memberRedemptions = await tx.rewardRedemption.count({
            where: {
              member_id: memberId,
              reward_id: rewardId,
              status: { in: ['PENDING', 'ACTIVE', 'USED'] },
            },
          });

          if (memberRedemptions >= reward.redemption_limit) {
            return {
              success: false,
              error: `You have reached the redemption limit for this reward (${reward.redemption_limit})`,
            };
          }
        }

        // 6. Generate unique redemption code
        let code = this.generateRedemptionCode();
        let codeExists = true;
        let attempts = 0;
        while (codeExists && attempts < 10) {
          const existing = await tx.rewardRedemption.findUnique({
            where: { code },
          });
          if (!existing) {
            codeExists = false;
          } else {
            code = this.generateRedemptionCode();
            attempts++;
          }
        }

        if (codeExists) {
          return { success: false, error: 'Failed to generate unique code' };
        }

        // 7. Calculate expiration date (default 30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // 8. Create redemption record (atomic)
        const redemption = await tx.rewardRedemption.create({
          data: {
            member_id: memberId,
            reward_id: rewardId,
            points_spent: reward.points_cost,
            status: 'ACTIVE',
            code,
            expires_at: expiresAt,
          },
          include: {
            reward: true,
          },
        });

        console.log('[REDEMPTION] Created redemption record:', {
          id: redemption.id,
          member_id: memberId,
          reward_id: rewardId,
          code,
          status: redemption.status,
          redeemed_at: redemption.redeemed_at,
        });

        // 9. Deduct points (atomic - has its own transaction)
        const spendResult = await pointsService.spendPoints(
          memberId,
          reward.points_cost,
          'REDEMPTION',
          rewardId,
          `Redeemed reward: ${reward.title}`
        );

        if (!spendResult.success) {
          throw new Error('Failed to deduct points');
        }

        // 10. Send notification (async, don't wait)
        // Get user_id from member for notification
        const memberForNotification = await tx.member.findUnique({
          where: { id: memberId },
          select: {
            user_id: true,
          },
        });

        // Lazy require notificationService to avoid circular dependency
        const notificationService = require('./notification.service.js');
        if (memberForNotification?.user_id) {
          notificationService
            .sendNotification({
              userId: memberForNotification.user_id,
              memberId,
              type: 'REWARD',
              title: 'Reward Redeemed!',
              message: `You've successfully redeemed: ${reward.title}. Your code: ${code}`,
              data: {
                reward_id: rewardId,
                redemption_id: redemption.id,
                code,
              },
              channels: ['IN_APP', 'PUSH'],
            })
            .catch(err => console.error('Notification error:', err));
        } else {
          console.warn('[WARNING] Cannot send notification: member user_id not found');
        }

        // 11. Emit socket event for real-time update (async, don't wait)
        rewardSocketHelper
          .emitRewardRedeemed(memberId, {
            id: redemption.id,
            reward_id: rewardId,
            reward: {
              id: reward.id,
              title: reward.title,
              category: reward.category,
            },
            points_spent: reward.points_cost,
            new_balance: spendResult.newBalance,
            code,
            expires_at: expiresAt,
            redeemed_at: redemption.redeemed_at,
          })
          .catch(err => console.error('Socket emit error:', err));

        // 12. Create database notification and emit socket event to admin/super admin (async, don't wait)
        // Use tx instead of prisma to ensure consistency within transaction
        const member = await tx.member.findUnique({
          where: { id: memberId },
          select: {
            id: true,
            full_name: true,
            email: true,
            phone: true,
            membership_number: true,
          },
        });

        // Reuse notificationService already required above (line 547)

        if (member) {
          // Create database notification for admins
          notificationService
            .createRewardRedemptionNotificationForAdmin({
              memberId: member.id,
              memberName: member.full_name,
              memberData: {
                email: member.email,
                phone: member.phone,
                membership_number: member.membership_number,
              },
              rewardId: rewardId,
              rewardTitle: reward.title,
              rewardCategory: reward.category,
              pointsSpent: reward.points_cost,
              redemptionCode: code,
            })
            .catch(err =>
              console.error(
                '[ERROR] Failed to create reward redemption notification for admin:',
                err
              )
            );

          // Also emit socket event (for real-time updates)
          rewardSocketHelper
            .emitRewardRedeemedToAdmin(memberId, {
              id: redemption.id,
              reward_id: rewardId,
              reward: {
                id: reward.id,
                title: reward.title,
                category: reward.category,
              },
              reward_title: reward.title,
              reward_category: reward.category,
              points_spent: reward.points_cost,
              code,
              redeemed_at: redemption.redeemed_at,
            })
            .catch(err => console.error('Socket emit to admin error:', err));
        }

        console.log('[REDEMPTION] Transaction completed successfully, returning redemption:', {
          id: redemption.id,
          member_id: memberId,
          reward_id: rewardId,
        });

        return {
          success: true,
          redemption: {
            ...redemption,
            new_balance: spendResult.newBalance,
          },
        };
      });

      console.log('[REDEMPTION] Transaction result:', {
        success: result.success,
        redemption_id: result.redemption?.id,
        member_id: memberId,
        reward_id: rewardId,
      });

      // Release lock after successful transaction
      if (lockAcquired && distributedLock && lockId) {
        await distributedLock.release('reward', rewardId, lockId).catch(err => {
          console.error('Failed to release lock:', err);
        });
      }

      return result;
    } catch (error) {
      console.error('Redeem reward error:', error);

      // Release lock on error
      if (lockAcquired && distributedLock && lockId) {
        await distributedLock.release('reward', rewardId, lockId).catch(err => {
          console.error('Failed to release lock on error:', err);
        });
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Get member's redemption history
   * @param {string} memberId - Member ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Redemption history
   */
  async getMemberRedemptions(memberId, filters = {}) {
    try {
      const { status, limit = 50, offset = 0 } = filters;

      const where = {
        member_id: memberId,
      };

      if (status) where.status = status;

      const [redemptions, total] = await Promise.all([
        prisma.rewardRedemption.findMany({
          where,
          include: {
            reward: true,
          },
          orderBy: { redeemed_at: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.rewardRedemption.count({ where }),
      ]);

      return {
        success: true,
        redemptions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    } catch (error) {
      console.error('Get member redemptions error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark redemption as used
   * @param {string} redemptionId - Redemption ID
   * @returns {Promise<Object>} Updated redemption
   */
  async markAsUsed(redemptionId) {
    try {
      const redemption = await prisma.rewardRedemption.update({
        where: { id: redemptionId },
        data: {
          status: 'USED',
          used_at: new Date(),
        },
        include: {
          reward: true,
        },
      });

      return { success: true, redemption };
    } catch (error) {
      console.error('Mark redemption as used error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate unique redemption code
   * Format: REWARD-XXXX-XXXX
   * @returns {string} Redemption code
   */
  generateRedemptionCode() {
    // Remove confusing chars (I, O, 0, 1) to avoid user mistakes
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'REWARD-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Verify redemption code
   * @param {string} code - Redemption code
   * @returns {Promise<Object>} Redemption details
   */
  async verifyCode(code) {
    try {
      const redemption = await prisma.rewardRedemption.findUnique({
        where: { code },
        include: {
          reward: true,
          member: {
            select: {
              id: true,
              full_name: true,
              membership_number: true,
            },
          },
        },
      });

      if (!redemption) {
        return { success: false, error: 'Invalid redemption code' };
      }

      if (redemption.status !== 'ACTIVE') {
        return { success: false, error: `Code is ${redemption.status.toLowerCase()}` };
      }

      if (redemption.expires_at && new Date() > redemption.expires_at) {
        // Auto-expire
        await prisma.rewardRedemption.update({
          where: { id: redemption.id },
          data: { status: 'EXPIRED' },
        });
        return { success: false, error: 'Redemption code has expired' };
      }

      return { success: true, redemption };
    } catch (error) {
      console.error('Verify code error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto-expire old redemptions (cron job)
   */
  async expireOldRedemptions() {
    try {
      const now = new Date();

      // Get redemptions that will be expired (before updating)
      const redemptionsToExpire = await prisma.rewardRedemption.findMany({
        where: {
          status: 'ACTIVE',
          expires_at: {
            lt: now,
          },
        },
        include: {
          member: {
            select: { user_id: true },
          },
          reward: {
            select: { id: true, title: true },
          },
        },
      });

      // Update status
      const result = await prisma.rewardRedemption.updateMany({
        where: {
          status: 'ACTIVE',
          expires_at: {
            lt: now,
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      // Emit socket events for all expired redemptions (async)
      if (redemptionsToExpire.length > 0) {
        redemptionsToExpire.forEach(redemption => {
          rewardSocketHelper
            .emitRewardExpired(redemption.member_id, {
              id: redemption.id,
              reward_id: redemption.reward_id,
              reward: {
                id: redemption.reward.id,
                title: redemption.reward.title,
              },
              code: redemption.code,
              expires_at: redemption.expires_at,
            })
            .catch(err => console.error(`Socket emit error for redemption ${redemption.id}:`, err));
        });
      }

      return { success: true, expired: result.count };
    } catch (error) {
      console.error('Expire old redemptions error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all redemptions (Admin)
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Redemptions list
   */
  async getAllRedemptions(filters = {}) {
    try {
      const { memberId, rewardId, status, limit = 50, offset = 0, startDate, endDate } = filters;

      const where = {};
      if (memberId) where.member_id = memberId;
      if (rewardId) where.reward_id = rewardId;
      if (status) where.status = status;
      if (startDate || endDate) {
        where.redeemed_at = {};
        if (startDate) where.redeemed_at.gte = new Date(startDate);
        if (endDate) where.redeemed_at.lte = new Date(endDate);
      }

      const [redemptions, total] = await Promise.all([
        prisma.rewardRedemption.findMany({
          where,
          include: {
            reward: true,
            member: {
              select: {
                id: true,
                full_name: true,
                membership_number: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: { redeemed_at: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.rewardRedemption.count({ where }),
      ]);

      return {
        success: true,
        redemptions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    } catch (error) {
      console.error('Get all redemptions error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get redemption trend data
   * @param {string} period - Period type: 'daily', 'weekly', 'monthly'
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Object>} Trend data with dates, redemptions, and points_spent
   */
  async getRedemptionTrend(period = 'monthly', startDate = null, endDate = null) {
    try {
      // Default to last 12 months if no dates provided
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date();

      if (period === 'monthly') {
        start.setMonth(start.getMonth() - 12);
      } else if (period === 'weekly') {
        start.setDate(start.getDate() - 84); // 12 weeks
      } else {
        start.setDate(start.getDate() - 30); // 30 days
      }

      // Query redemptions in date range
      // Limit to prevent loading too much data at once
      // For analytics, we can aggregate in the database instead of loading all records
      const redemptions = await prisma.rewardRedemption.findMany({
        where: {
          redeemed_at: {
            gte: start,
            lte: end,
          },
        },
        select: {
          redeemed_at: true,
          points_spent: true,
        },
        orderBy: {
          redeemed_at: 'asc',
        },
        // Add reasonable limit to prevent timeout
        // For large datasets, consider using database aggregation instead
        take: 10000, // Max 10k records for trend analysis
      });

      // Group by period
      const grouped = {};
      const dates = [];
      const redemptionsCount = [];
      const pointsSpent = [];

      redemptions.forEach(redemption => {
        const date = new Date(redemption.redeemed_at);
        let key;

        if (period === 'monthly') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else if (period === 'weekly') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
          const weekNum = Math.ceil((date.getDate() + 6 - date.getDay()) / 7);
          key = `${weekStart.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }

        if (!grouped[key]) {
          grouped[key] = { count: 0, points: 0 };
        }
        grouped[key].count += 1;
        grouped[key].points += redemption.points_spent;
      });

      // Generate all periods in range
      const current = new Date(start);
      while (current <= end) {
        let key;
        let label;

        if (period === 'monthly') {
          key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
          label = `T${current.getMonth() + 1}/${current.getFullYear()}`;
          current.setMonth(current.getMonth() + 1);
        } else if (period === 'weekly') {
          const weekStart = new Date(current);
          weekStart.setDate(current.getDate() - current.getDay());
          const weekNum = Math.ceil((current.getDate() + 6 - current.getDay()) / 7);
          key = `${weekStart.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
          label = `Tuần ${weekNum}/${weekStart.getMonth() + 1}`;
          current.setDate(current.getDate() + 7);
        } else {
          key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
          label = `${String(current.getDate()).padStart(2, '0')}/${String(current.getMonth() + 1).padStart(2, '0')}`;
          current.setDate(current.getDate() + 1);
        }

        dates.push(label);
        redemptionsCount.push(grouped[key]?.count || 0);
        pointsSpent.push(grouped[key]?.points || 0);
      }

      return {
        success: true,
        data: {
          dates,
          redemptions: redemptionsCount,
          points_spent: pointsSpent,
        },
      };
    } catch (error) {
      console.error('Get redemption trend error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get reward statistics
   * @param {string} rewardId - Optional reward ID (if not provided, returns global stats)
   * @returns {Promise<Object>} Statistics
   */
  async getRewardStats(rewardId = null) {
    try {
      if (rewardId) {
        // Stats for specific reward
        const reward = await prisma.reward.findUnique({
          where: { id: rewardId },
          include: {
            redemptions: {
              select: {
                status: true,
                points_spent: true,
              },
            },
            _count: {
              select: {
                redemptions: true,
              },
            },
          },
        });

        if (!reward) {
          return { success: false, error: 'Reward not found' };
        }

        const redemptions = reward.redemptions;
        const activeCount = redemptions.filter(r => r.status === 'ACTIVE').length;
        const usedCount = redemptions.filter(r => r.status === 'USED').length;
        const expiredCount = redemptions.filter(r => r.status === 'EXPIRED').length;
        const refundedCount = redemptions.filter(r => r.status === 'REFUNDED').length;
        const totalPointsSpent = redemptions.reduce((sum, r) => sum + r.points_spent, 0);

        return {
          success: true,
          stats: {
            total_redemptions: reward._count.redemptions,
            active_redemptions: activeCount,
            used_redemptions: usedCount,
            expired_redemptions: expiredCount,
            refunded_redemptions: refundedCount,
            total_points_spent: totalPointsSpent,
            available_stock:
              reward.stock_quantity !== null
                ? Math.max(0, reward.stock_quantity - reward._count.redemptions)
                : null,
          },
        };
      } else {
        // Global stats
        const [totalRewards, activeRewards, totalRedemptions, popularRewardsData] =
          await Promise.all([
            prisma.reward.count(),
            prisma.reward.count({ where: { is_active: true } }),
            prisma.rewardRedemption.count(),
            prisma.rewardRedemption.groupBy({
              by: ['reward_id'],
              _count: { id: true },
              orderBy: { _count: { id: 'desc' } },
              take: 10,
            }),
          ]);

        // Get reward details for popular rewards
        const popularRewardIds = popularRewardsData.map(r => r.reward_id);
        const popularRewardDetails = await prisma.reward.findMany({
          where: { id: { in: popularRewardIds } },
          select: {
            id: true,
            title: true,
            points_cost: true,
          },
        });

        const popularRewards = popularRewardsData.map(r => {
          const reward = popularRewardDetails.find(rd => rd.id === r.reward_id);
          return {
            reward_id: r.reward_id,
            title: reward?.title || 'Unknown',
            points_cost: reward?.points_cost || 0,
            redemption_count: r._count.id,
          };
        });

        return {
          success: true,
          stats: {
            total_rewards: totalRewards,
            active_rewards: activeRewards,
            total_redemptions: totalRedemptions,
            popular_rewards: popularRewards,
          },
        };
      }
    } catch (error) {
      console.error('Get reward stats error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new RewardService();
