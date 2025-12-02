const { createClient } = require('redis');

/**
 * Redis Cache Service
 * Handles caching with Redis for improved performance
 */
class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour default TTL
    this.initialize();
  }

  /**
   * Initialize Redis client
   */
  async initialize() {
    try {
      if (!process.env.REDIS_URL) {
        throw new Error('REDIS_URL environment variable is required. Please set it in your .env file.');
      }
      const redisUrl = process.env.REDIS_URL;
      
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
      console.error('[ERROR] Failed to initialize Redis:', error);
      console.log('[WARNING] Cache service will run in fallback mode (no caching)');
      this.isConnected = false;
    }
  }

  /**
   * Generate cache key
   * @param {string} prefix - Key prefix
   * @param {string} identifier - Identifier (id, slug, etc.)
   * @param {Object} params - Additional parameters
   * @returns {string} - Cache key
   */
  generateKey(prefix, identifier, params = {}) {
    const keyParts = [prefix, identifier];
    
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
      console.error(`[ERROR] Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
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
      console.error(`[ERROR] Redis SET error for key ${key}:`, error);
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
      console.error(`[ERROR] Redis DELETE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   * @param {string} pattern - Key pattern (e.g., 'user:*')
   * @returns {Promise<number>} - Number of keys deleted
   */
  async deleteByPattern(pattern) {
    if (!this.isConnected || !this.client) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      
      await this.client.del(keys);
      return keys.length;
    } catch (error) {
      console.error(`[ERROR] Redis DELETE BY PATTERN error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - True if key exists
   */
  async exists(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[ERROR] Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set cache (cache-aside pattern)
   * @param {string} key - Cache key
   * @param {Function} fetchFunction - Function to fetch data if not cached
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<any>} - Cached or fetched value
   */
  async getOrSet(key, fetchFunction, ttl = null) {
    // Try to get from cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const freshData = await fetchFunction();
    
    // Cache the fresh data
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, ttl);
    }

    return freshData;
  }

  /**
   * Invalidate cache by pattern
   * @param {string} pattern - Pattern to match (e.g., 'member:*')
   * @returns {Promise<number>} - Number of keys invalidated
   */
  async invalidate(pattern) {
    return await this.deleteByPattern(pattern);
  }

  /**
   * Set cache with tags (for easier invalidation)
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {string[]} tags - Cache tags
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  async setWithTags(key, value, tags = [], ttl = null) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      // Store the value
      await this.set(key, value, ttl);

      // Store tags for this key
      for (const tag of tags) {
        const tagKey = `tag:${tag}:${key}`;
        await this.set(tagKey, key, ttl || this.defaultTTL);
      }

      return true;
    } catch (error) {
      console.error(`[ERROR] Redis SET WITH TAGS error:`, error);
      return false;
    }
  }

  /**
   * Invalidate cache by tags
   * @param {string[]} tags - Tags to invalidate
   * @returns {Promise<number>} - Number of keys invalidated
   */
  async invalidateByTags(tags) {
    if (!this.isConnected || !this.client) {
      return 0;
    }

    let totalDeleted = 0;

    try {
      for (const tag of tags) {
        const pattern = `tag:${tag}:*`;
        const tagKeys = await this.client.keys(pattern);
        
        if (tagKeys.length > 0) {
          // Get all keys associated with this tag
          const keys = await Promise.all(
            tagKeys.map(async (tagKey) => {
              return await this.client.get(tagKey);
            })
          );

          // Delete the actual cache keys
          const validKeys = keys.filter(k => k !== null);
          if (validKeys.length > 0) {
            await this.client.del(validKeys);
            totalDeleted += validKeys.length;
          }

          // Delete tag keys
          await this.client.del(tagKeys);
        }
      }

      return totalDeleted;
    } catch (error) {
      console.error(`[ERROR] Redis INVALIDATE BY TAGS error:`, error);
      return totalDeleted;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} - Cache statistics
   */
  async getStats() {
    if (!this.isConnected || !this.client) {
      return {
        connected: false,
        info: null,
      };
    }

    try {
      const info = await this.client.info('stats');
      return {
        connected: true,
        info,
      };
    } catch (error) {
      console.error('[ERROR] Redis STATS error:', error);
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Queue State Caching Methods
   */

  /**
   * Get queue length from cache
   * @param {string} equipmentId - Equipment ID
   * @returns {Promise<number|null>} - Queue length or null if not cached
   */
  async getQueueLength(equipmentId) {
    const key = `queue:length:${equipmentId}`;
    const cached = await this.get(key);
    return cached !== null ? cached : null;
  }

  /**
   * Set queue length in cache
   * @param {string} equipmentId - Equipment ID
   * @param {number} length - Queue length
   * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
   * @returns {Promise<boolean>} - Success status
   */
  async setQueueLength(equipmentId, length, ttl = 300) {
    const key = `queue:length:${equipmentId}`;
    return await this.set(key, length, ttl);
  }

  /**
   * Get queue list from cache
   * @param {string} equipmentId - Equipment ID
   * @returns {Promise<Array|null>} - Queue list or null if not cached
   */
  async getQueueList(equipmentId) {
    const key = `queue:list:${equipmentId}`;
    const cached = await this.get(key);
    return cached !== null ? cached : null;
  }

  /**
   * Set queue list in cache
   * @param {string} equipmentId - Equipment ID
   * @param {Array} queueList - Queue list
   * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
   * @returns {Promise<boolean>} - Success status
   */
  async setQueueList(equipmentId, queueList, ttl = 300) {
    const key = `queue:list:${equipmentId}`;
    return await this.set(key, queueList, ttl);
  }

  /**
   * Invalidate all queue cache for an equipment
   * @param {string} equipmentId - Equipment ID
   * @returns {Promise<number>} - Number of keys deleted
   */
  async invalidateQueueCache(equipmentId) {
    const patterns = [
      `queue:length:${equipmentId}`,
      `queue:list:${equipmentId}`,
      `queue:position:${equipmentId}:*`,
    ];
    
    let totalDeleted = 0;
    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        totalDeleted += await this.deleteByPattern(pattern);
      } else {
        const deleted = await this.delete(pattern);
        if (deleted) totalDeleted += 1;
      }
    }
    
    return totalDeleted;
  }

  /**
   * Get or set queue length (cache-aside pattern)
   * @param {string} equipmentId - Equipment ID
   * @param {Function} fetchFunction - Function to fetch queue length from DB
   * @param {number} ttl - Time to live in seconds (default: 300)
   * @returns {Promise<number>} - Queue length
   */
  async getOrSetQueueLength(equipmentId, fetchFunction, ttl = 300) {
    return await this.getOrSet(
      `queue:length:${equipmentId}`,
      fetchFunction,
      ttl
    );
  }

  /**
   * Get or set queue list (cache-aside pattern)
   * @param {string} equipmentId - Equipment ID
   * @param {Function} fetchFunction - Function to fetch queue list from DB
   * @param {number} ttl - Time to live in seconds (default: 300)
   * @returns {Promise<Array>} - Queue list
   */
  async getOrSetQueueList(equipmentId, fetchFunction, ttl = 300) {
    return await this.getOrSet(
      `queue:list:${equipmentId}`,
      fetchFunction,
      ttl
    );
  }

  /**
   * Leaderboard Caching Methods (using Redis Sorted Sets)
   */

  /**
   * Add or update member score in leaderboard
   * @param {string} leaderboardKey - Leaderboard key (e.g., 'leaderboard:challenge:weekly')
   * @param {string} memberId - Member ID
   * @param {number} score - Score to add/update
   * @returns {Promise<boolean>} - Success status
   */
  async addToLeaderboard(leaderboardKey, memberId, score) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      // Use ZADD to add/update score in sorted set
      // Score is the number of completed challenges
      await this.client.zAdd(leaderboardKey, {
        score: score,
        value: memberId,
      });
      return true;
    } catch (error) {
      console.error(`[ERROR] Redis ZADD error for leaderboard ${leaderboardKey}:`, error);
      return false;
    }
  }

  /**
   * Get leaderboard from Redis Sorted Set
   * @param {string} leaderboardKey - Leaderboard key
   * @param {number} limit - Number of top members to return
   * @param {boolean} reverse - If true, return in ascending order (default: false = descending)
   * @returns {Promise<Array>} - Array of { memberId, score, rank }
   */
  async getLeaderboard(leaderboardKey, limit = 10, reverse = false) {
    if (!this.isConnected || !this.client) {
      return [];
    }

    try {
      // Use ZREVRANGE for descending order (highest scores first)
      // or ZRANGE for ascending order
      const rangeMethod = reverse ? 'zRange' : 'zRevRange';
      const results = await this.client[rangeMethod](leaderboardKey, 0, limit - 1, {
        WITHSCORES: true,
      });

      // Parse results: [memberId1, score1, memberId2, score2, ...]
      const leaderboard = [];
      for (let i = 0; i < results.length; i += 2) {
        const memberId = results[i];
        const score = parseFloat(results[i + 1]);
        const rank = reverse ? Math.floor(i / 2) + 1 : Math.floor(i / 2) + 1;
        leaderboard.push({ memberId, score, rank });
      }

      return leaderboard;
    } catch (error) {
      console.error(`[ERROR] Redis leaderboard GET error for ${leaderboardKey}:`, error);
      return [];
    }
  }

  /**
   * Get member's rank in leaderboard
   * @param {string} leaderboardKey - Leaderboard key
   * @param {string} memberId - Member ID
   * @param {boolean} reverse - If true, rank from lowest (default: false = from highest)
   * @returns {Promise<number|null>} - Rank (1-based) or null if not found
   */
  async getMemberRank(leaderboardKey, memberId, reverse = false) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      // Use ZREVRANK for descending order or ZRANK for ascending
      const rankMethod = reverse ? 'zRank' : 'zRevRank';
      const rank = await this.client[rankMethod](leaderboardKey, memberId);
      return rank !== null ? rank + 1 : null; // Convert 0-based to 1-based
    } catch (error) {
      console.error(`[ERROR] Redis rank GET error for ${leaderboardKey}:`, error);
      return null;
    }
  }

  /**
   * Get member's score in leaderboard
   * @param {string} leaderboardKey - Leaderboard key
   * @param {string} memberId - Member ID
   * @returns {Promise<number|null>} - Score or null if not found
   */
  async getMemberScore(leaderboardKey, memberId) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const score = await this.client.zScore(leaderboardKey, memberId);
      return score !== null ? score : null;
    } catch (error) {
      console.error(`[ERROR] Redis score GET error for ${leaderboardKey}:`, error);
      return null;
    }
  }

  /**
   * Remove member from leaderboard
   * @param {string} leaderboardKey - Leaderboard key
   * @param {string} memberId - Member ID
   * @returns {Promise<boolean>} - Success status
   */
  async removeFromLeaderboard(leaderboardKey, memberId) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.zRem(leaderboardKey, memberId);
      return true;
    } catch (error) {
      console.error(`[ERROR] Redis ZREM error for leaderboard ${leaderboardKey}:`, error);
      return false;
    }
  }

  /**
   * Clear entire leaderboard
   * @param {string} leaderboardKey - Leaderboard key
   * @returns {Promise<boolean>} - Success status
   */
  async clearLeaderboard(leaderboardKey) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(leaderboardKey);
      return true;
    } catch (error) {
      console.error(`[ERROR] Redis DEL error for leaderboard ${leaderboardKey}:`, error);
      return false;
    }
  }

  /**
   * Set TTL for leaderboard
   * @param {string} leaderboardKey - Leaderboard key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  async setLeaderboardTTL(leaderboardKey, ttl) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.expire(leaderboardKey, ttl);
      return true;
    } catch (error) {
      console.error(`[ERROR] Redis EXPIRE error for leaderboard ${leaderboardKey}:`, error);
      return false;
    }
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

// Graceful shutdown
process.on('SIGTERM', async () => {
  await cacheService.close();
});

process.on('SIGINT', async () => {
  await cacheService.close();
});

module.exports = cacheService;

