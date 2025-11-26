/**
 * Reward Socket Helper
 * Helper functions for emitting reward-related socket events
 */

/**
 * Emit reward redeemed event to member
 * @param {string} memberId - Member ID
 * @param {Object} redemptionData - Redemption data
 */
async function emitRewardRedeemed(memberId, redemptionData) {
  if (!global.io) return;

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { user_id: true },
    });

    if (!member?.user_id) {
      await prisma.$disconnect();
      return;
    }

    const roomName = `user:${member.user_id}`;
    const socketPayload = {
      redemption_id: redemptionData.id,
      reward_id: redemptionData.reward_id,
      reward: redemptionData.reward,
      points_spent: redemptionData.points_spent,
      new_balance: redemptionData.new_balance,
      code: redemptionData.code,
      expires_at: redemptionData.expires_at,
      redeemed_at: redemptionData.redeemed_at,
    };

    global.io.to(roomName).emit('reward:redeemed', socketPayload);
    global.io.to(roomName).emit('points:updated', {
      new_balance: redemptionData.new_balance,
      change: -redemptionData.points_spent,
      reason: 'reward_redemption',
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error emitting reward:redeemed:', error);
  }
}

/**
 * Emit reward refunded event to member
 * @param {string} memberId - Member ID
 * @param {Object} refundData - Refund data
 */
async function emitRewardRefunded(memberId, refundData) {
  if (!global.io) return;

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { user_id: true },
    });

    if (!member?.user_id) {
      await prisma.$disconnect();
      return;
    }

    const roomName = `user:${member.user_id}`;
    const socketPayload = {
      redemption_id: refundData.redemption_id,
      reward_id: refundData.reward_id,
      reward: refundData.reward,
      points_refunded: refundData.points_refunded,
      new_balance: refundData.new_balance,
      reason: refundData.reason,
    };

    global.io.to(roomName).emit('reward:refunded', socketPayload);
    if (refundData.new_balance !== null && refundData.new_balance !== undefined) {
      global.io.to(roomName).emit('points:updated', {
        new_balance: refundData.new_balance,
        change: refundData.points_refunded,
        reason: 'reward_refund',
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error emitting reward:refunded:', error);
  }
}

/**
 * Emit reward used event to member
 * @param {string} memberId - Member ID
 * @param {Object} redemptionData - Redemption data
 */
async function emitRewardUsed(memberId, redemptionData) {
  if (!global.io) return;

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { user_id: true },
    });

    if (!member?.user_id) {
      await prisma.$disconnect();
      return;
    }

    const roomName = `user:${member.user_id}`;
    const socketPayload = {
      redemption_id: redemptionData.id,
      reward_id: redemptionData.reward_id,
      reward: redemptionData.reward,
      used_at: redemptionData.used_at,
    };

    global.io.to(roomName).emit('reward:used', socketPayload);
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error emitting reward:used:', error);
  }
}

/**
 * Emit reward expired event to member
 * @param {string} memberId - Member ID
 * @param {Object} redemptionData - Redemption data
 */
async function emitRewardExpired(memberId, redemptionData) {
  if (!global.io) return;

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { user_id: true },
    });

    if (!member?.user_id) {
      await prisma.$disconnect();
      return;
    }

    const roomName = `user:${member.user_id}`;
    const socketPayload = {
      redemption_id: redemptionData.id,
      reward_id: redemptionData.reward_id,
      reward: redemptionData.reward,
      code: redemptionData.code,
      expires_at: redemptionData.expires_at,
    };

    global.io.to(roomName).emit('reward:expired', socketPayload);
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error emitting reward:expired:', error);
  }
}

/**
 * Emit reward redeemed event to admin/super admin
 * @param {string} memberId - Member ID
 * @param {Object} redemptionData - Redemption data with member info
 */
async function emitRewardRedeemedToAdmin(memberId, redemptionData) {
  if (!global.io) return;

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Get member info for admin notification
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        membership_number: true,
      },
    });

    if (!member) {
      await prisma.$disconnect();
      return;
    }

    // Emit to admin room (all admins subscribed to 'admin' room)
    const socketPayload = {
      redemption_id: redemptionData.id,
      member_id: memberId,
      member_name: member.full_name,
      member_email: member.email,
      member_phone: member.phone,
      membership_number: member.membership_number,
      reward_id: redemptionData.reward_id,
      reward_title: redemptionData.reward?.title || redemptionData.reward_title,
      reward_category: redemptionData.reward?.category || redemptionData.reward_category,
      points_spent: redemptionData.points_spent,
      code: redemptionData.code,
      redeemed_at: redemptionData.redeemed_at,
      timestamp: new Date().toISOString(),
    };

    // Emit to admin room
    global.io.to('admin').emit('reward:redemption:new', socketPayload);
    
    // Also broadcast to all connected clients (for admins not in room)
    global.io.emit('reward:redemption:new', socketPayload);

    console.log(`📢 Emitted reward:redemption:new to admin for member ${memberId}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error emitting reward:redemption:new to admin:', error);
  }
}

module.exports = {
  emitRewardRedeemed,
  emitRewardRefunded,
  emitRewardUsed,
  emitRewardExpired,
  emitRewardRedeemedToAdmin,
};


