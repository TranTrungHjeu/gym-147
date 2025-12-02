/**
 * Centralized Event Manager Service
 * Manages all custom events in a centralized way with type safety and validation
 */

export type EventType =
  // Member events
  | 'member:created'
  | 'member:updated'
  | 'member:deleted'
  | 'member:status_changed'
  // Trainer events
  | 'trainer:created'
  | 'trainer:updated'
  | 'trainer:deleted'
  // Booking events
  | 'booking:new'
  | 'booking:updated'
  | 'booking:confirmed'
  | 'booking:cancelled'
  | 'booking:status_changed'
  // Schedule events
  | 'schedule:new'
  | 'schedule:updated'
  | 'schedule:deleted'
  | 'schedule:status_changed'
  // Certification events
  | 'certification:upload'
  | 'certification:pending'
  | 'certification:verified'
  | 'certification:rejected'
  | 'certification:deleted'
  | 'certification:status'
  | 'certification:updated'
  | 'certification:created'
  // Notification events
  | 'notification:new'
  // Member check-in
  | 'member:checked_in'
  // User deletion events
  | 'user:deleted'
  // Socket connection events
  | 'socket:connection_state';

export interface EventData {
  [key: string]: any;
}

export interface EventSubscription {
  id: string;
  eventType: EventType;
  callback: (data: EventData) => void;
  once?: boolean;
}

export interface EventHistoryEntry {
  eventType: EventType;
  data: EventData;
  timestamp: number;
}

class EventManagerService {
  private subscriptions: Map<EventType, Set<EventSubscription>> = new Map();
  private eventHistory: EventHistoryEntry[] = [];
  private maxHistorySize = 100;
  private isEnabled = true;

  /**
   * Subscribe to an event
   */
  subscribe(eventType: EventType, callback: (data: EventData) => void, once = false): string {
    if (!this.isEnabled) {
      console.warn(`[WARNING] EventManager is disabled, subscription to ${eventType} ignored`);
      return '';
    }

    const subscriptionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      callback,
      once,
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
    }

    this.subscriptions.get(eventType)!.add(subscription);

    // Also subscribe to window events for backward compatibility
    const windowHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      callback(customEvent.detail || {});
      
      if (once) {
        this.unsubscribe(subscriptionId);
        window.removeEventListener(eventType, windowHandler);
      }
    };

    window.addEventListener(eventType, windowHandler);

    return subscriptionId;
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      const subscription = Array.from(subscriptions).find(s => s.id === subscriptionId);
      if (subscription) {
        subscriptions.delete(subscription);
        return true;
      }
    }
    return false;
  }

  /**
   * Unsubscribe all subscriptions for an event type
   */
  unsubscribeAll(eventType: EventType): void {
    this.subscriptions.delete(eventType);
    // Note: We don't remove window listeners here as they might be used by other code
  }

  /**
   * Dispatch an event
   */
  dispatch(eventType: EventType, data: EventData = {}): void {
    if (!this.isEnabled) {
      console.warn(`[WARNING] EventManager is disabled, dispatch of ${eventType} ignored`);
      return;
    }

    // Validate event data
    if (!this.validateEvent(eventType, data)) {
      console.warn(`[WARNING] Invalid event data for ${eventType}:`, data);
      return;
    }

    // Add to history
    this.addToHistory(eventType, data);

    // Notify subscribers
    const subscriptions = this.subscriptions.get(eventType);
    if (subscriptions) {
      subscriptions.forEach(subscription => {
        try {
          subscription.callback(data);
          
          // Remove if once subscription
          if (subscription.once) {
            subscriptions.delete(subscription);
          }
        } catch (error) {
          console.error(`[ERROR] Error in event subscription for ${eventType}:`, error);
        }
      });
    }

    // Also dispatch window event for backward compatibility
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent(eventType, { detail: data }));
    }
  }

  /**
   * Validate event data
   */
  private validateEvent(eventType: EventType, data: EventData): boolean {
    // Basic validation - can be extended
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    // Type-specific validation
    switch (eventType) {
      case 'member:created':
      case 'member:updated':
      case 'member:deleted':
        return !!(data.member_id || data.id);
      
      case 'trainer:created':
      case 'trainer:updated':
      case 'trainer:deleted':
        return !!(data.trainer_id || data.id);
      
      case 'booking:new':
      case 'booking:updated':
      case 'booking:confirmed':
      case 'booking:cancelled':
        return !!(data.booking_id || data.id);
      
      case 'schedule:new':
      case 'schedule:updated':
      case 'schedule:deleted':
        return !!(data.schedule_id || data.id);
      
      case 'certification:upload':
      case 'certification:pending':
      case 'certification:verified':
      case 'certification:rejected':
      case 'certification:deleted':
        return !!(data.certification_id || data.id);
      
      case 'user:deleted':
        return !!(data.user_id || data.id);
      
      default:
        return true; // Allow other events
    }
  }

  /**
   * Add event to history
   */
  private addToHistory(eventType: EventType, data: EventData): void {
    this.eventHistory.push({
      eventType,
      data,
      timestamp: Date.now(),
    });

    // Limit history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get event history
   */
  getHistory(eventType?: EventType, limit = 50): EventHistoryEntry[] {
    let history = [...this.eventHistory];
    
    if (eventType) {
      history = history.filter(e => e.eventType === eventType);
    }
    
    return history.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get subscription count for an event type
   */
  getSubscriptionCount(eventType: EventType): number {
    return this.subscriptions.get(eventType)?.size || 0;
  }

  /**
   * Get all subscription counts
   */
  getAllSubscriptionCounts(): Map<EventType, number> {
    const counts = new Map<EventType, number>();
    this.subscriptions.forEach((subscriptions, eventType) => {
      counts.set(eventType, subscriptions.size);
    });
    return counts;
  }

  /**
   * Enable/disable event manager
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if event manager is enabled
   */
  isEventManagerEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Remove all subscriptions
   */
  clearAllSubscriptions(): void {
    this.subscriptions.clear();
  }
}

export const eventManager = new EventManagerService();

// Export convenience functions
export const subscribe = (eventType: EventType, callback: (data: EventData) => void, once = false) => 
  eventManager.subscribe(eventType, callback, once);

export const unsubscribe = (subscriptionId: string) => 
  eventManager.unsubscribe(subscriptionId);

export const dispatch = (eventType: EventType, data: EventData = {}) => 
  eventManager.dispatch(eventType, data);

