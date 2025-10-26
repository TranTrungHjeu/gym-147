const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class NotificationController {
  // ==================== NOTIFICATION MANAGEMENT ====================

  // Get member's notifications
  async getMemberNotifications(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20, unread_only = false, type } = req.query;
      const skip = (page - 1) * limit;

      const where = { member_id: id };
      if (unread_only === 'true') {
        where.is_read = false;
      }
      if (type) {
        where.type = type;
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          orderBy: { created_at: 'desc' },
        }),
        prisma.notification.count({ where }),
      ]);

      res.json({
        success: true,
        message: 'Notifications retrieved successfully',
        data: {
          notifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Get member notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get unread notification count
  async getUnreadCount(req, res) {
    try {
      const { id } = req.params;

      const count = await prisma.notification.count({
        where: {
          member_id: id,
          is_read: false,
        },
      });

      res.json({
        success: true,
        message: 'Unread count retrieved successfully',
        data: { count },
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

  // Get notification by ID
  async getNotificationById(req, res) {
    try {
      const { id } = req.params;

      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Notification retrieved successfully',
        data: { notification },
      });
    } catch (error) {
      console.error('Get notification by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Create notification
  async createNotification(req, res) {
    try {
      const { id } = req.params;
      const { type, title, message, channels, send_at, data } = req.body;

      // Validate required fields
      if (!type || !title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Type, title, and message are required',
          data: null,
        });
      }

      // Validate notification type
      const validTypes = [
        'WORKOUT_REMINDER',
        'MEMBERSHIP_ALERT',
        'ACHIEVEMENT',
        'PROMOTIONAL',
        'SYSTEM',
        'HEALTH_TIP',
        'EQUIPMENT_MAINTENANCE',
      ];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification type',
          data: null,
        });
      }

      const notification = await prisma.notification.create({
        data: {
          member_id: id,
          type,
          title,
          message,
          channels: channels || ['IN_APP'],
          send_at: send_at ? new Date(send_at) : new Date(),
          data: data || {},
        },
      });

      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: { notification },
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

  // Mark notification as read
  async markNotificationAsRead(req, res) {
    try {
      const { id } = req.params;

      const notification = await prisma.notification.update({
        where: { id },
        data: { is_read: true },
      });

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: { notification },
      });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead(req, res) {
    try {
      const { id } = req.params;

      await prisma.notification.updateMany({
        where: {
          member_id: id,
          is_read: false,
        },
        data: { is_read: true },
      });

      res.json({
        success: true,
        message: 'All notifications marked as read',
        data: null,
      });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;

      await prisma.notification.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Notification deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== SMART NOTIFICATIONS ====================

  // Send workout reminder
  async sendWorkoutReminder(req, res) {
    try {
      const { id } = req.params;
      const { message, send_time } = req.body;

      // Get member's preferred workout times
      const member = await prisma.member.findUnique({
        where: { id },
        select: { full_name: true, fitness_goals: true },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      const reminderMessage =
        message ||
        `Hi ${member.full_name}! Time for your workout. Let's achieve your fitness goals! 💪`;

      const notification = await prisma.notification.create({
        data: {
          member_id: id,
          type: 'WORKOUT_REMINDER',
          title: 'Workout Reminder',
          message: reminderMessage,
          channels: ['IN_APP', 'EMAIL'],
          send_at: send_time ? new Date(send_time) : new Date(),
          data: {
            reminder_type: 'workout',
            member_goals: member.fitness_goals,
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Workout reminder sent successfully',
        data: { notification },
      });
    } catch (error) {
      console.error('Send workout reminder error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Send membership alert
  async sendMembershipAlert(req, res) {
    try {
      const { id } = req.params;
      const { alert_type, days_remaining } = req.body;

      // Get member's membership info
      const member = await prisma.member.findUnique({
        where: { id },
        select: {
          full_name: true,
          membership_type: true,
          expires_at: true,
          memberships: {
            where: { status: 'ACTIVE' },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      let title, message;
      const membershipType = member.membership_type || 'Basic';

      switch (alert_type) {
        case 'EXPIRING_SOON':
          title = 'Membership Expiring Soon';
          message = `Hi ${member.full_name}! Your ${membershipType} membership expires in ${days_remaining} days. Renew now to continue your fitness journey!`;
          break;
        case 'EXPIRED':
          title = 'Membership Expired';
          message = `Hi ${member.full_name}! Your ${membershipType} membership has expired. Renew now to regain access to all gym facilities!`;
          break;
        case 'RENEWAL_SUCCESS':
          title = 'Membership Renewed';
          message = `Hi ${member.full_name}! Your ${membershipType} membership has been successfully renewed. Thank you for continuing with us!`;
          break;
        default:
          title = 'Membership Alert';
          message = `Hi ${member.full_name}! Important information about your ${membershipType} membership.`;
      }

      const notification = await prisma.notification.create({
        data: {
          member_id: id,
          type: 'MEMBERSHIP_ALERT',
          title,
          message,
          channels: ['IN_APP', 'EMAIL', 'SMS'],
          send_at: new Date(),
          data: {
            alert_type,
            membership_type: membershipType,
            days_remaining,
            expires_at: member.expires_at,
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Membership alert sent successfully',
        data: { notification },
      });
    } catch (error) {
      console.error('Send membership alert error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Send achievement notification
  async sendAchievementNotification(req, res) {
    try {
      const { id } = req.params;
      const { achievement_id } = req.body;

      // Get achievement details
      const achievement = await prisma.achievement.findUnique({
        where: { id: achievement_id },
        include: {
          member: {
            select: { full_name: true },
          },
        },
      });

      if (!achievement) {
        return res.status(404).json({
          success: false,
          message: 'Achievement not found',
          data: null,
        });
      }

      const notification = await prisma.notification.create({
        data: {
          member_id: id,
          type: 'ACHIEVEMENT',
          title: 'Achievement Unlocked! 🏆',
          message: `Congratulations ${achievement.member.full_name}! You've unlocked "${achievement.title}" - ${achievement.description}`,
          channels: ['IN_APP', 'EMAIL'],
          send_at: new Date(),
          data: {
            achievement_id: achievement.id,
            achievement_title: achievement.title,
            achievement_points: achievement.points,
            achievement_badge: achievement.badge_icon,
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Achievement notification sent successfully',
        data: { notification },
      });
    } catch (error) {
      console.error('Send achievement notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Send promotional message
  async sendPromotionalMessage(req, res) {
    try {
      const { id } = req.params;
      const { title, message, promotion_data } = req.body;

      const notification = await prisma.notification.create({
        data: {
          member_id: id,
          type: 'PROMOTIONAL',
          title: title || 'Special Offer!',
          message,
          channels: ['IN_APP', 'EMAIL'],
          send_at: new Date(),
          data: {
            promotion_type: 'marketing',
            ...promotion_data,
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Promotional message sent successfully',
        data: { notification },
      });
    } catch (error) {
      console.error('Send promotional message error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== BULK NOTIFICATIONS ====================

  // Send bulk notifications
  async sendBulkNotifications(req, res) {
    try {
      const { member_ids, type, title, message, channels, send_at, data } = req.body;

      if (!Array.isArray(member_ids) || member_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Member IDs array is required',
          data: null,
        });
      }

      if (!type || !title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Type, title, and message are required',
          data: null,
        });
      }

      // Create notifications for all members
      const notifications = await Promise.all(
        member_ids.map(member_id =>
          prisma.notification.create({
            data: {
              member_id,
              type,
              title,
              message,
              channels: channels || ['IN_APP'],
              send_at: send_at ? new Date(send_at) : new Date(),
              data: data || {},
            },
          })
        )
      );

      res.status(201).json({
        success: true,
        message: 'Bulk notifications sent successfully',
        data: { notifications },
      });
    } catch (error) {
      console.error('Send bulk notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Send notifications to all active members
  async sendNotificationToAllActiveMembers(req, res) {
    try {
      const { type, title, message, channels, send_at, data } = req.body;

      if (!type || !title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Type, title, and message are required',
          data: null,
        });
      }

      // Get all active members
      const activeMembers = await prisma.member.findMany({
        where: {
          membership_status: 'ACTIVE',
          access_enabled: true,
        },
        select: { id: true },
      });

      const memberIds = activeMembers.map(member => member.id);

      // Create notifications for all active members
      const notifications = await Promise.all(
        memberIds.map(member_id =>
          prisma.notification.create({
            data: {
              member_id,
              type,
              title,
              message,
              channels: channels || ['IN_APP'],
              send_at: send_at ? new Date(send_at) : new Date(),
              data: data || {},
            },
          })
        )
      );

      res.status(201).json({
        success: true,
        message: `Notifications sent to ${memberIds.length} active members`,
        data: {
          notifications,
          totalSent: memberIds.length,
        },
      });
    } catch (error) {
      console.error('Send notification to all active members error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== NOTIFICATION TEMPLATES ====================

  // Get notification templates
  async getNotificationTemplates(req, res) {
    try {
      const templates = {
        WORKOUT_REMINDER: {
          title: 'Workout Reminder',
          message:
            "Hi {{member_name}}! Time for your workout. Let's achieve your fitness goals! 💪",
          channels: ['IN_APP', 'EMAIL'],
        },
        MEMBERSHIP_ALERT: {
          title: 'Membership Alert',
          message:
            'Hi {{member_name}}! Important information about your {{membership_type}} membership.',
          channels: ['IN_APP', 'EMAIL', 'SMS'],
        },
        ACHIEVEMENT: {
          title: 'Achievement Unlocked! 🏆',
          message:
            'Congratulations {{member_name}}! You\'ve unlocked "{{achievement_title}}" - {{achievement_description}}',
          channels: ['IN_APP', 'EMAIL'],
        },
        PROMOTIONAL: {
          title: 'Special Offer!',
          message: "Hi {{member_name}}! Don't miss out on our special offer!",
          channels: ['IN_APP', 'EMAIL'],
        },
        HEALTH_TIP: {
          title: 'Health Tip',
          message: "Hi {{member_name}}! Here's a health tip for you: {{tip_content}}",
          channels: ['IN_APP'],
        },
        EQUIPMENT_MAINTENANCE: {
          title: 'Equipment Maintenance',
          message:
            'Hi {{member_name}}! Some equipment will be under maintenance. We apologize for any inconvenience.',
          channels: ['IN_APP', 'EMAIL'],
        },
      };

      res.json({
        success: true,
        message: 'Notification templates retrieved successfully',
        data: { templates },
      });
    } catch (error) {
      console.error('Get notification templates error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== NOTIFICATION ANALYTICS ====================

  // Get notification statistics
  async getNotificationStats(req, res) {
    try {
      const { id } = req.params;
      const { period = '30' } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const [totalNotifications, unreadNotifications, notificationsByType, readRate] =
        await Promise.all([
          prisma.notification.count({
            where: {
              member_id: id,
              created_at: { gte: startDate },
            },
          }),
          prisma.notification.count({
            where: {
              member_id: id,
              is_read: false,
              created_at: { gte: startDate },
            },
          }),
          prisma.notification.groupBy({
            by: ['type'],
            where: {
              member_id: id,
              created_at: { gte: startDate },
            },
            _count: { id: true },
          }),
          prisma.notification.aggregate({
            where: {
              member_id: id,
              created_at: { gte: startDate },
            },
            _avg: { is_read: true },
          }),
        ]);

      res.json({
        success: true,
        message: 'Notification statistics retrieved successfully',
        data: {
          stats: {
            totalNotifications,
            unreadNotifications,
            readRate: Math.round((readRate._avg.is_read || 0) * 100),
            notificationsByType,
          },
        },
      });
    } catch (error) {
      console.error('Get notification stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new NotificationController();
