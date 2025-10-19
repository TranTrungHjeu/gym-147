/**
 * Rate Limiting Service
 * Manages rate limiting for various operations
 */

class RateLimitService {
  constructor() {
    this.limits = new Map();
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      60 * 60 * 1000
    ); // Cleanup every hour
  }

  /**
   * Check if user has exceeded rate limit
   * @param {string} userId - User ID
   * @param {string} operation - Operation type (e.g., 'create_schedule')
   * @param {number} maxRequests - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {boolean} - true if allowed, false if rate limited
   */
  checkRateLimit(userId, operation, maxRequests = 10, windowMs = 24 * 60 * 60 * 1000) {
    const key = `${userId}_${operation}`;
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

    // Check if limit exceeded
    if (userLimit.count >= maxRequests) {
      return false;
    }

    // Increment counter
    userLimit.count++;
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
