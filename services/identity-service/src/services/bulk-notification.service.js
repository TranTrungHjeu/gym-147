const axios = require('axios');
const { prisma } = require('../lib/prisma.js');

class BulkNotificationService {
  constructor() {
    if (!process.env.MEMBER_SERVICE_URL) {
      throw new Error(
        'MEMBER_SERVICE_URL environment variable is required. Please set it in your .env file.'
      );
    }
    if (!process.env.SCHEDULE_SERVICE_URL) {
      throw new Error(
        'SCHEDULE_SERVICE_URL environment variable is required. Please set it in your .env file.'
      );
    }
    this.memberServiceUrl = process.env.MEMBER_SERVICE_URL;
    this.scheduleServiceUrl = process.env.SCHEDULE_SERVICE_URL;
  }

  /**
   * Get members by filters from Member Service
   * @param {Object} filters - { membership_type, membership_status, search, member_ids }
   * @returns {Promise<Array>} Array of members with user_id
   */
  async getMembersByFilters(filters) {
    try {
      const { member_ids, membership_type, membership_status, search } = filters;

      // If specific member_ids provided, use them
      if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
        const response = await axios.post(
          `${this.memberServiceUrl}/api/members/for-notification`,
          { member_ids },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
          }
        );

        if (response.data?.success) {
          return response.data.data?.members || response.data.data || [];
        }
        return [];
      }

      // Otherwise use filters
      const params = new URLSearchParams();
      if (membership_type) params.append('membership_type', membership_type);
      if (membership_status) params.append('status', membership_status);
      if (search) params.append('search', search);
      // Get all members (no pagination limit for bulk notification)
      params.append('limit', '10000');

      const response = await axios.get(
        `${this.memberServiceUrl}/api/members/for-notification?${params.toString()}`,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      if (response.data?.success) {
        return response.data.data?.members || response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error('[ERROR] Error getting members by filters:', error.message);
      throw error;
    }
  }

