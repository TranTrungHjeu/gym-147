const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Notification Service for Certification Management
 * Handles notifications for admin/super-admin when trainers upload certifications
 */

class NotificationService {
  /**
   * Send notification to admins when trainer uploads certification
   * @param {string} trainerId - Trainer ID
   * @param {string} certificationId - Certification ID
   * @param {Object} certificationData - Certification data
   */
  async notifyAdminsOfCertificationUpload(trainerId, certificationId, certificationData) {
    try {
      console.log(`📢 Sending notification to admins for certification upload: ${certificationId}`);

      // Get trainer info
      const trainer = await prisma.trainer.findUnique({
        where: { id: trainerId },
        select: {
          full_name: true,
          email: true,
          user_id: true,
        },
      });

      if (!trainer) {
        console.error('Trainer not found for notification');
        return;
      }

      // Get all admins and super-admins
      const admins = await this.getAdminsAndSuperAdmins();

      // Create notification for each admin
      const notifications = admins.map(admin => ({
        user_id: admin.user_id,
        type: 'CERTIFICATION_UPLOAD',
        title: 'Chứng chỉ mới được tải lên',
        message: `Trainer ${trainer.full_name} đã tải lên chứng chỉ mới: ${certificationData.certification_name}`,
        data: {
          trainer_id: trainerId,
          trainer_name: trainer.full_name,
          trainer_email: trainer.email,
          certification_id: certificationId,
          certification_name: certificationData.certification_name,
          certification_issuer: certificationData.certification_issuer,
          certification_level: certificationData.certification_level,
          category: certificationData.category,
          issued_date: certificationData.issued_date,
          expiration_date: certificationData.expiration_date,
          certificate_file_url: certificationData.certificate_file_url,
        },
        is_read: false,
        created_at: new Date(),
      }));

      // Save notifications to database
      await prisma.notification.createMany({
        data: notifications,
      });

      console.log(`✅ Sent ${notifications.length} notifications to admins`);

      // Also send real-time notification (if WebSocket is available)
      await this.sendRealTimeNotification(notifications);
    } catch (error) {
      console.error('Error sending certification upload notification:', error);
    }
  }

  /**
   * Send notification when certification is auto-verified by AI
   * @param {string} trainerId - Trainer ID
   * @param {string} certificationId - Certification ID
   * @param {Object} scanResult - AI scan result
   */
  async notifyCertificationAutoVerified(trainerId, certificationId, scanResult) {
    try {
      console.log(
        `🤖 Sending auto-verification notification for certification: ${certificationId}`
      );

      // Get trainer info
      const trainer = await prisma.trainer.findUnique({
        where: { id: trainerId },
        select: {
          full_name: true,
          email: true,
          user_id: true,
        },
      });

      if (!trainer) {
        console.error('Trainer not found for auto-verification notification');
        return;
      }

      // Create notification for trainer
      const trainerNotification = {
        user_id: trainer.user_id,
        type: 'CERTIFICATION_AUTO_VERIFIED',
        title: 'Chứng chỉ đã được xác thực tự động',
        message: `Chứng chỉ của bạn đã được xác thực tự động bởi AI với độ tin cậy ${(scanResult.confidence * 100).toFixed(1)}%`,
        data: {
          certification_id: certificationId,
          scan_result: scanResult,
          auto_verified: true,
        },
        is_read: false,
        created_at: new Date(),
      };

      await prisma.notification.create({
        data: trainerNotification,
      });

      // Also notify admins about auto-verification
      const admins = await this.getAdminsAndSuperAdmins();
      const adminNotifications = admins.map(admin => ({
        user_id: admin.user_id,
        type: 'CERTIFICATION_AUTO_VERIFIED',
        title: 'Chứng chỉ được xác thực tự động',
        message: `Chứng chỉ của trainer ${trainer.full_name} đã được xác thực tự động bởi AI`,
        data: {
          trainer_id: trainerId,
          trainer_name: trainer.full_name,
          certification_id: certificationId,
          scan_result: scanResult,
          auto_verified: true,
        },
        is_read: false,
        created_at: new Date(),
      }));

      await prisma.notification.createMany({
        data: adminNotifications,
      });

      console.log(`✅ Sent auto-verification notifications`);
    } catch (error) {
      console.error('Error sending auto-verification notification:', error);
    }
  }

