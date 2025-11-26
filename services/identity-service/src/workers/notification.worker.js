const { createClient } = require('redis');
const { prisma } = require('../lib/prisma.js');
// Push notification utility (optional - may not exist)
let sendPushNotification = null;
try {
  const pushNotificationUtils = require('../utils/push-notification');
  sendPushNotification = pushNotificationUtils.sendPushNotification;
} catch (e) {
  console.warn('⚠️ Push notification utility not available, push notifications will be skipped');
  sendPushNotification = async () => {
    console.log('📱 Push notification skipped (utility not available)');
  };
}

/**
 * Notification Worker
 * Consumes notifications from Redis queue and sends them
 */
class NotificationWorker {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isProcessing = false;
    this.processInterval = null;
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Initialize Redis client
   */
  async initialize() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Notification Worker: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        console.error('❌ Notification Worker Redis Error:', err);
        this.isConnected = false;
      });

      this.client.on('ready', () => {
        console.log('✅ Notification Worker: Connected and ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('🔌 Notification Worker: Connection closed');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('❌ Failed to initialize Notification Worker Redis:', error);
      this.isConnected = false;
    }
  }

  /**
   * Process a single notification
   */
  async processNotification(notificationData) {
    try {
      const { user_id, type, title, message, data, channels = ['IN_APP'] } = notificationData;

      // Create notification in database
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

      // Send push notification if enabled
      if (channels.includes('PUSH')) {
        try {
          await sendPushNotification(user_id, title, message, {
            type,
            notification_id: notification.id,
            ...data,
          });
        } catch (pushError) {
          console.error('Push notification error:', pushError);
          // Continue even if push fails
        }
      }

      // Emit socket event if socket.io is available
      if (global.io) {
        global.io.to(`user:${user_id}`).emit('notification:new', {
          id: notification.id,
          type,
          title,
          message,
          data,
          is_read: false,
          created_at: notification.created_at,
        });
      }

      return { success: true, notification };
    } catch (error) {
      console.error('Error processing notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process notifications from queue
   */
  async processQueue(priority = 'normal') {
    if (!this.isConnected || !this.client || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const queueKey = `notifications:queue:${priority}`;
      
      // Get notification from queue (blocking pop with timeout)
      // In redis v4+, blPop takes key and timeout as separate arguments
      const result = await this.client.blPop(
        queueKey,
        1 // 1 second timeout
      );

      if (!result || !result.element) {
        this.isProcessing = false;
        return;
      }

      const notificationData = JSON.parse(result.element);
      console.log(`📬 Processing ${priority} priority notification for user ${notificationData.user_id}`);

      // Process notification
      const result_process = await this.processNotification(notificationData);

      if (!result_process.success) {
        // Retry logic
        const retryCount = (notificationData._retryCount || 0) + 1;
        
        if (retryCount < this.maxRetries) {
          console.log(`🔄 Retrying notification (attempt ${retryCount}/${this.maxRetries})`);
          notificationData._retryCount = retryCount;
          
          // Add back to queue with delay
          setTimeout(async () => {
            await this.enqueueNotification(notificationData, priority);
          }, this.retryDelay * retryCount);
        } else {
          // Move to dead letter queue
          console.error(`❌ Notification failed after ${this.maxRetries} retries, moving to DLQ`);
          await this.client.lPush('notifications:dlq', JSON.stringify({
            ...notificationData,
            failed_at: new Date().toISOString(),
            error: result_process.error,
          }));
        }
      }
    } catch (error) {
      console.error('Error processing notification queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Enqueue notification to Redis
   */
  async enqueueNotification(notificationData, priority = 'normal') {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis not connected, notification will not be queued');
      return false;
    }

    try {
      const queueKey = `notifications:queue:${priority}`;
      await this.client.rPush(queueKey, JSON.stringify(notificationData));
      return true;
    } catch (error) {
      console.error('Error enqueueing notification:', error);
      return false;
    }
  }

  /**
   * Start worker
   */
  async start() {
    await this.initialize();

    if (!this.isConnected) {
      console.warn('⚠️ Notification worker cannot start: Redis not connected');
      return;
    }

    console.log('🚀 Notification worker started');

    // Process high priority queue every 100ms
    setInterval(() => {
      this.processQueue('high').catch(err => {
        console.error('Error processing high priority queue:', err);
      });
    }, 100);

    // Process normal priority queue every 500ms
    setInterval(() => {
      this.processQueue('normal').catch(err => {
        console.error('Error processing normal priority queue:', err);
      });
    }, 500);

    // Process low priority queue every 2 seconds
    setInterval(() => {
      this.processQueue('low').catch(err => {
        console.error('Error processing low priority queue:', err);
      });
    }, 2000);
  }

  /**
   * Stop worker
   */
  async stop() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }

    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }

    console.log('🛑 Notification worker stopped');
  }
}

// Singleton instance
const notificationWorker = new NotificationWorker();

// Start worker if this file is run directly
if (require.main === module) {
  notificationWorker.start().catch(error => {
    console.error('Failed to start notification worker:', error);
    process.exit(1);
  });
}

module.exports = { NotificationWorker, notificationWorker };

