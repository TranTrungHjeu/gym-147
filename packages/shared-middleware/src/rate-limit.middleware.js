const { createClient } = require('redis');

/**
 * Redis-based Rate Limiting Middleware
 * Uses sliding window algorithm with Redis INCR
 */
class RedisRateLimiter {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.fallbackStore = new Map(); // In-memory fallback when Redis is down
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
              console.error('[ERROR] Redis Rate Limiter: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        console.error('[ERROR] Redis Rate Limiter Error:', err);
        this.isConnected = false;
      });

      this.client.on('ready', () => {
        console.log('[SUCCESS] Redis Rate Limiter: Connected and ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('[SOCKET] Redis Rate Limiter: Connection closed');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
    } catch (error) {
      console.error('[ERROR] Failed to initialize Redis Rate Limiter:', error.message);
      console.log('[WARNING] Rate limiter will use in-memory fallback');
      this.isConnected = false;
    }
  }

  /**
   * Check rate limit using Redis or fallback
   * @param {string} key - Rate limit key (e.g., userId:operation)
   * @param {number} maxRequests - Maximum requests allowed
   * @param {number} windowSeconds - Time window in seconds
   * @returns {Object} - { allowed: boolean, remaining: number, resetAt: Date }
   */
  async checkRateLimit(key, maxRequests, windowSeconds) {
    const redisKey = `ratelimit:${key}:${windowSeconds}`;

    if (this.isConnected && this.client) {
      try {
        // Use Redis sliding window
        const now = Date.now();
        const windowMs = windowSeconds * 1000;
        const windowStart = now - windowMs;

        // Use pipeline for atomic operations
        const pipeline = this.client.multi();
        
        // Remove expired entries (older than window)
        pipeline.zRemRangeByScore(redisKey, 0, windowStart);
        
        // Count current requests in window
        pipeline.zCard(redisKey);
        
        // Add current request
        pipeline.zAdd(redisKey, { score: now, value: `${now}-${Math.random()}` });
        
        // Set expiry on the key
        pipeline.expire(redisKey, windowSeconds);

        const results = await pipeline.exec();
        const currentCount = results[1] || 0;

        const allowed = currentCount < maxRequests;
        const remaining = Math.max(0, maxRequests - currentCount - 1);
        const resetAt = new Date(now + windowMs);

        return { allowed, remaining, resetAt, resetIn: windowSeconds };
      } catch (error) {
        console.error('[ERROR] Redis rate limit error, falling back to in-memory:', error);
        this.isConnected = false;
        // Fall through to in-memory fallback
      }
    }

    // In-memory fallback
    return this.checkRateLimitFallback(key, maxRequests, windowSeconds);
  }

  /**
   * In-memory fallback for rate limiting
   */
  checkRateLimitFallback(key, maxRequests, windowSeconds) {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const record = this.fallbackStore.get(key);

    if (!record || now > record.resetTime) {
      // New window or expired
      this.fallbackStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: new Date(now + windowMs),
        resetIn: windowSeconds,
      };
    }

    if (record.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(record.resetTime),
        resetIn: Math.ceil((record.resetTime - now) / 1000),
      };
    }

    record.count++;
    return {
      allowed: true,
      remaining: maxRequests - record.count,
      resetAt: new Date(record.resetTime),
      resetIn: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  /**
   * Increment rate limit counter (alternative method using simple INCR)
   * @param {string} key - Rate limit key
   * @param {number} maxRequests - Maximum requests allowed
   * @param {number} windowSeconds - Time window in seconds
   * @returns {Object} - { allowed: boolean, count: number, remaining: number }
   */
  async increment(key, maxRequests, windowSeconds) {
    const redisKey = `ratelimit:${key}:${windowSeconds}`;

    if (this.isConnected && this.client) {
      try {
        const count = await this.client.incr(redisKey);
        
        if (count === 1) {
          // First request, set expiry
          await this.client.expire(redisKey, windowSeconds);
        }

        const allowed = count <= maxRequests;
        const remaining = Math.max(0, maxRequests - count);

        return { allowed, count, remaining };
      } catch (error) {
        console.error('[ERROR] Redis increment error, falling back:', error);
        this.isConnected = false;
        // Fall through to fallback
      }
    }

    // In-memory fallback
    const result = this.checkRateLimitFallback(key, maxRequests, windowSeconds);
    return {
      allowed: result.allowed,
      count: maxRequests - result.remaining,
      remaining: result.remaining,
    };
  }

  /**
   * Reset rate limit for a key
   * @param {string} key - Rate limit key
   * @param {number} windowSeconds - Time window in seconds
   */
  async reset(key, windowSeconds) {
    const redisKey = `ratelimit:${key}:${windowSeconds}`;

    if (this.isConnected && this.client) {
      try {
        await this.client.del(redisKey);
      } catch (error) {
        console.error('[ERROR] Redis reset error:', error);
      }
    }

    // Also clear from fallback
    this.fallbackStore.delete(key);
  }

  /**
   * Cleanup expired entries from fallback store
   */
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.fallbackStore.entries()) {
      if (now > record.resetTime) {
        this.fallbackStore.delete(key);
      }
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

// Singleton instance
const rateLimiter = new RedisRateLimiter();

// Cleanup fallback store every hour
setInterval(() => {
  rateLimiter.cleanup();
}, 60 * 60 * 1000);

/**
 * Express middleware factory for rate limiting
 * @param {Object} options - Rate limit options
 * @param {number} options.maxRequests - Maximum requests allowed
 * @param {number} options.windowSeconds - Time window in seconds
 * @param {Function} options.keyGenerator - Function to generate rate limit key from request
 * @param {Function} options.skip - Function to skip rate limiting for certain requests
 * @returns {Function} - Express middleware
 */
const rateLimitMiddleware = (options = {}) => {
  const {
    maxRequests = 100,
    windowSeconds = 60,
    keyGenerator = (req) => {
      const userId = req.user?.id || req.user?.userId || req.ip;
      const path = req.path;
      return `${userId}:${path}`;
    },
    skip = () => false,
  } = options;

  return async (req, res, next) => {
    try {
      // Skip rate limiting if skip function returns true
      if (skip(req)) {
        return next();
      }

      const key = keyGenerator(req);
      const result = await rateLimiter.checkRateLimit(key, maxRequests, windowSeconds);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.floor(result.resetAt.getTime() / 1000));

      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later',
          data: {
            retryAfter: result.resetIn,
            resetAt: result.resetAt.toISOString(),
          },
        });
      }

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
};

module.exports = {
  RedisRateLimiter,
  rateLimiter,
  rateLimitMiddleware,
};

