import { Platform } from 'react-native';

/**
 * Cross-platform event emitter
 * Works in React Native (iOS/Android) and Web
 */
class EventEmitter {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  /**
   * Add event listener
   */
  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);

    const listenerCount = this.listeners.get(event)!.size;
    console.log(
      `[APPEVENTS] Registered listener for event: ${event}. Total listeners: ${listenerCount}`
    );

    // Return unsubscribe function
    return () => {
      console.log(`[APPEVENTS] Unregistering listener for event: ${event}`);
      this.off(event, callback);
      const remainingCount = this.listeners.get(event)?.size || 0;
      console.log(
        `[APPEVENTS] Remaining listeners for ${event}: ${remainingCount}`
      );
    };
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: (data: any) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit event
   */
  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    const listenerCount = callbacks ? callbacks.size : 0;

    console.log(`[APPEVENTS] Emitting event: ${event}`, {
      listenerCount,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      notificationId: data?.notification_id || data?.id,
    });

    if (callbacks) {
      // Clone the set to avoid issues if listeners modify during iteration
      const callbacksArray = Array.from(callbacks);
      console.log(
        `[APPEVENTS] Calling ${callbacksArray.length} listener(s) for event: ${event}`
      );
      callbacksArray.forEach((callback, index) => {
        try {
          console.log(
            `[APPEVENTS] Calling listener ${index + 1}/${
              callbacksArray.length
            } for ${event}`
          );
          callback(data);
          console.log(
            `[APPEVENTS] Listener ${index + 1}/${
              callbacksArray.length
            } completed for ${event}`
          );
        } catch (error) {
          console.error(
            `[APPEVENTS] Error in event listener for ${event}:`,
            error
          );
        }
      });
    } else {
      console.warn(
        `[APPEVENTS] ⚠️ No listeners registered for event: ${event}`
      );
    }

    // Also emit to window for web compatibility (if running on web)
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.dispatchEvent
    ) {
      try {
        window.dispatchEvent(new CustomEvent(event, { detail: data }));
      } catch (error) {
        // Ignore errors in web dispatch
      }
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Create singleton instance
export const eventEmitter = new EventEmitter();

/**
 * Platform-agnostic event utilities
 */
export const AppEvents = {
  /**
   * Add event listener
   * @param event Event name
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  on: (event: string, callback: (data: any) => void): (() => void) => {
    console.log(
      `[APPEVENTS] AppEvents.on called for event: ${event}`,
      Platform.OS === 'web' ? '(web)' : '(native)'
    );

    // Use native EventEmitter for React Native
    const unsubscribe = eventEmitter.on(event, callback);

    // Also listen on window for web compatibility
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.addEventListener
    ) {
      const handleEvent = (e: Event) => {
        const customEvent = e as CustomEvent;
        callback(customEvent.detail);
      };
      window.addEventListener(event, handleEvent);
      console.log(
        `[APPEVENTS] Also registered window listener for ${event} (web)`
      );
      return () => {
        console.log(`[APPEVENTS] Unsubscribing from ${event} (web)`);
        unsubscribe();
        window.removeEventListener(event, handleEvent);
      };
    }

    return unsubscribe;
  },

  /**
   * Remove event listener
   */
  off: (event: string, callback: (data: any) => void): void => {
    eventEmitter.off(event, callback);

    // Also remove from window for web compatibility
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.removeEventListener
    ) {
      // Note: We can't easily remove window listeners without the original handler
      // This is a limitation, but the EventEmitter will handle it
    }
  },

  /**
   * Emit event
   */
  emit: (event: string, data?: any): void => {
    console.log(`[APPEVENTS] AppEvents.emit called for event: ${event}`, {
      hasData: !!data,
      notificationId: data?.notification_id || data?.id,
      title: data?.title,
    });
    eventEmitter.emit(event, data);
  },
};
