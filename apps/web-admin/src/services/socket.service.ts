import { io, Socket } from 'socket.io-client';

// Use the same URL as schedule.service.ts for consistency
const SCHEDULE_SERVICE_URL = 'http://localhost:3003';

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
    this.socket = io(SCHEDULE_SERVICE_URL, {
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

    // Subscribe to user room when connected
    this.socket.on('connect', () => {
      console.log('Socket connected to schedule service');
      this.socket?.emit('subscribe:user', userId);
    });

    this.socket.on('connect_error', error => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('disconnect', reason => {
      console.log('Socket disconnected:', reason);
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
