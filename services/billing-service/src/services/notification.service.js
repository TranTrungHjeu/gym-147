const { createClient } = require('redis');

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
              console.error('❌ Billing Notification Service Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.redisClient.on('error', (err) => {
        console.error('❌ Billing Notification Service Redis Error:', err);
        this.isConnected = false;
      });

      this.redisClient.on('ready', () => {
        console.log('✅ Billing Notification Service Redis: Connected and ready');
        this.isConnected = true;
      });

      this.redisClient.on('end', () => {
        console.log('🔌 Billing Notification Service Redis: Connection closed');
        this.isConnected = false;
      });

      await this.redisClient.connect();
    } catch (error) {
      console.error('❌ Failed to initialize Billing Notification Service Redis:', error.message);
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
        throw new Error('Missing required fields: user_id, type, title, message');
      }

      const queueKey = `notifications:queue:identity:${priority}`;
      const notificationPayload = {
        user_id,
        type,
        title,
        message,
        data: data || {},
        channels: data?.channels || ['IN_APP', 'PUSH'],
        source: 'billing-service',
        timestamp: new Date().toISOString(),
      };

      await this.redisClient.rPush(queueKey, JSON.stringify(notificationPayload));
      console.log(`✅ [BILLING NOTIFICATION] Enqueued notification to Redis: ${type} for user ${user_id} (priority: ${priority})`);
      return true;
    } catch (error) {
      console.error('❌ [BILLING NOTIFICATION] Error enqueueing notification:', error);
      return false;
    }
  }

  /**
   * Create in-app notification via Redis queue (enqueues to Identity Service worker)
   * @param {Object} params - { userId, type, title, message, data }
   */
  async createInAppNotification({ userId, type, title, message, data = {} }) {
    try {
      const priority = data?.priority || 'normal';
      const enqueued = await this.enqueueNotification({
        user_id: userId,
        type,
        title,
        message,
        data,
      }, priority);

      if (enqueued) {
        // Return mock notification for backward compatibility
        return {
          success: true,
          notification: {
            id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: userId,
            type,
            title,
            message,
            data,
            created_at: new Date(),
            is_read: false,
          },
        };
      } else {
        return {
          success: false,
          error: 'Failed to enqueue notification to Redis',
        };
      }
    } catch (error) {
      console.error('❌ Create in-app notification error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create payment notification
   * @param {Object} params - { userId, paymentId, amount, status, paymentMethod, subscriptionId? }
   */
  async createPaymentNotification({ userId, paymentId, amount, status, paymentMethod, subscriptionId = null }) {
    const type = status === 'COMPLETED' || status === 'SUCCESS' 
      ? 'PAYMENT_SUCCESS' 
      : 'PAYMENT_FAILED';
    
    const title = status === 'COMPLETED' || status === 'SUCCESS'
      ? 'Thanh toán thành công'
      : 'Thanh toán thất bại';
    
    const message = status === 'COMPLETED' || status === 'SUCCESS'
      ? `Thanh toán ${amount.toLocaleString('vi-VN')} VND đã được xử lý thành công`
      : `Thanh toán ${amount.toLocaleString('vi-VN')} VND đã thất bại. Vui lòng thử lại.`;

    const result = await this.createInAppNotification({
      userId,
      type,
      title,
      message,
      data: {
        payment_id: paymentId,
        amount,
        status,
        payment_method: paymentMethod,
        subscription_id: subscriptionId,
      },
    });

    // Emit socket event
    if (global.io && result.success) {
      const socketEvent = status === 'COMPLETED' || status === 'SUCCESS'
        ? 'payment:success'
        : 'payment:failed';

      global.io.to(`user:${userId}`).emit(socketEvent, {
        payment_id: paymentId,
        amount,
        status,
        payment_method: paymentMethod,
        subscription_id: subscriptionId,
        notification_id: result.notification?.id,
      });

      // Also emit to admin room
      global.io.to('admin').emit(socketEvent, {
        payment_id: paymentId,
        amount,
        status,
        payment_method: paymentMethod,
        user_id: userId,
        subscription_id: subscriptionId,
      });
    }

    return result;
  }

  /**
   * Create subscription notification
   * @param {Object} params - { userId, subscriptionId, planName, planType, action }
   */
  async createSubscriptionNotification({ userId, subscriptionId, planName, planType, action }) {
    const typeMap = {
      created: 'SUBSCRIPTION_CREATED',
      renewed: 'SUBSCRIPTION_RENEWED',
      expired: 'SUBSCRIPTION_EXPIRED',
      upgraded: 'SUBSCRIPTION_UPGRADED',
    };

    const titleMap = {
      created: 'Đăng ký gói thành công',
      renewed: 'Gia hạn gói thành công',
      expired: 'Gói đã hết hạn',
      upgraded: 'Nâng cấp gói thành công',
    };

    const messageMap = {
      created: `Bạn đã đăng ký gói ${planName} thành công`,
      renewed: `Gói ${planName} của bạn đã được gia hạn`,
      expired: `Gói ${planName} của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng.`,
      upgraded: `Bạn đã nâng cấp lên gói ${planName}`,
    };

    const type = typeMap[action] || 'SUBSCRIPTION_CREATED';
    const title = titleMap[action] || 'Cập nhật gói';
    const message = messageMap[action] || `Gói ${planName} đã được cập nhật`;

    const result = await this.createInAppNotification({
      userId,
      type,
      title,
      message,
      data: {
        subscription_id: subscriptionId,
        plan_name: planName,
        plan_type: planType,
        action,
      },
    });

    // Emit socket event
    if (global.io && result.success) {
      const socketEvent = `subscription:${action}`;
      global.io.to(`user:${userId}`).emit(socketEvent, {
        subscription_id: subscriptionId,
        plan_name: planName,
        plan_type: planType,
        action,
        notification_id: result.notification?.id,
      });

      // Also emit to admin room
      global.io.to('admin').emit(socketEvent, {
        subscription_id: subscriptionId,
        plan_name: planName,
        plan_type: planType,
        user_id: userId,
        action,
      });
    }

    return result;
  }

  /**
   * Create invoice notification
   * @param {Object} params - { userId, invoiceId, invoiceNumber, amount, status }
   */
  async createInvoiceNotification({ userId, invoiceId, invoiceNumber, amount, status }) {
    const type = status === 'OVERDUE' ? 'INVOICE_OVERDUE' : 'INVOICE_GENERATED';
    const title = status === 'OVERDUE' 
      ? 'Hóa đơn quá hạn thanh toán'
      : 'Hóa đơn mới';
    const message = status === 'OVERDUE'
      ? `Hóa đơn ${invoiceNumber} với số tiền ${amount.toLocaleString('vi-VN')} VND đã quá hạn thanh toán`
      : `Hóa đơn ${invoiceNumber} với số tiền ${amount.toLocaleString('vi-VN')} VND đã được tạo`;

    const result = await this.createInAppNotification({
      userId,
      type,
      title,
      message,
      data: {
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        amount,
        status,
      },
    });

    // Emit socket event
    if (global.io && result.success) {
      global.io.to(`user:${userId}`).emit('invoice:generated', {
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        amount,
        status,
        notification_id: result.notification?.id,
      });

      // Also emit to admin room
      global.io.to('admin').emit('invoice:generated', {
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        amount,
        user_id: userId,
        status,
      });
    }

    return result;
  }

  /**
   * Create bulk notifications for multiple users
   * @param {Object} params - { userIds, type, title, message, data }
   */
  async createBulkNotifications({ userIds, type, title, message, data = {} }) {
    const results = await Promise.allSettled(
      userIds.map(userId =>
        this.createInAppNotification({
          userId,
          type,
          title,
          message,
          data,
        })
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    return {
      success: true,
      sent: successCount,
      total: userIds.length,
    };
  }
}

module.exports = new NotificationService();

