const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const pointsService = require('./points.service.js');
const notificationService = require('./notification.service.js');

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

      const reward = await prisma.reward.create({
        data: {
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
   * Get all available rewards
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Rewards list
   */
  async getRewards(filters = {}) {
    try {
      const { category, is_active = true, min_points, max_points } = filters;

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

      // Query rewards first, then filter valid_until in JavaScript
      // This avoids Prisma OR complexity with nullable fields
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
      });

      // Filter by valid_until: valid_until >= now OR valid_until IS NULL
      const validRewards = allRewards.filter((reward) => {
        if (reward.valid_until === null) return true; // No expiration
        return new Date(reward.valid_until) >= now; // Not expired
      });

      // Filter out rewards with no stock
      const availableRewards = validRewards.filter((reward) => {
        if (reward.stock_quantity === null) return true; // Unlimited
        const redeemedCount = reward._count.redemptions || 0;
        return redeemedCount < reward.stock_quantity;
      });

      return { success: true, rewards: availableRewards };
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
    try {
      // Get reward
      const rewardResult = await this.getRewardById(rewardId);
      if (!rewardResult.success || !rewardResult.reward) {
        return { success: false, error: 'Reward not found' };
      }

      const reward = rewardResult.reward;

      // Check availability
      if (!reward.is_available) {
        return { success: false, error: 'Reward is not available' };
      }

      // Check member points balance
      const balanceResult = await pointsService.getBalance(memberId);
      if (!balanceResult.success) {
        return { success: false, error: 'Failed to check points balance' };
      }

      if (balanceResult.balance.current < reward.points_cost) {
        return {
          success: false,
          error: 'Insufficient points',
          required: reward.points_cost,
          current: balanceResult.balance.current,
        };
      }

      // Check redemption limit per member
      if (reward.redemption_limit) {
        const memberRedemptions = await prisma.rewardRedemption.count({
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

      // Generate redemption code if needed
      const code = this.generateRedemptionCode();

      // Calculate expiration date (default 30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Create redemption record
      const redemption = await prisma.rewardRedemption.create({
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

      // Deduct points
      const spendResult = await pointsService.spendPoints(
        memberId,
        reward.points_cost,
        'REDEMPTION',
        rewardId,
        `Redeemed reward: ${reward.title}`
      );

      if (!spendResult.success) {
        // Rollback redemption
        await prisma.rewardRedemption.delete({
          where: { id: redemption.id },
        });
        return { success: false, error: 'Failed to deduct points' };
      }

      // Send notification
      await notificationService.sendNotification({
        memberId,
        type: 'REWARD',
        title: 'Reward Redeemed!',
        message: `You've successfully redeemed: ${reward.title}. Your code: ${code}`,
        data: {
          reward_id: rewardId,
          redemption_id: redemption.id,
          code,
        },
      });

      return {
        success: true,
        redemption: {
          ...redemption,
          new_balance: spendResult.newBalance,
        },
      };
    } catch (error) {
      console.error('Redeem reward error:', error);
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
   * @returns {string} Redemption code
   */
  generateRedemptionCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
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

      return { success: true, expired: result.count };
    } catch (error) {
      console.error('Expire old redemptions error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new RewardService();

