const { PrismaClient } = require('@prisma/client');
const pushNotificationService = require('../utils/push-notification');
const emailService = require('./email.service');
const smsService = require('./sms.service');

const prisma = new PrismaClient();

// Connect to Identity Service database to get user info
const identityPrisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.IDENTITY_DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/identity_db',
    },
  },
});

class NotificationService {
  /**
   * Send notification via multiple channels
   * @param {Object} params - Notification parameters
   * @param {string} params.userId - User ID
   * @param {string} params.memberId - Member ID (optional, for in-app notifications)
   * @param {string} params.type - Notification type
   * @param {string} params.title - Notification title
   * @param {string} params.message - Notification message
   * @param {Object} params.data - Additional data
   * @param {Array<string>} params.channels - Channels to send (PUSH, EMAIL, SMS, IN_APP)
   * @param {Object} params.templateVariables - Variables for template (optional)
   * @returns {Promise<Object>} Result of notification sending
   */
  async sendNotification({
    userId,
    memberId = null,
    type,
    title,
    message,
    data = {},
    channels = ['IN_APP'],
    templateVariables = {},
  }) {
    try {
      // Get user info and preferences
      const user = await identityPrisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          push_enabled: true,
          push_token: true,
          push_platform: true,
          email_notifications_enabled: true,
          sms_notifications_enabled: true,
        },
      });

      // Get member notification preferences if memberId is provided
      let memberPreferences = null;
      if (memberId) {
        memberPreferences = await prisma.member.findUnique({
          where: { id: memberId },
          select: {
            notification_preferences: true,
          },
        });
      }

      const results = {
        success: true,
        channels: {},
        errors: [],
      };

      // Send via each channel
      for (const channel of channels) {
        try {
          switch (channel) {
            case 'PUSH':
              if (user.push_enabled && user.push_token) {
                const pushResult = await pushNotificationService.sendPushNotification(
                  userId,
                  title,
                  message,
                  { ...data, type, notification_type: type }
                );
                results.channels.PUSH = pushResult;
              } else {
                results.channels.PUSH = { skipped: 'Push disabled or no token' };
              }
              break;

            case 'EMAIL':
              if (user.email && (user.email_notifications_enabled !== false)) {
                const emailResult = await emailService.sendTemplateEmail(
                  user.email,
                  type,
                  {
                    member_name: user.email.split('@')[0],
                    ...templateVariables,
                  }
                );
                results.channels.EMAIL = emailResult;
              } else {
                results.channels.EMAIL = { skipped: 'Email not available or disabled' };
              }
              break;

            case 'SMS':
              if (user.phone && (user.sms_notifications_enabled !== false)) {
                const smsResult = await smsService.sendTemplateSMS(
                  user.phone,
                  type,
                  {
                    member_name: user.email?.split('@')[0] || 'Bạn',
                    ...templateVariables,
                  }
                );
                results.channels.SMS = smsResult;
              } else {
                results.channels.SMS = { skipped: 'Phone not available or disabled' };
              }
              break;

            case 'IN_APP':
              if (memberId) {
                const inAppResult = await this.createInAppNotification({
                  memberId,
                  type,
                  title,
                  message,
                  data,
                });
                results.channels.IN_APP = inAppResult;
              } else {
                results.channels.IN_APP = { skipped: 'Member ID not provided' };
              }
              break;

            default:
              results.errors.push(`Unknown channel: ${channel}`);
          }
        } catch (error) {
          console.error(`❌ Error sending ${channel} notification:`, error);
          results.channels[channel] = {
            success: false,
            error: error.message,
          };
          results.errors.push(`${channel}: ${error.message}`);
        }
      }

      // Check if any channel succeeded
      const hasSuccess = Object.values(results.channels).some(
        result => result && result.success !== false && !result.skipped
      );

      if (!hasSuccess && results.errors.length > 0) {
        results.success = false;
      }

      return results;
    } catch (error) {
      console.error('❌ Send notification error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send notification',
      };
    }
  }

  /**
   * Create in-app notification
   */
  async createInAppNotification({ memberId, type, title, message, data }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          member_id: memberId,
          type,
          title,
          message,
          data: data || {},
          is_read: false,
        },
      });

      return {
        success: true,
        notificationId: notification.id,
        message: 'In-app notification created',
      };
    } catch (error) {
      console.error('❌ Create in-app notification error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications({
    userIds,
    memberIds = [],
    type,
    title,
    message,
    data = {},
    channels = ['IN_APP'],
    templateVariables = {},
  }) {
    const results = {
      success: true,
      sent: 0,
      failed: 0,
      total: userIds.length,
      details: [],
    };

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const memberId = memberIds[i] || null;

      const result = await this.sendNotification({
        userId,
        memberId,
        type,
        title,
        message,
        data,
        channels,
        templateVariables,
      });

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
      }

      results.details.push({
        userId,
        memberId,
        result,
      });
    }

    return results;
  }

  /**
   * Get notification templates
   */
  getNotificationTemplates() {
    return {
      WORKOUT_REMINDER: {
        title: 'Nhắc nhở tập luyện',
        message: "Hi {{member_name}}! Time for your workout. Let's achieve your fitness goals! 💪",
        channels: ['IN_APP', 'PUSH', 'EMAIL'],
        variables: ['member_name', 'workout_time'],
      },
      MEMBERSHIP_ALERT: {
        title: 'Thông báo gói tập',
        message: 'Hi {{member_name}}! Important information about your {{membership_type}} membership.',
        channels: ['IN_APP', 'PUSH', 'EMAIL', 'SMS'],
        variables: ['member_name', 'membership_type', 'message'],
      },
      ACHIEVEMENT: {
        title: 'Thành tích mới! 🏆',
        message: 'Congratulations {{member_name}}! You\'ve unlocked "{{achievement_title}}" - {{achievement_description}}',
        channels: ['IN_APP', 'PUSH', 'EMAIL'],
        variables: ['member_name', 'achievement_title', 'achievement_description'],
      },
      PROMOTIONAL: {
        title: 'Ưu đãi đặc biệt!',
        message: "Hi {{member_name}}! Don't miss out on our special offer!",
        channels: ['IN_APP', 'PUSH', 'EMAIL'],
        variables: ['member_name', 'offer_content'],
      },
      HEALTH_TIP: {
        title: 'Mẹo sức khỏe',
        message: "Hi {{member_name}}! Here's a health tip for you: {{tip_content}}",
        channels: ['IN_APP'],
        variables: ['member_name', 'tip_content'],
      },
      EQUIPMENT_MAINTENANCE: {
        title: 'Bảo trì thiết bị',
        message: 'Hi {{member_name}}! Some equipment will be under maintenance. We apologize for any inconvenience.',
        channels: ['IN_APP', 'PUSH', 'EMAIL'],
        variables: ['member_name', 'equipment_name'],
      },
      PAYMENT_SUCCESS: {
        title: 'Thanh toán thành công',
        message: 'Thanh toán của bạn đã được xử lý thành công! Số tiền: {{amount}} VND',
        channels: ['IN_APP', 'PUSH', 'EMAIL', 'SMS'],
        variables: ['member_name', 'amount', 'payment_method'],
      },
      PAYMENT_FAILED: {
        title: 'Thanh toán thất bại',
        message: 'Thanh toán của bạn không thành công. Lý do: {{reason}}',
        channels: ['IN_APP', 'PUSH', 'EMAIL', 'SMS'],
        variables: ['member_name', 'reason'],
      },
      MEMBERSHIP_EXPIRING: {
        title: 'Gói tập sắp hết hạn',
        message: 'Gói tập {{membership_type}} của bạn sẽ hết hạn sau {{days_left}} ngày.',
        channels: ['IN_APP', 'PUSH', 'EMAIL', 'SMS'],
        variables: ['member_name', 'membership_type', 'days_left'],
      },
    };
  }

  /**
   * Get notification preferences for a member
   */
  async getNotificationPreferences(memberId) {
    try {
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: {
          notification_preferences: true,
        },
      });

      if (!member) {
        return {
          success: false,
          error: 'Member not found',
        };
      }

      return {
        success: true,
        preferences: member.notification_preferences || {
          push: true,
          email: true,
          sms: false,
          in_app: true,
        },
      };
    } catch (error) {
      console.error('❌ Get notification preferences error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update notification preferences for a member
   */
  async updateNotificationPreferences(memberId, preferences) {
    try {
      const member = await prisma.member.update({
        where: { id: memberId },
        data: {
          notification_preferences: preferences,
        },
        select: {
          notification_preferences: true,
        },
      });

      return {
        success: true,
        preferences: member.notification_preferences,
        message: 'Notification preferences updated',
      };
    } catch (error) {
      console.error('❌ Update notification preferences error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new NotificationService();