  /**
   * Get trainers by filters from Schedule Service
   * @param {Object} filters - { status, specialization, trainer_ids }
   * @returns {Promise<Array>} Array of trainers with user_id
   */
  async getTrainersByFilters(filters) {
    try {
      const { trainer_ids, status, specialization } = filters;

      // If specific trainer_ids provided, use them
      if (trainer_ids && Array.isArray(trainer_ids) && trainer_ids.length > 0) {
        const response = await axios.post(
          `${this.scheduleServiceUrl}/trainers/for-notification`,
          { trainer_ids },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
          }
        );

        if (response.data?.success) {
          return response.data.data?.trainers || response.data.data || [];
        }
        return [];
      }

      // Otherwise use filters
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (specialization) params.append('specialization', specialization);

      const response = await axios.get(
        `${this.scheduleServiceUrl}/trainers/for-notification?${params.toString()}`,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      if (response.data?.success) {
        return response.data.data?.trainers || response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error('[ERROR] Error getting trainers by filters:', error.message);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users
   * @param {Array<string>} userIds - Array of user IDs
   * @param {Object} notificationData - { type, title, message, data? }
   * @returns {Promise<{success: number, failed: number, errors: Array}>}
   */
  async createNotificationsForUsers(userIds, notificationData) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      notifications: [], // Array of { userId, success, notification }
    };

    if (!userIds || userIds.length === 0) {
      console.log('[WARNING] [BULK_NOTIFICATION] No user IDs provided');
      return results;
    }

    console.log(
      `[PROCESS] [BULK_NOTIFICATION] Creating notifications for ${userIds.length} user(s):`,
      {
        userIds: userIds.slice(0, 5), // Log first 5 IDs
        total: userIds.length,
        notificationData: {
          type: notificationData.type,
          title: notificationData.title,
          messageLength: notificationData.message?.length || 0,
        },
      }
    );

    // Batch create notifications (process in chunks of 50 to avoid overwhelming the database)
    const chunkSize = 50;
    const chunks = [];

    for (let i = 0; i < userIds.length; i += chunkSize) {
      chunks.push(userIds.slice(i, i + chunkSize));
    }

    console.log(
      `[DATA] [BULK_NOTIFICATION] Processing in ${chunks.length} chunk(s) of ${chunkSize}`
    );

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(
        `[SYNC] [BULK_NOTIFICATION] Processing chunk ${chunkIndex + 1}/${chunks.length} (${
          chunk.length
        } users)`
      );

      const promises = chunk.map(async userId => {
        try {
          // Verify user exists first
          const userExists = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true },
          });

          if (!userExists) {
            console.warn(
              `[WARNING] [BULK_NOTIFICATION] User not found in Identity Service: ${userId}`
            );
            results.failed++;
            results.errors.push({
              userId,
              error: 'User not found in Identity Service',
              code: 'USER_NOT_FOUND',
            });
            return { userId, success: false, error: 'User not found' };
          }

          console.log(
            `[SUCCESS] [BULK_NOTIFICATION] User verified: ${userId} (${
              userExists.email || 'no email'
            }, ${userExists.role})`
          );

          // Enqueue notification to Redis queue instead of creating directly
          const { notificationWorker } = require('../workers/notification.worker.js');
          const priority = notificationData.priority || 'normal';

          const enqueued = await notificationWorker.enqueueNotification(
            {
              user_id: userId,
              type: notificationData.type || 'GENERAL',
              title: notificationData.title,
              message: notificationData.message,
              data: notificationData.data || {},
              channels: notificationData.channels || ['IN_APP', 'PUSH'],
            },
            priority
          );

          if (!enqueued) {
            // Fallback: create notification directly if Redis is down
            console.warn(
              `[WARNING] Redis queue unavailable for user ${userId}, creating notification directly`
            );
            const notification = await prisma.notification.create({
              data: {
                user_id: userId,
                type: notificationData.type || 'GENERAL',
                title: notificationData.title,
                message: notificationData.message,
                data: notificationData.data || {},
              },
            });

            // Update results
            results.success++;
            results.notifications.push({ userId, success: true, notification });
            console.log(
              `[SUCCESS] [BULK_NOTIFICATION] Created notification for user ${userId}: ${notification.id}`
            );
            return { userId, success: true, notification };
          }

          // Notification was enqueued successfully (will be processed by worker)
          // Update results even though notification is queued
          results.success++;
          // Don't create temporary notification object - worker will create the real one
          // Return null to indicate notification was enqueued (not yet created)
          console.log(
            `[SUCCESS] [BULK_NOTIFICATION] Enqueued notification for user ${userId} (will be processed by worker)`
          );
          return { userId, success: true, queued: true, notification: null };
        } catch (error) {
          // Check if it's a foreign key constraint error
          if (error.code === 'P2003' || error.message?.includes('Foreign key constraint')) {
            console.error(
              `[ERROR] [BULK_NOTIFICATION] Foreign key constraint error for user ${userId}:`,
              {
                error: error.message,
                code: error.code,
                meta: error.meta,
                userId,
              }
            );
            results.failed++;
            results.errors.push({
              userId,
              error: `User ${userId} does not exist in Identity Service database`,
              code: error.code || 'FOREIGN_KEY_CONSTRAINT',
              meta: error.meta,
            });
          } else {
            console.error(
              `[ERROR] [BULK_NOTIFICATION] Error creating notification for user ${userId}:`,
              {
                error: error.message,
                code: error.code,
                meta: error.meta,
                stack: error.stack?.split('\n').slice(0, 3).join('\n'),
              }
            );
            results.failed++;
            results.errors.push({
              userId,
              error: error.message || 'Failed to create notification',
              code: error.code,
              meta: error.meta,
            });
          }
          return { userId, success: false };
        }
      });

      const chunkResults = await Promise.all(promises);

      // Update results from chunk results
      chunkResults.forEach(result => {
        if (result.success) {
          // results.success and results.notifications are already updated in the promise
          // Just verify they match
        } else {
          // results.failed and results.errors are already updated in the promise
        }
      });

      console.log(`[STATS] [BULK_NOTIFICATION] Chunk ${chunkIndex + 1} completed:`, {
        success: chunkResults.filter(r => r.success).length,
        failed: chunkResults.filter(r => !r.success).length,
      });
    }

    console.log(`[STATS] [BULK_NOTIFICATION] Final results:`, {
      total: userIds.length,
      success: results.success,
      failed: results.failed,
      notificationsCount: results.notifications.length,
      errors: results.errors.slice(0, 10), // Log first 10 errors
    });

    return results;
  }

  /**
   * Emit socket events for notifications
   * @param {Array<string>} userIds - Array of user IDs
   * @param {Object} notificationData - { type, title, message, data? }
   * @param {Array<Object>} createdNotifications - Array of created notification objects with IDs
   */
  async emitSocketEvents(userIds, notificationData, createdNotifications = []) {
    if (!global.io || !userIds || userIds.length === 0) {
      return;
    }

    try {
      // Create a map of userId -> notificationId for quick lookup
      const notificationMap = new Map();
      console.log(
        `[SEARCH] [BULK_NOTIFICATION] Creating notification map from ${
          createdNotifications?.length || 0
        } created notifications`
      );

      if (createdNotifications && createdNotifications.length > 0) {
        // Filter out notifications that were enqueued (notification is null)
        const validNotifications = createdNotifications.filter(
          notif => notif.userId && notif.notification && notif.notification.id
        );

        console.log(
          `[FILTER] [BULK_NOTIFICATION] Filtered notifications: ${createdNotifications.length} total, ${validNotifications.length} with real IDs`
        );

        validNotifications.forEach((notif, index) => {
          console.log(`[SEARCH] [BULK_NOTIFICATION] Processing notification ${index}:`, {
            userId: notif.userId,
            notificationId: notif.notification.id,
            hasNotification: !!notif.notification,
          });

          notificationMap.set(notif.userId, notif.notification.id);
          console.log(
            `[SUCCESS] [BULK_NOTIFICATION] Mapped userId ${notif.userId} → notificationId ${notif.notification.id}`
          );
        });
      } else {
        console.warn(
          `[WARNING] [BULK_NOTIFICATION] No createdNotifications provided or empty array`
        );
      }

      console.log(
        `[STATS] [BULK_NOTIFICATION] Notification map size: ${notificationMap.size}, Total userIds: ${userIds.length}`
      );

      // Emit to each user's room with notification_id (only if notification was created)
      let emittedCount = 0;
      userIds.forEach(userId => {
        const notificationId = notificationMap.get(userId);
        const roomName = `user:${userId}`;

        // Only emit if notification_id exists (notification was created, not just enqueued)
        if (!notificationId) {
          console.log(
            `[SKIP] [BULK_NOTIFICATION] Skipping socket emit for user ${userId} - notification was enqueued (not yet created)`
          );
          return;
        }

        const socketPayload = {
          notification_id: notificationId,
          type: notificationData.type || 'GENERAL',
          title: notificationData.title,
          message: notificationData.message,
          data: notificationData.data || {},
          created_at: new Date().toISOString(),
        };

        // Log payload before emitting
        console.log(
          `[EMIT] [BULK_NOTIFICATION] Emitting to user ${userId} in room ${roomName}. Payload:`,
          JSON.stringify(socketPayload, null, 2)
        );

        // Emit both notification:new (for compatibility) and admin:bulk:notification (specific event)
        global.io.to(roomName).emit('notification:new', socketPayload);
        global.io.to(roomName).emit('admin:bulk:notification', socketPayload);
        emittedCount++;

        console.log(
          `[SUCCESS] [BULK_NOTIFICATION] Emitted notification:new and admin:bulk:notification to user ${userId} with notification_id: ${notificationId}`
        );
      });

      console.log(
        `[EMIT] [BULK_NOTIFICATION] Emitted socket events to ${emittedCount}/${userIds.length} user(s)`
      );
    } catch (error) {
      console.error('[ERROR] [BULK_NOTIFICATION] Error emitting socket events:', error.message);
      // Don't throw - socket emission failure shouldn't fail the whole operation
    }
  }

  /**
   * Save notification history
   * @param {Object} historyData - { sender_id, sender_role, target_type, target_ids?, filters?, title, message, notification_type, sent_count, failed_count, total_targets }
   * @returns {Promise<Object>} Created history record
   */
  async saveNotificationHistory(historyData) {
    try {
      const history = await prisma.notificationHistory.create({
        data: {
          sender_id: historyData.sender_id,
          sender_role: historyData.sender_role,
          target_type: historyData.target_type,
          target_ids: historyData.target_ids
            ? JSON.parse(JSON.stringify(historyData.target_ids))
            : null,
          filters: historyData.filters ? JSON.parse(JSON.stringify(historyData.filters)) : null,
          title: historyData.title,
          message: historyData.message,
          notification_type: historyData.notification_type || 'GENERAL',
          sent_count: historyData.sent_count || 0,
          failed_count: historyData.failed_count || 0,
          total_targets: historyData.total_targets || 0,
        },
      });

      return history;
    } catch (error) {
      console.error('[ERROR] Error saving notification history:', error.message);
      throw error;
    }
  }

  /**
   * Get notification history with filters
   * @param {Object} filters - { page, limit, sender_id, target_type, startDate, endDate }
   * @returns {Promise<Object>} { history, pagination }
   */
  async getNotificationHistory(filters) {
    try {
      const { page = 1, limit = 20, sender_id, target_type, startDate, endDate } = filters;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      if (sender_id) where.sender_id = sender_id;
      if (target_type) where.target_type = target_type;
      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at.gte = new Date(startDate);
        if (endDate) where.created_at.lte = new Date(endDate);
      }

      const [history, total] = await Promise.all([
        prisma.notificationHistory.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { created_at: 'desc' },
        }),
        prisma.notificationHistory.count({ where }),
      ]);

      return {
        history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      console.error('[ERROR] Error getting notification history:', error.message);
      throw error;
    }
  }
}

module.exports = new BulkNotificationService();
