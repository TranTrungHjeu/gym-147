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
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('🔄 Redis: Connecting...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis: Connected and ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('🔌 Redis: Connection closed');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      console.log('⚠️ Cache service will run in fallback mode (no caching)');
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
      console.error(`❌ Redis GET error for key ${key}:`, error);
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
      console.error(`❌ Redis SET error for key ${key}:`, error);
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
      console.error(`❌ Redis DELETE error for key ${key}:`, error);
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
      console.error(`❌ Redis DELETE BY PATTERN error for ${pattern}:`, error);
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
      console.error(`❌ Redis EXISTS error for key ${key}:`, error);
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
      console.error(`❌ Redis SET WITH TAGS error:`, error);
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
      console.error(`❌ Redis INVALIDATE BY TAGS error:`, error);
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
      console.error('❌ Redis STATS error:', error);
      return {
        connected: false,
        error: error.message,
      };
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

