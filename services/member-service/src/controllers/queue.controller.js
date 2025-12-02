const { sendPushNotification } = require('../utils/push-notification');
const notificationService = require('../services/notification.service');
const cacheService = require('../services/cache.service');
// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');
let distributedLock = null;
try {
  distributedLock = require('../../../packages/shared-utils/dist/redis-lock.utils.js').distributedLock;
} catch (e) {
  try {
    distributedLock = require('../../../packages/shared-utils/src/redis-lock.utils.ts').distributedLock;
  } catch (e2) {
    console.warn('[WARNING] Distributed lock utility not available, queue operations will use database transactions only');
  }
}

// ============================================
//  CONSTANTS
// ============================================

const MAX_QUEUE_LENGTH = 10; // Maximum 10 people in queue
const NOTIFICATION_EXPIRE_MINUTES = 5; // 5 minutes to claim equipment

// ============================================
//  HELPER FUNCTIONS
// ============================================

/**
 * Helper function to get userId from JWT token
 */
function getUserIdFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return null;
    }

    // Add padding to base64 if needed
    let payloadBase64 = tokenParts[1];
    while (payloadBase64.length % 4) {
      payloadBase64 += '=';
    }

    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    return payload.userId || payload.id;
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
}

// ============================================
//  JOIN QUEUE
// ============================================

