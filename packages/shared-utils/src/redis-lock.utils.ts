import { createClient, RedisClientType } from 'redis';

/**
 * Distributed Lock Utility using Redis SET NX EX
 * Implements distributed locks with automatic expiration and retry mechanism
 */

interface LockOptions {
  ttl?: number; // Time to live in seconds (default: 30)
  retryAttempts?: number; // Maximum retry attempts (default: 3)
  retryDelay?: number; // Initial retry delay in milliseconds (default: 100)
  retryBackoff?: number; // Exponential backoff multiplier (default: 2)
}

interface LockResult {
  acquired: boolean;
  lockId?: string;
  error?: string;
}

class DistributedLock {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;
  private lockIdCounter: number = 0;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Redis client
   */
  private async initialize() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Redis Lock: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis Lock Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('ready', () => {
        console.log('✅ Redis Lock: Connected and ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('🔌 Redis Lock: Connection closed');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
    } catch (error) {
      console.error('❌ Failed to initialize Redis Lock:', error);
      console.log('⚠️ Distributed locks will not be available');
      this.isConnected = false;
    }
  }

  /**
   * Generate unique lock ID
   */
  private generateLockId(): string {
    this.lockIdCounter = (this.lockIdCounter + 1) % 1000000;
    return `${Date.now()}-${process.pid}-${this.lockIdCounter}`;
  }

  /**
   * Acquire a distributed lock
   * @param resource - Resource identifier (e.g., 'booking', 'queue')
   * @param resourceId - Specific resource ID
   * @param options - Lock options
   * @returns Lock result with lockId if acquired
   */
  async acquire(
    resource: string,
    resourceId: string,
    options: LockOptions = {}
  ): Promise<LockResult> {
    const {
      ttl = 30, // Default 30 seconds
      retryAttempts = 3,
      retryDelay = 100,
      retryBackoff = 2,
    } = options;

    const lockKey = `lock:${resource}:${resourceId}`;
    const lockId = this.generateLockId();

    if (!this.isConnected || !this.client) {
      return {
        acquired: false,
        error: 'Redis not connected',
      };
    }

    // Try to acquire lock with retries
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        // Use SET NX EX to atomically set lock with expiration
        const result = await this.client.set(lockKey, lockId, {
          NX: true, // Only set if not exists
          EX: ttl, // Set expiration in seconds
        });

        if (result === 'OK') {
          return {
            acquired: true,
            lockId,
          };
        }

        // Lock already exists, wait and retry
        if (attempt < retryAttempts) {
          const delay = retryDelay * Math.pow(retryBackoff, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`❌ Error acquiring lock (attempt ${attempt + 1}):`, error);
        if (attempt === retryAttempts) {
          return {
            acquired: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
        // Wait before retry
        const delay = retryDelay * Math.pow(retryBackoff, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      acquired: false,
      error: 'Failed to acquire lock after retries',
    };
  }

  /**
   * Release a distributed lock
   * @param resource - Resource identifier
   * @param resourceId - Specific resource ID
   * @param lockId - Lock ID returned from acquire
   * @returns True if released successfully
   */
  async release(
    resource: string,
    resourceId: string,
    lockId: string
  ): Promise<boolean> {
    const lockKey = `lock:${resource}:${resourceId}`;

    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      // Use Lua script to atomically check and delete lock
      // This ensures we only delete the lock if we own it
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.client.eval(script, {
        keys: [lockKey],
        arguments: [lockId],
      });

      return result === 1;
    } catch (error) {
      console.error('❌ Error releasing lock:', error);
      return false;
    }
  }

  /**
   * Extend lock TTL
   * @param resource - Resource identifier
   * @param resourceId - Specific resource ID
   * @param lockId - Lock ID
   * @param ttl - New TTL in seconds
   * @returns True if extended successfully
   */
  async extend(
    resource: string,
    resourceId: string,
    lockId: string,
    ttl: number
  ): Promise<boolean> {
    const lockKey = `lock:${resource}:${resourceId}`;

    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      // Use Lua script to atomically check and extend lock
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("expire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await this.client.eval(script, {
        keys: [lockKey],
        arguments: [lockId, ttl.toString()],
      });

      return result === 1;
    } catch (error) {
      console.error('❌ Error extending lock:', error);
      return false;
    }
  }

  /**
   * Check if lock exists
   * @param resource - Resource identifier
   * @param resourceId - Specific resource ID
   * @returns True if lock exists
   */
  async exists(resource: string, resourceId: string): Promise<boolean> {
    const lockKey = `lock:${resource}:${resourceId}`;

    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(lockKey);
      return result === 1;
    } catch (error) {
      console.error('❌ Error checking lock existence:', error);
      return false;
    }
  }

  /**
   * Execute a function with a distributed lock
   * @param resource - Resource identifier
   * @param resourceId - Specific resource ID
   * @param fn - Function to execute
   * @param options - Lock options
   * @returns Result of the function or error
   */
  async withLock<T>(
    resource: string,
    resourceId: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const lock = await this.acquire(resource, resourceId, options);

    if (!lock.acquired) {
      throw new Error(`Failed to acquire lock: ${lock.error || 'Unknown error'}`);
    }

    try {
      const result = await fn();
      return result;
    } finally {
      // Always release lock
      await this.release(resource, resourceId, lock.lockId!);
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
const distributedLock = new DistributedLock();

// Export both class and instance
export { DistributedLock, distributedLock };

// JavaScript-compatible export for services that use require()
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DistributedLock, distributedLock };
}

