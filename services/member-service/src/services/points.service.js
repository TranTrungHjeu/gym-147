const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
let distributedLock = null;
try {
  distributedLock = require('../../../packages/shared-utils/dist/redis-lock.utils.js').distributedLock;
} catch (e) {
  try {
    distributedLock = require('../../../packages/shared-utils/src/redis-lock.utils.ts').distributedLock;
  } catch (e2) {
    console.warn('⚠️ Distributed lock utility not available, points transactions will use database transactions only');
  }
}

/**
 * Points Service
 * Manages member points balance and transactions
 */
class PointsService {
  /**
   * Get member points balance
   * @param {string} memberId - Member ID
   * @returns {Promise<Object>} Points balance
   */
  async getBalance(memberId) {
    try {
      const lastTransaction = await prisma.pointsTransaction.findFirst({
        where: { member_id: memberId },
        orderBy: { created_at: 'desc' },
      });

      const balance = lastTransaction ? lastTransaction.balance_after : 0;

      // Get summary stats
      const [totalEarned, totalSpent] = await Promise.all([
        prisma.pointsTransaction.aggregate({
          where: {
            member_id: memberId,
            type: 'EARNED',
          },
          _sum: { points: true },
        }),
        prisma.pointsTransaction.aggregate({
          where: {
            member_id: memberId,
            type: 'SPENT',
          },
          _sum: { points: true },
        }),
      ]);

      return {
        success: true,
        balance: {
          current: balance,
          total_earned: Number(totalEarned._sum.points || 0),
          total_spent: Math.abs(Number(totalSpent._sum.points || 0)),
        },
      };
    } catch (error) {
      console.error('Get points balance error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Award points to member
   * @param {string} memberId - Member ID
   * @param {number} points - Points to award
   * @param {string} source - Source type
   * @param {string} sourceId - Source ID
   * @param {string} description - Transaction description
   * @returns {Promise<Object>} Transaction result
   */
  async awardPoints(memberId, points, source = 'SYSTEM', sourceId = null, description = null) {
    try {
      if (points <= 0) {
        return { success: false, error: 'Points must be positive' };
      }

      // 🔒 Use transaction to prevent race conditions
      // Lock member record, get balance, and create transaction atomically
      const result = await prisma.$transaction(async (tx) => {
        // 1. Get current balance (from latest transaction)
        const lastTransaction = await tx.pointsTransaction.findFirst({
          where: { member_id: memberId },
          orderBy: { created_at: 'desc' },
          select: { balance_after: true },
        });

        const currentBalance = lastTransaction ? lastTransaction.balance_after : 0;
        const newBalance = currentBalance + points;

        // 2. Create transaction
        const transaction = await tx.pointsTransaction.create({
          data: {
            member_id: memberId,
            points: points,
            type: 'EARNED',
            source: source,
            source_id: sourceId,
            description: description || `Earned ${points} points from ${source}`,
            balance_after: newBalance,
          },
        });

        return {
          transaction,
          newBalance,
        };
      });

      return {
        success: true,
        transaction: result.transaction,
        newBalance: result.newBalance,
      };
    } catch (error) {
      console.error('Award points error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Spend points
   * @param {string} memberId - Member ID
   * @param {number} points - Points to spend
   * @param {string} source - Source type
   * @param {string} sourceId - Source ID
   * @param {string} description - Transaction description
   * @returns {Promise<Object>} Transaction result
   */
  async spendPoints(memberId, points, source = 'REDEMPTION', sourceId = null, description = null) {
    try {
      if (points <= 0) {
        return { success: false, error: 'Points must be positive' };
      }

      // Acquire distributed lock for points transaction
      let lockAcquired = false;
      let lockId = null;

      if (distributedLock) {
        const lockResult = await distributedLock.acquire('points', memberId, {
          ttl: 30, // 30 seconds
          retryAttempts: 3,
          retryDelay: 100,
        });

        if (!lockResult.acquired) {
          return { success: false, error: 'Points transaction đang được xử lý, vui lòng thử lại sau' };
        }

        lockAcquired = true;
        lockId = lockResult.lockId;
      }

      try {
        // 🔒 Use transaction to prevent race conditions and negative balance
        // Lock member record, check balance, and create transaction atomically
        const result = await prisma.$transaction(async (tx) => {
          // 1. Get current balance (from latest transaction)
          const lastTransaction = await tx.pointsTransaction.findFirst({
            where: { member_id: memberId },
            orderBy: { created_at: 'desc' },
            select: { balance_after: true },
          });

          const currentBalance = lastTransaction ? lastTransaction.balance_after : 0;

          // 2. Check sufficient balance
          if (currentBalance < points) {
            throw new Error('INSUFFICIENT_POINTS');
          }

          const newBalance = currentBalance - points;

          // 3. Create transaction
          const transaction = await tx.pointsTransaction.create({
            data: {
              member_id: memberId,
              points: -points, // Negative for spending
              type: 'SPENT',
              source: source,
              source_id: sourceId,
              description: description || `Spent ${points} points on ${source}`,
              balance_after: newBalance,
            },
          });

          return {
            transaction,
            newBalance,
            currentBalance,
          };
        });

        return {
          success: true,
          transaction: result.transaction,
          newBalance: result.newBalance,
        };
      } catch (error) {
        console.error('Spend points error:', error);
        
        // Handle insufficient points error
        if (error.message === 'INSUFFICIENT_POINTS') {
          const balanceResult = await this.getBalance(memberId);
          return {
            success: false,
            error: 'Insufficient points',
            currentBalance: balanceResult.balance.current,
            required: points,
          };
        }

        return { success: false, error: error.message };
      } finally {
        // Release distributed lock
        if (lockAcquired && lockId && distributedLock) {
          try {
            await distributedLock.release('points', memberId, lockId);
          } catch (releaseError) {
            console.error('Error releasing points lock:', releaseError);
          }
        }
      }
    } catch (error) {
      console.error('Spend points outer error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get points transaction history
   * @param {string} memberId - Member ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Transaction history
   */
  async getHistory(memberId, filters = {}) {
    try {
      const { type, source, limit = 50, offset = 0 } = filters;

      const where = {
        member_id: memberId,
      };

      if (type) where.type = type;
      if (source) where.source = source;

      const [transactions, total] = await Promise.all([
        prisma.pointsTransaction.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.pointsTransaction.count({ where }),
      ]);

      return {
        success: true,
        transactions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    } catch (error) {
      console.error('Get points history error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get top members by points with period filtering
   * @param {number} limit - Number of top members
   * @param {string} period - Period: 'weekly', 'monthly', 'yearly', 'alltime'
   * @returns {Promise<Object>} Top members
   */
  async getTopMembersByPoints(limit = 10, period = 'alltime') {
    try {
      const { getPeriodFilter } = require('../utils/leaderboard.util.js');
      const dateFilter = getPeriodFilter(period);

      let topMembers;

      if (period === 'alltime') {
        // For all-time: use current balance
        const transactions = await prisma.pointsTransaction.findMany({
          distinct: ['member_id'],
          orderBy: { created_at: 'desc' },
          select: {
            member_id: true,
            balance_after: true,
            created_at: true,
          },
        });

        // Group by member and get latest balance
        const memberBalances = {};
        transactions.forEach(t => {
          if (!memberBalances[t.member_id] || t.created_at > memberBalances[t.member_id].created_at) {
            memberBalances[t.member_id] = {
              member_id: t.member_id,
              points: t.balance_after,
              last_updated: t.created_at,
            };
          }
        });

        topMembers = Object.values(memberBalances)
          .sort((a, b) => b.points - a.points)
          .slice(0, limit);
      } else {
        // For period: sum earned points in that period
        const earnedPoints = await prisma.pointsTransaction.groupBy({
          by: ['member_id'],
          _sum: {
            points: true,
          },
          where: {
            type: 'EARNED',
            created_at: dateFilter,
          },
          orderBy: {
            _sum: {
              points: 'desc',
            },
          },
          take: limit,
        });

        topMembers = earnedPoints.map(item => ({
          member_id: item.member_id,
          points: item._sum.points || 0,
        }));
      }

      // Get member details
      const memberIds = topMembers.map(m => m.member_id);
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

      const result = topMembers.map((item, index) => ({
        rank: index + 1,
        memberId: item.member_id,
        memberName: memberMap[item.member_id]?.full_name || 'Unknown',
        avatarUrl: memberMap[item.member_id]?.profile_photo || null,
        membershipType: memberMap[item.member_id]?.membership_type || 'BASIC',
        points: item.points,
        isCurrentUser: false, // Will be set by frontend
      }));

      return { success: true, members: result };
    } catch (error) {
      console.error('Get top members by points error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PointsService();

