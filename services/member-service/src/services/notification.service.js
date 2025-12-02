// Ensure dotenv is loaded before Prisma Client initialization
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const pushNotificationService = require('../utils/push-notification');
const emailService = require('./email.service');
const smsService = require('./sms.service');

// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');

/**
 * Create a PrismaClient instance with a custom DATABASE_URL
 * Note: This function temporarily modifies process.env.DATABASE_URL
 * to create the client, then restores it.
 */
function createPrismaClientWithUrl(databaseUrl, options = {}) {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = databaseUrl;

  try {
    const client = new PrismaClient({
      log: options.log || ['error', 'warn'],
    });
    return client;
  } finally {
    // Restore original DATABASE_URL
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
}

// Connect to Identity Service database to get user info
// Create a separate PrismaClient instance for identity database
let identityPrisma = null;
if (process.env.IDENTITY_DATABASE_URL) {
  try {
    identityPrisma = createPrismaClientWithUrl(process.env.IDENTITY_DATABASE_URL, {
      log: ['error', 'warn'],
    });
    console.log('[INFO] Identity PrismaClient initialized successfully');

    // Verify that user model exists
    if (!identityPrisma.user) {
      console.error(
        '[ERROR] Identity PrismaClient initialized but user model is not available. Check Prisma schema.'
      );
      identityPrisma = null;
    } else {
      // Test connection
      identityPrisma
        .$connect()
        .then(() => {
          console.log('[INFO] Identity PrismaClient connected successfully');
          // Verify user model is accessible
          if (identityPrisma.user) {
            console.log('[INFO] Identity PrismaClient user model is accessible');
          } else {
            console.error(
              '[ERROR] Identity PrismaClient user model is not accessible after connection'
            );
            identityPrisma = null;
          }
        })
        .catch(connectError => {
          console.error('[ERROR] Identity PrismaClient connection failed:', connectError);
          identityPrisma = null;
        });
    }
  } catch (error) {
    console.error('[ERROR] Failed to initialize Identity PrismaClient:', error);
    identityPrisma = null;
  }
} else {
  console.warn('[WARNING] IDENTITY_DATABASE_URL not set, identity database queries will fail');
  console.warn('[WARNING] Member event notifications will not be created in database');
}

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
      // Check if identityPrisma is initialized and has user model
      if (!identityPrisma || !identityPrisma.user) {
        console.error(
          '[ERROR] Identity PrismaClient not initialized or user model not available, cannot get user preferences'
        );
        throw new Error('Identity database not available');
      }

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
              if (user.email && user.email_notifications_enabled !== false) {
                const emailResult = await emailService.sendTemplateEmail(user.email, type, {
                  member_name: user.email.split('@')[0],
                  ...templateVariables,
                });
                results.channels.EMAIL = emailResult;
              } else {
                results.channels.EMAIL = { skipped: 'Email not available or disabled' };
              }
              break;

            case 'SMS':
              if (user.phone && user.sms_notifications_enabled !== false) {
                const smsResult = await smsService.sendTemplateSMS(user.phone, type, {
                  member_name: user.email?.split('@')[0] || 'Bạn',
                  ...templateVariables,
                });
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
          console.error(`[ERROR] Error sending ${channel} notification:`, error);
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
      console.error('[ERROR] Send notification error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send notification',
      };
    }
  }

  /**
   * Create in-app notification
   * Now enqueues notification to Redis queue (processed by worker)
   */
  async createInAppNotification({ memberId, type, title, message, data }) {
    try {
      // Get member's user_id to create notification in identity service
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { user_id: true },
      });

      if (!member?.user_id) {
        throw new Error(`Member ${memberId} not found or has no user_id`);
      }

      // Enqueue notification to Redis queue
      const { notificationWorker } = require('../workers/notification.worker.js');
      const priority = data?.priority || 'normal';

      const enqueued = await notificationWorker.enqueueNotification(
        {
          userId: member.user_id,
          memberId,
          type,
          title,
          message,
          data: data || {},
          channels: ['IN_APP', 'PUSH'],
        },
        priority
      );

      if (!enqueued) {
        // Fallback: create notification directly via identity service if Redis is down
        console.warn('[WARN] Redis queue unavailable, creating notification via identity service');
        const axios = require('axios');
        const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';

        const response = await axios.post(
          `${IDENTITY_SERVICE_URL}/notifications`,
          {
            user_id: member.user_id,
            type,
            title,
            message,
            data: {
              ...(data || {}),
              member_id: memberId,
              role: 'MEMBER',
            },
          },
          {
            timeout: 5000,
          }
        );

        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to create notification');
        }

        const notification = response.data.data.notification;

        // Emit socket event if socket.io is available
        if (global.io) {
          try {
            const roomName = `user:${member.user_id}`;
            const socketPayload = {
              notification_id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              data: notification.data,
              created_at: notification.created_at,
              is_read: notification.is_read,
            };

            // Map notification types to specific socket events
            const socketEventMap = {
              REWARD: 'reward:notification',
              CHALLENGE: 'challenge:notification',
              ACHIEVEMENT: 'achievement:notification',
              STREAK: 'streak:notification',
              BOOKING: 'booking:notification',
              QUEUE: 'queue:notification',
            };

            const specificEvent = socketEventMap[type];
            if (specificEvent) {
              global.io.to(roomName).emit(specificEvent, socketPayload);
            }

            // Always emit general notification:new event for compatibility
            global.io.to(roomName).emit('notification:new', socketPayload);
          } catch (socketError) {
            console.error('[ERROR] Socket emit error:', socketError);
            // Don't fail notification creation if socket fails
          }
        }

        return {
          success: true,
          notificationId: notification.id,
          message: 'In-app notification created',
        };
      }

      // If enqueued successfully, return success
      return {
        success: true,
        message: 'Notification enqueued successfully',
        enqueued: true,
      };
    } catch (error) {
      console.error('[ERROR] Create in-app notification error:', error);
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
        message:
          "Hi {{member_name}}! Time for your workout. Let's achieve your fitness goals! [STRENGTH]",
        channels: ['IN_APP', 'PUSH', 'EMAIL'],
        variables: ['member_name', 'workout_time'],
      },
      MEMBERSHIP_ALERT: {
        title: 'Thông báo gói tập',
        message:
          'Hi {{member_name}}! Important information about your {{membership_type}} membership.',
        channels: ['IN_APP', 'PUSH', 'EMAIL', 'SMS'],
        variables: ['member_name', 'membership_type', 'message'],
      },
      ACHIEVEMENT: {
        title: 'Thành tích mới! [TROPHY]',
        message:
          'Congratulations {{member_name}}! You\'ve unlocked "{{achievement_title}}" - {{achievement_description}}',
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
        message:
          'Hi {{member_name}}! Some equipment will be under maintenance. We apologize for any inconvenience.',
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
      console.error('[ERROR] Get notification preferences error:', error);
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
      console.error('[ERROR] Update notification preferences error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create queue notification for member
   */
  async createQueueNotification({ memberId, type, title, message, data }) {
    try {
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { user_id: true },
      });

      if (!member?.user_id) {
        throw new Error(`Member ${memberId} not found or has no user_id`);
      }

      return await this.createInAppNotification({
        memberId,
        type,
        title,
        message,
        data,
      });
    } catch (error) {
      console.error('[ERROR] Create queue notification error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create equipment notification for admin
   * @param {Object} params - { equipmentId, equipmentName, status, action }
   */
  async createEquipmentNotificationForAdmin({
    equipmentId,
    equipmentName,
    status,
    action = 'status_changed',
  }) {
    try {
      const axios = require('axios');
      const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';

      // Get all admin users from Identity Service API
      let admins = [];
      try {
        const response = await axios.get(`${IDENTITY_SERVICE_URL}/auth/users/admins`, {
          timeout: 10000,
        });
        if (response.data?.success && response.data?.data?.users) {
          admins = response.data.data.users.map(admin => ({ id: admin.id }));
          console.log(
            `[INFO] Retrieved ${admins.length} admins from Identity Service API for equipment notification`
          );
        } else {
          console.warn(
            '[WARNING] Invalid response from Identity Service /auth/users/admins:',
            response.data
          );
        }
      } catch (apiError) {
        console.error(
          '[ERROR] Failed to get admins from Identity Service API:',
          apiError.message || apiError
        );
        return { success: false, error: 'Failed to get admins from Identity Service', sent: 0 };
      }

      if (admins.length === 0) {
        console.log('[INFO] No active admins found for equipment notification');
        return { success: true, sent: 0 };
      }

      const title =
        action === 'available'
          ? 'Thiết bị có sẵn'
          : action === 'status_changed'
            ? 'Thay đổi trạng thái thiết bị'
            : 'Cập nhật thiết bị';

      const message =
        action === 'available'
          ? `Thiết bị ${equipmentName} đã có sẵn`
          : `Thiết bị ${equipmentName} đã thay đổi trạng thái thành ${status}`;

      const notificationType =
        action === 'available' ? 'EQUIPMENT_AVAILABLE' : 'EQUIPMENT_MAINTENANCE_SCHEDULED';

      const results = await Promise.allSettled(
        admins.map(admin =>
          axios.post(
            `${IDENTITY_SERVICE_URL}/notifications`,
            {
              user_id: admin.id,
              type: notificationType,
              title,
              message,
              data: {
                equipment_id: equipmentId,
                equipment_name: equipmentName,
                status,
                action,
                role: 'MEMBER', // Role of the sender (member), not the recipient (admin)
              },
            },
            { timeout: 5000 }
          )
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;

      // Emit socket events to admin room
      if (global.io) {
        try {
          admins.forEach(admin => {
            try {
              global.io.to(`user:${admin.id}`).emit('equipment:status:changed', {
                equipment_id: equipmentId,
                equipment_name: equipmentName,
                status,
                action,
              });
            } catch (emitError) {
              console.error(
                `[ERROR] Error emitting equipment:status:changed to user:${admin.id}:`,
                emitError
              );
            }
          });
        } catch (socketError) {
          console.error(
            '[ERROR] Socket emit error in createEquipmentNotificationForAdmin:',
            socketError
          );
          // Don't fail notification creation if socket fails
        }
      }

      return {
        success: true,
        sent: successCount,
        total: admins.length,
      };
    } catch (error) {
      console.error('[ERROR] Create equipment notification for admin error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create queue notification for admin
   * @param {Object} params - { equipmentId, equipmentName, memberName, position, action }
   */
  async createQueueNotificationForAdmin({
    equipmentId,
    equipmentName,
    memberName,
    position,
    action = 'joined',
  }) {
    try {
      const axios = require('axios');
      const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';

      // Get all admin users from Identity Service API
      let admins = [];
      try {
        const response = await axios.get(`${IDENTITY_SERVICE_URL}/auth/users/admins`, {
          timeout: 10000,
        });
        if (response.data?.success && response.data?.data?.users) {
          admins = response.data.data.users.map(admin => ({ id: admin.id }));
          console.log(
            `[INFO] Retrieved ${admins.length} admins from Identity Service API for queue notification`
          );
        } else {
          console.warn(
            '[WARNING] Invalid response from Identity Service /auth/users/admins:',
            response.data
          );
        }
      } catch (apiError) {
        console.error(
          '[ERROR] Failed to get admins from Identity Service API:',
          apiError.message || apiError
        );
        return { success: false, error: 'Failed to get admins from Identity Service', sent: 0 };
      }

      if (admins.length === 0) {
        console.log('[INFO] No active admins found for queue notification');
        return { success: true, sent: 0 };
      }

      const title =
        action === 'joined'
          ? 'Thành viên tham gia hàng chờ'
          : action === 'left'
            ? 'Thành viên rời hàng chờ'
            : 'Cập nhật hàng chờ';

      const message =
        action === 'joined'
          ? `${memberName} đã tham gia hàng chờ thiết bị ${equipmentName} ở vị trí ${position}`
          : action === 'left'
            ? `${memberName} đã rời hàng chờ thiết bị ${equipmentName}`
            : `Hàng chờ thiết bị ${equipmentName} đã được cập nhật`;

      const results = await Promise.allSettled(
        admins.map(admin =>
          axios.post(
            `${IDENTITY_SERVICE_URL}/notifications`,
            {
              user_id: admin.id,
              type: 'QUEUE_JOINED',
              title,
              message,
              data: {
                equipment_id: equipmentId,
                equipment_name: equipmentName,
                member_name: memberName,
                position,
                action,
                role: 'MEMBER', // Role of the sender (member), not the recipient (admin)
              },
            },
            { timeout: 5000 }
          )
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;

      // Emit socket events to admin room
      if (global.io) {
        try {
          admins.forEach(admin => {
            try {
              global.io.to(`user:${admin.id}`).emit('queue:updated', {
                equipment_id: equipmentId,
                equipment_name: equipmentName,
                member_name: memberName,
                position,
                action,
              });
            } catch (emitError) {
              console.error(`[ERROR] Error emitting queue:updated to user:${admin.id}:`, emitError);
            }
          });
        } catch (socketError) {
          console.error(
            '[ERROR] Socket emit error in createQueueNotificationForAdmin:',
            socketError
          );
          // Don't fail notification creation if socket fails
        }
      }

      return {
        success: true,
        sent: successCount,
        total: admins.length,
      };
    } catch (error) {
      console.error('[ERROR] Create queue notification for admin error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create registration completed notification for all admins/super admins
   * @param {Object} params - { memberId, memberName, memberData }
   */
  async createRegistrationCompletedNotificationForAdmin({ memberId, memberName, memberData = {} }) {
    try {
      const axios = require('axios');
      const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';

      // Get all admin users from Identity Service API
      let admins = [];
      try {
        const response = await axios.get(`${IDENTITY_SERVICE_URL}/auth/users/admins`, {
          timeout: 10000,
        });
        if (response.data?.success && response.data?.data?.users) {
          admins = response.data.data.users.map(admin => ({ id: admin.id }));
          console.log(`[INFO] Retrieved ${admins.length} admins from Identity Service API`);
        } else {
          console.warn(
            '[WARNING] Invalid response from Identity Service /auth/users/admins:',
            response.data
          );
        }
      } catch (apiError) {
        console.error(
          '[ERROR] Failed to get admins from Identity Service API:',
          apiError.message || apiError
        );
        return { success: false, error: 'Failed to get admins from Identity Service', sent: 0 };
      }

      if (admins.length === 0) {
        console.log('[INFO] No active admins found for registration completed notification');
        return { success: true, sent: 0 };
      }

      const title = 'Thành viên hoàn tất đăng ký';
      const message = `${memberName || 'Thành viên'} đã hoàn tất đăng ký và sẵn sàng sử dụng dịch vụ`;

      const results = await Promise.allSettled(
        admins.map(admin =>
          axios.post(
            `${IDENTITY_SERVICE_URL}/notifications`,
            {
              user_id: admin.id,
              type: 'MEMBER_REGISTERED', // This is the final notification when registration is completed
              title,
              message,
              data: {
                member_id: memberId,
                member_name: memberName,
                ...memberData,
                role: 'MEMBER', // Role of the sender (member), not the recipient (admin)
              },
              channels: ['IN_APP', 'PUSH'],
            },
            { timeout: 5000 }
          )
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failedCount = results.filter(r => r.status === 'rejected').length;

      if (failedCount > 0) {
        console.warn(
          `[WARNING] Failed to create registration completed notification for ${failedCount} admins`
        );
      }

      console.log(
        `[SUCCESS] Created registration completed notification for ${successCount}/${admins.length} admins`
      );

      return {
        success: true,
        sent: successCount,
        total: admins.length,
      };
    } catch (error) {
      console.error('[ERROR] Create registration completed notification for admin error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create member event notification for all admins/super admins
   * @param {Object} params - { memberId, memberName, memberData, eventType, title, message }
   */
  async createMemberEventNotificationForAdmin({
    memberId,
    memberName,
    memberData = {},
    eventType = 'MEMBER_UPDATED',
    title,
    message,
  }) {
    try {
      console.log(
        `[START] [${eventType}] createMemberEventNotificationForAdmin called for member ${memberId}`
      );
      const axios = require('axios');
      const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';
      console.log(`[INFO] [${eventType}] Using Identity Service URL: ${IDENTITY_SERVICE_URL}`);

      // Get all admin users from Identity Service API
      let admins = [];
      try {
        console.log(
          `[INFO] [${eventType}] Calling Identity Service API: ${IDENTITY_SERVICE_URL}/auth/users/admins`
        );
        const response = await axios.get(`${IDENTITY_SERVICE_URL}/auth/users/admins`, {
          timeout: 10000,
        });
        console.log(
          `[INFO] [${eventType}] Identity Service API response status: ${response.status}`
        );
        console.log(
          `[INFO] [${eventType}] Identity Service API response data:`,
          JSON.stringify(response.data, null, 2)
        );

        if (response.data?.success && response.data?.data?.users) {
          admins = response.data.data.users.map(admin => ({ id: admin.id }));
          console.log(
            `[SUCCESS] [${eventType}] Retrieved ${admins.length} admins from Identity Service API`
          );
        } else {
          console.warn(
            `[WARNING] [${eventType}] Invalid response from Identity Service /auth/users/admins:`,
            JSON.stringify(response.data, null, 2)
          );
        }
      } catch (apiError) {
        console.error(
          `[ERROR] [${eventType}] Failed to get admins from Identity Service API:`,
          apiError.message || apiError
        );
        if (apiError.response) {
          console.error(
            `[ERROR] [${eventType}] Response status: ${apiError.response.status}`,
            `Response data:`,
            JSON.stringify(apiError.response.data, null, 2)
          );
        }
        return { success: false, error: 'Failed to get admins from Identity Service', sent: 0 };
      }

      if (admins.length === 0) {
        console.warn(
          `[WARNING] [${eventType}] No active admins found in Identity Service. Notification will not be created.`
        );
        console.warn(
          `[WARNING] [${eventType}] This might be because there are no ADMIN or SUPER_ADMIN users in the system.`
        );
        return { success: true, sent: 0, total: 0 };
      }

      console.log(
        `[INFO] [${eventType}] Creating notifications for ${admins.length} admins via Identity Service`
      );

      const results = await Promise.allSettled(
        admins.map(admin => {
          const payload = {
            user_id: admin.id,
            type: eventType,
            title: title || 'Thông báo thành viên',
            message: message || `${memberName || 'Thành viên'} đã được cập nhật`,
            data: {
              member_id: memberId,
              member_name: memberName,
              ...memberData,
              role: 'MEMBER',
            },
            channels: ['IN_APP', 'PUSH'],
          };
          console.log(
            `[INFO] [${eventType}] Sending notification to admin ${admin.id}:`,
            JSON.stringify(payload, null, 2)
          );
          return axios.post(`${IDENTITY_SERVICE_URL}/notifications`, payload, { timeout: 10000 });
        })
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failedCount = results.filter(r => r.status === 'rejected').length;

      if (failedCount > 0) {
        console.warn(
          `[WARNING] Failed to create ${eventType} notification for ${failedCount} admins`
        );
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(
              `[ERROR] [${eventType}] Failed for admin ${admins[index].id}:`,
              result.reason?.message || result.reason
            );
            if (result.reason?.response) {
              console.error(
                `[ERROR] [${eventType}] Response status: ${result.reason.response.status}`,
                `Response data:`,
                JSON.stringify(result.reason.response.data, null, 2)
              );
            }
          }
        });
      }

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const notificationId = result.value?.data?.data?.notification?.id || 'enqueued';
          console.log(
            `[SUCCESS] [${eventType}] Notification created for admin ${admins[index].id}: ${notificationId}`
          );
        } else {
          console.error(
            `[ERROR] [${eventType}] Failed to create notification for admin ${admins[index].id}:`,
            result.reason?.message || result.reason
          );
          if (result.reason?.response) {
            console.error(
              `[ERROR] [${eventType}] Response status: ${result.reason.response.status}`,
              `Response data:`,
              JSON.stringify(result.reason.response.data, null, 2)
            );
          }
        }
      });

      console.log(
        `[SUCCESS] [${eventType}] Created notifications for ${successCount}/${admins.length} admins`
      );

      return {
        success: true,
        sent: successCount,
        total: admins.length,
      };
    } catch (error) {
      console.error(`[ERROR] Create ${eventType} notification for admin error:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send system announcement to all members
   * @param {Object} params - { title, message, data }
   */
  async sendSystemAnnouncement({ title, message, data = {} }) {
    try {
      // Get all active members
      const members = await prisma.member.findMany({
        where: {
          membership_status: 'ACTIVE',
        },
        select: { id: true, user_id: true },
      });

      if (members.length === 0) {
        console.log('[INFO] No active members found for system announcement');
        return { success: true, sent: 0 };
      }

      const axios = require('axios');
      const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';

      const results = await Promise.allSettled(
        members
          .filter(m => m.user_id) // Only members with user_id
          .map(member =>
            axios.post(
              `${IDENTITY_SERVICE_URL}/notifications`,
              {
                user_id: member.user_id,
                type: 'SYSTEM_ANNOUNCEMENT',
                title,
                message,
                data: {
                  ...data,
                  role: 'MEMBER',
                },
                channels: ['IN_APP', 'PUSH'], // Ensure both in-app and push notifications are sent
              },
              { timeout: 5000 }
            )
          )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;

      // Emit socket events to all members
      if (global.io) {
        try {
          const socketPayload = {
            title,
            message,
            data,
            type: 'SYSTEM_ANNOUNCEMENT',
            created_at: new Date().toISOString(),
          };

          // Emit to each member's user room
          members.forEach(member => {
            if (member.user_id) {
              try {
                const roomName = `user:${member.user_id}`;
                // Emit both system:announcement (for compatibility) and admin:system:announcement (specific event)
                global.io.to(roomName).emit('system:announcement', socketPayload);
                global.io.to(roomName).emit('admin:system:announcement', socketPayload);
                console.log(
                  `[EMIT] [SYSTEM_ANNOUNCEMENT] Emitted to user:${member.user_id} in room ${roomName}`
                );
              } catch (emitError) {
                console.error(
                  `[ERROR] Error emitting system:announcement to user:${member.user_id}:`,
                  emitError
                );
              }
            }
          });

          // Also broadcast to all members room (if exists) for real-time updates
          global.io.emit('admin:system:announcement', socketPayload);
          console.log(
            `[EMIT] [SYSTEM_ANNOUNCEMENT] Broadcasted to all connected clients (${members.length} members)`
          );
        } catch (socketError) {
          console.error('[ERROR] Socket emit error in sendSystemAnnouncement:', socketError);
          // Don't fail notification creation if socket fails
        }
      }

      return {
        success: true,
        sent: successCount,
        total: members.length,
      };
    } catch (error) {
      console.error('[ERROR] Send system announcement error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send membership expiry warning
   * @param {Object} params - { memberId, daysUntilExpiry, membershipType }
   */
  async sendMembershipExpiryWarning({ memberId, daysUntilExpiry, membershipType }) {
    try {
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true, user_id: true, full_name: true },
      });

      if (!member?.user_id) {
        throw new Error(`Member ${memberId} not found or has no user_id`);
      }

      const title =
        daysUntilExpiry <= 3
          ? '[WARNING] Gói thành viên sắp hết hạn'
          : 'Gói thành viên sắp hết hạn';

      const message =
        daysUntilExpiry <= 3
          ? `Gói ${membershipType} của bạn sẽ hết hạn sau ${daysUntilExpiry} ngày. Vui lòng gia hạn sớm để tiếp tục sử dụng dịch vụ.`
          : `Gói ${membershipType} của bạn sẽ hết hạn sau ${daysUntilExpiry} ngày. Vui lòng gia hạn để tiếp tục sử dụng dịch vụ.`;

      return await this.createInAppNotification({
        memberId,
        type: 'MEMBERSHIP_EXPIRING',
        title,
        message,
        data: {
          days_until_expiry: daysUntilExpiry,
          membership_type: membershipType,
        },
      });
    } catch (error) {
      console.error('[ERROR] Send membership expiry warning error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send payment reminder
   * @param {Object} params - { memberId, invoiceNumber, amount, dueDate }
   */
  async sendPaymentReminder({ memberId, invoiceNumber, amount, dueDate }) {
    try {
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true, user_id: true },
      });

      if (!member?.user_id) {
        throw new Error(`Member ${memberId} not found or has no user_id`);
      }

      const title = 'Nhắc nhở thanh toán';
      const message = `Hóa đơn ${invoiceNumber} với số tiền ${amount.toLocaleString('vi-VN')} VND sẽ đến hạn thanh toán vào ${new Date(dueDate).toLocaleDateString('vi-VN')}. Vui lòng thanh toán sớm.`;

      return await this.createInAppNotification({
        memberId,
        type: 'PAYMENT_REMINDER',
        title,
        message,
        data: {
          invoice_number: invoiceNumber,
          amount,
          due_date: dueDate,
        },
      });
    } catch (error) {
      console.error('[ERROR] Send payment reminder error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send equipment maintenance notification to affected members
   * @param {Object} params - { equipmentId, equipmentName, maintenanceType, scheduledDate, affectedMemberIds? }
   */
  async sendEquipmentMaintenanceNotification({
    equipmentId,
    equipmentName,
    maintenanceType,
    scheduledDate,
    affectedMemberIds = null,
  }) {
    try {
      let members = [];

      if (affectedMemberIds && affectedMemberIds.length > 0) {
        // Get specific members
        members = await prisma.member.findMany({
          where: {
            id: { in: affectedMemberIds },
          },
          select: { id: true, user_id: true },
        });
      } else {
        // Get all active members (broadcast)
        members = await prisma.member.findMany({
          where: {
            membership_status: 'ACTIVE',
          },
          select: { id: true, user_id: true },
        });
      }

      if (members.length === 0) {
        console.log('[INFO] No members found for equipment maintenance notification');
        return { success: true, sent: 0 };
      }

      const axios = require('axios');
      const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';

      const title = 'Bảo trì thiết bị';
      const message = `Thiết bị ${equipmentName} sẽ được bảo trì vào ${new Date(scheduledDate).toLocaleDateString('vi-VN')}. Vui lòng lưu ý khi sử dụng.`;

      const results = await Promise.allSettled(
        members
          .filter(m => m.user_id)
          .map(member =>
            axios.post(
              `${IDENTITY_SERVICE_URL}/notifications`,
              {
                user_id: member.user_id,
                type: 'EQUIPMENT_MAINTENANCE_SCHEDULED',
                title,
                message,
                data: {
                  equipment_id: equipmentId,
                  equipment_name: equipmentName,
                  maintenance_type: maintenanceType,
                  scheduled_date: scheduledDate,
                },
              },
              { timeout: 5000 }
            )
          )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;

      // Emit socket events
      if (global.io) {
        try {
          members.forEach(member => {
            if (member.user_id) {
              try {
                global.io.to(`user:${member.user_id}`).emit('equipment:maintenance:scheduled', {
                  equipment_id: equipmentId,
                  equipment_name: equipmentName,
                  maintenance_type: maintenanceType,
                  scheduled_date: scheduledDate,
                });
              } catch (emitError) {
                console.error(
                  `[ERROR] Error emitting equipment:maintenance:scheduled to user:${member.user_id}:`,
                  emitError
                );
              }
            }
          });
        } catch (socketError) {
          console.error(
            '[ERROR] Socket emit error in sendEquipmentMaintenanceNotification:',
            socketError
          );
          // Don't fail notification creation if socket fails
        }
      }

      return {
        success: true,
        sent: successCount,
        total: members.length,
      };
    } catch (error) {
      console.error('[ERROR] Send equipment maintenance notification error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new NotificationService();
