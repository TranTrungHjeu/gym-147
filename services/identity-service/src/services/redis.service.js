const { createClient } = require('redis');

/**
 * Redis Service for Identity Service
 * Handles maintenance mode, caching, and session management
 */
class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.processStartTime = Date.now();
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
        console.error('❌ Identity Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('🔄 Identity Redis: Connecting...');
      });

      this.client.on('ready', () => {
        console.log('✅ Identity Redis: Connected and ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('🔌 Identity Redis: Connection closed');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error.message);
      console.log('⚠️ Identity service will run without Redis (maintenance mode disabled)');
      this.isConnected = false;
    }
  }

  /**
   * Check if Redis is connected
   */
  async ping() {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('❌ Redis ping error:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get maintenance mode status
   */
  async getMaintenanceMode() {
    if (!this.isConnected || !this.client) {
      return { enabled: false };
    }

    try {
      const data = await this.client.get('maintenance:mode');
      if (!data) {
        return { enabled: false };
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Error getting maintenance mode:', error);
      return { enabled: false };
    }
  }

  /**
   * Set maintenance mode
   */
  async setMaintenanceMode(enabled, reason, estimatedDuration) {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis not connected');
    }

    try {
      const data = {
        enabled,
        reason: reason || null,
        estimatedDuration: estimatedDuration || null,
        enabledAt: enabled ? new Date().toISOString() : null,
        disabledAt: !enabled ? new Date().toISOString() : null,
      };

      if (enabled) {
        // Store with 24 hour TTL (can be extended)
        await this.client.setEx('maintenance:mode', 24 * 60 * 60, JSON.stringify(data));
      } else {
        await this.client.del('maintenance:mode');
      }

      return data;
    } catch (error) {
      console.error('❌ Error setting maintenance mode:', error);
      throw error;
    }
  }

  /**
   * Get process uptime
   */
  getUptime() {
    const uptimeMs = Date.now() - this.processStartTime;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    return {
      milliseconds: uptimeMs,
      seconds: uptimeSeconds,
      formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`,
    };
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

  // ==================== SESSION MANAGEMENT ====================

  /**
   * Store session in Redis
   * @param {string} sessionId - Session ID
   * @param {Object} sessionData - Session data to store
   * @param {number} ttlSeconds - Time to live in seconds
   */
  async setSession(sessionId, sessionData, ttlSeconds) {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis not connected, skipping session storage');
      return false;
    }

    try {
      const key = `session:${sessionId}`;
      const userSessionsKey = `user:${sessionData.user_id}:sessions`;

      // Store session data with TTL
      await this.client.setEx(key, ttlSeconds, JSON.stringify(sessionData));

      // Add session ID to user's session set
      await this.client.sAdd(userSessionsKey, sessionId);
      // Set TTL on the set as well (use max TTL of all sessions)
      await this.client.expire(userSessionsKey, ttlSeconds);

      return true;
    } catch (error) {
      console.error('❌ Error setting session in Redis:', error);
      return false;
    }
  }

  /**
   * Get session from Redis
   * @param {string} sessionId - Session ID
   * @returns {Object|null} - Session data or null if not found
   */
  async getSession(sessionId) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const key = `session:${sessionId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Error getting session from Redis:', error);
      return null;
    }
  }

  /**
   * Delete session from Redis
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (optional, for cleanup)
   * @returns {boolean} - True if deleted successfully
   */
  async deleteSession(sessionId, userId = null) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const key = `session:${sessionId}`;
      
      // Delete session data
      await this.client.del(key);

      // Remove from user's session set if userId provided
      if (userId) {
        const userSessionsKey = `user:${userId}:sessions`;
        await this.client.sRem(userSessionsKey, sessionId);
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting session from Redis:', error);
      return false;
    }
  }

  /**
   * Get all session IDs for a user
   * @param {string} userId - User ID
   * @returns {string[]} - Array of session IDs
   */
  async getUserSessions(userId) {
    if (!this.isConnected || !this.client) {
      return [];
    }

    try {
      const userSessionsKey = `user:${userId}:sessions`;
      const sessionIds = await this.client.sMembers(userSessionsKey);
      return sessionIds || [];
    } catch (error) {
      console.error('❌ Error getting user sessions from Redis:', error);
      return [];
    }
  }

  /**
   * Revoke all sessions for a user
   * @param {string} userId - User ID
   * @returns {number} - Number of sessions revoked
   */
  async revokeUserSessions(userId) {
    if (!this.isConnected || !this.client) {
      return 0;
    }

    try {
      const userSessionsKey = `user:${userId}:sessions`;
      const sessionIds = await this.client.sMembers(userSessionsKey);

      if (!sessionIds || sessionIds.length === 0) {
        return 0;
      }

      // Delete all session keys
      const keysToDelete = sessionIds.map(id => `session:${id}`);
      if (keysToDelete.length > 0) {
        await this.client.del(keysToDelete);
      }

      // Delete the user sessions set
      await this.client.del(userSessionsKey);

      return sessionIds.length;
    } catch (error) {
      console.error('❌ Error revoking user sessions from Redis:', error);
      return 0;
    }
  }

  /**
   * Update session TTL (for refresh token)
   * @param {string} sessionId - Session ID
   * @param {number} ttlSeconds - New TTL in seconds
   * @returns {boolean} - True if updated successfully
   */
  async refreshSessionTTL(sessionId, ttlSeconds) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const key = `session:${sessionId}`;
      const exists = await this.client.exists(key);
      
      if (exists) {
        await this.client.expire(key, ttlSeconds);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error refreshing session TTL in Redis:', error);
      return false;
    }
  }

  // ==================== TOKEN BLACKLIST ====================

  /**
   * Add token to blacklist
   * @param {string} tokenHash - Hashed token
   * @param {number} ttlSeconds - Time to live in seconds (remaining token expiry time)
   * @returns {boolean} - True if added successfully
   */
  async addToBlacklist(tokenHash, ttlSeconds) {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis not connected, skipping token blacklist');
      return false;
    }

    try {
      const key = `blacklist:token:${tokenHash}`;
      await this.client.setEx(key, ttlSeconds, '1');
      return true;
    } catch (error) {
      console.error('❌ Error adding token to blacklist:', error);
      return false;
    }
  }

  /**
   * Check if token is blacklisted
   * @param {string} tokenHash - Hashed token
   * @returns {boolean} - True if token is blacklisted
   */
  async isBlacklisted(tokenHash) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const key = `blacklist:token:${tokenHash}`;
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('❌ Error checking token blacklist:', error);
      return false;
    }
  }

  /**
   * Revoke all tokens for a user (add all sessions to blacklist)
   * @param {string} userId - User ID
   * @returns {number} - Number of tokens blacklisted
   */
  async revokeAllTokens(userId) {
    if (!this.isConnected || !this.client) {
      return 0;
    }

    try {
      const userSessionsKey = `user:${userId}:sessions`;
      const sessionIds = await this.client.sMembers(userSessionsKey);

      if (!sessionIds || sessionIds.length === 0) {
        return 0;
      }

      // Get all sessions and add tokens to blacklist
      let blacklistedCount = 0;
      const pipeline = this.client.multi();

      for (const sessionId of sessionIds) {
        const sessionKey = `session:${sessionId}`;
        const sessionData = await this.client.get(sessionKey);
        
        if (sessionData) {
          try {
            const session = JSON.parse(sessionData);
            if (session.token) {
              // Hash the token (simple hash for now, can use crypto.createHash if needed)
              const tokenHash = require('crypto')
                .createHash('sha256')
                .update(session.token)
                .digest('hex');
              
              const ttl = await this.client.ttl(sessionKey);
              if (ttl > 0) {
                const blacklistKey = `blacklist:token:${tokenHash}`;
                pipeline.setEx(blacklistKey, ttl, '1');
                blacklistedCount++;
              }
            }
          } catch (parseError) {
            console.error('Error parsing session data:', parseError);
          }
        }
      }

      if (blacklistedCount > 0) {
        await pipeline.exec();
      }

      return blacklistedCount;
    } catch (error) {
      console.error('❌ Error revoking all tokens:', error);
      return 0;
    }
  }
}

module.exports = new RedisService();

