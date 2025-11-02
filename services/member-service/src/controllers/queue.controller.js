const { PrismaClient } = require('@prisma/client');
const { sendPushNotification } = require('../utils/push-notification');

const prisma = new PrismaClient();

// ============================================
//  CONSTANTS
// ============================================

const MAX_QUEUE_LENGTH = 10; // Maximum 10 people in queue
const NOTIFICATION_EXPIRE_MINUTES = 5; // 5 minutes to claim equipment

// ============================================
//  JOIN QUEUE
// ============================================

async function joinQueue(req, res) {
  try {
    const { equipment_id } = req.body;
    const userId = req.user.userId || req.user.id;

    console.log(`🎫 User ${userId} joining queue for equipment ${equipment_id}`);

    // 1. Get member_id from user_id
    const member = await prisma.member.findUnique({
      where: { user_id: userId },
      select: { id: true, full_name: true },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
      });
    }

    // 2. Check if equipment exists
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipment_id },
      select: { id: true, name: true, status: true },
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found',
      });
    }

    // 3. Check if member already in queue for this equipment
    const existingQueueEntry = await prisma.equipmentQueue.findFirst({
      where: {
        member_id: member.id,
        equipment_id: equipment_id,
        status: { in: ['WAITING', 'NOTIFIED'] },
      },
    });

    if (existingQueueEntry) {
      return res.status(400).json({
        success: false,
        message: 'You are already in the queue for this equipment',
        data: { position: existingQueueEntry.position },
      });
    }

    // 4. Check if member is currently using this equipment
    const activeUsage = await prisma.equipmentUsage.findFirst({
      where: {
        member_id: member.id,
        equipment_id: equipment_id,
        end_time: null,
      },
    });

    if (activeUsage) {
      return res.status(400).json({
        success: false,
        message: 'You are currently using this equipment',
      });
    }

    // 5. Check queue length
    const currentQueueCount = await prisma.equipmentQueue.count({
      where: {
        equipment_id: equipment_id,
        status: { in: ['WAITING', 'NOTIFIED'] },
      },
    });

    if (currentQueueCount >= MAX_QUEUE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Queue is full (max ${MAX_QUEUE_LENGTH} people)`,
      });
    }

    // 6. Get next position
    const lastPosition = await prisma.equipmentQueue.findFirst({
      where: {
        equipment_id: equipment_id,
        status: { in: ['WAITING', 'NOTIFIED'] },
      },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const nextPosition = (lastPosition?.position || 0) + 1;

    // 7. Create queue entry
    const queueEntry = await prisma.equipmentQueue.create({
      data: {
        member_id: member.id,
        equipment_id: equipment_id,
        position: nextPosition,
        status: 'WAITING',
      },
      include: {
        equipment: {
          select: { id: true, name: true, category: true },
        },
      },
    });

    console.log(`✅ Member ${member.full_name} joined queue at position ${nextPosition}`);

    // 8. Emit WebSocket event
    if (global.io) {
      global.io.to(`equipment:${equipment_id}`).emit('queue:updated', {
        equipment_id: equipment_id,
        queue_length: currentQueueCount + 1,
        action: 'joined',
        member_id: member.id,
      });

      // Notify the member
      global.io.to(`user:${userId}`).emit('queue:joined', {
        queue_id: queueEntry.id,
        equipment: queueEntry.equipment,
        position: nextPosition,
      });
    }

    return res.status(201).json({
      success: true,
      message: `You are in position ${nextPosition} for ${equipment.name}`,
      data: {
        queue_id: queueEntry.id,
        position: nextPosition,
        equipment: queueEntry.equipment,
        estimated_wait: nextPosition * 30, // Rough estimate: 30 min per person
      },
    });
  } catch (error) {
    console.error('❌ Join queue error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to join queue',
      error: error.message,
    });
  }
}

// ============================================
//  LEAVE QUEUE (CANCEL)
// ============================================

async function leaveQueue(req, res) {
  try {
    const { equipment_id } = req.body;
    const userId = req.user.userId || req.user.id;

    console.log(`🚪 User ${userId} leaving queue for equipment ${equipment_id}`);

    // 1. Get member_id
    const member = await prisma.member.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
      });
    }

    // 2. Find queue entry
    const queueEntry = await prisma.equipmentQueue.findFirst({
      where: {
        member_id: member.id,
        equipment_id: equipment_id,
        status: { in: ['WAITING', 'NOTIFIED'] },
      },
    });

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'You are not in the queue for this equipment',
      });
    }

    const removedPosition = queueEntry.position;

    // 3. Update status to CANCELLED
    await prisma.equipmentQueue.update({
      where: { id: queueEntry.id },
      data: { status: 'CANCELLED' },
    });

    // 4. Reorder remaining queue entries
    await prisma.equipmentQueue.updateMany({
      where: {
        equipment_id: equipment_id,
        status: { in: ['WAITING', 'NOTIFIED'] },
        position: { gt: removedPosition },
      },
      data: {
        position: { decrement: 1 },
      },
    });

    console.log(`✅ Member left queue at position ${removedPosition}`);

    // 5. Emit WebSocket event
    if (global.io) {
      const newQueueLength = await prisma.equipmentQueue.count({
        where: {
          equipment_id: equipment_id,
          status: { in: ['WAITING', 'NOTIFIED'] },
        },
      });

      global.io.to(`equipment:${equipment_id}`).emit('queue:updated', {
        equipment_id: equipment_id,
        queue_length: newQueueLength,
        action: 'left',
        member_id: member.id,
      });

      // Notify members that positions have shifted
      global.io.to(`equipment:${equipment_id}`).emit('queue:position_updated', {
        equipment_id: equipment_id,
      });
    }

    return res.json({
      success: true,
      message: 'Successfully left the queue',
    });
  } catch (error) {
    console.error('❌ Leave queue error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to leave queue',
      error: error.message,
    });
  }
}

// ============================================
//  GET QUEUE POSITION
// ============================================

async function getQueuePosition(req, res) {
  try {
    const { equipment_id } = req.params;
    const userId = req.user.userId || req.user.id;

    // 1. Get member_id
    const member = await prisma.member.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
      });
    }

    // 2. Find queue entry
    const queueEntry = await prisma.equipmentQueue.findFirst({
      where: {
        member_id: member.id,
        equipment_id: equipment_id,
        status: { in: ['WAITING', 'NOTIFIED'] },
      },
      include: {
        equipment: {
          select: { id: true, name: true, category: true, status: true },
        },
      },
    });

    if (!queueEntry) {
      return res.json({
        success: true,
        data: {
          in_queue: false,
          message: 'You are not in the queue',
        },
      });
    }

    // 3. Get total queue length
    const totalInQueue = await prisma.equipmentQueue.count({
      where: {
        equipment_id: equipment_id,
        status: { in: ['WAITING', 'NOTIFIED'] },
      },
    });

    // 4. Calculate estimated wait time
    const estimatedWaitMinutes = queueEntry.position * 30;

    return res.json({
      success: true,
      data: {
        in_queue: true,
        queue_id: queueEntry.id,
        position: queueEntry.position,
        total_in_queue: totalInQueue,
        status: queueEntry.status,
        equipment: queueEntry.equipment,
        joined_at: queueEntry.joined_at,
        notified_at: queueEntry.notified_at,
        expires_at: queueEntry.expires_at,
        estimated_wait_minutes: estimatedWaitMinutes,
      },
    });
  } catch (error) {
    console.error('❌ Get queue position error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get queue position',
      error: error.message,
    });
  }
}

// ============================================
//  GET EQUIPMENT QUEUE (ALL WAITING)
// ============================================

async function getEquipmentQueue(req, res) {
  try {
    const { equipment_id } = req.params;

    const queue = await prisma.equipmentQueue.findMany({
      where: {
        equipment_id: equipment_id,
        status: { in: ['WAITING', 'NOTIFIED'] },
      },
      include: {
        member: {
          select: {
            id: true,
            full_name: true,
            profile_photo: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });

    return res.json({
      success: true,
      data: {
        queue_length: queue.length,
        queue: queue,
      },
    });
  } catch (error) {
    console.error('❌ Get equipment queue error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get equipment queue',
      error: error.message,
    });
  }
}

// ============================================
//  NOTIFY NEXT IN QUEUE (INTERNAL)
// ============================================

async function notifyNextInQueue(equipment_id, equipment_name) {
  try {
    console.log(`🔔 Notifying next person in queue for ${equipment_name}`);

    // 1. Find next person in WAITING status
    const nextInQueue = await prisma.equipmentQueue.findFirst({
      where: {
        equipment_id: equipment_id,
        status: 'WAITING',
      },
      orderBy: { position: 'asc' },
      include: {
        member: {
          select: {
            id: true,
            user_id: true,
            full_name: true,
          },
        },
      },
    });

    if (!nextInQueue) {
      console.log('ℹ️ No one in queue');
      return null;
    }

    // 2. Update status to NOTIFIED and set expiry
    const expiresAt = new Date(Date.now() + NOTIFICATION_EXPIRE_MINUTES * 60 * 1000);

    await prisma.equipmentQueue.update({
      where: { id: nextInQueue.id },
      data: {
        status: 'NOTIFIED',
        notified_at: new Date(),
        expires_at: expiresAt,
      },
    });

    console.log(`✅ Notified ${nextInQueue.member.full_name} (position ${nextInQueue.position})`);

    // 3. Send WebSocket notification
    if (global.io) {
      global.io.to(`user:${nextInQueue.member.user_id}`).emit('queue:your_turn', {
        equipment_id: equipment_id,
        equipment_name: equipment_name,
        queue_id: nextInQueue.id,
        expires_at: expiresAt,
        expires_in_minutes: NOTIFICATION_EXPIRE_MINUTES,
      });

      global.io.to(`equipment:${equipment_id}`).emit('queue:updated', {
        equipment_id: equipment_id,
        action: 'notified',
        member_id: nextInQueue.member.id,
      });
    }

    // 4. Send Push Notification
    if (nextInQueue.member.user_id) {
      await sendPushNotification(
        nextInQueue.member.user_id,
        "🎉 It's Your Turn!",
        `${equipment_name} is now available. You have ${NOTIFICATION_EXPIRE_MINUTES} minutes to claim it.`,
        {
          type: 'QUEUE_YOUR_TURN',
          equipment_id: equipment_id,
          equipment_name: equipment_name,
          queue_id: nextInQueue.id,
          expires_at: expiresAt.toISOString(),
        }
      );
    }

    return nextInQueue;
  } catch (error) {
    console.error('❌ Notify next in queue error:', error);
    return null;
  }
}

// ============================================
//  CLEANUP EXPIRED NOTIFICATIONS (CRON)
// ============================================

async function cleanupExpiredNotifications() {
  try {
    console.log('🧹 Cleaning up expired queue notifications...');

    const now = new Date();

    // Find all expired notifications
    const expiredEntries = await prisma.equipmentQueue.findMany({
      where: {
        status: 'NOTIFIED',
        expires_at: { lte: now },
      },
      include: {
        member: {
          select: { id: true, user_id: true, full_name: true },
        },
        equipment: {
          select: { id: true, name: true },
        },
      },
    });

    if (expiredEntries.length === 0) {
      console.log('ℹ️ No expired notifications to clean up');
      return { expired_count: 0 };
    }

    console.log(`⚠️ Found ${expiredEntries.length} expired notifications`);

    // Process each expired entry
    for (const entry of expiredEntries) {
      // 1. Mark as EXPIRED
      await prisma.equipmentQueue.update({
        where: { id: entry.id },
        data: { status: 'EXPIRED' },
      });

      // 2. Notify user via WebSocket
      if (global.io && entry.member.user_id) {
        global.io.to(`user:${entry.member.user_id}`).emit('queue:expired', {
          equipment_id: entry.equipment_id,
          equipment_name: entry.equipment.name,
          queue_id: entry.id,
        });
      }

      console.log(`⏰ Expired: ${entry.member.full_name} for ${entry.equipment.name}`);

      // 3. Notify next person in queue
      await notifyNextInQueue(entry.equipment_id, entry.equipment.name);
    }

    return {
      expired_count: expiredEntries.length,
      entries: expiredEntries.map(e => ({
        member: e.member.full_name,
        equipment: e.equipment.name,
      })),
    };
  } catch (error) {
    console.error('❌ Cleanup expired notifications error:', error);
    return { error: error.message };
  }
}

module.exports = {
  joinQueue,
  leaveQueue,
  getQueuePosition,
  getEquipmentQueue,
  notifyNextInQueue,
  cleanupExpiredNotifications,
};







