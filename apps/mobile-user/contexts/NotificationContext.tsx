import { notificationService } from '@/services/member/notification.service';
import { Socket, io } from 'socket.io-client';
import { Platform } from 'react-native';
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { useAuth } from './AuthContext';
import { AppEvents } from '@/utils/eventEmitter';

interface NotificationContextType {
  unreadCount: number;
  incrementCount: () => void;
  decrementCount: () => void;
  refreshCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const { user, member } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const identitySocketRef = useRef<Socket | null>(null); // Socket for identity service (bulk notifications)
  const isInitializedRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastErrorTimeRef = useRef(0);

  // Initialize socket connection for notifications
  useEffect(() => {
    if (!user?.id || isInitializedRef.current) return;

    const initSocket = (usePolling = false) => {
      try {
        const { SERVICE_URLS } = require('@/config/environment');

        // Create socket connection to member service
        // If websocket fails, fallback to polling
        const socket = io(SERVICE_URLS.MEMBER, {
          transports: usePolling ? ['polling'] : ['polling', 'websocket'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity, // Keep trying to reconnect
          timeout: 20000,
          // CORS configuration for web
          withCredentials: false,
          // Allow socket on all platforms including web
          forceNew: false,
          autoConnect: true,
        });

        socket.on('connect', () => {
          console.log(
            '[BELL] Notification socket connected',
            usePolling ? '(polling)' : '(websocket)'
          );
          retryCountRef.current = 0;
          lastErrorTimeRef.current = 0;

          // Subscribe to user-specific room for notifications
          if (user.id) {
            try {
              socket.emit('subscribe:user', user.id);
              console.log('[BELL] Subscribed to user room:', user.id);
            } catch (error) {
              console.error('[BELL] Error subscribing to user room:', error);
            }
          }
        });

        socket.on('disconnect', (reason) => {
          console.log('[BELL] Notification socket disconnected:', reason);
          // If disconnected unexpectedly, try to reconnect
          if (
            reason === 'io server disconnect' ||
            reason === 'transport close'
          ) {
            console.log('[BELL] Attempting to reconnect...');
          }
        });

        socket.on('reconnect', (attemptNumber) => {
          console.log(
            `[BELL] Notification socket reconnected after ${attemptNumber} attempts`
          );
          retryCountRef.current = 0;
          // Re-subscribe to user room after reconnection
          if (user.id) {
            try {
              socket.emit('subscribe:user', user.id);
              console.log('[BELL] Re-subscribed to user room:', user.id);
            } catch (error) {
              console.error('[BELL] Error re-subscribing to user room:', error);
            }
          }
        });

        socket.on('reconnect_attempt', (attemptNumber) => {
          console.log(`[BELL] Reconnection attempt ${attemptNumber}...`);
        });

        socket.on('reconnect_error', (error) => {
          console.warn('[BELL] Reconnection error:', error.message);
        });

        socket.on('reconnect_failed', () => {
          console.error('[BELL] Failed to reconnect after all attempts');
          // Try to reinitialize with polling as fallback
          if (!usePolling && retryCountRef.current < 2) {
            retryCountRef.current++;
            setTimeout(() => {
              if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                isInitializedRef.current = false;
                initSocket(true); // Retry with polling only
              }
            }, 5000);
          }
        });

        // Cleanup reward listeners on unmount
        return () => {
          socket.off('reward:redeemed');
          socket.off('reward:refunded');
          socket.off('reward:used');
          socket.off('reward:expired');
          socket.off('points:updated');
        };

        socket.on('connect_error', (error) => {
          const now = Date.now();
          const isCorsError =
            error.message?.includes('CORS') ||
            error.message?.includes('Access-Control-Allow-Origin') ||
            error.message?.includes('xhr poll error');

          // Only log error if it's been more than 10 seconds since last error (reduce spam)
          if (now - lastErrorTimeRef.current > 10000) {
            if (Platform.OS === 'web' && isCorsError) {
              console.warn(
                '[BELL] Socket CORS error (will keep retrying):',
                error.message
              );
            } else {
              console.warn(
                '[BELL] Notification socket connection error (will retry):',
                error.message
              );
            }
            lastErrorTimeRef.current = now;
          }

          // If websocket fails and we haven't tried polling yet, retry with polling
          if (!usePolling && retryCountRef.current === 0) {
            retryCountRef.current++;
            console.log('[BELL] Retrying with polling transport...');
            // Clear any existing timeout
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
            }
            retryTimeoutRef.current = setTimeout(() => {
              if (socketRef.current) {
                try {
                  socketRef.current.disconnect();
                } catch (disconnectError) {
                  console.error(
                    '[BELL] Error disconnecting socket:',
                    disconnectError
                  );
                }
                socketRef.current = null;
                isInitializedRef.current = false;
                initSocket(true); // Retry with polling only
              }
              retryTimeoutRef.current = null;
            }, 2000);
          }
        });

        // Listen for new notification events
        socket.on('notification:new', (data: any) => {
          try {
            console.log(
              '[BELL] 🔔 notification:new received from member service:',
              JSON.stringify(data, null, 2)
            );
            console.log('[BELL] Socket connection status:', {
              connected: socket.connected,
              id: socket.id,
            });

            setUnreadCount((prev) => {
              const newCount = prev + 1;
              console.log(
                `[BELL] Updating unread count: ${prev} -> ${newCount}`
              );
              return newCount;
            });

            // Emit event for NotificationCenterScreen to listen
            console.log(
              '[BELL] Emitting AppEvents.emit("notification:new", data)',
              {
                notificationId: data?.notification_id || data?.id,
                title: data?.title,
              }
            );
            AppEvents.emit('notification:new', data);
            console.log('[BELL] ✅ AppEvents.emit completed');
          } catch (error) {
            console.error(
              '[BELL] ❌ Error handling notification:new event:',
              error
            );
          }
        });

        // Listen for notification read events
        socket.on('notification:read', (data: any) => {
          try {
            console.log('[BELL] Notification read:', data);
            if (data.all) {
              // Mark all as read - count should be 0
              setUnreadCount(0);
            } else if (data.bulk && data.updated_count) {
              // Bulk mark as read - decrease by updated_count
              setUnreadCount((prev) => Math.max(0, prev - data.updated_count));
            } else {
              // Single notification read
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }

            // Emit event for NotificationCenterScreen to listen
            AppEvents.emit('notification:read', data);
          } catch (error) {
            console.error(
              '[BELL] Error handling notification:read event:',
              error
            );
          }
        });

        // Listen for notification count update
        socket.on(
          'notification:count_updated',
          (data: { count: number; user_id?: string }) => {
            try {
              // Only update if this update is for the current user
              if (!data.user_id || data.user_id === user.id) {
                console.log('[BELL] Notification count updated:', data.count);
                setUnreadCount(data.count);

                // Emit event for NotificationCenterScreen to listen
                AppEvents.emit('notification:count_updated', data);
              }
            } catch (error) {
              console.error(
                '[BELL] Error handling notification:count_updated event:',
                error
              );
            }
          }
        );

        // Listen for reward redemption events
        socket.on('reward:redeemed', (data: any) => {
          console.log('[GIFT] Reward redeemed event received:', data);
          // Emit event for other components to listen
          AppEvents.emit('reward:redeemed', data);
        });

        socket.on('reward:refunded', (data: any) => {
          console.log('[REWARD] Reward refunded event received:', data);
          AppEvents.emit('reward:refunded', data);
        });

        socket.on('reward:used', (data: any) => {
          console.log('[SUCCESS] Reward used event received:', data);
          AppEvents.emit('reward:used', data);
        });

        socket.on('reward:expired', (data: any) => {
          console.log('[TIME] Reward expired event received:', data);
          AppEvents.emit('reward:expired', data);
        });

        // Listen for points updates
        socket.on('points:updated', (data: any) => {
          console.log('[POINTS] Points updated event received:', data);
          // Emit event for other components to listen
          AppEvents.emit('points:updated', data);
        });

        // Listen for user:deleted event (account deletion)
        socket.on('user:deleted', (data: any) => {
          console.log('[ALERT] user:deleted event received:', data);
          // Emit event for AuthContext to handle logout
          AppEvents.emit('user:deleted', data);
        });

        // Queue events
        socket.on('queue:joined', (data: any) => {
          console.log('[QUEUE] Queue joined event received:', data);
          refreshCount();
        });
        socket.on('queue:position_updated', (data: any) => {
          console.log('[DATA] Queue position updated event received:', data);
          refreshCount();
        });
        socket.on('queue:your_turn', (data: any) => {
          console.log('[QUEUE] Queue your turn event received:', data);
          refreshCount();
        });
        socket.on('queue:expired', (data: any) => {
          console.log('[TIME] Queue expired event received:', data);
          refreshCount();
        });

        // Equipment events
        socket.on('equipment:available', (data: any) => {
          console.log('[EQUIPMENT] Equipment available event received:', data);
          refreshCount();
        });

        // Payment events
        socket.on('payment:success', (data: any) => {
          console.log('[PAYMENT] Payment success event received:', data);
          refreshCount();
        });
        socket.on('payment:failed', (data: any) => {
          console.log('[ERROR] Payment failed event received:', data);
          refreshCount();
        });

        // Subscription events
        socket.on('subscription:created', (data: any) => {
          console.log(
            '[SUBSCRIPTION] Subscription created event received:',
            data
          );
          refreshCount();
        });
        socket.on('subscription:renewed', (data: any) => {
          console.log(
            '[SUBSCRIPTION] Subscription renewed event received:',
            data
          );
          refreshCount();
        });
        socket.on('subscription:expired', (data: any) => {
          console.log(
            '[SUBSCRIPTION] Subscription expired event received:',
            data
          );
          refreshCount();
        });

        // Invoice events
        socket.on('invoice:generated', (data: any) => {
          console.log('[INVOICE] Invoice generated event received:', data);
          refreshCount();
        });

        // Class reminder events
        socket.on('class:reminder', (data: any) => {
          console.log('[TIME] Class reminder event received:', data);
          refreshCount();
        });

        // Schedule change events
        socket.on('schedule:changed', (data: any) => {
          console.log('[DATE] Schedule changed event received:', data);
          refreshCount();
        });

        // System announcement events
        socket.on('system:announcement', (data: any) => {
          console.log('[NOTIFY] System announcement event received:', data);
          setUnreadCount((prev) => prev + 1);
          // Emit event for NotificationCenterScreen to listen
          AppEvents.emit('notification:new', {
            notification_id: `system_announcement_${Date.now()}`,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: data.title || 'Thông báo hệ thống',
            message: data.message || '',
            data: data.data || {},
            created_at: data.created_at || new Date().toISOString(),
          });
          refreshCount();
        });

        // Admin system announcement events (from member service)
        socket.on('admin:system:announcement', (data: any) => {
          try {
            console.log(
              '[NOTIFY] Admin system announcement event received:',
              data
            );
            setUnreadCount((prev) => prev + 1);

            // Emit event for NotificationCenterScreen to listen
            AppEvents.emit('notification:new', {
              notification_id: `admin_system_announcement_${Date.now()}`,
              type: 'SYSTEM_ANNOUNCEMENT',
              title: data.title || 'Thông báo hệ thống',
              message: data.message || '',
              data: data.data || {},
              created_at: data.created_at || new Date().toISOString(),
            });
            refreshCount();
          } catch (error) {
            console.error(
              '[BELL] Error handling admin:system:announcement event:',
              error
            );
          }
        });

        socketRef.current = socket;
        isInitializedRef.current = true;
      } catch (error) {
        console.error('[BELL] Error initializing notification socket:', error);
        // Don't block app functionality if socket fails
      }
    };

    // Initialize identity service socket for bulk notifications
    const initIdentitySocket = () => {
      if (!user?.id) return;

      try {
        const { SERVICE_URLS } = require('@/config/environment');

        // Create socket connection to identity service for bulk notifications
        const identitySocket = io(SERVICE_URLS.IDENTITY, {
          transports: ['polling', 'websocket'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity,
          timeout: 20000,
          withCredentials: false,
          forceNew: false,
          autoConnect: true,
        });

        identitySocket.on('connect', () => {
          console.log('[BELL] Identity service socket connected');

          // Subscribe to user-specific room for notifications
          if (user.id) {
            try {
              identitySocket.emit('subscribe:user', user.id);
              console.log(
                '[BELL] Subscribed to identity service user room:',
                user.id
              );
              console.log(
                '[BELL] Socket will receive notifications for room:',
                `user:${user.id}`
              );
            } catch (error) {
              console.error(
                '[BELL] Error subscribing to identity service user room:',
                error
              );
            }
          } else {
            console.warn('[BELL] Cannot subscribe: user.id is missing');
          }
        });

        identitySocket.on('disconnect', (reason) => {
          console.log('[BELL] Identity service socket disconnected:', reason);
        });

        identitySocket.on('reconnect', (attemptNumber) => {
          console.log(
            `[BELL] Identity service socket reconnected after ${attemptNumber} attempts`
          );
          // Re-subscribe to user room after reconnection
          if (user.id) {
            try {
              identitySocket.emit('subscribe:user', user.id);
              console.log(
                '[BELL] Re-subscribed to identity service user room:',
                user.id
              );
            } catch (error) {
              console.error(
                '[BELL] Error re-subscribing to identity service user room:',
                error
              );
            }
          }
        });

        // Listen for admin bulk notification events (from identity service)
        // Note: This event is emitted along with notification:new, so we only handle it
        // to emit AppEvents, but don't increment count here to avoid double counting
        identitySocket.on('admin:bulk:notification', (data: any) => {
          try {
            console.log(
              '[BELL] Admin bulk notification received from identity service:',
              data
            );
            // Don't increment count here - notification:new will handle it
            // This event is just for identification purposes

            // Emit event for NotificationCenterScreen to listen
            AppEvents.emit('notification:new', data);
          } catch (error) {
            console.error(
              '[BELL] Error handling admin:bulk:notification event:',
              error
            );
          }
        });

        // Listen for notification:new events from identity service (worker emits these)
        // This is the main event that should update the badge
        identitySocket.on('notification:new', (data: any) => {
          try {
            console.log(
              '[BELL] 🔔 notification:new received from identity service:',
              JSON.stringify(data, null, 2)
            );
            console.log('[BELL] Socket connection status:', {
              connected: identitySocket.connected,
              id: identitySocket.id,
            });

            setUnreadCount((prev) => {
              const newCount = prev + 1;
              console.log(
                `[BELL] Updating unread count: ${prev} -> ${newCount}`
              );
              return newCount;
            });

            // Emit event for NotificationCenterScreen to listen
            console.log(
              '[BELL] Emitting AppEvents.emit("notification:new", data)',
              {
                notificationId: data?.notification_id || data?.id,
                title: data?.title,
              }
            );
            AppEvents.emit('notification:new', data);
            console.log('[BELL] ✅ AppEvents.emit completed');
          } catch (error) {
            console.error(
              '[BELL] ❌ Error handling notification:new event from identity service:',
              error
            );
          }
        });

        identitySocketRef.current = identitySocket;
      } catch (error) {
        console.error(
          '[BELL] Error initializing identity service socket:',
          error
        );
        // Don't block app functionality if socket fails
      }
    };

    initSocket();
    initIdentitySocket();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (socketRef.current) {
        console.log('[BELL] Cleaning up notification socket');
        socketRef.current.off('notification:new');
        socketRef.current.off('notification:read');
        socketRef.current.off('notification:count_updated');
        socketRef.current.off('reward:redeemed');
        socketRef.current.off('reward:refunded');
        socketRef.current.off('reward:used');
        socketRef.current.off('reward:expired');
        socketRef.current.off('points:updated');
        socketRef.current.off('user:deleted');
        socketRef.current.off('queue:joined');
        socketRef.current.off('queue:position_updated');
        socketRef.current.off('queue:your_turn');
        socketRef.current.off('queue:expired');
        socketRef.current.off('equipment:available');
        socketRef.current.off('payment:success');
        socketRef.current.off('payment:failed');
        socketRef.current.off('subscription:created');
        socketRef.current.off('subscription:renewed');
        socketRef.current.off('subscription:expired');
        socketRef.current.off('invoice:generated');
        socketRef.current.off('class:reminder');
        socketRef.current.off('schedule:changed');
        socketRef.current.off('system:announcement');
        socketRef.current.off('admin:system:announcement');
        socketRef.current.disconnect();
        socketRef.current = null;
        isInitializedRef.current = false;
        retryCountRef.current = 0;
      }
      if (identitySocketRef.current) {
        console.log('[BELL] Cleaning up identity service socket');
        identitySocketRef.current.off('admin:bulk:notification');
        identitySocketRef.current.off('notification:new');
        identitySocketRef.current.disconnect();
        identitySocketRef.current = null;
      }
    };
  }, [user?.id]);

  const refreshCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const count = await notificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error refreshing notification count:', error);
      // Don't update count on error - keep current value
    }
  }, [user?.id]);

  // Load initial notification count
  useEffect(() => {
    if (user?.id) {
      refreshCount();
    }
  }, [user?.id, refreshCount]);

  // Periodic refresh as fallback (if socket fails to connect)
  // This ensures notification count is updated even if socket doesn't work
  useEffect(() => {
    if (user?.id) {
      const interval = setInterval(() => {
        // Only refresh if socket is not connected
        if (!socketRef.current?.connected) {
          refreshCount();
        }
      }, 60000); // Refresh every 60 seconds as fallback

      return () => {
        clearInterval(interval);
      };
    }
  }, [user?.id, refreshCount]);

  const incrementCount = () => {
    setUnreadCount((prev) => prev + 1);
  };

  const decrementCount = () => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        incrementCount,
        decrementCount,
        refreshCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
};
