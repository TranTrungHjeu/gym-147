const { prisma } = require('../lib/prisma.js');
const memberService = require('../services/member.service');

class NotificationController {
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

      res.json(result);
    } catch (error) {
      console.error('Get notification preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
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
      const { user_id, type, title, message, data } = req.body;

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
      
      const enqueued = await notificationWorker.enqueueNotification({
        user_id,
        type,
        title,
        message,
        data: data || {},
        channels: data?.channels || ['IN_APP', 'PUSH'],
        source: req.headers['x-service-name'] || 'unknown',
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      }, priority);

      if (!enqueued) {
        // Fallback: create notification directly if Redis is down
        console.warn('⚠️ Redis queue unavailable, creating notification directly');
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
          console.log(`📡 Emitted notification:new to room ${roomName}`);
        } catch (socketError) {
          console.error('❌ Error emitting socket event:', socketError);
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
        console.error('❌ [NOTIFICATION] User ID not found in token. Token payload:', req.user);
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

      console.log(`📋 [NOTIFICATION] Query filters:`, whereClause);

      const [notifications, totalCount] = await Promise.all([
        prisma.notification.findMany({
          where: whereClause,
          orderBy: {
            created_at: 'desc',
          },
          skip,
          take,
        }),
        prisma.notification.count({
          where: whereClause,
        }),
      ]);

      console.log(`✅ [NOTIFICATION] Found ${notifications.length} notifications (total: ${totalCount}) for userId: ${userId}`);

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
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
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
        console.error('❌ Error creating audit log:', auditError);
        // Don't fail the request if audit log fails
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
        console.error('❌ Error creating audit log:', auditError);
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
        console.error('❌ [NOTIFICATION] User ID not found in request');
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
          data: null,
        });
      }

      console.log(`📊 [NOTIFICATION] Fetching unread count for userId: ${userId}`);

      const count = await prisma.notification.count({
        where: {
          user_id: userId,
          is_read: false,
        },
      });

      console.log(`✅ [NOTIFICATION] Unread count for userId ${userId}: ${count}`);

      res.json({
        success: true,
        message: 'Unread count retrieved successfully',
        data: { count, unreadCount: count },
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
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
        console.error('❌ Error creating audit log:', auditError);
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
        console.error('❌ Error creating audit log:', auditError);
      }

      res.json({
        success: true,
        message: `Deleted ${result.count} notifications`,
        data: { deleted_count: result.count },
      });
    } catch (error) {
      console.error('Bulk delete notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
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
        console.error('❌ Error creating audit log:', auditError);
      }

      res.json({
        success: true,
        message: `Marked ${result.count} notifications as read`,
        data: { updated_count: result.count },
      });
    } catch (error) {
      console.error('Bulk mark notifications read error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
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

      // Get unread count per type
      const unreadByType = await prisma.notification.groupBy({
        by: ['type'],
        where: {
          user_id: userId,
          is_read: false,
        },
        _count: {
          id: true,
        },
      });

      // Get total unread count
      const totalUnread = await prisma.notification.count({
        where: {
          user_id: userId,
          is_read: false,
        },
      });

      // Get notification creation rate (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentNotifications = await prisma.notification.count({
        where: {
          user_id: userId,
          created_at: {
            gte: sevenDaysAgo,
          },
        },
      });

      res.json({
        success: true,
        message: 'Notification metrics retrieved successfully',
        data: {
          total_unread: totalUnread,
          unread_by_type: unreadByType.map((item) => ({
            type: item.type,
            count: item._count.id,
          })),
          recent_count_7_days: recentNotifications,
        },
      });
    } catch (error) {
      console.error('Get notification metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = { NotificationController };