  /**
   * Send notification when certification is manually verified/rejected by admin
   * @param {string} trainerId - Trainer ID
   * @param {string} certificationId - Certification ID
   * @param {string} action - 'VERIFIED' or 'REJECTED'
   * @param {string} adminId - Admin who performed the action
   * @param {string} reason - Reason for rejection (if applicable)
   */
  async notifyCertificationStatusChange(
    trainerId,
    certificationId,
    action,
    adminId,
    reason = null
  ) {
    try {
      console.log(`📢 Sending certification status change notification: ${action}`);

      // Get trainer info
      const trainer = await prisma.trainer.findUnique({
        where: { id: trainerId },
        select: {
          full_name: true,
          email: true,
          user_id: true,
        },
      });

      if (!trainer) {
        console.error('Trainer not found for status change notification');
        return;
      }

      // Get admin info
      const admin = await prisma.trainer.findUnique({
        where: { id: adminId },
        select: {
          full_name: true,
          email: true,
        },
      });

      const adminName = admin ? admin.full_name : 'Admin';

      let title, message;
      if (action === 'VERIFIED') {
        title = 'Chứng chỉ đã được xác thực';
        message = `Chứng chỉ của bạn đã được xác thực bởi ${adminName}`;
      } else {
        title = 'Chứng chỉ bị từ chối';
        message = `Chứng chỉ của bạn đã bị từ chối bởi ${adminName}${reason ? `: ${reason}` : ''}`;
      }

      // Create notification for trainer
      const notification = {
        user_id: trainer.user_id,
        type: `CERTIFICATION_${action}`,
        title,
        message,
        data: {
          certification_id: certificationId,
          action,
          admin_id: adminId,
          admin_name: adminName,
          reason,
        },
        is_read: false,
        created_at: new Date(),
      };

      await prisma.notification.create({
        data: notification,
      });

      console.log(`✅ Sent certification status change notification`);
    } catch (error) {
      console.error('Error sending certification status change notification:', error);
    }
  }

  /**
   * Get all admins and super-admins
   * @returns {Array} - Array of admin users
   */
  async getAdminsAndSuperAdmins() {
    try {
      // This would typically call the Identity Service to get admin users
      // For now, we'll return a mock list or use a hardcoded approach

      // In a real implementation, you would call the Identity Service API
      // const response = await fetch('http://localhost:3001/users?role=ADMIN,SUPER_ADMIN');
      // const admins = await response.json();

      // For now, return empty array - this should be implemented with actual Identity Service call
      return [];
    } catch (error) {
      console.error('Error getting admins:', error);
      return [];
    }
  }

