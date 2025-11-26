/**
 * Rate Limiting Service
 * Manages rate limiting for various operations using Redis
 */

let redisRateLimiter = null;
try {
  redisRateLimiter = require('../../../packages/shared-middleware/src/rate-limit.middleware.js').rateLimiter;
} catch (e) {
  console.warn('⚠️ Shared rate limiter not available, using in-memory fallback');
}

class RateLimitService {
  constructor() {
    this.limits = new Map(); // Fallback in-memory store
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // Cleanup every hour
  }

  /**
   * Check if user can perform operation (without incrementing counter)
   * @param {string} userId - User ID
   * @param {string} operation - Operation type (e.g., 'create_schedule')
   * @param {number} maxRequests - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Promise<boolean>} - true if allowed, false if rate limited
   */
  async canPerformOperation(userId, operation, maxRequests = 10, windowMs = 24 * 60 * 60 * 1000) {
    const key = `${userId}:${operation}`;
    const windowSeconds = Math.floor(windowMs / 1000);

    // Use Redis rate limiter if available
    if (redisRateLimiter) {
      try {
        const result = await redisRateLimiter.checkRateLimit(key, maxRequests, windowSeconds);
        return result.allowed;
      } catch (error) {
        console.error('Redis rate limit error, using fallback:', error);
      }
    }

    // Fallback to in-memory
    const now = Date.now();
    let userLimit = this.limits.get(key);

    if (!userLimit) {
      // No limit yet, user can perform operation
      return true;
    }

    // Reset if window has passed
    if (now > userLimit.resetTime) {
      // Window expired, user can perform operation
      return true;
    }

    // Check if limit exceeded (without incrementing)
    return userLimit.count < maxRequests;
  }

  /**
   * Increment rate limit counter (call this AFTER successful operation)
   * @param {string} userId - User ID
   * @param {string} operation - Operation type (e.g., 'create_schedule')
   * @param {number} windowMs - Time window in milliseconds
   */
  async incrementRateLimit(userId, operation, windowMs = 24 * 60 * 60 * 1000) {
    const key = `${userId}:${operation}`;
    const windowSeconds = Math.floor(windowMs / 1000);

    // Use Redis rate limiter if available
    if (redisRateLimiter) {
      try {
        await redisRateLimiter.increment(key, 10, windowSeconds); // Default maxRequests = 10
        return;
      } catch (error) {
        console.error('Redis rate limit increment error, using fallback:', error);
      }
    }

    // Fallback to in-memory
    const now = Date.now();
    let userLimit = this.limits.get(key);

    if (!userLimit) {
      userLimit = {
        count: 0,
        resetTime: now + windowMs,
        firstRequest: now,
      };
      this.limits.set(key, userLimit);
    }

    // Reset if window has passed
    if (now > userLimit.resetTime) {
      userLimit.count = 0;
      userLimit.resetTime = now + windowMs;
      userLimit.firstRequest = now;
    }

    // Increment counter (only when operation succeeds)
    userLimit.count++;
  }

  /**
   * Check if user has exceeded rate limit (backward compatibility - deprecated)
   * @deprecated Use canPerformOperation + incrementRateLimit instead
   * @param {string} userId - User ID
   * @param {string} operation - Operation type (e.g., 'create_schedule')
   * @param {number} maxRequests - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Promise<boolean>} - true if allowed, false if rate limited
   */
  async checkRateLimit(userId, operation, maxRequests = 10, windowMs = 24 * 60 * 60 * 1000) {
    // For backward compatibility, check first
    const allowed = await this.canPerformOperation(userId, operation, maxRequests, windowMs);
    if (!allowed) {
      return false;
    }
    // Then increment
    await this.incrementRateLimit(userId, operation, windowMs);
    return true;
  }

  /**
   * Get rate limit info for user
   * @param {string} userId - User ID
   * @param {string} operation - Operation type
   * @returns {Object} - Rate limit info
   */
  getRateLimitInfo(userId, operation) {
    const key = `${userId}_${operation}`;
    const userLimit = this.limits.get(key);

    if (!userLimit) {
      return {
        count: 0,
        limit: 10,
        resetTime: null,
        remaining: 10,
      };
    }

    const now = Date.now();
    const remaining = Math.max(0, 10 - userLimit.count);
    const resetTime = userLimit.resetTime > now ? userLimit.resetTime : null;

    return {
      count: userLimit.count,
      limit: 10,
      resetTime,
      remaining,
    };
  }

  /**
   * Reset rate limit for a specific user and operation
   * @param {string} userId - User ID
   * @param {string} operation - Operation type (e.g., 'create_schedule')
   * @returns {boolean} - true if reset successful, false if not found
   */
  resetRateLimit(userId, operation) {
    const key = `${userId}_${operation}`;
    if (this.limits.has(key)) {
      this.limits.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Reset rate limit for a specific user (all operations)
   * @param {string} userId - User ID
   * @returns {number} - Number of rate limits reset
   */
  resetUserRateLimits(userId) {
    let count = 0;
    const keysToDelete = [];

    for (const key of this.limits.keys()) {
      if (key.startsWith(`${userId}_`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.limits.delete(key);
      count++;
    });

    return count;
  }

  /**
   * Reset all rate limits (use with caution)
   * @returns {number} - Number of rate limits reset
   */
  resetAllRateLimits() {
    const count = this.limits.size;
    this.limits.clear();
    return count;
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, limit] of this.limits.entries()) {
      if (now > limit.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Destroy the service and cleanup
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.limits.clear();
  }
}

// Singleton instance
const rateLimitService = new RateLimitService();

module.exports = rateLimitService;
