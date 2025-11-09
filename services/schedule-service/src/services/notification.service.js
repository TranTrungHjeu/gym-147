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
        message: `${trainer.full_name} đã tải lên chứng chỉ mới: ${certificationData.certification_name}`,
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
          role: 'TRAINER', // Add role to identify notification source
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
        message: `Chứng chỉ của bạn đã được xác thực tự động bởi AI với độ tin cậy ${(
          scanResult.confidence * 100
        ).toFixed(1)}%`,
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
        message: `Chứng chỉ của ${trainer.full_name} đã được xác thực tự động bởi AI`,
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
    const { IDENTITY_SERVICE_URL } = require('../config/serviceUrls.js');
    const axios = require('axios');

    // Declare triedUrl outside try block so it's accessible in catch
    let triedUrl = '';

    try {
      // Detect if running in Docker
      const isDocker =
        process.env.DOCKER_ENV === 'true' ||
        require('fs').existsSync('/.dockerenv') ||
        process.env.NODE_ENV === 'production';

      // Try API Gateway URL first - prefer 8080 for Docker, 8081 for local dev (if API Gateway runs on 8081)
      let apiGatewayUrl = process.env.API_GATEWAY_URL || process.env.GATEWAY_URL;

      // If no explicit gateway URL, try to detect
      if (!apiGatewayUrl) {
        if (isDocker) {
          // If in Docker, API Gateway runs on port 8080 (mapped from container port 80)
          apiGatewayUrl = 'http://host.docker.internal:8080';
        } else {
          // If not in Docker, try 8080 first (API Gateway), then 8081 (if API Gateway runs there)
          // Note: 8081 might be Vite dev server, so prefer 8080
          apiGatewayUrl = 'http://localhost:8080';
        }
      }

      let identityUrl = IDENTITY_SERVICE_URL;

      // If in Docker and IDENTITY_SERVICE_URL is localhost, try Docker service name first
      if (isDocker && IDENTITY_SERVICE_URL.includes('localhost:3001')) {
        // In Docker, use service name for direct communication
        identityUrl = 'http://identity:3001';
        triedUrl = identityUrl;
        console.log(`🐳 Using Docker service name for identity service: ${identityUrl}`);
      } else if (!isDocker && IDENTITY_SERVICE_URL.includes('localhost:3001')) {
        // Local dev: try API Gateway first
        identityUrl = `${apiGatewayUrl.replace(/\/$/, '')}/identity`;
        triedUrl = identityUrl;
        console.log(`🌐 Using API Gateway URL for identity service: ${identityUrl}`);
      } else {
        triedUrl = identityUrl;
        console.log(`🔗 Using direct Identity Service URL: ${identityUrl}`);
      }

      // Get all admins and super admins (public endpoint, no auth required)
      const adminsResponse = await axios.get(`${identityUrl}/auth/users/admins`, {
        timeout: 10000,
      });

      const allAdmins = (adminsResponse.data?.data?.users || []).map(user => ({
        user_id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
      }));

      console.log(`📊 Admin API response:`, {
        totalCount: allAdmins.length,
        adminCount: allAdmins.filter(a => a.role === 'ADMIN').length,
        superAdminCount: allAdmins.filter(a => a.role === 'SUPER_ADMIN').length,
        responseStatus: adminsResponse.status,
      });

      console.log(
        `✅ Found ${allAdmins.length} admin/super-admin users:`,
        allAdmins.map(a => ({ user_id: a.user_id, email: a.email }))
      );
      return allAdmins;
    } catch (error) {
      console.error('❌ Error getting admins:', error.message);
      console.error('Error details:', {
        code: error.code,
        address: error.address,
        port: error.port,
        config: error.config?.url,
      });

      // Try fallback to API Gateway if direct connection failed
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        // Try both 8080 (Docker) and 8081 (local dev) if not already tried
        const gatewaysToTry = [];

        // Add explicit gateway URL if set
        const explicitGateway = process.env.API_GATEWAY_URL || process.env.GATEWAY_URL;
        if (explicitGateway) {
          gatewaysToTry.push(explicitGateway);
        }

        // Always try both ports (8080 for API Gateway, 8081 might be Vite dev server)
        // If in Docker, try host.docker.internal:8080 first (API Gateway in Docker)
        // Then try localhost:8080 (if API Gateway runs locally)
        if (isDocker) {
          gatewaysToTry.push('http://host.docker.internal:8080'); // API Gateway in Docker
          gatewaysToTry.push('http://host.docker.internal:8081'); // Fallback (might be Vite)
        }
        gatewaysToTry.push('http://localhost:8080'); // API Gateway (preferred)
        gatewaysToTry.push('http://localhost:8081'); // Fallback (might be Vite dev server)

        // Remove duplicates and already tried URLs
        const uniqueGateways = [...new Set(gatewaysToTry)].filter(url => {
          // Extract port from URL (8080 or 8081)
          const urlPort = url.match(/:(\d+)/)?.[1];
          // Check if this port was already tried
          return !triedUrl.includes(urlPort);
        });

        for (const gatewayUrl of uniqueGateways) {
          try {
            const fallbackUrl = `${gatewayUrl.replace(/\/$/, '')}/identity`;
            console.log(`🔄 Retrying with API Gateway URL: ${fallbackUrl}`);

            // Get all admins and super admins (public endpoint, no auth required)
            const adminsResponse = await axios.get(`${fallbackUrl}/auth/users/admins`, {
              timeout: 10000,
            });

            const allAdmins = (adminsResponse.data?.data?.users || []).map(user => ({
              user_id: user.id,
              email: user.email,
              role: user.role,
              first_name: user.first_name,
              last_name: user.last_name,
            }));

            console.log(
              `✅ Found ${allAdmins.length} admin/super-admin users via API Gateway: ${fallbackUrl}`
            );
            return allAdmins;
          } catch (fallbackError) {
            console.error(`❌ Fallback to ${gatewayUrl} failed:`, fallbackError.message);
            // Continue to next gateway
          }
        }

        console.error('❌ All gateway fallbacks failed');
      }

      // Return empty array on error to prevent blocking
      return [];
    }
  }

  /**
   * Send notification to admins when trainer uploads certification
   * Only sends notification if certification needs manual review (PENDING)
   * @param {Object} params - Certification upload parameters
   * @param {string} params.trainerId - Trainer ID
   * @param {string} params.trainerName - Trainer name
   * @param {string} params.certificationId - Certification ID
   * @param {string} params.category - Certification category
   * @param {string} params.certificationLevel - Certification level
   * @param {string} params.verificationStatus - Verification status (VERIFIED or PENDING)
   * @param {Object} params.aiScanResult - AI scan result (if available)
   */
  async sendCertificationUploadNotification({
    trainerId,
    trainerName,
    certificationId,
    category,
    certificationLevel,
    verificationStatus,
    aiScanResult,
  }) {
    try {
      console.log(
        `📢 Processing certification upload notification: ${certificationId}, status: ${verificationStatus}`
      );

      // Determine if AI scan was performed and auto-verified
      const aiScanPerformed = !!aiScanResult;
      const aiAutoVerified = verificationStatus === 'VERIFIED' && aiScanPerformed;

      // Send notification to admins in both cases:
      // 1. PENDING - needs manual review
      // 2. VERIFIED (AI auto-verified) - inform admins about successful auto-verification

      if (verificationStatus === 'VERIFIED' && !aiAutoVerified) {
        // Manual verification by admin - handled separately
        console.log(
          `ℹ️ Certification ${certificationId} was manually verified by admin - skipping upload notification`
        );
        return;
      }

      console.log(
        `📢 Certification ${certificationId} status: ${verificationStatus} - sending notification to admins`
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
        console.error('Trainer not found for certification upload notification');
        return;
      }

      // Get all admins and super-admins
      const admins = await this.getAdminsAndSuperAdmins();

      if (admins.length === 0) {
        console.warn('⚠️ No admin/super-admin users found - skipping notification');
        return;
      }

      // Create notification message based on verification status
      let title, message;
      if (verificationStatus === 'PENDING') {
        if (aiScanPerformed) {
          title = 'Chứng chỉ cần duyệt thủ công';
          message = `${trainerName} đã tải lên chứng chỉ ${category} cần duyệt thủ công (AI scan không đạt yêu cầu)`;
        } else {
          title = 'Chứng chỉ cần duyệt thủ công';
          message = `${trainerName} đã tải lên chứng chỉ ${category} cần duyệt thủ công (không có quét AI)`;
        }
      } else if (verificationStatus === 'VERIFIED' && aiAutoVerified) {
        // AI auto-verified - inform admins
        const confidence = aiScanResult?.confidence
          ? `${(aiScanResult.confidence * 100).toFixed(1)}%`
          : 'cao';
        title = 'Chứng chỉ đã được xác thực tự động';
        message = `${trainerName} đã tải lên chứng chỉ ${category} và đã được AI tự động xác thực (độ tin cậy: ${confidence})`;
      } else {
        // Should not reach here for upload notification
        return;
      }

      // Create notification for each admin
      const notificationType =
        verificationStatus === 'VERIFIED' ? 'CERTIFICATION_AUTO_VERIFIED' : 'CERTIFICATION_PENDING';

      const adminNotifications = admins.map(admin => ({
        user_id: admin.user_id,
        type: notificationType,
        title,
        message,
        data: {
          trainer_id: trainerId,
          trainer_name: trainerName,
          trainer_email: trainer.email,
          certification_id: certificationId,
          category,
          certification_level: certificationLevel,
          verification_status: verificationStatus,
          ai_scan_performed: aiScanPerformed,
          ai_auto_verified: aiAutoVerified,
          role: 'TRAINER', // Add role to identify notification source
        },
        is_read: false,
        created_at: new Date(),
      }));

      // Save notifications to database
      if (adminNotifications.length > 0) {
        console.log(`💾 Saving ${adminNotifications.length} notifications to database...`);
        await prisma.notification.createMany({
          data: adminNotifications,
        });
        console.log(`✅ Saved ${adminNotifications.length} notifications to database`);

        // Emit socket events to all admins
        if (global.io) {
          console.log(
            `📡 Starting to emit socket events to ${adminNotifications.length} admin(s)...`
          );
          adminNotifications.forEach(notification => {
            const roomName = `user:${notification.user_id}`;
            const socketData = {
              certification_id: certificationId,
              trainer_id: trainerId,
              trainer_name: trainerName,
              category,
              certification_level: certificationLevel,
              verification_status: verificationStatus,
              ai_scan_performed: aiScanPerformed,
              ai_auto_verified: aiAutoVerified,
            };

            // Check if room has any sockets
            const room = global.io.sockets.adapter.rooms.get(roomName);
            const socketCount = room ? room.size : 0;

            // Emit different event based on verification status
            const eventName =
              verificationStatus === 'VERIFIED'
                ? 'certification:verified'
                : 'certification:pending';

            console.log(
              `📡 Emitting ${eventName} to room ${roomName} (${socketCount} socket(s) connected)`,
              socketData
            );
            global.io.to(roomName).emit(eventName, socketData);
          });

          console.log(
            `✅ Sent ${adminNotifications.length} socket notifications to admins for certification ${certificationId}`
          );
        } else {
          console.warn('⚠️ global.io not available - skipping socket notification');
        }
      }
    } catch (error) {
      console.error('❌ Error sending certification upload notification:', error);
      // Don't throw - notification failure shouldn't break certification creation
    }
  }

  /**
   * Send notification to trainer about certification status
   * @param {Object} params - Certification status parameters
   */
  async sendCertificationStatusNotification({
    trainerId,
    trainerName,
    certificationId,
    category,
    verificationStatus,
    message,
  }) {
    try {
      // Get trainer info
      const trainer = await prisma.trainer.findUnique({
        where: { id: trainerId },
        select: {
          user_id: true,
        },
      });

      if (!trainer) {
        console.error('Trainer not found for certification status notification');
        return;
      }

      // Create notification for trainer
      const notification = await prisma.notification.create({
        data: {
          user_id: trainer.user_id,
          type: `CERTIFICATION_${verificationStatus}`,
          title:
            verificationStatus === 'VERIFIED'
              ? 'Chứng chỉ đã được xác thực'
              : 'Chứng chỉ đang chờ duyệt',
          message: message || 'Chứng chỉ của bạn đang được xem xét',
          data: {
            certification_id: certificationId,
            category,
            verification_status: verificationStatus,
            role: 'TRAINER',
          },
          is_read: false,
        },
      });

      // Emit socket event to trainer
      if (global.io) {
        const roomName = `user:${trainer.user_id}`;
        global.io.to(roomName).emit('certification:status', {
          certification_id: certificationId,
          category,
          verification_status: verificationStatus,
        });
      }

      console.log(`✅ Sent certification status notification to trainer ${trainerId}`);
    } catch (error) {
      console.error('Error sending certification status notification:', error);
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
          message: `Bạn đã được thêm vào danh sách chờ cho lớp ${
            data?.class_name || 'học'
          } ở vị trí ${data?.waitlist_position || 'N/A'}`,
        },
        WAITLIST_PROMOTED: {
          title: 'Được nâng cấp từ danh sách chờ',
          message: `Chúc mừng! Bạn đã được nâng cấp từ danh sách chờ cho lớp ${
            data?.class_name || 'học'
          }`,
        },
        SCHEDULE_CANCELLED: {
          title: 'Lịch học bị hủy',
          message: `Lớp ${data?.class_name || 'học'} với ${
            data?.trainer_name || ''
          } đã bị hủy. Lý do: ${data?.cancellation_reason || 'Không có lý do'}`,
        },
        ROOM_CHANGED: {
          title: 'Phòng học đã thay đổi',
          message: `Lớp ${data?.class_name || 'học'} đã được chuyển từ phòng ${
            data?.old_room || ''
          } sang phòng ${data?.new_room || ''}`,
        },
        ROOM_CHANGE_REJECTED: {
          title: 'Yêu cầu đổi phòng bị từ chối',
          message: `Yêu cầu đổi phòng cho lớp ${data?.class_name || 'học'} đã bị từ chối. Lý do: ${
            data?.rejection_reason || 'Không có lý do'
          }`,
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

      // Auto-detect role from data if not explicitly provided
      let notificationData = data || {};
      if (!notificationData.role) {
        // Infer role from notification type or data
        if (type.startsWith('CERTIFICATION_')) {
          notificationData.role = 'TRAINER';
        } else if (type === 'CLASS_BOOKING' || type.startsWith('MEMBERSHIP_')) {
          notificationData.role = 'MEMBER';
        } else if (notificationData.trainer_id || notificationData.trainer_name) {
          notificationData.role = 'TRAINER';
        } else if (notificationData.member_id || notificationData.member_name) {
          notificationData.role = 'MEMBER';
        } else if (type === 'SYSTEM_ANNOUNCEMENT') {
          notificationData.role = 'SYSTEM';
        }
      }

      // Create notification
      await prisma.notification.create({
        data: {
          user_id: targetUserId,
          type,
          title: finalTitle,
          message: finalMessage,
          data: notificationData,
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