  /**
   * Send real-time notification via WebSocket (if available)
   * @param {Array} notifications - Array of notifications
   */
  async sendRealTimeNotification(notifications) {
    try {
      // This would integrate with WebSocket service for real-time notifications
      // For now, just log the notifications
      console.log('📡 Real-time notifications would be sent here:', notifications.length);
    } catch (error) {
      console.error('Error sending real-time notification:', error);
    }
  }

  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} - Array of notifications
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const { limit = 50, offset = 0, unreadOnly = false } = options;

      const where = {
        user_id: userId,
        ...(unreadOnly && { is_read: false }),
      };

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      });

      return notifications;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   */
  async markNotificationAsRead(notificationId, userId) {
    try {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          user_id: userId,
        },
        data: {
          is_read: true,
          read_at: new Date(),
        },
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   */
  async markAllNotificationsAsRead(userId) {
    try {
      await prisma.notification.updateMany({
        where: {
          user_id: userId,
          is_read: false,
        },
        data: {
          is_read: true,
          read_at: new Date(),
        },
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  /**
   * Generic method to send notifications
   * @param {Object} notificationData - Notification data
   * @param {string} notificationData.type - Notification type
   * @param {string} notificationData.user_id - User ID from Identity Service (for socket rooms)
   * @param {string} notificationData.member_id - Member ID (alternative, will need lookup to get user_id)
   * @param {string} notificationData.schedule_id - Schedule ID (optional)
   * @param {Object} notificationData.data - Additional data
   * @note Socket rooms use user_id (from Identity Service). If only member_id is provided, it needs to be converted to user_id.
   */
  async sendNotification(notificationData) {
    try {
      const { type, user_id, member_id, title, message, data } = notificationData;

      // Use user_id if provided (preferred for socket notifications)
      // Otherwise use member_id (will need to lookup user_id from member service)
      const targetUserId = user_id || member_id;

      if (!targetUserId) {
        console.error('sendNotification: user_id or member_id is required');
        return;
      }

      // Map notification types to titles and messages (if not provided)
      const notificationTemplates = {
        WAITLIST_ADDED: {
          title: 'Đã thêm vào danh sách chờ',
          message: `Bạn đã được thêm vào danh sách chờ cho lớp ${data?.class_name || 'học'} ở vị trí ${data?.waitlist_position || 'N/A'}`,
        },
        WAITLIST_PROMOTED: {
          title: 'Được nâng cấp từ danh sách chờ',
          message: `Chúc mừng! Bạn đã được nâng cấp từ danh sách chờ cho lớp ${data?.class_name || 'học'}`,
        },
        SCHEDULE_CANCELLED: {
          title: 'Lịch học bị hủy',
          message: `Lớp ${data?.class_name || 'học'} với trainer ${data?.trainer_name || ''} đã bị hủy. Lý do: ${data?.cancellation_reason || 'Không có lý do'}`,
        },
        ROOM_CHANGED: {
          title: 'Phòng học đã thay đổi',
          message: `Lớp ${data?.class_name || 'học'} đã được chuyển từ phòng ${data?.old_room || ''} sang phòng ${data?.new_room || ''}`,
        },
        ROOM_CHANGE_REJECTED: {
          title: 'Yêu cầu đổi phòng bị từ chối',
          message: `Yêu cầu đổi phòng cho lớp ${data?.class_name || 'học'} đã bị từ chối. Lý do: ${data?.rejection_reason || 'Không có lý do'}`,
        },
        CLASS_BOOKING: {
          title: title || 'Đặt lớp mới',
          message: message || `Có thành viên đã đặt lớp ${data?.class_name || 'Lớp học'}`,
        },
      };

      // Use provided title/message or fallback to template
      const template = notificationTemplates[type];
      const finalTitle = title || template?.title || 'Thông báo';
      const finalMessage = message || template?.message || 'Bạn có thông báo mới';

      // Create notification
      await prisma.notification.create({
        data: {
          user_id: targetUserId,
          type,
          title: finalTitle,
          message: finalMessage,
          data: data || {},
        },
      });

      console.log(`Notification sent: ${type} to user ${targetUserId}`);
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send real-time notification to trainer when member checks in
   * @param {string} trainerId - Trainer user ID
   * @param {string} memberName - Member name
   * @param {string} className - Class name
   * @param {Date} checkInTime - Check-in time
   */
  async notifyTrainerCheckIn(trainerId, memberName, className, checkInTime) {
    try {
      console.log(`📢 Sending check-in notification to trainer: ${trainerId}`);

      await prisma.notification.create({
        data: {
          user_id: trainerId,
          type: 'MEMBER_CHECKED_IN',
          title: 'Member Check-in',
          message: `${memberName} has checked in to ${className}`,
          data: {
            member_name: memberName,
            class_name: className,
            check_in_time: checkInTime.toISOString(),
          },
          is_read: false,
        },
      });

      console.log(`📢 Check-in notification sent to trainer ${trainerId}`);
    } catch (error) {
      console.error('Error sending check-in notification:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
