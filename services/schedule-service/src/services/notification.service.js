const { PrismaClient } = require('@prisma/client');
const { createClient } = require('redis');
const prisma = new PrismaClient();

/**
 * Notification Service for Certification Management
 * Handles notifications for admin/super-admin when trainers upload certifications
 *
 * NOTE: All notifications are now enqueued to Redis queue for processing by Identity Service worker
 * This service enqueues notifications to Redis instead of calling Identity Service API directly
 */

class NotificationService {
  constructor() {
    this.redisClient = null;
    this.isConnected = false;
    this.initializeRedis();
  }

  /**
   * Initialize Redis client for notification queue
   */
  async initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.redisClient = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Notification Service Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.redisClient.on('error', (err) => {
        console.error('❌ Notification Service Redis Error:', err);
        this.isConnected = false;
      });

      this.redisClient.on('ready', () => {
        console.log('✅ Notification Service Redis: Connected and ready');
        this.isConnected = true;
      });

      this.redisClient.on('end', () => {
        console.log('🔌 Notification Service Redis: Connection closed');
        this.isConnected = false;
      });

      await this.redisClient.connect();
    } catch (error) {
      console.error('❌ Failed to initialize Notification Service Redis:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Enqueue notification to Redis queue
   * @param {Object} notificationData - { user_id, type, title, message, data? }
   * @param {string} priority - 'high', 'normal', or 'low' (default: 'normal')
   * @returns {Promise<boolean>} True if enqueued successfully
   */
  async enqueueNotification(notificationData, priority = 'normal') {
    if (!this.isConnected || !this.redisClient) {
      console.warn('⚠️ Redis not connected, notification will not be queued');
      return false;
    }

    try {
      const { user_id, type, title, message, data } = notificationData;

      if (!user_id || !type || !title || !message) {
        const missing = [];
        if (!user_id) missing.push('user_id');
        if (!type) missing.push('type');
        if (!title) missing.push('title');
        if (!message) missing.push('message');
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
      }

      const queueKey = `notifications:queue:identity:${priority}`;
      const notificationPayload = {
        user_id,
        type,
        title,
        message,
        data: data || {},
        channels: data?.channels || ['IN_APP', 'PUSH'],
        source: 'schedule-service',
        timestamp: new Date().toISOString(),
      };

      await this.redisClient.rPush(queueKey, JSON.stringify(notificationPayload));
      console.log(`✅ [NOTIFICATION] Enqueued notification to Redis: ${type} for user ${user_id} (priority: ${priority})`);
      return true;
    } catch (error) {
      console.error('❌ [NOTIFICATION] Error enqueueing notification:', error);
      return false;
    }
  }

  /**
   * Helper function to create notification in Identity Service (now enqueues to Redis)
   * @param {Object} notificationData - { user_id, type, title, message, data? }
   * @param {string} priority - 'high', 'normal', or 'low' (default: 'normal')
   * @returns {Promise<Object>} Mock notification object (for backward compatibility)
   */
  async createNotificationInIdentityService(notificationData, priority = 'normal') {
    try {
      const { user_id, type, title, message, data } = notificationData;

      console.log(`📤 [NOTIFICATION] Enqueueing notification to Redis:`, {
        user_id,
        type,
        title,
        message: message?.substring(0, 50) + '...',
        hasData: !!data,
        priority,
      });

      const enqueued = await this.enqueueNotification(notificationData, priority);

      if (!enqueued) {
        // Fallback: return a mock notification object for backward compatibility
        console.warn('⚠️ [NOTIFICATION] Failed to enqueue, returning mock notification');
        return {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id,
          type,
          title,
          message,
          data: data || {},
          created_at: new Date(),
          is_read: false,
        };
      }

      // Return a mock notification object for backward compatibility
      // The actual notification will be created by the worker
      return {
        id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id,
        type,
        title,
        message,
        data: data || {},
        created_at: new Date(),
        is_read: false,
      };
    } catch (error) {
      console.error('❌ [NOTIFICATION] Error enqueueing notification:', {
        message: error.message,
        user_id: notificationData?.user_id,
        type: notificationData?.type,
      });
      // Return mock notification for backward compatibility
      return {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: notificationData?.user_id,
        type: notificationData?.type,
        title: notificationData?.title,
        message: notificationData?.message,
        data: notificationData?.data || {},
        created_at: new Date(),
        is_read: false,
      };
    }
  }
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

      // Create notifications in identity service
      const createdNotifications = [];
      for (const notificationData of notifications) {
        try {
          const created = await this.createNotificationInIdentityService(notificationData);
          createdNotifications.push(created);
        } catch (error) {
          console.error(
            `❌ Failed to create notification for user ${notificationData.user_id}:`,
            error.message
          );
        }
      }

      console.log(`✅ Created ${createdNotifications.length} notifications in identity service`);

      // Emit socket events for real-time notifications
      if (global.io && createdNotifications.length > 0) {
        for (const notification of createdNotifications) {
          const roomName = `user:${notification.user_id}`;
          const socketPayload = {
            notification_id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            created_at: notification.created_at,
            is_read: notification.is_read,
          };
          global.io.to(roomName).emit('notification:new', socketPayload);
        }
        console.log(`📡 Emitted socket events for ${createdNotifications.length} notifications`);
      }
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
        title: 'AI duyệt',
        message: `đã duyệt chứng chỉ của bạn`,
        data: {
          certification_id: certificationId,
          scan_result: scanResult,
          auto_verified: true,
          role: 'AI', // Role is AI to indicate AI auto-verification
          verified_by: 'AI_SYSTEM',
        },
        is_read: false,
        created_at: new Date(),
      };

      const notification = await this.createNotificationInIdentityService({
        user_id: trainer.user_id,
        type: 'CERTIFICATION_AUTO_VERIFIED',
        title: 'AI duyệt',
        message: `đã duyệt chứng chỉ của bạn`,
        data: {
          certification_id: certificationId,
          scan_result: scanResult,
          auto_verified: true,
          role: 'AI',
          verified_by: 'AI_SYSTEM',
        },
      });

      // Emit socket event to trainer for real-time notification
      if (global.io) {
        const roomName = `user:${trainer.user_id}`;
        const socketData = {
          notification_id: notification.id,
          certification_id: certificationId,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          created_at: notification.created_at,
          is_read: false,
        };

        global.io.to(roomName).emit('certification:verified', socketData);
        global.io.to(roomName).emit('notification:new', {
          notification_id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: socketData,
          created_at: notification.created_at,
          is_read: false,
        });
        console.log(`📡 Emitted socket events to trainer room: ${roomName}`);
      }

      // Note: Admin notifications are handled by sendCertificationUploadNotification
      // when certification is created with VERIFIED status
      // This function only sends notification to trainer about AI auto-verification

      console.log(`✅ Sent auto-verification notification to trainer`);
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

      // Get certification details for socket event
      const certification = await prisma.trainerCertification.findUnique({
        where: { id: certificationId },
        select: {
          category: true,
          certification_level: true,
          certification_name: true,
          certification_issuer: true,
          verification_status: true,
          issued_date: true,
          expiration_date: true,
        },
      });

      // Get admin info from Identity Service
      // Use getAdminsAndSuperAdmins to get list, then find the admin by ID
      let adminName = 'Admin';
      let adminEmail = null;
      try {
        // Get all admins and find the one matching adminId
        const allAdmins = await this.getAdminsAndSuperAdmins();
        const admin = allAdmins.find(a => a.user_id === adminId);

        if (admin) {
          // Try to get full name from first_name and last_name
          // Format: LastName FirstName (Vietnamese format: Họ Tên đệm Tên)
          const firstName = admin.first_name || '';
          const lastName = admin.last_name || '';

          // Debug: Log raw values to check encoding
          console.log(`🔍 [ADMIN_NAME] Raw values:`, {
            first_name: firstName,
            first_name_bytes: Buffer.from(firstName, 'utf8').toString('hex'),
            last_name: lastName,
            last_name_bytes: Buffer.from(lastName, 'utf8').toString('hex'),
          });

          const fullName = `${lastName} ${firstName}`.trim();

          // Debug: Log final name
          console.log(`🔍 [ADMIN_NAME] Final fullName:`, {
            fullName,
            fullName_bytes: Buffer.from(fullName, 'utf8').toString('hex'),
            length: fullName.length,
          });

          // Use full name if available, otherwise use email (without @domain), otherwise use 'Admin'
          if (fullName) {
            adminName = fullName;
          } else if (admin.email) {
            // Extract name from email (e.g., "admin@example.com" -> "admin")
            const emailName = admin.email.split('@')[0];
            adminName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
          } else {
            adminName = 'Admin';
          }

          adminEmail = admin.email;
          console.log(
            `✅ Found admin user: ${adminName} (${adminEmail}), first_name: ${firstName}, last_name: ${lastName}`
          );
        } else {
          console.warn(
            `⚠️ Admin with ID ${adminId} not found in admin list, using default name 'Admin'`
          );
          console.warn(`⚠️ Available admin IDs: ${allAdmins.map(a => a.user_id).join(', ')}`);
        }
      } catch (adminError) {
        console.error('❌ Error fetching admin info:', adminError.message);
        // Fallback: use 'Admin' as default name
        adminName = 'Admin';
      }

      let title, message;
      if (action === 'VERIFIED') {
        title = 'Admin duyệt';
        // Always include admin name in message (even if it's "Admin" as fallback)
        // The frontend will display it with a badge if role is ADMIN
        message = `${adminName} đã duyệt chứng chỉ ${certification?.category || ''} (${
          certification?.certification_level || ''
        }) của bạn`;
      } else {
        title = 'Admin từ chối';
        // Always include admin name in message (even if it's "Admin" as fallback)
        // The frontend will display it with a badge if role is ADMIN
        message = `${adminName} đã từ chối chứng chỉ ${certification?.category || ''} (${
          certification?.certification_level || ''
        }) của bạn${reason ? `: ${reason}` : ''}`;
      }

      // Create notification for trainer
      const notificationData = {
        user_id: trainer.user_id,
        type: `CERTIFICATION_${action}`,
        title,
        message,
        data: {
          certification_id: certificationId,
          action,
          admin_id: adminId,
          admin_name: adminName,
          admin_email: adminEmail,
          role: 'ADMIN', // Role is ADMIN to indicate admin verified/rejected
          reason,
          category: certification?.category,
          certification_level: certification?.certification_level,
        },
        is_read: false,
        created_at: new Date(),
      };

      const notification = await this.createNotificationInIdentityService({
        user_id: trainer.user_id,
        type: `CERTIFICATION_${action}`,
        title,
        message,
        data: {
          certification_id: certificationId,
          action,
          admin_id: adminId,
          admin_name: adminName,
          admin_email: adminEmail,
          role: 'ADMIN',
          reason,
          category: certification?.category,
          certification_level: certification?.certification_level,
        },
      });

      // Emit socket event to trainer
      if (global.io) {
        try {
          const roomName = `user:${trainer.user_id}`;
          const eventName =
            action === 'VERIFIED' ? 'certification:verified' : 'certification:rejected';

          const socketData = {
            notification_id: notification.id,
            certification_id: certificationId,
            action,
            admin_id: adminId,
            admin_name: adminName,
            admin_email: adminEmail,
            role: 'ADMIN', // Role is ADMIN to indicate admin verified/rejected
            reason,
            title,
            message,
            created_at: notification.created_at,
            // Include full certification details for UI update
            certification: certification
              ? {
                  id: certificationId,
                  category: certification.category,
                  certification_level: certification.certification_level,
                  certification_name: certification.certification_name,
                  certification_issuer: certification.certification_issuer,
                  verification_status: certification.verification_status,
                  issued_date: certification.issued_date,
                  expiration_date: certification.expiration_date,
                }
              : null,
          };

          // Check if room has any sockets
          const room = global.io.sockets.adapter.rooms.get(roomName);
          const socketCount = room ? room.size : 0;

          if (socketCount > 0) {
            console.log(
              `📡 Emitting ${eventName} to room ${roomName} (${socketCount} socket(s) connected)`,
              socketData
            );
            // Emit certification:verified or certification:rejected event
            global.io.to(roomName).emit(eventName, socketData);

            // Also emit notification:new event for real-time notification display
            global.io.to(roomName).emit('notification:new', {
              notification_id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              data: socketData,
              created_at: notification.created_at,
              is_read: false,
            });
            console.log(`✅ Emitted ${eventName} and notification:new to room ${roomName}`);
          } else {
            console.log(
              `⚠️ No sockets connected to room ${roomName} - notification saved to database only`
            );
          }
        } catch (socketError) {
          console.error(
            '❌ Error emitting socket event for certification status change:',
            socketError
          );
        }
      } else {
        console.warn('⚠️ global.io not available - skipping socket notification');
      }

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

    try {
      console.log(`\n🔍 [GET_ADMINS] ========== STARTING ADMIN FETCH ==========`);

      // Use IDENTITY_SERVICE_URL directly (no need for API_GATEWAY_URL or GATEWAY_URL)
      const identityUrl = IDENTITY_SERVICE_URL;
      console.log(`🔗 [GET_ADMINS] Using Identity Service URL: ${identityUrl}`);

      if (!identityUrl) {
        console.error(`❌ [GET_ADMINS] IDENTITY_SERVICE_URL is not set`);
        throw new Error(
          'IDENTITY_SERVICE_URL environment variable is required. Please set it in your .env file.'
        );
      }

      const adminEndpoint = `${identityUrl}/auth/users/admins`;
      console.log(`🔗 [GET_ADMINS] Calling endpoint: ${adminEndpoint}`);

      // Get all admins and super admins (public endpoint, no auth required)
      const adminsResponse = await axios.get(adminEndpoint, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Accept: 'application/json; charset=utf-8',
        },
        responseType: 'json',
        responseEncoding: 'utf8',
      });

      console.log(`📊 [GET_ADMINS] Response status: ${adminsResponse.status}`);
      console.log(`📊 [GET_ADMINS] Response data structure:`, {
        hasData: !!adminsResponse.data,
        hasDataData: !!adminsResponse.data?.data,
        hasUsers: !!adminsResponse.data?.data?.users,
        usersType: Array.isArray(adminsResponse.data?.data?.users)
          ? 'array'
          : typeof adminsResponse.data?.data?.users,
        usersLength: Array.isArray(adminsResponse.data?.data?.users)
          ? adminsResponse.data?.data?.users.length
          : 'N/A',
        fullResponse: JSON.stringify(adminsResponse.data, null, 2).substring(0, 500), // First 500 chars
      });

      const rawUsers = adminsResponse.data?.data?.users || [];
      console.log(`📊 [GET_ADMINS] Raw users from API:`, rawUsers.length);
      if (rawUsers.length > 0) {
        console.log(`📋 [GET_ADMINS] Sample user:`, rawUsers[0]);
      }

      const allAdmins = rawUsers.map(user => ({
        user_id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
      }));

      console.log(`📊 [GET_ADMINS] Admin API response:`, {
        totalCount: allAdmins.length,
        adminCount: allAdmins.filter(a => a.role === 'ADMIN').length,
        superAdminCount: allAdmins.filter(a => a.role === 'SUPER_ADMIN').length,
        responseStatus: adminsResponse.status,
      });

      if (allAdmins.length > 0) {
        console.log(
          `✅ [GET_ADMINS] Found ${allAdmins.length} admin/super-admin users:`,
          allAdmins.map(a => ({ user_id: a.user_id, email: a.email, role: a.role }))
        );
      } else {
        console.warn(`⚠️ [GET_ADMINS] WARNING: No admins found in response!`);
        console.warn(
          `⚠️ [GET_ADMINS] Response data:`,
          JSON.stringify(adminsResponse.data, null, 2).substring(0, 1000)
        );
      }

      console.log(`🔍 [GET_ADMINS] ========== END ADMIN FETCH ==========\n`);
      return allAdmins;
    } catch (error) {
      console.error('\n❌ [GET_ADMINS] ========== ERROR GETTING ADMINS ==========');
      console.error('❌ [GET_ADMINS] Error message:', error.message);
      console.error('❌ [GET_ADMINS] Error code:', error.code);
      console.error('❌ [GET_ADMINS] Error name:', error.name);
      console.error('❌ [GET_ADMINS] Error stack:', error.stack);
      console.error('❌ [GET_ADMINS] Error details:', {
        code: error.code,
        address: error.address,
        port: error.port,
        config: error.config?.url,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers,
      });

      // Retry with API Gateway if direct connection failed (optional fallback)
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.log(`🔄 [GET_ADMINS] Connection failed, checking for API Gateway fallback...`);
        const apiGatewayUrl = process.env.API_GATEWAY_URL || process.env.GATEWAY_URL;

        if (apiGatewayUrl) {
          try {
            const gatewayUrl = `${apiGatewayUrl.replace(/\/$/, '')}/identity`;
            console.log(`🔄 [GET_ADMINS] Retrying with API Gateway URL: ${gatewayUrl}`);

            // Get all admins and super admins (public endpoint, no auth required)
            const adminsResponse = await axios.get(`${gatewayUrl}/auth/users/admins`, {
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
              `✅ [GET_ADMINS] Found ${allAdmins.length} admin/super-admin users via API Gateway: ${gatewayUrl}`
            );
            console.error('❌ [GET_ADMINS] ========== END ERROR (RETRY SUCCESS) ==========\n');
            return allAdmins;
          } catch (gatewayError) {
            console.error(`❌ [GET_ADMINS] API Gateway retry failed:`, gatewayError.message);
            console.error(`❌ [GET_ADMINS] Gateway error details:`, {
              code: gatewayError.code,
              response: gatewayError.response?.data,
              status: gatewayError.response?.status,
            });
            console.error('❌ [GET_ADMINS] ========== END ERROR (RETRY FAILED) ==========\n');
            throw gatewayError;
          }
        } else {
          console.log(`⚠️ [GET_ADMINS] No API Gateway URL configured for retry`);
        }
      }

      // Return empty array on error to prevent blocking
      console.error('⚠️ [GET_ADMINS] Returning empty array due to error (non-connection error)');
      console.error('❌ [GET_ADMINS] ========== END ERROR (RETURNING EMPTY) ==========\n');
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
    isManualEntry = false, // Flag to indicate if this is a manual entry (no file upload)
  }) {
    try {
      console.log(
        `\n📢 [NOTIFICATION] ========== STARTING CERTIFICATION UPLOAD NOTIFICATION ==========`
      );
      console.log(
        `📢 [NOTIFICATION] Processing certification upload notification: ${certificationId}, status: ${verificationStatus}, isManualEntry: ${isManualEntry}`
      );
      console.log(
        `📢 [NOTIFICATION] Parameters: trainerId=${trainerId}, trainerName=${trainerName}, category=${category}, level=${certificationLevel}`
      );

      // Determine if AI scan was performed and auto-verified
      const aiScanPerformed = !!aiScanResult;
      const aiAutoVerified = verificationStatus === 'VERIFIED' && aiScanPerformed;

      console.log(
        `📢 [NOTIFICATION] AI scan performed: ${aiScanPerformed}, AI auto-verified: ${aiAutoVerified}`
      );

      // Send notification to admins in these cases:
      // 1. PENDING - needs manual review (manual entry, AI scan failed, or no file)
      // 2. VERIFIED (AI auto-verified) - inform admins about successful auto-verification (role: TRAINER)
      // DO NOT send notification for: VERIFIED (manually verified by admin) - handled separately

      console.log(
        `🔍 [NOTIFICATION] Checking notification conditions: verificationStatus=${verificationStatus}, aiAutoVerified=${aiAutoVerified}, isManualEntry=${isManualEntry}`
      );

      if (verificationStatus === 'VERIFIED' && !aiAutoVerified) {
        // Manual verification by admin - handled separately (not an upload notification)
        console.log(
          `ℹ️ [NOTIFICATION] Certification ${certificationId} was manually verified by admin - skipping upload notification`
        );
        return;
      }

      // For PENDING status, ALWAYS send notification to admins (manual entry, AI scan failed, or no file)
      // For VERIFIED status with AI auto-verification, send notification to inform admins
      if (verificationStatus !== 'PENDING' && verificationStatus !== 'VERIFIED') {
        console.warn(
          `⚠️ [NOTIFICATION] Unexpected verification status ${verificationStatus} for certification ${certificationId} - skipping notification`
        );
        return;
      }

      console.log(
        `✅ [NOTIFICATION] Certification ${certificationId} status: ${verificationStatus} - sending notification to admins (isManualEntry: ${isManualEntry})`
      );
      console.log(
        `📋 [NOTIFICATION] Will proceed to fetch trainer info and admin list, then create notifications`
      );

      // Get trainer info
      console.log(`🔍 [NOTIFICATION] Fetching trainer info for trainerId: ${trainerId}`);
      const trainer = await prisma.trainer.findUnique({
        where: { id: trainerId },
        select: {
          full_name: true,
          email: true,
          user_id: true,
        },
      });

      if (!trainer) {
        console.error(`❌ [NOTIFICATION] Trainer not found for trainerId: ${trainerId}`);
        console.error(`❌ [NOTIFICATION] Cannot send notification to admins without trainer info`);
        throw new Error(`Trainer not found for trainerId: ${trainerId}`);
      }

      console.log(
        `✅ [NOTIFICATION] Trainer found: ${trainer.full_name} (user_id: ${trainer.user_id})`
      );

      // Get all admins and super-admins
      console.log(`🔍 [NOTIFICATION] ========== FETCHING ADMIN LIST ==========`);
      console.log(
        `🔍 [NOTIFICATION] Fetching all admins and super-admins from Identity Service...`
      );
      let admins = [];
      try {
        admins = await this.getAdminsAndSuperAdmins();
        console.log(
          `✅ [NOTIFICATION] Successfully fetched ${admins.length} admin(s)/super-admin(s) from Identity Service`
        );
        if (admins.length > 0) {
          console.log(
            `📋 [NOTIFICATION] Admin list:`,
            admins.map(a => ({ user_id: a.user_id, email: a.email, role: a.role }))
          );
        } else {
          console.warn(`⚠️ [NOTIFICATION] WARNING: No admins found in Identity Service!`);
        }
        console.log(`🔍 [NOTIFICATION] ========== END FETCHING ADMIN LIST ==========`);
      } catch (adminFetchError) {
        console.error('❌ [NOTIFICATION] ========== CRITICAL ERROR FETCHING ADMINS ==========');
        console.error('❌ [NOTIFICATION] Error fetching admins:', adminFetchError);
        console.error('❌ [NOTIFICATION] Admin fetch error details:', {
          message: adminFetchError.message,
          stack: adminFetchError.stack,
          code: adminFetchError.code,
          response: adminFetchError.response?.data,
          status: adminFetchError.response?.status,
        });
        console.error('❌ [NOTIFICATION] ========== END CRITICAL ERROR ==========');
        // Throw error so it's caught and logged in createCertification
        throw new Error(`Failed to fetch admin list: ${adminFetchError.message}`);
      }

      if (admins.length === 0) {
        console.error(
          '❌ [NOTIFICATION] ========== CRITICAL: No admin/super-admin users found =========='
        );
        console.error(
          '❌ [NOTIFICATION] This means NO admin will receive notification about this certification upload'
        );
        console.error('❌ [NOTIFICATION] Certification ID:', certificationId);
        console.error('❌ [NOTIFICATION] Trainer ID:', trainerId);
        console.error(
          '❌ [NOTIFICATION] This is a critical issue - notifications will not be sent to admins'
        );
        console.error('❌ [NOTIFICATION] ========== END CRITICAL ERROR ==========');
        // Don't return - throw error so it's logged in createCertification
        throw new Error(
          'No admin/super-admin users found in system. Cannot send certification upload notification.'
        );
      }

      console.log(
        `✅ [NOTIFICATION] Found ${admins.length} admin(s)/super-admin(s) - will create notifications for all of them`
      );
      console.log(
        `📋 [NOTIFICATION] Admin list:`,
        admins.map(a => ({ user_id: a.user_id, email: a.email, role: a.role }))
      );

      // Create notification message based on verification status and entry type
      let title, message;
      if (verificationStatus === 'PENDING') {
        if (isManualEntry) {
          // Manual entry (trainer entered certification manually without file upload)
          title = 'Chứng chỉ nhập tay cần duyệt';
          message = `${trainerName} đã nhập tay chứng chỉ ${category} (${certificationLevel}) cần duyệt thủ công`;
        } else if (aiScanPerformed) {
          // File uploaded but AI scan failed or low confidence
          title = 'Chứng chỉ quét AI cần duyệt thủ công';
          message = `${trainerName} đã quét và tải lên chứng chỉ ${category} (${certificationLevel}) bằng AI nhưng cần duyệt thủ công (AI scan không đạt yêu cầu)`;
        } else {
          // File uploaded but no AI scan performed (should not happen, but handle it)
          title = 'Chứng chỉ cần duyệt thủ công';
          message = `${trainerName} đã tải lên chứng chỉ ${category} cần duyệt thủ công (không có quét AI)`;
        }
      } else if (verificationStatus === 'VERIFIED' && aiAutoVerified) {
        // AI auto-verified - inform admins
        const confidence = aiScanResult?.confidence
          ? `${(aiScanResult.confidence * 100).toFixed(1)}%`
          : 'cao';
        title = 'Chứng chỉ đã được xác thực tự động bởi AI';
        message = `${trainerName} đã quét và tải lên chứng chỉ ${category} (${certificationLevel}) bằng AI. Chứng chỉ đã được AI tự động xác thực với độ tin cậy ${confidence}`;
      } else {
        // Should not reach here for upload notification
        console.warn(
          `⚠️ Unexpected verification status ${verificationStatus} for certification ${certificationId} - skipping notification`
        );
        return;
      }

      // Create notification for each admin
      // Use CERTIFICATION_UPLOAD for PENDING status (manual entry or AI scan failed)
      // Use CERTIFICATION_AUTO_VERIFIED for VERIFIED status (AI auto-verified)
      const notificationType =
        verificationStatus === 'VERIFIED' ? 'CERTIFICATION_AUTO_VERIFIED' : 'CERTIFICATION_UPLOAD';

      console.log(`📝 [NOTIFICATION] Creating notification data for ${admins.length} admin(s)...`);
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
          is_manual_entry: isManualEntry, // Flag to indicate manual entry (no file upload)
          role: 'TRAINER', // Role is always TRAINER for admin notifications (trainer uploaded the certification)
          // Add route information for navigation to certification review page
          route: '/management/trainers',
          action_route: `/management/trainers?certification_id=${certificationId}&trainer_id=${trainerId}`,
        },
        is_read: false,
        created_at: new Date(),
      }));

      console.log(
        `✅ [NOTIFICATION] Created ${adminNotifications.length} notification data object(s) for ${admins.length} admin(s)`
      );
      console.log(
        `📋 [NOTIFICATION] Notification details:`,
        adminNotifications.map(n => ({
          user_id: n.user_id,
          type: n.type,
          title: n.title,
          message: n.message.substring(0, 50) + '...',
        }))
      );

      // Save notifications to Identity Service and get IDs
      // IMPORTANT: Notifications are saved to Identity Service for ALL admins (online and offline)
      // Online admins will receive real-time WebSocket notifications
      // Offline admins will see notifications when they log in and open notification dropdown
      console.log(
        `💾 [NOTIFICATION] Preparing to create ${adminNotifications.length} notification(s) in Identity Service for ${admins.length} admin(s)`
      );

      if (adminNotifications.length === 0) {
        console.error(
          '❌ [NOTIFICATION] ========== CRITICAL: adminNotifications array is empty =========='
        );
        console.error(
          '❌ [NOTIFICATION] This should not happen - admins were found but notification array is empty'
        );
        console.error('❌ [NOTIFICATION] Certification ID:', certificationId);
        console.error('❌ [NOTIFICATION] Trainer ID:', trainerId);
        console.error('❌ [NOTIFICATION] Admins found:', admins.length);
        throw new Error('adminNotifications array is empty - cannot create notifications');
      }

      if (adminNotifications.length > 0) {
        console.log(
          `💾 [NOTIFICATION] Saving ${adminNotifications.length} notifications to Identity Service for ALL admins (online and offline)...`
        );

        // Create notifications individually in Identity Service to get their IDs
        let createdNotifications = [];
        let failedNotifications = [];
        try {
          // Use Promise.allSettled to continue even if some notifications fail
          const results = await Promise.allSettled(
            adminNotifications.map(async notifData => {
              try {
                console.log(
                  `📤 [NOTIFICATION] Creating notification for admin ${notifData.user_id} (${
                    admins.find(a => a.user_id === notifData.user_id)?.email || 'unknown'
                  })...`
                );
                const created = await this.createNotificationInIdentityService({
                  user_id: notifData.user_id,
                  type: notifData.type,
                  title: notifData.title,
                  message: notifData.message,
                  data: notifData.data,
                });
                console.log(
                  `✅ [NOTIFICATION] Successfully created notification ${created.id} for admin ${notifData.user_id}`
                );
                return created;
              } catch (error) {
                console.error(
                  `❌ [NOTIFICATION] Failed to create notification for admin ${notifData.user_id}:`,
                  error.message
                );
                failedNotifications.push({
                  user_id: notifData.user_id,
                  error: error.message,
                });
                throw error;
              }
            })
          );

          // Separate successful and failed notifications
          results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              createdNotifications.push(result.value);
            } else {
              failedNotifications.push({
                user_id: adminNotifications[index].user_id,
                error: result.reason?.message || 'Unknown error',
              });
            }
          });

          console.log(
            `✅ [NOTIFICATION] Successfully saved ${createdNotifications.length}/${adminNotifications.length} notifications to Identity Service`
          );

          if (failedNotifications.length > 0) {
            console.warn(
              `⚠️ [NOTIFICATION] Failed to create ${failedNotifications.length} notification(s):`,
              failedNotifications
            );
          }

          console.log(
            `📊 [NOTIFICATION] Notification saved for ${createdNotifications.length} admin(s) - online admins will receive real-time, offline admins will see when they log in`
          );

          // Log notification IDs for debugging
          if (createdNotifications.length > 0) {
            console.log(
              `📋 [NOTIFICATION] Created notification IDs:`,
              createdNotifications.map(n => n.id)
            );
          }
        } catch (dbError) {
          console.error(
            '❌ [NOTIFICATION] Error saving notifications to Identity Service:',
            dbError
          );
          console.error('❌ [NOTIFICATION] Error details:', {
            message: dbError.message,
            name: dbError.name,
            code: dbError.code,
            stack: dbError.stack,
            failedCount: failedNotifications.length,
            failedNotifications: failedNotifications,
          });

          // If all notifications failed, throw error
          if (createdNotifications.length === 0 && adminNotifications.length > 0) {
            console.error(
              '❌ [NOTIFICATION] ALL notifications failed to create! This is a critical error.'
            );
            throw new Error(
              `Failed to create any notifications for ${adminNotifications.length} admin(s). First error: ${dbError.message}`
            );
          }

          // If some succeeded, log warning but don't throw (partial success)
          if (createdNotifications.length > 0) {
            console.warn(
              `⚠️ [NOTIFICATION] Partial success: ${createdNotifications.length}/${adminNotifications.length} notifications created`
            );
          }
        }

        // Small delay to ensure database transaction is committed before emitting socket event
        await new Promise(resolve => setTimeout(resolve, 100));

        // Emit socket events to online admins only
        if (global.io) {
          let onlineAdminsCount = 0;
          let offlineAdminsCount = 0;

          console.log(
            `📡 [NOTIFICATION] Starting to emit socket events to online admins (${createdNotifications.length} notification(s) created)...`
          );

          if (createdNotifications.length === 0) {
            console.warn(
              `⚠️ [NOTIFICATION] No notifications were created - cannot emit socket events. This may indicate an issue with notification creation.`
            );
          }

          createdNotifications.forEach(createdNotification => {
            const roomName = `user:${createdNotification.user_id}`;

            const socketData = {
              notification_id: createdNotification.id,
              certification_id: certificationId,
              trainer_id: trainerId,
              trainer_name: trainerName,
              trainer_email: trainer.email,
              category,
              certification_level: certificationLevel,
              verification_status: verificationStatus,
              ai_scan_performed: aiScanPerformed,
              ai_auto_verified: aiAutoVerified,
              is_manual_entry: isManualEntry,
              title: createdNotification.title,
              message: createdNotification.message,
              created_at: createdNotification.created_at,
              // Add route information for navigation to certification review page
              route: '/management/trainers',
              action_route: `/management/trainers?certification_id=${certificationId}&trainer_id=${trainerId}`,
            };

            // Check if room has any sockets (admin is online)
            const room = global.io.sockets.adapter.rooms.get(roomName);
            const socketCount = room ? room.size : 0;

            if (socketCount > 0) {
              // Admin is online - send real-time notification
              onlineAdminsCount++;

              // Emit different events based on verification status
              if (verificationStatus === 'VERIFIED') {
                // AI auto-verified: emit certification:verified
                console.log(
                  `📡 [ONLINE] Emitting certification:verified to room ${roomName} (${socketCount} socket(s) connected)`
                );
                global.io.to(roomName).emit('certification:verified', socketData);
              } else {
                // PENDING: emit both events for compatibility with frontend
                console.log(
                  `📡 [ONLINE] Emitting certification:upload and certification:pending to room ${roomName} (${socketCount} socket(s) connected)`
                );
                // Emit certification:upload (new event name)
                global.io.to(roomName).emit('certification:upload', socketData);
                // Also emit certification:pending (for backward compatibility with frontend)
                global.io.to(roomName).emit('certification:pending', socketData);
              }

              // Also emit a general notification event for real-time notification display
              global.io.to(roomName).emit('notification:new', {
                notification_id: createdNotification.id,
                type: createdNotification.type,
                title: createdNotification.title,
                message: createdNotification.message,
                data: {
                  ...socketData,
                  ...createdNotification.data, // Include all notification data (trainer_id, trainer_name, etc.)
                },
                created_at: createdNotification.created_at,
                is_read: false,
              });

              console.log(`✅ [ONLINE] Emitted events and notification:new to ${roomName}`);
            } else {
              // Admin is offline - notification saved to database, will see when they log in
              offlineAdminsCount++;
              console.log(
                `📋 [OFFLINE] Admin ${createdNotification.user_id} is offline - notification saved to database, will see when they log in`
              );
            }
          });

          console.log(
            `✅ [NOTIFICATION] Notification summary: ${onlineAdminsCount} online admin(s) received real-time notification, ${offlineAdminsCount} offline admin(s) will see notification when they log in`
          );
        } else {
          console.warn(
            '⚠️ [NOTIFICATION] global.io not available - all notifications saved to Identity Service only (admins will see when they log in)'
          );
        }
      } else {
        console.error(
          '❌ [NOTIFICATION] ========== CRITICAL: No notifications were created =========='
        );
        console.error('❌ [NOTIFICATION] This should not happen - adminNotifications.length was 0');
        console.error('❌ [NOTIFICATION] Certification ID:', certificationId);
        console.error('❌ [NOTIFICATION] Trainer ID:', trainerId);
        console.error('❌ [NOTIFICATION] ========== END CRITICAL ERROR ==========');
      }

      console.log(
        `\n✅ [NOTIFICATION] ========== CERTIFICATION UPLOAD NOTIFICATION COMPLETED ==========`
      );
      console.log(
        `✅ [NOTIFICATION] Summary: Created ${createdNotifications.length} notification(s) for ${admins.length} admin(s)`
      );
      console.log(
        `✅ [NOTIFICATION] Certification ID: ${certificationId}, Trainer: ${trainerName}`
      );
      console.log(`✅ [NOTIFICATION] ========== END NOTIFICATION PROCESS ==========\n`);
    } catch (error) {
      console.error(
        '❌ [NOTIFICATION] ========== CRITICAL ERROR SENDING CERTIFICATION UPLOAD NOTIFICATION =========='
      );
      console.error('❌ [NOTIFICATION] Error:', error);
      console.error('❌ [NOTIFICATION] Error stack:', error.stack);
      console.error('❌ [NOTIFICATION] Error details:', {
        message: error.message,
        name: error.name,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        certificationId,
        trainerId,
        verificationStatus,
        isManualEntry,
        aiScanPerformed: !!aiScanResult,
      });
      console.error('❌ [NOTIFICATION] ========== END CRITICAL ERROR ==========');
      // Don't throw - notification failure shouldn't break certification creation
      // But log it clearly so we know there's an issue
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
    certificationLevel,
    verificationStatus,
    message,
    isManualEntry = false,
  }) {
    try {
      console.log(
        `\n📢 [TRAINER_NOTIF] ========== SENDING CERTIFICATION STATUS NOTIFICATION TO TRAINER ==========`
      );
      console.log(`📢 [TRAINER_NOTIF] Parameters:`, {
        trainerId,
        trainerName,
        certificationId,
        category,
        certificationLevel,
        verificationStatus,
        isManualEntry,
        messageLength: message?.length || 0,
      });

      // Get trainer info
      console.log(`🔍 [TRAINER_NOTIF] Fetching trainer info for trainerId: ${trainerId}`);
      const trainer = await prisma.trainer.findUnique({
        where: { id: trainerId },
        select: {
          user_id: true,
          full_name: true,
          email: true,
        },
      });

      if (!trainer) {
        console.error(`❌ [TRAINER_NOTIF] Trainer not found for trainerId: ${trainerId}`);
        return;
      }

      console.log(
        `✅ [TRAINER_NOTIF] Trainer found: ${trainer.full_name} (user_id: ${trainer.user_id})`
      );

      // Create notification for trainer
      // Use CERTIFICATION_UPLOAD for PENDING status (manual entry or AI scan failed)
      // Use CERTIFICATION_VERIFIED for VERIFIED status (manually verified by admin)
      // Note: CERTIFICATION_AUTO_VERIFIED is handled separately by notifyCertificationAutoVerified
      const notificationType =
        verificationStatus === 'VERIFIED' ? 'CERTIFICATION_VERIFIED' : 'CERTIFICATION_UPLOAD'; // Use CERTIFICATION_UPLOAD for PENDING status

      const notificationData = {
        user_id: trainer.user_id,
        type: notificationType,
        title:
          verificationStatus === 'VERIFIED'
            ? 'Chứng chỉ đã được xác thực'
            : 'Chứng chỉ đang chờ duyệt',
        message: message || 'Chứng chỉ của bạn đang được xem xét',
        data: {
          certification_id: certificationId,
          category,
          certification_level: certificationLevel,
          verification_status: verificationStatus,
          is_manual_entry: isManualEntry,
          role: 'TRAINER',
        },
        is_read: false,
      };

      console.log(`💾 [TRAINER_NOTIF] Creating notification in database:`, {
        user_id: notificationData.user_id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message.substring(0, 50) + '...',
      });

      const notification = await this.createNotificationInIdentityService({
        user_id: trainer.user_id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
      });

      console.log(`✅ [TRAINER_NOTIF] Notification created successfully: ID=${notification.id}`);

      // Emit socket event to trainer for real-time notification
      if (global.io) {
        const roomName = `user:${trainer.user_id}`;
        const socketData = {
          notification_id: notification.id,
          certification_id: certificationId,
          category,
          certification_level: certificationLevel,
          verification_status: verificationStatus,
          is_manual_entry: isManualEntry,
          title: notification.title,
          message: notification.message,
          created_at: notification.created_at,
          is_read: false,
        };

        // Check if room has any sockets (trainer is online)
        const room = global.io.sockets.adapter.rooms.get(roomName);
        const socketCount = room ? room.size : 0;

        console.log(
          `📡 [TRAINER_NOTIF] Checking socket room: ${roomName}, socketCount: ${socketCount}`
        );

        if (socketCount > 0) {
          console.log(
            `📡 [TRAINER_NOTIF] Trainer is online - emitting socket events to room: ${roomName}`
          );
          // Emit certification:pending for backward compatibility
          global.io.to(roomName).emit('certification:pending', socketData);
          // Emit certification:created for optimistic UI update
          global.io.to(roomName).emit('certification:created', {
            ...socketData,
            id: certificationId,
            certification_id: certificationId,
          });
          // Emit notification:new for notification dropdown
          global.io.to(roomName).emit('notification:new', {
            notification_id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: socketData,
            created_at: notification.created_at,
            is_read: false,
          });
          console.log(`✅ [TRAINER_NOTIF] Socket events emitted to trainer room: ${roomName}`);
        } else {
          console.log(
            `📋 [TRAINER_NOTIF] Trainer is offline - notification saved to database, will see when they log in`
          );
        }
      } else {
        console.warn(
          `⚠️ [TRAINER_NOTIF] global.io not available - notification saved to database only`
        );
      }

      console.log(
        `✅ [TRAINER_NOTIF] Certification status notification sent to trainer ${trainerId} (user_id: ${trainer.user_id})`
      );
    } catch (error) {
      console.error(
        `\n❌ [TRAINER_NOTIF] ========== ERROR SENDING CERTIFICATION STATUS NOTIFICATION ==========`
      );
      console.error('❌ [TRAINER_NOTIF] Error sending certification status notification:', error);
      console.error('❌ [TRAINER_NOTIF] Error stack:', error.stack);
      console.error('❌ [TRAINER_NOTIF] Error details:', {
        message: error.message,
        code: error.code,
        trainerId,
        certificationId,
        verificationStatus,
        isManualEntry,
      });
    }
  }

  /**
   * Send notification to trainer when certification is deleted
   * @param {Object} params - Deletion parameters
   */
  async sendCertificationDeletedNotification({
    trainerId,
    trainerName,
    certificationId,
    category,
    certificationName,
    reason,
    deletedBy,
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
        console.error('Trainer not found for certification deletion notification');
        return;
      }

      // Helper function to get category label
      const getCategoryLabel = cat => {
        const categoryMap = {
          CARDIO: 'Tim mạch',
          STRENGTH: 'Sức mạnh',
          YOGA: 'Yoga',
          PILATES: 'Pilates',
          DANCE: 'Khiêu vũ',
          MARTIAL_ARTS: 'Võ thuật',
          AQUA: 'Bơi lội',
          FUNCTIONAL: 'Chức năng',
          RECOVERY: 'Phục hồi',
          SPECIALIZED: 'Chuyên biệt',
        };
        return categoryMap[cat] || cat;
      };
      const categoryLabel = getCategoryLabel(category);

      // Create notification for trainer in identity service
      const notification = await this.createNotificationInIdentityService({
        user_id: trainer.user_id,
        type: 'CERTIFICATION_DELETED',
        title: 'Chứng chỉ đã bị xóa',
        message: `Chứng chỉ "${certificationName}" (${categoryLabel}) đã bị xóa. Lý do: ${reason}`,
        data: {
          certification_id: certificationId,
          category,
          certification_name: certificationName,
          reason,
          deleted_by: deletedBy,
          role: 'ADMIN', // Admin deleted the certification
        },
      });

      // Emit socket events to trainer
      if (global.io) {
        const roomName = `user:${trainer.user_id}`;
        const socketPayload = {
          notification_id: notification.id,
          certification_id: certificationId,
          category,
          certification_name: certificationName,
          reason,
          deleted_by: deletedBy,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          created_at: notification.created_at,
        };

        // Emit certification:deleted event
        global.io.to(roomName).emit('certification:deleted', socketPayload);

        // Also emit notification:new event for NotificationDropdown
        global.io.to(roomName).emit('notification:new', socketPayload);

        console.log(`✅ Emitted certification:deleted and notification:new events to ${roomName}`);
      }

      console.log(`✅ Sent certification deletion notification to trainer ${trainerId}`);
    } catch (error) {
      console.error('Error sending certification deletion notification:', error);
    }
  }

  /**
   * Send notification to trainer about certifications expiring soon
   * @param {Object} params - Expiry warning parameters
   */
  async sendCertificationExpiringWarning({ trainerId, trainerName, certifications }) {
    try {
      console.log(
        `📢 Sending expiry warning to trainer ${trainerName} for ${certifications.length} certification(s)`
      );

      // Get trainer info
      const trainer = await prisma.trainer.findUnique({
        where: { id: trainerId },
        select: {
          user_id: true,
        },
      });

      if (!trainer) {
        console.error('Trainer not found for expiry warning notification');
        return;
      }

      // Helper function to get category label
      const getCategoryLabel = cat => {
        const categoryMap = {
          CARDIO: 'Tim mạch',
          STRENGTH: 'Sức mạnh',
          YOGA: 'Yoga',
          PILATES: 'Pilates',
          DANCE: 'Khiêu vũ',
          MARTIAL_ARTS: 'Võ thuật',
          AQUA: 'Bơi lội',
          FUNCTIONAL: 'Chức năng',
          RECOVERY: 'Phục hồi',
          SPECIALIZED: 'Chuyên biệt',
        };
        return categoryMap[cat] || cat;
      };

      // Format expiration dates
      const formatDate = date => {
        return new Date(date).toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      };

      // Create message based on number of certifications
      let title, message;
      if (certifications.length === 1) {
        const cert = certifications[0];
        const categoryLabel = getCategoryLabel(cert.category);
        const daysUntilExpiry = cert.daysUntilExpiry;
        title = 'Chứng chỉ sắp hết hạn';
        message = `Chứng chỉ "${
          cert.certification_name
        }" (${categoryLabel}) của bạn sẽ hết hạn sau ${daysUntilExpiry} ngày (${formatDate(
          cert.expiration_date
        )}). Vui lòng gia hạn sớm.`;
      } else {
        const certsList = certifications
          .map(cert => {
            const categoryLabel = getCategoryLabel(cert.category);
            return `- "${cert.certification_name}" (${categoryLabel}): ${
              cert.daysUntilExpiry
            } ngày (${formatDate(cert.expiration_date)})`;
          })
          .join('\n');
        title = 'Nhiều chứng chỉ sắp hết hạn';
        message = `Bạn có ${certifications.length} chứng chỉ sắp hết hạn:\n${certsList}\nVui lòng gia hạn sớm để tiếp tục hoạt động.`;
      }

      // Create notification for trainer in identity service
      const notification = await this.createNotificationInIdentityService({
        user_id: trainer.user_id,
        type: 'CERTIFICATION_EXPIRING',
        title,
        message,
        data: {
          certifications: certifications.map(cert => ({
            certification_id: cert.id,
            category: cert.category,
            certification_name: cert.certification_name,
            expiration_date: cert.expiration_date,
            days_until_expiry: cert.daysUntilExpiry,
          })),
          role: 'TRAINER',
        },
      });

      // Emit socket event to trainer
      if (global.io) {
        const roomName = `user:${trainer.user_id}`;
        global.io.to(roomName).emit('certification:expiring_soon', {
          notification_id: notification.id,
          title,
          message,
          certifications: certifications.map(cert => ({
            certification_id: cert.id,
            category: cert.category,
            certification_name: cert.certification_name,
            expiration_date: cert.expiration_date,
            days_until_expiry: cert.daysUntilExpiry,
          })),
          created_at: notification.created_at,
        });
      }

      console.log(`✅ Sent expiry warning notification to trainer ${trainerId}`);
    } catch (error) {
      console.error('Error sending certification expiry warning notification:', error);
    }
  }

  /**
   * Send notification to admins about certifications expiring soon (summary)
   * @param {Object} params - Summary parameters
   */
  async sendCertificationExpiringSummaryToAdmins({
    totalExpiring,
    trainersAffected,
    certifications,
  }) {
    try {
      console.log(
        `📢 Sending expiry summary to admins: ${totalExpiring} certification(s), ${trainersAffected} trainer(s) affected`
      );

      // Get all admins and super-admins
      const admins = await this.getAdminsAndSuperAdmins();

      if (admins.length === 0) {
        console.log('⚠️ No admins found - skipping expiry summary notification');
        return;
      }

      // Helper function to get category label
      const getCategoryLabel = cat => {
        const categoryMap = {
          CARDIO: 'Tim mạch',
          STRENGTH: 'Sức mạnh',
          YOGA: 'Yoga',
          PILATES: 'Pilates',
          DANCE: 'Khiêu vũ',
          MARTIAL_ARTS: 'Võ thuật',
          AQUA: 'Bơi lội',
          FUNCTIONAL: 'Chức năng',
          RECOVERY: 'Phục hồi',
          SPECIALIZED: 'Chuyên biệt',
        };
        return categoryMap[cat] || cat;
      };

      // Format expiration dates
      const formatDate = date => {
        return new Date(date).toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      };

      // Calculate days until expiry for each certification
      const now = new Date();
      const certsWithDays = certifications.map(cert => {
        const expirationDate = new Date(cert.expiration_date);
        const daysUntilExpiry = Math.ceil(
          (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          ...cert,
          daysUntilExpiry,
          categoryLabel: getCategoryLabel(cert.category),
        };
      });

      // Sort by days until expiry (soonest first)
      certsWithDays.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

      // Create summary message
      const title = 'Tóm tắt chứng chỉ sắp hết hạn';
      const message = `Có ${totalExpiring} chứng chỉ sắp hết hạn từ ${trainersAffected} huấn luyện viên. Vui lòng kiểm tra và nhắc nhở các huấn luyện viên gia hạn.`;

      // Create notifications for each admin
      const notifications = admins.map(admin => ({
        user_id: admin.user_id,
        type: 'CERTIFICATION_EXPIRING_SUMMARY',
        title,
        message,
        data: {
          total_expiring: totalExpiring,
          trainers_affected: trainersAffected,
          certifications: certsWithDays.map(cert => ({
            certification_id: cert.id,
            trainer_id: cert.trainer_id,
            trainer_name: cert.trainer_name,
            category: cert.category,
            category_label: cert.categoryLabel,
            certification_name: cert.certification_name,
            expiration_date: cert.expiration_date,
            expiration_date_formatted: formatDate(cert.expiration_date),
            days_until_expiry: cert.daysUntilExpiry,
          })),
          role: 'ADMIN',
        },
        is_read: false,
        created_at: new Date(),
      }));

      // Create notifications in identity service
      const createdNotifications = [];
      for (const notificationData of notifications) {
        try {
          const created = await this.createNotificationInIdentityService(notificationData);
          createdNotifications.push(created);
        } catch (error) {
          console.error(
            `❌ Failed to create notification for user ${notificationData.user_id}:`,
            error.message
          );
        }
      }

      console.log(
        `✅ Created ${createdNotifications.length} expiry summary notifications in identity service`
      );

      // Emit socket events to all admins
      if (global.io) {
        createdNotifications.forEach(notification => {
          const roomName = `user:${notification.user_id}`;
          const room = global.io.sockets.adapter.rooms.get(roomName);
          const socketCount = room ? room.size : 0;

          if (socketCount > 0) {
            console.log(
              `📡 Emitting certification:expiring_summary to room ${roomName} (${socketCount} socket(s) connected)`
            );
            global.io.to(roomName).emit('certification:expiring_summary', {
              notification_id: notification.id || null,
              title,
              message,
              total_expiring: totalExpiring,
              trainers_affected: trainersAffected,
              certifications: certsWithDays,
              created_at: notification.created_at,
            });
          } else {
            console.log(
              `⚠️ No sockets connected to room ${roomName} - notification saved to database only`
            );
          }
        });
      }

      console.log(`✅ Sent expiry summary to ${admins.length} admin(s)`);
    } catch (error) {
      console.error('Error sending certification expiry summary to admins:', error);
    }
  }

  /**
   * Send notification to trainer about expired certifications
   * @param {Object} params - Expired certification parameters
   */
  async sendCertificationExpiredNotification({ trainerId, trainerName, category, certifications }) {
    try {
      console.log(
        `📢 Sending expired certification notification to trainer ${trainerName} for category ${category}`
      );

      // Get trainer info
      const trainer = await prisma.trainer.findUnique({
        where: { id: trainerId },
        select: {
          user_id: true,
        },
      });

      if (!trainer) {
        console.error('Trainer not found for expired certification notification');
        return;
      }

      // Helper function to get category label
      const getCategoryLabel = cat => {
        const categoryMap = {
          CARDIO: 'Tim mạch',
          STRENGTH: 'Sức mạnh',
          YOGA: 'Yoga',
          PILATES: 'Pilates',
          DANCE: 'Khiêu vũ',
          MARTIAL_ARTS: 'Võ thuật',
          AQUA: 'Bơi lội',
          FUNCTIONAL: 'Chức năng',
          RECOVERY: 'Phục hồi',
          SPECIALIZED: 'Chuyên biệt',
        };
        return categoryMap[cat] || cat;
      };

      const categoryLabel = getCategoryLabel(category);
      const formatDate = date => {
        return new Date(date).toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      };

      // Create message
      const title = 'Chứng chỉ đã hết hạn';
      let message;
      if (certifications.length === 1) {
        const cert = certifications[0];
        message = `Chứng chỉ "${
          cert.certification_name
        }" (${categoryLabel}) của bạn đã hết hạn vào ${formatDate(
          cert.expiration_date
        )}. Vui lòng gia hạn ngay để tiếp tục hoạt động.`;
      } else {
        const certsList = certifications
          .map(cert => `- "${cert.certification_name}": ${formatDate(cert.expiration_date)}`)
          .join('\n');
        message = `Bạn có ${certifications.length} chứng chỉ (${categoryLabel}) đã hết hạn:\n${certsList}\nVui lòng gia hạn ngay để tiếp tục hoạt động.`;
      }

      // Create notification for trainer in identity service
      const notification = await this.createNotificationInIdentityService({
        user_id: trainer.user_id,
        type: 'CERTIFICATION_EXPIRED',
        title,
        message,
        data: {
          category,
          certifications: certifications.map(cert => ({
            certification_id: cert.id,
            certification_name: cert.certification_name,
            expiration_date: cert.expiration_date,
          })),
          role: 'TRAINER',
        },
      });

      // Emit socket event to trainer
      if (global.io) {
        const roomName = `user:${trainer.user_id}`;
        global.io.to(roomName).emit('certification:expired', {
          notification_id: notification.id,
          title,
          message,
          category,
          certifications: certifications.map(cert => ({
            certification_id: cert.id,
            certification_name: cert.certification_name,
            expiration_date: cert.expiration_date,
          })),
          created_at: notification.created_at,
        });
      }

      console.log(`✅ Sent expired certification notification to trainer ${trainerId}`);
    } catch (error) {
      console.error('Error sending expired certification notification:', error);
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

      // Get user_id from member_id if needed
      let targetUserId = user_id;
      if (!targetUserId && member_id) {
        try {
          const memberService = require('./member.service.js');
          const member = await memberService.getMemberById(member_id);
          if (member && member.user_id) {
            targetUserId = member.user_id;
          } else {
            console.warn(`⚠️ Could not get user_id for member_id: ${member_id}`);
            // Fallback to member_id if user_id not found (for backward compatibility)
            targetUserId = member_id;
          }
        } catch (memberError) {
          console.error(
            `❌ Error getting user_id for member_id ${member_id}:`,
            memberError.message
          );
          // Fallback to member_id if lookup fails
          targetUserId = member_id;
        }
      }

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
      let notificationDataObj = data || {};
      if (!notificationDataObj.role) {
        // Infer role from notification type or data
        if (type.startsWith('CERTIFICATION_')) {
          notificationDataObj.role = 'TRAINER';
        } else if (type === 'CLASS_BOOKING' || type.startsWith('MEMBERSHIP_')) {
          notificationDataObj.role = 'MEMBER';
        } else if (notificationDataObj.trainer_id || notificationDataObj.trainer_name) {
          notificationDataObj.role = 'TRAINER';
        } else if (notificationDataObj.member_id || notificationDataObj.member_name) {
          notificationDataObj.role = 'MEMBER';
        } else if (type === 'SYSTEM_ANNOUNCEMENT') {
          notificationDataObj.role = 'SYSTEM';
        }
      }

      // Enqueue notification to Redis queue instead of calling Identity Service API directly
      let createdNotification;
      try {
        const priority = notificationDataObj?.priority || 'normal';
        const enqueued = await this.enqueueNotification({
          user_id: targetUserId,
          type,
          title: finalTitle,
          message: finalMessage,
          data: notificationDataObj,
        }, priority);

        if (enqueued) {
          console.log(
            `✅ Notification enqueued to Redis: ${type} to user ${targetUserId} (priority: ${priority})`
          );
          // Create a mock notification object for backward compatibility
          createdNotification = {
            id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: targetUserId,
            type,
            title: finalTitle,
            message: finalMessage,
            data: notificationDataObj,
            created_at: new Date(),
            is_read: false,
          };
        } else {
          throw new Error('Failed to enqueue notification to Redis');
        }
      } catch (error) {
        console.error('❌ Error enqueueing notification to Redis:', error.message);
        // Don't throw - notification failure shouldn't break the main flow
        // Create a mock notification object for socket emission
        createdNotification = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: targetUserId,
          type,
          title: finalTitle,
          message: finalMessage,
          data: notificationDataObj,
          created_at: new Date(),
          is_read: false,
        };
        console.warn('⚠️ Using temporary notification ID for socket emission');
      }

      // Emit socket event based on notification type
      if (global.io) {
        const roomName = `user:${targetUserId}`;
        const socketPayload = {
          notification_id: createdNotification.id,
          type: createdNotification.type,
          title: createdNotification.title,
          message: createdNotification.message,
          data: createdNotification.data,
          created_at: createdNotification.created_at,
          is_read: createdNotification.is_read,
        };

        // Map notification types to socket events
        const socketEventMap = {
          WAITLIST_ADDED: 'waitlist:added',
          WAITLIST_PROMOTED: 'waitlist:promoted',
          SCHEDULE_CANCELLED: 'schedule:cancelled',
          ROOM_CHANGED: 'room:changed',
          ROOM_CHANGE_REJECTED: 'room:change:rejected',
          CLASS_BOOKING: 'booking:new', // Already handled in booking controller
        };

        const socketEvent = socketEventMap[type];
        if (socketEvent) {
          console.log(`📡 Emitting socket event ${socketEvent} to ${roomName}`);
          global.io.to(roomName).emit(socketEvent, socketPayload);

          // Also emit general notification:new event for compatibility
          global.io.to(roomName).emit('notification:new', socketPayload);
          console.log(`✅ Socket events emitted successfully to ${roomName}`);
        } else {
          // For other notification types, just emit notification:new
          console.log(`📡 Emitting notification:new to ${roomName}`);
          global.io.to(roomName).emit('notification:new', socketPayload);
          console.log(`✅ Socket event notification:new emitted successfully to ${roomName}`);
        }
      } else {
        console.warn('⚠️ global.io not available - notification saved to database only');
      }
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send class reminder to members
   * @param {Object} params - { scheduleId, className, startTime, reminderMinutes, memberUserIds }
   */
  async sendClassReminder({ scheduleId, className, startTime, reminderMinutes, memberUserIds }) {
    try {
      const title = `Nhắc nhở lớp học - ${reminderMinutes} phút`;
      const message = `Lớp ${className} sẽ bắt đầu sau ${reminderMinutes} phút. Vui lòng chuẩn bị sẵn sàng!`;

      const results = await Promise.allSettled(
        memberUserIds.map(userId =>
          this.sendNotification({
            user_id: userId,
            type: 'CLASS_REMINDER',
            title,
            message,
            data: {
              schedule_id: scheduleId,
              class_name: className,
              start_time: startTime,
              reminder_minutes: reminderMinutes,
            },
          })
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;

      // Emit socket events
      if (global.io) {
        memberUserIds.forEach(userId => {
          global.io.to(`user:${userId}`).emit('class:reminder', {
            schedule_id: scheduleId,
            class_name: className,
            start_time: startTime,
            reminder_minutes: reminderMinutes,
          });
        });
      }

      return {
        success: true,
        sent: successCount,
        total: memberUserIds.length,
      };
    } catch (error) {
      console.error('❌ Send class reminder error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send schedule change notification to members
   * @param {Object} params - { scheduleId, className, changeType, oldData, newData, memberUserIds }
   */
  async sendScheduleChangeNotification({ scheduleId, className, changeType, oldData, newData, memberUserIds }) {
    try {
      const titleMap = {
        updated: 'Lịch học đã được cập nhật',
        cancelled: 'Lịch học đã bị hủy',
        room_changed: 'Phòng học đã thay đổi',
        time_changed: 'Thời gian học đã thay đổi',
      };

      const messageMap = {
        updated: `Lịch học ${className} đã được cập nhật. Vui lòng kiểm tra thông tin mới.`,
        cancelled: `Lịch học ${className} đã bị hủy. Chúng tôi rất xin lỗi vì sự bất tiện này.`,
        room_changed: `Lịch học ${className} đã được chuyển sang phòng ${newData.room_name || 'khác'}.`,
        time_changed: `Thời gian của lớp ${className} đã được thay đổi từ ${oldData.start_time} sang ${newData.start_time}.`,
      };

      const title = titleMap[changeType] || 'Lịch học đã được cập nhật';
      const message = messageMap[changeType] || `Lịch học ${className} đã được cập nhật.`;

      const results = await Promise.allSettled(
        memberUserIds.map(userId =>
          this.sendNotification({
            user_id: userId,
            type: changeType === 'cancelled' ? 'SCHEDULE_CANCELLED' : 'SCHEDULE_UPDATED',
            title,
            message,
            data: {
              schedule_id: scheduleId,
              class_name: className,
              change_type: changeType,
              old_data: oldData,
              new_data: newData,
            },
          })
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;

      // Emit socket events
      if (global.io) {
        memberUserIds.forEach(userId => {
          global.io.to(`user:${userId}`).emit('schedule:changed', {
            schedule_id: scheduleId,
            class_name: className,
            change_type: changeType,
            old_data: oldData,
            new_data: newData,
          });
        });
      }

      return {
        success: true,
        sent: successCount,
        total: memberUserIds.length,
      };
    } catch (error) {
      console.error('❌ Send schedule change notification error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send personal training request from trainer to member
   * @param {Object} params - { trainerId, trainerName, memberUserId, message, proposedTime }
   */
  async sendPersonalTrainingRequest({ trainerId, trainerName, memberUserId, message, proposedTime }) {
    try {
      const title = 'Yêu cầu tập luyện cá nhân';
      const notificationMessage = message || `${trainerName} đã gửi yêu cầu tập luyện cá nhân cho bạn.`;

      const result = await this.sendNotification({
        user_id: memberUserId,
        type: 'GENERAL',
        title,
        message: notificationMessage,
        data: {
          trainer_id: trainerId,
          trainer_name: trainerName,
          proposed_time: proposedTime,
          request_type: 'PERSONAL_TRAINING',
        },
      });

      // Emit socket event
      if (global.io && result.success) {
        global.io.to(`user:${memberUserId}`).emit('personal:training:request', {
          trainer_id: trainerId,
          trainer_name: trainerName,
          message: notificationMessage,
          proposed_time: proposedTime,
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Send personal training request error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send real-time notification to trainer when member checks in
   * @param {string} trainerId - Trainer user ID
   * @param {string} memberName - Member name
   * @param {string} className - Class name
   * @param {Date} checkInTime - Check-in time
   * @param {string} scheduleId - Schedule ID (optional)
   * @param {string} memberId - Member ID (optional)
   */
  async notifyTrainerCheckIn(
    trainerId,
    memberName,
    className,
    checkInTime,
    scheduleId = null,
    memberId = null
  ) {
    try {
      console.log(`📢 Sending check-in notification to trainer: ${trainerId}`);

      const notificationData = {
        member_name: memberName,
        class_name: className,
        check_in_time: checkInTime.toISOString(),
        role: 'MEMBER',
      };

      if (scheduleId) {
        notificationData.schedule_id = scheduleId;
      }

      if (memberId) {
        notificationData.member_id = memberId;
      }

      // Create notification in identity service
      const createdNotification = await this.createNotificationInIdentityService({
        user_id: trainerId,
        type: 'MEMBER_CHECKED_IN',
        title: 'Thành viên đã check-in',
        message: `${memberName} đã check-in vào lớp ${className}`,
        data: notificationData,
      });

      console.log(
        `✅ Check-in notification created for trainer ${trainerId} (notification_id: ${createdNotification.id})`
      );

      // Emit socket event to trainer
      if (global.io) {
        const roomName = `user:${trainerId}`;
        const socketPayload = {
          notification_id: createdNotification.id,
          type: createdNotification.type,
          title: createdNotification.title,
          message: createdNotification.message,
          data: createdNotification.data,
          created_at: createdNotification.created_at,
          is_read: createdNotification.is_read,
        };

        console.log(`📡 Emitting socket event member:checked_in to ${roomName}`);
        global.io.to(roomName).emit('member:checked_in', socketPayload);

        // Also emit general notification:new event for compatibility
        global.io.to(roomName).emit('notification:new', socketPayload);
        console.log(`✅ Socket events emitted successfully to ${roomName}`);
      } else {
        console.warn('⚠️ global.io not available - notification saved to database only');
      }
    } catch (error) {
      console.error('❌ Error sending check-in notification:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
