import { createClient, RedisClientType } from 'redis';

/**
 * Redis Pub/Sub Utility
 * Provides publish/subscribe functionality for real-time event distribution
 * across microservices
 */
class RedisPubSub {
  private publisher: RedisClientType;
  private subscriber: RedisClientType;
  private isConnected: boolean = false;
  private subscriptions: Map<string, Set<(message: string, channel: string) => void>> = new Map();

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    // Create publisher client
    this.publisher = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ RedisPubSub Publisher: Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    // Create subscriber client (separate connection required for pub/sub)
    this.subscriber = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ RedisPubSub Subscriber: Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this.publisher.on('error', (err) => {
      console.error('❌ RedisPubSub Publisher Error:', err);
      this.isConnected = false;
    });

    this.subscriber.on('error', (err) => {
      console.error('❌ RedisPubSub Subscriber Error:', err);
      this.isConnected = false;
    });

    this.publisher.on('ready', () => {
      console.log('✅ RedisPubSub Publisher: Connected and ready');
      this.checkConnection();
    });

    this.subscriber.on('ready', () => {
      console.log('✅ RedisPubSub Subscriber: Connected and ready');
      this.checkConnection();
    });

    // Handle incoming messages
    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });

    // Connect both clients
    this.publisher.connect().catch(err => {
      console.error('❌ Failed to connect RedisPubSub Publisher:', err.message);
      this.isConnected = false;
    });

    this.subscriber.connect().catch(err => {
      console.error('❌ Failed to connect RedisPubSub Subscriber:', err.message);
      this.isConnected = false;
    });
  }

  /**
   * Check if both clients are connected
   */
  private checkConnection() {
    if (this.publisher.isReady && this.subscriber.isReady) {
      this.isConnected = true;
      console.log('✅ RedisPubSub: Both clients connected');
    }
  }

  /**
   * Handle incoming message from subscribed channel
   */
  private handleMessage(channel: string, message: string) {
    const handlers = this.subscriptions.get(channel);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message, channel);
        } catch (error) {
          console.error(`❌ Error in Pub/Sub handler for channel ${channel}:`, error);
        }
      });
    }
  }

  /**
   * Publish a message to a channel
   * @param {string} channel - Channel name (e.g., 'user:login', 'booking:created')
   * @param {any} data - Data to publish (will be JSON stringified)
   * @returns {Promise<number>} - Number of subscribers that received the message
   */
  async publish(channel: string, data: any): Promise<number> {
    if (!this.isConnected || !this.publisher.isReady) {
      console.warn(`⚠️ RedisPubSub not connected, message not published to ${channel}`);
      return 0;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      const subscribers = await this.publisher.publish(channel, message);
      console.log(`📢 Published to ${channel} (${subscribers} subscribers)`);
      return subscribers;
    } catch (error) {
      console.error(`❌ Error publishing to channel ${channel}:`, error);
      return 0;
    }
  }

  /**
   * Subscribe to a channel
   * @param {string} channel - Channel name (e.g., 'user:login', 'booking:created')
   * @param {Function} handler - Callback function to handle messages
   * @returns {Promise<boolean>} - Success status
   */
  async subscribe(channel: string, handler: (message: string, channel: string) => void): Promise<boolean> {
    if (!this.isConnected || !this.subscriber.isReady) {
      console.warn(`⚠️ RedisPubSub not connected, cannot subscribe to ${channel}`);
      return false;
    }

    try {
      // Add handler to subscriptions map
      if (!this.subscriptions.has(channel)) {
        this.subscriptions.set(channel, new Set());
        // Subscribe to channel in Redis
        await this.subscriber.subscribe(channel, (message, channel) => {
          this.handleMessage(channel, message);
        });
        console.log(`📡 Subscribed to channel: ${channel}`);
      }

      this.subscriptions.get(channel)!.add(handler);
      return true;
    } catch (error) {
      console.error(`❌ Error subscribing to channel ${channel}:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe from a channel
   * @param {string} channel - Channel name
   * @param {Function} handler - Optional handler to remove (if not provided, removes all handlers)
   * @returns {Promise<boolean>} - Success status
   */
  async unsubscribe(channel: string, handler?: (message: string, channel: string) => void): Promise<boolean> {
    if (!this.isConnected || !this.subscriber.isReady) {
      return false;
    }

    try {
      const handlers = this.subscriptions.get(channel);
      if (!handlers) {
        return true; // Already unsubscribed
      }

      if (handler) {
        // Remove specific handler
        handlers.delete(handler);
        if (handlers.size === 0) {
          // No more handlers, unsubscribe from Redis
          await this.subscriber.unsubscribe(channel);
          this.subscriptions.delete(channel);
          console.log(`📡 Unsubscribed from channel: ${channel}`);
        }
      } else {
        // Remove all handlers
        await this.subscriber.unsubscribe(channel);
        this.subscriptions.delete(channel);
        console.log(`📡 Unsubscribed from channel: ${channel}`);
      }

      return true;
    } catch (error) {
      console.error(`❌ Error unsubscribing from channel ${channel}:`, error);
      return false;
    }
  }

  /**
   * Subscribe to multiple channels using pattern matching
   * @param {string} pattern - Pattern (e.g., 'user:*', 'booking:*')
   * @param {Function} handler - Callback function to handle messages
   * @returns {Promise<boolean>} - Success status
   */
  async pSubscribe(pattern: string, handler: (message: string, channel: string) => void): Promise<boolean> {
    if (!this.isConnected || !this.subscriber.isReady) {
      console.warn(`⚠️ RedisPubSub not connected, cannot pSubscribe to ${pattern}`);
      return false;
    }

    try {
      await this.subscriber.pSubscribe(pattern, (message, channel) => {
        handler(message, channel);
      });
      console.log(`📡 Pattern subscribed to: ${pattern}`);
      return true;
    } catch (error) {
      console.error(`❌ Error pattern subscribing to ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe from pattern
   * @param {string} pattern - Pattern to unsubscribe from
   * @returns {Promise<boolean>} - Success status
   */
  async pUnsubscribe(pattern: string): Promise<boolean> {
    if (!this.isConnected || !this.subscriber.isReady) {
      return false;
    }

    try {
      await this.subscriber.pUnsubscribe(pattern);
      console.log(`📡 Pattern unsubscribed from: ${pattern}`);
      return true;
    } catch (error) {
      console.error(`❌ Error pattern unsubscribing from ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Disconnect both clients
   */
  async disconnect() {
    try {
      if (this.publisher && this.publisher.isReady) {
        await this.publisher.quit();
      }
      if (this.subscriber && this.subscriber.isReady) {
        await this.subscriber.quit();
      }
      this.isConnected = false;
      this.subscriptions.clear();
      console.log('🔌 RedisPubSub: Disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting RedisPubSub:', error);
    }
  }
}

// Create singleton instance
export const redisPubSub = new RedisPubSub();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redisPubSub.disconnect();
});

process.on('SIGINT', async () => {
  await redisPubSub.disconnect();
});

