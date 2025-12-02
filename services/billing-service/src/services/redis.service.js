const { createClient } = require('redis');

/**
 * Redis Service for Billing Service
 * Handles idempotency keys, webhook processing, and caching
 */
class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.initialize();
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
              console.error('[ERROR] Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        console.error('[ERROR] Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('[SYNC] Billing Redis: Connecting...');
      });

      this.client.on('ready', () => {
        console.log('[SUCCESS] Billing Redis: Connected and ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('[SOCKET] Billing Redis: Connection closed');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
    } catch (error) {
      console.error('[ERROR] Failed to initialize Redis:', error.message);
      console.log('[WARNING] Billing service will run without Redis (idempotency disabled)');
      this.isConnected = false;
    }
  }

  /**
   * Check if webhook was already processed (idempotency)
   * @param {string} webhookId - Unique webhook identifier (transaction_id or webhook_id)
   * @returns {Promise<boolean>} - True if already processed
   */
  async isWebhookProcessed(webhookId) {
    if (!this.isConnected || !this.client) {
      return false; // If Redis unavailable, allow processing (fail open)
    }

    try {
      const key = `webhook:processed:${webhookId}`;
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('[ERROR] Error checking webhook idempotency:', error);
      return false; // Fail open - allow processing if check fails
    }
  }

  /**
   * Mark webhook as processed
   * @param {string} webhookId - Unique webhook identifier
   * @param {number} ttlSeconds - Time to live in seconds (default 7 days)
   */
  async markWebhookProcessed(webhookId, ttlSeconds = 7 * 24 * 60 * 60) {
    if (!this.isConnected || !this.client) {
      return; // Silently fail if Redis unavailable
    }

    try {
      const key = `webhook:processed:${webhookId}`;
      await this.client.setEx(key, ttlSeconds, '1');
    } catch (error) {
      console.error('[ERROR] Error marking webhook as processed:', error);
    }
  }

  /**
   * Store compensation task for retry
   * @param {string} taskId - Unique task identifier
   * @param {Object} taskData - Task data to retry
   * @param {number} ttlSeconds - Time to live in seconds (default 24 hours)
   */
  async storeCompensationTask(taskId, taskData, ttlSeconds = 24 * 60 * 60) {
    if (!this.isConnected || !this.client) {
      console.warn('[WARNING] Redis unavailable, compensation task not stored:', taskId);
      return;
    }

    try {
      const key = `compensation:task:${taskId}`;
      await this.client.setEx(key, ttlSeconds, JSON.stringify(taskData));
    } catch (error) {
      console.error('[ERROR] Error storing compensation task:', error);
    }
  }

  /**
   * Get compensation task
   * @param {string} taskId - Unique task identifier
   * @returns {Promise<Object|null>} - Task data or null
   */
  async getCompensationTask(taskId) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const key = `compensation:task:${taskId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[ERROR] Error getting compensation task:', error);
      return null;
    }
  }

  /**
   * Delete compensation task
   * @param {string} taskId - Unique task identifier
   */
  async deleteCompensationTask(taskId) {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      const key = `compensation:task:${taskId}`;
      await this.client.del(key);
    } catch (error) {
      console.error('[ERROR] Error deleting compensation task:', error);
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

module.exports = new RedisService();

