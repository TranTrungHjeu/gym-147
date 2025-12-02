const { createClient } = require('redis');

/**
 * Redis Cache Service for Schedule Service
 * Handles caching with Redis for improved performance
 */
class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour default TTL (as described in paper)
    this.initialize();
  }

  /**
   * Initialize Redis client
   */
  async initialize() {
    try {
      // Redis URL from environment or default
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: retries => {
            if (retries > 10) {
              console.error('[ERROR] Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', err => {
        console.error('[ERROR] Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('[SYNC] Redis: Connecting...');
      });

      this.client.on('ready', () => {
        console.log('[SUCCESS] Redis: Connected and ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('[SOCKET] Redis: Connection closed');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
    } catch (error) {
      console.error('[ERROR] Failed to initialize Redis:', error.message);
      console.log('[WARNING] Cache service will run in fallback mode (no caching)');
      this.isConnected = false;
    }
  }

  /**
   * Generate cache key for recommendations
   * @param {string} memberId - Member ID
   * @param {Object} params - Additional parameters (useVector, useAI, etc.)
   * @returns {string} - Cache key
   */
  generateRecommendationKey(memberId, params = {}) {
    const keyParts = ['recommendations', memberId];

    if (Object.keys(params).length > 0) {
      const paramString = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join('|');
      keyParts.push(paramString);
    }

    return keyParts.join(':');
  }

  /**
   * Generate cache key with prefix and optional parameters
   * @param {string} prefix - Key prefix (e.g., 'trainer:schedules', 'class')
   * @param {string} id - Entity ID
   * @param {Object} params - Additional parameters
   * @returns {string} - Cache key
   */
  generateKey(prefix, id, params = {}) {
    const keyParts = [prefix, id];

    if (Object.keys(params).length > 0) {
      const paramString = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join('|');
      keyParts.push(paramString);
    }

    return keyParts.join(':');
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Cached value or null
   */
  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Redis GET error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional, default 1 hour)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = null) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      const expireTime = ttl || this.defaultTTL;

      await this.client.setEx(key, expireTime, serialized);
      return true;
    } catch (error) {
      console.error(`[ERROR] Redis SET error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async delete(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`[ERROR] Redis DELETE error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete all recommendation caches for a member
   * @param {string} memberId - Member ID
   * @returns {Promise<boolean>} - Success status
   */
  async invalidateMemberRecommendations(memberId) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      // Use pattern matching to find all recommendation keys for this member
      const pattern = `recommendations:${memberId}:*`;
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`[DELETE] Invalidated ${keys.length} cache entries for member ${memberId}`);
      }

      return true;
    } catch (error) {
      console.error(`[ERROR] Redis INVALIDATE error for member ${memberId}:`, error.message);
      return false;
    }
  }

  /**
   * Check if Redis is connected
   * @returns {boolean}
   */
  isReady() {
    return this.isConnected;
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
