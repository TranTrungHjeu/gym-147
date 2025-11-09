import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/config/api.config';

// Use centralized config for WebSocket URL
// WebSocket connects directly to schedule service (not through Nginx gateway)

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  /**
   * Initialize socket connection and subscribe to user notifications
   */
  connect(userId: string): Socket {
    if (this.socket && this.socket.connected && this.userId === userId) {
      return this.socket;
    }

    // Disconnect existing connection if user changed
    if (this.socket) {
      this.disconnect();
    }

    this.userId = userId;
    
    // Validate WebSocket URL
    if (!API_CONFIG.WS_SCHEDULE_URL) {
      console.error('❌ WS_SCHEDULE_URL is not configured. Please check your .env file.');
      // Return a dummy socket that won't crash
      this.socket = io('http://localhost:3003', {
        autoConnect: false,
        reconnection: false,
      }) as Socket;
      return this.socket;
    }
    
    // Log the WebSocket URL being used
    console.log(`🔌 Attempting to connect to WebSocket: ${API_CONFIG.WS_SCHEDULE_URL}`);
    
    try {
      this.socket = io(API_CONFIG.WS_SCHEDULE_URL, {
        // Try polling first, then upgrade to websocket if available
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        timeout: 20000,
        forceNew: false,
        autoConnect: true,
        upgrade: true,
        rememberUpgrade: false,
      });
    } catch (error) {
      console.error('❌ Failed to create socket connection:', error);
      // Return a dummy socket that won't crash
      this.socket = io('http://localhost:3003', {
        autoConnect: false,
        reconnection: false,
      }) as Socket;
      return this.socket;
    }

    // Subscribe to user room when connected
    this.socket.on('connect', () => {
      console.log(`✅ Socket connected to schedule service: ${API_CONFIG.WS_SCHEDULE_URL}`);
      if (this.socket && userId) {
        console.log(`📡 Subscribing socket to user room: user:${userId}`);
        this.socket.emit('subscribe:user', userId);
        
        // Verify subscription after a short delay
        setTimeout(() => {
          if (this.socket) {
            console.log(`🔍 Debug: Socket ID: ${this.socket.id}, User ID: ${userId}`);
            console.log(`🔍 Debug: Socket connected: ${this.socket.connected}`);
          }
        }, 1000);
      }
    });

    // Also try to subscribe immediately if already connected
    if (this.socket.connected && userId) {
      console.log(`📡 Socket already connected, subscribing immediately to user:${userId}`);
      this.socket.emit('subscribe:user', userId);
    }

    this.socket.on('connect_error', error => {
      console.error(`❌ Socket connection error to ${API_CONFIG.WS_SCHEDULE_URL}:`, error);
      console.error('Error details:', {
        message: error.message,
        type: error.type,
        description: error.description,
      });
    });

    this.socket.on('disconnect', reason => {
      console.log(`🔌 Socket disconnected from ${API_CONFIG.WS_SCHEDULE_URL}, reason:`, reason);
    });

    // Add error handler for transport errors
    this.socket.on('error', error => {
      console.error('❌ Socket error:', error);
    });

    return this.socket;
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      if (this.userId) {
        this.socket.emit('unsubscribe:user', this.userId);
      }
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
    }
  }

  /**
   * Get current socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Subscribe to schedule updates
   */
  subscribeToSchedule(scheduleId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:schedule', scheduleId);
    }
  }

  /**
   * Unsubscribe from schedule updates
   */
  unsubscribeFromSchedule(scheduleId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:schedule', scheduleId);
    }
  }
}

export const socketService = new SocketService();