async function joinQueue(req, res) {
  try {
    const { equipment_id } = req.body;
    const userId = getUserIdFromToken(req);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or missing token',
      });
    }

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

    // 5. Check queue length (with cache)
    const currentQueueCount = await cacheService.getOrSetQueueLength(
      equipment_id,
      async () => {
        return await prisma.equipmentQueue.count({
          where: {
            equipment_id: equipment_id,
            status: { in: ['WAITING', 'NOTIFIED'] },
          },
        });
      },
      300 // 5 minutes TTL
    );

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

    // 7. Acquire distributed lock for queue operations
    let lockAcquired = false;
    let lockId = null;

    if (distributedLock) {
      const lockResult = await distributedLock.acquire('queue', equipment_id, {
        ttl: 30, // 30 seconds
        retryAttempts: 3,
        retryDelay: 100,
      });

      if (!lockResult.acquired) {
        return res.status(409).json({
          success: false,
          message: 'Queue operation đang được xử lý, vui lòng thử lại sau',
          data: null,
        });
      }

      lockAcquired = true;
      lockId = lockResult.lockId;
    }

    try {
      // 7. Create queue entry (with lock protection)
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

      console.log(`[SUCCESS] Member ${member.full_name} joined queue at position ${nextPosition}`);

      // 7.5. Invalidate queue cache after joining
      await cacheService.invalidateQueueCache(equipment_id);
      // Update cache with new length
      await cacheService.setQueueLength(equipment_id, currentQueueCount + 1, 300);

      // 8. Create notifications
      // Notification for member
      await notificationService.createQueueNotification({
        memberId: member.id,
        type: 'QUEUE_JOINED',
        title: 'Đã tham gia hàng chờ',
        message: `Bạn đã tham gia hàng chờ thiết bị ${equipment.name} ở vị trí ${nextPosition}`,
        data: {
          equipment_id: equipment_id,
          equipment_name: equipment.name,
          queue_id: queueEntry.id,
          position: nextPosition,
          estimated_wait: nextPosition * 30,
        },
      });

      // Notification for admin
      await notificationService.createQueueNotificationForAdmin({
        equipmentId: equipment_id,
        equipmentName: equipment.name,
        memberName: member.full_name,
        position: nextPosition,
        action: 'joined',
      });

      // 9. Emit WebSocket event
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

      // Release lock after successful creation
      if (lockAcquired && distributedLock && lockId) {
        await distributedLock.release('queue', equipment_id, lockId);
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
      // Release lock on error
      if (lockAcquired && distributedLock && lockId) {
        await distributedLock.release('queue', equipment_id, lockId);
      }
      console.error('[ERROR] Join queue error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to join queue',
        error: error.message,
      });
    }
  } catch (error) {
    console.error('[ERROR] Join queue error:', error);
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
    const userId = getUserIdFromToken(req);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or missing token',
      });
    }

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

    // 3. Acquire distributed lock for queue operations
    let lockAcquired = false;
    let lockId = null;

    if (distributedLock) {
      const lockResult = await distributedLock.acquire('queue', equipment_id, {
        ttl: 30, // 30 seconds
        retryAttempts: 3,
        retryDelay: 100,
      });

      if (!lockResult.acquired) {
        return res.status(409).json({
          success: false,
          message: 'Queue operation đang được xử lý, vui lòng thử lại sau',
          data: null,
        });
      }

      lockAcquired = true;
      lockId = lockResult.lockId;
    }

    try {
      // 3. Delete queue entry (remove completely instead of marking as CANCELLED)
      await prisma.equipmentQueue.delete({
        where: { id: queueEntry.id },
      });

      // 4. Get members whose positions will be updated (before reordering)
      const affectedMembers = await prisma.equipmentQueue.findMany({
        where: {
          equipment_id: equipment_id,
          status: { in: ['WAITING', 'NOTIFIED'] },
          position: { gt: removedPosition },
        },
        include: {
          member: {
            select: { id: true, user_id: true, full_name: true },
          },
        },
      });

      // 5. Reorder remaining queue entries
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

      // Release lock after successful operation
      if (lockAcquired && distributedLock && lockId) {
        await distributedLock.release('queue', equipment_id, lockId);
      }
    } catch (error) {
      // Release lock on error
      if (lockAcquired && distributedLock && lockId) {
        await distributedLock.release('queue', equipment_id, lockId);
      }
      throw error;
    }

    console.log(`[SUCCESS] Member left queue at position ${removedPosition}`);

    // 5.5. Invalidate queue cache after leaving
    await cacheService.invalidateQueueCache(equipment_id);

    // 6. Get equipment info for notification
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipment_id },
      select: { id: true, name: true },
    });

    // 7. Get member info for notification
    const memberInfo = await prisma.member.findUnique({
      where: { id: member.id },
      select: { id: true, full_name: true },
    });

    // 8. Create notifications
    // Notification for admin
    if (equipment && memberInfo) {
      await notificationService.createQueueNotificationForAdmin({
        equipmentId: equipment_id,
        equipmentName: equipment.name,
        memberName: memberInfo.full_name,
        position: removedPosition,
        action: 'left',
      });
    }

    // Notification for affected members (position updated)
    if (equipment && affectedMembers.length > 0) {
      await Promise.allSettled(
        affectedMembers.map(async entry => {
          const newPosition = entry.position - 1;
          await notificationService.createQueueNotification({
            memberId: entry.member.id,
            type: 'QUEUE_POSITION_UPDATED',
            title: 'Vị trí hàng chờ đã cập nhật',
            message: `Vị trí của bạn trong hàng chờ thiết bị ${equipment.name} đã được cập nhật từ ${entry.position} xuống ${newPosition}`,
            data: {
              equipment_id: equipment_id,
              equipment_name: equipment.name,
              queue_id: entry.id,
              old_position: entry.position,
              new_position: newPosition,
            },
          });
        })
      );
    }

    // 9. Emit WebSocket event
    if (global.io) {
      const newQueueLength = await cacheService.getOrSetQueueLength(
        equipment_id,
        async () => {
          return await prisma.equipmentQueue.count({
            where: {
              equipment_id: equipment_id,
              status: { in: ['WAITING', 'NOTIFIED'] },
            },
          });
        },
        300
      );

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

      // Emit to affected members
      affectedMembers.forEach(entry => {
        if (entry.member.user_id) {
          global.io.to(`user:${entry.member.user_id}`).emit('queue:position_updated', {
            equipment_id: equipment_id,
            equipment_name: equipment?.name,
            queue_id: entry.id,
            old_position: entry.position,
            new_position: entry.position - 1,
          });
        }
      });
    }

    return res.json({
      success: true,
      message: 'Successfully left the queue',
    });
  } catch (error) {
    console.error('[ERROR] Leave queue error:', error);
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
    const userId = getUserIdFromToken(req);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or missing token',
      });
    }

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

    // 3. Get total queue length (with cache)
    const totalInQueue = await cacheService.getOrSetQueueLength(
      equipment_id,
      async () => {
        return await prisma.equipmentQueue.count({
          where: {
            equipment_id: equipment_id,
            status: { in: ['WAITING', 'NOTIFIED'] },
          },
        });
      },
      300
    );

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
    console.error('[ERROR] Get queue position error:', error);
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

    // Get queue from cache or database
    const queue = await cacheService.getOrSetQueueList(
      equipment_id,
      async () => {
        return await prisma.equipmentQueue.findMany({
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
      },
      300 // 5 minutes TTL
    );

    return res.json({
      success: true,
      data: {
        queue_length: queue.length,
        queue: queue,
      },
    });
  } catch (error) {
    console.error('[ERROR] Get equipment queue error:', error);
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
    console.log(`[BELL] Notifying next person in queue for ${equipment_name}`);

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
      console.log('[INFO] No one in queue');
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

    // Invalidate queue cache after status change
    await cacheService.invalidateQueueCache(equipment_id);

    console.log(`[SUCCESS] Notified ${nextInQueue.member.full_name} (position ${nextInQueue.position})`);

    // 3. Create in-app notification for member
    await notificationService.createQueueNotification({
      memberId: nextInQueue.member.id,
      type: 'QUEUE_YOUR_TURN',
      title: "[CELEBRATE] Đến lượt bạn!",
      message: `${equipment_name} đã có sẵn. Bạn có ${NOTIFICATION_EXPIRE_MINUTES} phút để sử dụng.`,
      data: {
        equipment_id: equipment_id,
        equipment_name: equipment_name,
        queue_id: nextInQueue.id,
        position: nextInQueue.position,
        expires_at: expiresAt.toISOString(),
        expires_in_minutes: NOTIFICATION_EXPIRE_MINUTES,
      },
    });

    // 4. Send WebSocket notification
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

    // 5. Send Push Notification
    if (nextInQueue.member.user_id) {
      await sendPushNotification(
        nextInQueue.member.user_id,
        "[CELEBRATE] It's Your Turn!",
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
    console.error('[ERROR] Notify next in queue error:', error);
    return null;
  }
}

// ============================================
//  CLEANUP EXPIRED NOTIFICATIONS (CRON)
// ============================================

async function cleanupExpiredNotifications() {
  try {
    console.log('[CLEANUP] Cleaning up expired queue notifications...');

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
      console.log('[INFO] No expired notifications to clean up');
      return { expired_count: 0 };
    }

    console.log(`[WARNING] Found ${expiredEntries.length} expired notifications`);

    // Process each expired entry
    for (const entry of expiredEntries) {
      // 1. Mark as EXPIRED
      await prisma.equipmentQueue.update({
        where: { id: entry.id },
        data: { status: 'EXPIRED' },
      });

      // Invalidate queue cache after status change
      await cacheService.invalidateQueueCache(entry.equipment_id);

      // 2. Create notification for member
      await notificationService.createQueueNotification({
        memberId: entry.member.id,
        type: 'QUEUE_EXPIRED',
        title: 'Hết hạn hàng chờ',
        message: `Bạn đã bỏ lỡ lượt sử dụng thiết bị ${entry.equipment.name}. Vui lòng tham gia lại hàng chờ nếu muốn sử dụng.`,
        data: {
          equipment_id: entry.equipment_id,
          equipment_name: entry.equipment.name,
          queue_id: entry.id,
        },
      });

      // 3. Notify user via WebSocket
      if (global.io && entry.member.user_id) {
        global.io.to(`user:${entry.member.user_id}`).emit('queue:expired', {
          equipment_id: entry.equipment_id,
          equipment_name: entry.equipment.name,
          queue_id: entry.id,
        });
      }

      console.log(`[TIMER] Expired: ${entry.member.full_name} for ${entry.equipment.name}`);

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
    console.error('[ERROR] Cleanup expired notifications error:', error);
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







