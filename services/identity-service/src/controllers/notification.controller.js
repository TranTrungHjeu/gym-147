const { prisma } = require('../lib/prisma.js');
const memberService = require('../services/member.service');

/**
 * Helper function to emit unread count update via socket
 * @param {string} userId - User ID
 */
async function emitUnreadCountUpdate(userId) {
  try {
    const count = await prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });

    if (global.io) {
      global.io.to(`user:${userId}`).emit('notification:count_updated', {
        count,
        user_id: userId,
        timestamp: new Date().toISOString(),
      });
      console.log(
        `[SOCKET] Emitted notification:count_updated to user:${userId} with count: ${count}`
      );
    }
  } catch (error) {
    console.error('[ERROR] Error emitting unread count update:', error);
    // Don't throw - this is a helper function
  }
}

class NotificationController {
  /**
   * Helper function to wrap Prisma queries with timeout and retry for connection errors
   * @param {Function} queryFn - Function that returns the Prisma query promise
   * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
   * @param {string} queryName - Name of the query for logging
   * @param {number} maxRetries - Maximum retries for connection errors (default: 1)
   * @returns {Promise} Query result or throws error
   */
  async withTimeout(queryFn, timeoutMs = 10000, queryName = 'Query', maxRetries = 1) {
    const executeQuery = async (attempt = 0) => {
      try {
        // Create fresh query promise for each attempt
        const queryPromise = queryFn();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`${queryName} timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        });

        return await Promise.race([queryPromise, timeoutPromise]);
      } catch (error) {
        // Retry on connection errors (P1001)
        const isConnectionError =
          error.code === 'P1001' ||
          error.message?.includes("Can't reach database server") ||
          error.message?.includes('connection');

        if (isConnectionError && attempt < maxRetries) {
          const retryDelay = 1000 * (attempt + 1); // Exponential backoff: 1s, 2s, 3s...
          console.log(
            `[RETRY] Retrying ${queryName} after connection error (attempt ${
              attempt + 1
            }/${maxRetries}, delay ${retryDelay}ms)`
          );
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return executeQuery(attempt + 1);
        }

        throw error;
      }
    };

    return executeQuery();
  }

  /**
   * Helper function to handle database errors consistently
   */
  handleDatabaseError(error, res, context = 'Operation') {
    console.error(`[ERROR] ${context} error:`, error);

    // Handle database connection errors (P1001: Can't reach database server)
    if (error.code === 'P1001' || error.message?.includes("Can't reach database server")) {
      console.error('[ERROR] Database connection failed:', error.message);
      console.log('[INFO] Returning 503 Service Unavailable response');
      return res.status(503).json({
        success: false,
        message: 'Database service temporarily unavailable. Please try again later.',
        error: 'DATABASE_CONNECTION_ERROR',
        data: null,
      });
    }

    // Handle timeout errors
    if (
      error.code === 'P1008' ||
      error.code === 'P1014' ||
      error.message?.includes('timeout') ||
      error.message?.includes('timed out') ||
      error.message?.includes('Operation timed out')
    ) {
      console.error('[ERROR] Database operation timed out:', error.message);
      console.log('[INFO] Returning 504 Gateway Timeout response');
      return res.status(504).json({
        success: false,
        message:
          'Database operation timed out. The request took too long to complete. Please try again.',
        error: 'DATABASE_TIMEOUT_ERROR',
        data: null,
      });
    }

    // Handle other Prisma errors
    if (error.code?.startsWith('P')) {
      console.error('[ERROR] Prisma error:', error.code, error.message);
      return res.status(500).json({
        success: false,
        message: 'Database query failed. Please try again later.',
        error: 'DATABASE_ERROR',
        data: null,
      });
    }

    // Generic error
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR',
      data: null,
    });
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(req, res) {
    try {
      // Support both userId and id from JWT token for backward compatibility
      const userId = req.user.userId || req.user.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token',
          data: null,
        });
      }
      const result = await memberService.getNotificationPreferences(userId);

      // If the result already has the correct structure, return it as is
      if (result.success && result.data) {
        return res.json(result);
      }

      // Otherwise, wrap it in the expected format
      res.json({
        success: true,
        message: 'Notification preferences retrieved successfully',
        data: result.data || result,
      });
    } catch (error) {
      console.error('Get notification preferences error:', error);
      // Return default preferences on error instead of 500
      res.json({
        success: true,
        message: 'Notification preferences retrieved successfully (default)',
        data: {
          preferences: {
            push: true,
            email: true,
            sms: false,
            in_app: true,
          },
        },
      });
    }
  }

  /**
   * Set notification preferences
   */
  async setNotificationPreferences(req, res) {
    try {
      // Support both userId and id from JWT token for backward compatibility
      const userId = req.user.userId || req.user.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token',
          data: null,
        });
      }

      const { preferences } = req.body;

      if (!preferences) {
        return res.status(400).json({
          success: false,
          message: 'Notification preferences là bắt buộc',
          data: null,
        });
      }

      const result = await memberService.updateNotificationPreferences(userId, preferences);

      res.json(result);
    } catch (error) {
      console.error('Set notification preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Create notification (called by other services)
   * POST /notifications
   * Body: { user_id, type, title, message, data? }
   * Note: This endpoint can be called without auth for service-to-service communication
   */
  async createNotification(req, res) {
    try {
      const { user_id, type, title, message, data, channels } = req.body;

      if (!user_id || !type || !title || !message) {
        return res.status(400).json({
          success: false,
          message: 'user_id, type, title, and message are required',
          data: null,
        });
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: user_id },
        select: { id: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null,
        });
      }

      // Enqueue notification to Redis queue instead of creating directly
      const { notificationWorker } = require('../workers/notification.worker.js');
      const priority = data?.priority || 'normal'; // high, normal, low

      // Support channels from both top-level and data.channels
      const notificationChannels = channels || data?.channels || ['IN_APP'];

      console.log(
        `[INFO] [CREATE_NOTIFICATION] Creating notification for user ${user_id}, type: ${type}, channels:`,
        notificationChannels
      );

      const enqueued = await notificationWorker.enqueueNotification(
        {
          user_id,
          type,
          title,
          message,
          data: data || {},
          channels: notificationChannels,
          source: req.headers['x-service-name'] || 'unknown',
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
        },
        priority
      );

      if (!enqueued) {
        // Fallback: create notification directly if Redis is down
        console.warn('[WARN] Redis queue unavailable, creating notification directly');
        const notification = await prisma.notification.create({
          data: {
            user_id,
            type,
            title,
            message,
            data: data || {},
            is_read: false,
          },
        });
        console.log(
          `[SUCCESS] [CREATE_NOTIFICATION] Created notification directly (fallback): ${notification.id}`
        );

        // Emit socket event if socket.io is available
        if (global.io) {
          try {
            const roomName = `user:${user_id}`;
            const socketPayload = {
              notification_id: notification.id,
              id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              data: notification.data,
              created_at: notification.created_at,
              is_read: notification.is_read,
            };

            global.io.to(roomName).emit('notification:new', socketPayload);
            console.log(`[SOCKET] Emitted notification:new to room ${roomName}`);
          } catch (socketError) {
            console.error('[ERROR] Error emitting socket event:', socketError);
            // Don't fail notification creation if socket fails
          }
        }

        res.status(201).json({
          success: true,
          message: 'Notification created successfully',
          data: { notification },
        });
        return; // Return early if fallback was used
      }

      // If enqueued successfully, return success
      res.status(201).json({
        success: true,
        message: 'Notification enqueued successfully',
        data: { enqueued: true },
      });
    } catch (error) {
      console.error('Create notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get notifications
   * All notifications are now stored in identity service
   */
  async getNotifications(req, res) {
    try {
      // Support both userId and id from JWT token for backward compatibility
      const userId = req.user.userId || req.user.id;

      if (!userId) {
        console.error(
          '[ERROR] [NOTIFICATION] User ID not found in token. Token payload:',
          req.user
        );
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token',
          data: null,
        });
      }

      console.log(`📬 [NOTIFICATION] Fetching notifications for userId: ${userId}`);

      const {
        page = 1,
        limit = 20,
        unreadOnly = false,
        type,
        startDate,
        endDate,
        search,
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const whereClause = { user_id: userId };
      if (unreadOnly === 'true') {
        whereClause.is_read = false;
      }
      if (type) {
        whereClause.type = type;
      }
      if (startDate || endDate) {
        whereClause.created_at = {};
        if (startDate) {
          whereClause.created_at.gte = new Date(startDate);
        }
        if (endDate) {
          whereClause.created_at.lte = new Date(endDate);
        }
      }
      if (search) {
        whereClause.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } },
        ];
      }

      console.log(`[LIST] [NOTIFICATION] Query filters:`, whereClause);

      // Use Promise.allSettled to handle partial failures gracefully
      // Wrap each query with timeout and retry logic
      const results = await Promise.allSettled([
        this.withTimeout(
          () =>
            prisma.notification.findMany({
              where: whereClause,
              orderBy: {
                created_at: 'desc',
              },
              skip,
              take,
            }),
          15000, // 15 seconds timeout
          'Get notifications',
          1 // 1 retry for connection errors
        ),
        this.withTimeout(
          () =>
            prisma.notification.count({
              where: whereClause,
            }),
          15000, // 15 seconds timeout
          'Count notifications',
          1 // 1 retry for connection errors
        ),
      ]);

      // Extract results with fallbacks
      const notifications = results[0].status === 'fulfilled' ? results[0].value : [];
      const totalCount = results[1].status === 'fulfilled' ? results[1].value : 0;

      // Log any failures
      if (results[0].status === 'rejected') {
        console.warn('[WARNING] Failed to fetch notifications:', results[0].reason?.message);
      }
      if (results[1].status === 'rejected') {
        console.warn('[WARNING] Failed to count notifications:', results[1].reason?.message);
      }

      console.log(
        `[SUCCESS] [NOTIFICATION] Found ${notifications.length} notifications (total: ${totalCount}) for userId: ${userId}`
      );

      // If both queries failed, return error
      if (results[0].status === 'rejected' && results[1].status === 'rejected') {
        throw results[0].reason; // Throw first error to be handled by catch block
      }

      res.json({
        success: true,
        message: 'Notifications retrieved successfully',
        data: {
          notifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      return this.handleDatabaseError(error, res, 'Get notifications');
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(req, res) {
    try {
      // Support both userId and id from JWT token for backward compatibility
      const userId = req.user.userId || req.user.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token',
          data: null,
        });
      }

      const { notificationId } = req.params;

      if (!notificationId) {
        return res.status(400).json({
          success: false,
          message: 'Notification ID là bắt buộc',
          data: null,
        });
      }

      // Verify notification belongs to user
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        select: { user_id: true },
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
          data: null,
        });
      }

      if (notification.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized',
          data: null,
        });
      }

      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: {
          is_read: true,
          read_at: new Date(),
        },
      });

      // Audit log
      try {
        await prisma.auditLog.create({
          data: {
            user_id: userId,
            action: 'NOTIFICATION_READ',
            entity_type: 'Notification',
            entity_id: notificationId,
            details: { notification_id: notificationId },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
          },
        });
      } catch (auditError) {
        console.error('[ERROR] Error creating audit log:', auditError);
        // Don't fail the request if audit log fails
      }

      // Emit socket events for real-time updates
      if (global.io) {
        try {
          const roomName = `user:${userId}`;

          // Emit notification:read event
          global.io.to(roomName).emit('notification:read', {
            notification_id: notificationId,
            user_id: userId,
            is_read: true,
            read_at: updated.read_at?.toISOString() || new Date().toISOString(),
          });
          console.log(
            `[SOCKET] Emitted notification:read to room ${roomName} for notification ${notificationId}`
          );

          // Emit unread count update
          await emitUnreadCountUpdate(userId);
        } catch (socketError) {
          console.error('[ERROR] Error emitting socket events:', socketError);
          // Don't fail the request if socket fails
        }
      }

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: { notification: updated },
      });
    } catch (error) {
      console.error('Mark notification read error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
          data: null,
        });
      }
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(req, res) {
    try {
      // Support both userId and id from JWT token for backward compatibility
      const userId = req.user.userId || req.user.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token',
          data: null,
        });
      }

      const result = await prisma.notification.updateMany({
        where: {
          user_id: userId,
          is_read: false,
        },
        data: {
          is_read: true,
          read_at: new Date(),
        },
      });

      // Audit log
      try {
        await prisma.auditLog.create({
          data: {
            user_id: userId,
            action: 'NOTIFICATIONS_ALL_READ',
            entity_type: 'Notification',
            details: { count: result.count },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
          },
        });
      } catch (auditError) {
        console.error('[ERROR] Error creating audit log:', auditError);
      }

      // Emit socket events for real-time updates
      if (global.io) {
        try {
          const roomName = `user:${userId}`;

          // Emit notification:read event with all flag
          global.io.to(roomName).emit('notification:read', {
            notification_id: null,
            user_id: userId,
            is_read: true,
            all: true,
            updated_count: result.count,
            read_at: new Date().toISOString(),
          });
          console.log(
            `[SOCKET] Emitted notification:read (all) to room ${roomName} for ${result.count} notifications`
          );

          // Emit unread count update (should be 0 after marking all as read)
          await emitUnreadCountUpdate(userId);
        } catch (socketError) {
          console.error('[ERROR] Error emitting socket events:', socketError);
          // Don't fail the request if socket fails
        }
      }

      res.json({
        success: true,
        message: `Marked ${result.count} notifications as read`,
        data: {
          updated_count: result.count,
        },
      });
    } catch (error) {
      console.error('Mark all notifications read error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(req, res) {
    try {
      // Support both userId and id from JWT token for backward compatibility
      // Also support userId from URL params (for public endpoint)
      const userId = req.params.userId || req.user?.userId || req.user?.id;

      if (!userId) {
        console.error('[ERROR] [NOTIFICATION] User ID not found in request');
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
          data: null,
        });
      }

      console.log(`[DATA] [NOTIFICATION] Fetching unread count for userId: ${userId}`);

      const count = await prisma.notification.count({
        where: {
          user_id: userId,
          is_read: false,
        },
      });

      console.log(`[SUCCESS] [NOTIFICATION] Unread count for userId ${userId}: ${count}`);

      res.json({
        success: true,
        message: 'Unread count retrieved successfully',
        data: { count, unreadCount: count },
      });
    } catch (error) {
      return this.handleDatabaseError(error, res, 'Get unread count');
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(req, res) {
    try {
      // Support both userId and id from JWT token for backward compatibility
      const userId = req.user.userId || req.user.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token',
          data: null,
        });
      }

      const { notificationId } = req.params;

      if (!notificationId) {
        return res.status(400).json({
          success: false,
          message: 'Notification ID là bắt buộc',
          data: null,
        });
      }

      // Verify notification belongs to user
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        select: { user_id: true },
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
          data: null,
        });
      }

      if (notification.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized',
          data: null,
        });
      }

      await prisma.notification.delete({
        where: { id: notificationId },
      });

      // Audit log
      try {
        await prisma.auditLog.create({
          data: {
            user_id: userId,
            action: 'NOTIFICATION_DELETED',
            entity_type: 'Notification',
            entity_id: notificationId,
            details: { notification_id: notificationId },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
          },
        });
      } catch (auditError) {
        console.error('[ERROR] Error creating audit log:', auditError);
        // Don't fail the request if audit log fails
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
          data: null,
        });
      }
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Bulk delete notifications
   * DELETE /notifications/bulk
   * Body: { notification_ids: string[] }
   */
  async bulkDeleteNotifications(req, res) {
    try {
      const userId = req.user.userId || req.user.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token',
          data: null,
        });
      }

      const { notification_ids } = req.body;

      if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'notification_ids array is required',
          data: null,
        });
      }

      // Verify all notifications belong to user
      const notifications = await prisma.notification.findMany({
        where: {
          id: { in: notification_ids },
          user_id: userId,
        },
        select: { id: true },
      });

      if (notifications.length !== notification_ids.length) {
        return res.status(403).json({
          success: false,
          message: 'Some notifications do not belong to you or do not exist',
          data: null,
        });
      }

      const result = await prisma.notification.deleteMany({
        where: {
          id: { in: notification_ids },
          user_id: userId,
        },
      });

      // Audit log
      try {
        await prisma.auditLog.create({
          data: {
            user_id: userId,
            action: 'NOTIFICATIONS_BULK_DELETED',
            entity_type: 'Notification',
            details: {
              count: result.count,
              notification_ids: notification_ids,
            },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
          },
        });
      } catch (auditError) {
        console.error('[ERROR] Error creating audit log:', auditError);
      }

      res.json({
        success: true,
        message: `Deleted ${result.count} notifications`,
        data: { deleted_count: result.count },
      });
    } catch (error) {
      return this.handleDatabaseError(error, res, 'Bulk delete notifications');
    }
  }

  /**
   * Bulk mark notifications as read
   * PUT /notifications/bulk/read
   * Body: { notification_ids: string[] }
   */
  async bulkMarkNotificationsRead(req, res) {
    try {
      const userId = req.user.userId || req.user.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token',
          data: null,
        });
      }

      const { notification_ids } = req.body;

      if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'notification_ids array is required',
          data: null,
        });
      }

      // Verify all notifications belong to user
      const notifications = await prisma.notification.findMany({
        where: {
          id: { in: notification_ids },
          user_id: userId,
        },
        select: { id: true },
      });

      if (notifications.length !== notification_ids.length) {
        return res.status(403).json({
          success: false,
          message: 'Some notifications do not belong to you or do not exist',
          data: null,
        });
      }

      const result = await prisma.notification.updateMany({
        where: {
          id: { in: notification_ids },
          user_id: userId,
          is_read: false, // Only update unread ones
        },
        data: {
          is_read: true,
          read_at: new Date(),
        },
      });

      // Audit log
      try {
        await prisma.auditLog.create({
          data: {
            user_id: userId,
            action: 'NOTIFICATIONS_BULK_READ',
            entity_type: 'Notification',
            details: {
              count: result.count,
              notification_ids: notification_ids,
            },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
          },
        });
      } catch (auditError) {
        console.error('[ERROR] Error creating audit log:', auditError);
      }

      // Emit socket events for real-time updates
      if (global.io && result.count > 0) {
        try {
          const roomName = `user:${userId}`;

          // Emit notification:read event for bulk operation
          global.io.to(roomName).emit('notification:read', {
            notification_id: null,
            user_id: userId,
            is_read: true,
            bulk: true,
            notification_ids: notification_ids,
            updated_count: result.count,
            read_at: new Date().toISOString(),
          });
          console.log(
            `[EMIT] Emitted notification:read (bulk) to room ${roomName} for ${result.count} notifications`
          );

          // Emit unread count update
          await emitUnreadCountUpdate(userId);
        } catch (socketError) {
          console.error('[ERROR] Error emitting socket events:', socketError);
          // Don't fail the request if socket fails
        }
      }

      res.json({
        success: true,
        message: `Marked ${result.count} notifications as read`,
        data: { updated_count: result.count },
      });
    } catch (error) {
      return this.handleDatabaseError(error, res, 'Bulk mark notifications read');
    }
  }

  /**
   * Get notification metrics (Admin only)
   * GET /notifications/metrics
   */
  async getNotificationMetrics(req, res) {
    try {
      const userId = req.user.userId || req.user.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token',
          data: null,
        });
      }

      // Get notification creation rate (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled([
        prisma.notification.groupBy({
          by: ['type'],
          where: {
            user_id: userId,
            is_read: false,
          },
          _count: {
            id: true,
          },
        }),
        prisma.notification.count({
          where: {
            user_id: userId,
            is_read: false,
          },
        }),
        prisma.notification.count({
          where: {
            user_id: userId,
            created_at: {
              gte: sevenDaysAgo,
            },
          },
        }),
      ]);

      // Extract results with fallbacks
      const unreadByType = results[0].status === 'fulfilled' ? results[0].value : [];
      const totalUnread = results[1].status === 'fulfilled' ? results[1].value : 0;
      const recentNotifications = results[2].status === 'fulfilled' ? results[2].value : 0;

      // Log any failures
      if (results[0].status === 'rejected') {
        console.warn('[WARNING] Failed to get unread by type:', results[0].reason?.message);
      }
      if (results[1].status === 'rejected') {
        console.warn('[WARNING] Failed to get total unread count:', results[1].reason?.message);
      }
      if (results[2].status === 'rejected') {
        console.warn('[WARNING] Failed to get recent notifications:', results[2].reason?.message);
      }

      // If all queries failed, throw error to be handled by catch block
      if (
        results[0].status === 'rejected' &&
        results[1].status === 'rejected' &&
        results[2].status === 'rejected'
      ) {
        throw results[0].reason; // Throw first error to be handled by catch block
      }

      res.json({
        success: true,
        message: 'Notification metrics retrieved successfully',
        data: {
          total_unread: totalUnread,
          unread_by_type: unreadByType.map(item => ({
            type: item.type,
            count: item._count.id,
          })),
          recent_count_7_days: recentNotifications,
        },
      });
    } catch (error) {
      return this.handleDatabaseError(error, res, 'Get notification metrics');
    }
  }
}

module.exports = { NotificationController };
