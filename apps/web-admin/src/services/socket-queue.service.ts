/**
 * Socket Event Queue Service
 * Stores events when socket is disconnected and replays them when reconnected
 */

export interface QueuedEvent {
  id: string;
  eventName: string;
  data: any;
  timestamp: number;
  service: 'schedule' | 'member';
  priority: 'high' | 'normal' | 'low';
}

class SocketQueueService {
  private queue: QueuedEvent[] = [];
  private maxQueueSize = 100;
  private replayCallbacks: Map<string, (event: QueuedEvent) => void> = new Map();

  /**
   * Add event to queue
   */
  enqueue(eventName: string, data: any, service: 'schedule' | 'member' = 'schedule', priority: 'high' | 'normal' | 'low' = 'normal'): void {
    const event: QueuedEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventName,
      data,
      timestamp: Date.now(),
      service,
      priority,
    };

    // Add to queue
    this.queue.push(event);

    // Sort by priority (high first) and timestamp
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    // Limit queue size
    if (this.queue.length > this.maxQueueSize) {
      // Remove oldest low-priority events first
      const lowPriorityIndex = this.queue.findIndex(e => e.priority === 'low');
      if (lowPriorityIndex !== -1) {
        this.queue.splice(lowPriorityIndex, 1);
      } else {
        this.queue.shift(); // Remove oldest
      }
    }

    // Persist critical events to localStorage
    if (priority === 'high') {
      this.persistEvent(event);
    }
  }

  /**
   * Get all queued events
   */
  getQueue(): QueuedEvent[] {
    return [...this.queue];
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.queue = [];
    this.clearPersistedEvents();
  }

  /**
   * Replay all queued events
   */
  replay(callback: (event: QueuedEvent) => void): void {
    const eventsToReplay = [...this.queue];
    this.queue = [];

    eventsToReplay.forEach(event => {
      try {
        callback(event);
      } catch (error) {
        console.error(`❌ Error replaying event ${event.eventName}:`, error);
        // Re-queue failed events
        this.enqueue(event.eventName, event.data, event.service, event.priority);
      }
    });

    this.clearPersistedEvents();
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Persist critical event to localStorage
   */
  private persistEvent(event: QueuedEvent): void {
    try {
      const persisted = this.getPersistedEvents();
      persisted.push(event);
      // Keep only last 20 critical events
      if (persisted.length > 20) {
        persisted.shift();
      }
      localStorage.setItem('socket_queue_events', JSON.stringify(persisted));
    } catch (error) {
      console.warn('⚠️ Failed to persist event to localStorage:', error);
    }
  }

  /**
   * Get persisted events from localStorage
   */
  private getPersistedEvents(): QueuedEvent[] {
    try {
      const stored = localStorage.getItem('socket_queue_events');
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.warn('⚠️ Failed to read persisted events from localStorage:', error);
      return [];
    }
  }

  /**
   * Clear persisted events
   */
  private clearPersistedEvents(): void {
    try {
      localStorage.removeItem('socket_queue_events');
    } catch (error) {
      console.warn('⚠️ Failed to clear persisted events from localStorage:', error);
    }
  }

  /**
   * Restore persisted events on startup
   */
  restorePersistedEvents(): QueuedEvent[] {
    const persisted = this.getPersistedEvents();
    // Only restore events from last 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentEvents = persisted.filter(e => e.timestamp > oneHourAgo);
    
    if (recentEvents.length > 0) {
      this.queue.push(...recentEvents);
      this.clearPersistedEvents();
    }
    
    return recentEvents;
  }
}

export const socketQueueService = new SocketQueueService();

