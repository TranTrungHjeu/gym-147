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
          console.log('🔔 Notification socket connected', usePolling ? '(polling)' : '(websocket)');
          retryCountRef.current = 0;
          
          // Subscribe to user-specific room for notifications
          if (user.id) {
            socket.emit('subscribe:user', user.id);
            console.log('🔔 Subscribed to user room:', user.id);
          }
        });

        socket.on('disconnect', (reason) => {
          console.log('🔔 Notification socket disconnected:', reason);
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
          const isCorsError = error.message?.includes('CORS') || 
                             error.message?.includes('Access-Control-Allow-Origin') ||
                             error.message?.includes('xhr poll error');
          
          // Only log error if it's been more than 10 seconds since last error (reduce spam)
          if (now - lastErrorTimeRef.current > 10000) {
            if (Platform.OS === 'web' && isCorsError) {
              console.warn('🔔 Socket CORS error (will keep retrying):', error.message);
            } else {
              console.warn('🔔 Notification socket connection error (will retry):', error.message);
            }
            lastErrorTimeRef.current = now;
          }
          
          // If websocket fails and we haven't tried polling yet, retry with polling
          if (!usePolling && retryCountRef.current === 0) {
            retryCountRef.current++;
            console.log('🔔 Retrying with polling transport...');
            setTimeout(() => {
              if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                isInitializedRef.current = false;
                initSocket(true); // Retry with polling only
              }
            }, 2000);
          }
        });

        // Listen for new notification events
        socket.on('notification:new', (data: any) => {
          console.log('🔔 New notification received:', data);
          setUnreadCount((prev) => prev + 1);
        });

        // Listen for notification read events
        socket.on('notification:read', (data: any) => {
          console.log('🔔 Notification read:', data);
          setUnreadCount((prev) => Math.max(0, prev - 1));
        });

        // Listen for notification count update
        socket.on('notification:count_updated', (data: { count: number }) => {
          console.log('🔔 Notification count updated:', data.count);
          setUnreadCount(data.count);
        });

        // Listen for reward redemption events
        socket.on('reward:redeemed', (data: any) => {
          console.log('🎁 Reward redeemed event received:', data);
          // Emit window event for other components to listen
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('reward:redeemed', { detail: data }));
          }
        });

        socket.on('reward:refunded', (data: any) => {
          console.log('💰 Reward refunded event received:', data);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('reward:refunded', { detail: data }));
          }
        });

        socket.on('reward:used', (data: any) => {
          console.log('✅ Reward used event received:', data);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('reward:used', { detail: data }));
          }
        });

        socket.on('reward:expired', (data: any) => {
          console.log('⏰ Reward expired event received:', data);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('reward:expired', { detail: data }));
          }
        });

        // Listen for points updates
        socket.on('points:updated', (data: any) => {
          console.log('💎 Points updated event received:', data);
          // Emit window event for other components to listen
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('points:updated', { detail: data }));
          }
        });

        // Listen for user:deleted event (account deletion)
        socket.on('user:deleted', (data: any) => {
          console.log('🚨 user:deleted event received:', data);
          // Emit window event for AuthContext to handle logout
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('user:deleted', { detail: data }));
          }
        });

        // Queue events
        socket.on('queue:joined', (data: any) => {
          console.log('🎫 Queue joined event received:', data);
          refreshCount();
        });
        socket.on('queue:position_updated', (data: any) => {
          console.log('📊 Queue position updated event received:', data);
          refreshCount();
        });
        socket.on('queue:your_turn', (data: any) => {
          console.log('🎉 Queue your turn event received:', data);
          refreshCount();
        });
        socket.on('queue:expired', (data: any) => {
          console.log('⏰ Queue expired event received:', data);
          refreshCount();
        });

        // Equipment events
        socket.on('equipment:available', (data: any) => {
          console.log('🏋️ Equipment available event received:', data);
          refreshCount();
        });

        // Payment events
        socket.on('payment:success', (data: any) => {
          console.log('💳 Payment success event received:', data);
          refreshCount();
        });
        socket.on('payment:failed', (data: any) => {
          console.log('❌ Payment failed event received:', data);
          refreshCount();
        });

        // Subscription events
        socket.on('subscription:created', (data: any) => {
          console.log('📦 Subscription created event received:', data);
          refreshCount();
        });
        socket.on('subscription:renewed', (data: any) => {
          console.log('🔄 Subscription renewed event received:', data);
          refreshCount();
        });
        socket.on('subscription:expired', (data: any) => {
          console.log('⏳ Subscription expired event received:', data);
          refreshCount();
        });

        // Invoice events
        socket.on('invoice:generated', (data: any) => {
          console.log('🧾 Invoice generated event received:', data);
          refreshCount();
        });

        // Class reminder events
        socket.on('class:reminder', (data: any) => {
          console.log('⏰ Class reminder event received:', data);
          refreshCount();
        });

        // Schedule change events
        socket.on('schedule:changed', (data: any) => {
          console.log('📅 Schedule changed event received:', data);
          refreshCount();
        });

        // System announcement events
        socket.on('system:announcement', (data: any) => {
          console.log('📢 System announcement event received:', data);
          refreshCount();
        });

        socketRef.current = socket;
        isInitializedRef.current = true;
      } catch (error) {
        console.error('🔔 Error initializing notification socket:', error);
        // Don't block app functionality if socket fails
      }
    };

    initSocket();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (socketRef.current) {
        console.log('🔔 Cleaning up notification socket');
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
        socketRef.current.disconnect();
        socketRef.current = null;
        isInitializedRef.current = false;
        retryCountRef.current = 0;
      }
    };
  }, [user?.id]);

  const refreshCount = useCallback(async () => {
    if (!member?.id) return;
    
    try {
      const count = await notificationService.getUnreadCount(member.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error refreshing notification count:', error);
    }
  }, [member?.id]);

  // Load initial notification count
  useEffect(() => {
    if (member?.id) {
      refreshCount();
    }
  }, [member?.id, refreshCount]);

  // Periodic refresh as fallback (if socket fails to connect)
  // This ensures notification count is updated even if socket doesn't work
  useEffect(() => {
    if (member?.id) {
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
  }, [member?.id, refreshCount]);

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

