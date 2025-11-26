import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/config/api.config';
import { socketQueueService, QueuedEvent } from './socket-queue.service';

export type SocketServiceType = 'schedule' | 'member' | 'identity';

export interface SocketConnectionState {
  service: SocketServiceType;
  connected: boolean;
  connecting: boolean;
  lastConnected?: number;
  reconnectAttempts: number;
  error?: string;
}

/**
 * Enhanced Socket Service with multi-service support, event queue, and improved reconnection
 */
class SocketService {
  private sockets: Map<SocketServiceType, Socket> = new Map();
  private userId: string | null = null;
  private connectionStates: Map<SocketServiceType, SocketConnectionState> = new Map();
  private reconnectTimeouts: Map<SocketServiceType, NodeJS.Timeout> = new Map();
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000; // 1 second
  private maxReconnectDelay = 30000; // 30 seconds
  private errorLogged: Map<SocketServiceType, boolean> = new Map();
  private lastErrorTime: Map<SocketServiceType, number> = new Map();

  /**
   * Initialize socket connections for all services
   */
  connect(userId: string): { schedule: Socket; member?: Socket; identity?: Socket } {
    if (this.userId && this.userId !== userId) {
      // User changed, disconnect all
      this.disconnect();
    }

    this.userId = userId;
    
    // Connect to schedule service (required)
    const scheduleSocket = this.connectToService('schedule', userId);

    // Connect to member service (optional)
    let memberSocket: Socket | undefined;
    if (API_CONFIG.WS_MEMBER_URL) {
      memberSocket = this.connectToService('member', userId);
    }

    // Connect to identity service (optional)
    let identitySocket: Socket | undefined;
    if (API_CONFIG.WS_IDENTITY_URL) {
      identitySocket = this.connectToService('identity', userId);
    }

    return { schedule: scheduleSocket, member: memberSocket, identity: identitySocket };
  }

  /**
   * Connect to a specific service
   */
  private connectToService(service: SocketServiceType, userId: string): Socket {
    // Check if already connected
    const existingSocket = this.sockets.get(service);
    if (existingSocket && existingSocket.connected) {
      return existingSocket;
    }

    // Get service URL
    let serviceUrl: string | undefined;
    if (service === 'schedule') {
      serviceUrl = API_CONFIG.WS_SCHEDULE_URL;
    } else if (service === 'member') {
      serviceUrl = API_CONFIG.WS_MEMBER_URL;
    } else if (service === 'identity') {
      serviceUrl = API_CONFIG.WS_IDENTITY_URL;
    }

    if (!serviceUrl) {
      if (service === 'schedule') {
        throw new Error('WS_SCHEDULE_URL environment variable is required. Please set VITE_WS_SCHEDULE_URL in your .env file.');
      }
      // Member and Identity services are optional, return a dummy socket
      console.warn(`⚠️ ${service.toUpperCase()} service URL not configured, skipping ${service} service socket connection`);
      return this.createDummySocket();
    }

    // Initialize connection state
    this.connectionStates.set(service, {
      service,
      connected: false,
      connecting: true,
      reconnectAttempts: 0,
    });

    console.log(`🔌 Attempting to connect to ${service} service: ${serviceUrl}`);

    try {
      const socket = io(serviceUrl, {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: this.baseReconnectDelay,
        reconnectionDelayMax: this.maxReconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 20000,
        forceNew: false,
        autoConnect: true,
        upgrade: true,
        rememberUpgrade: false,
      });

      this.setupSocketListeners(socket, service, userId);
      this.sockets.set(service, socket);

      return socket;
    } catch (error) {
      console.error(`❌ Failed to create ${service} socket connection:`, error);
      this.updateConnectionState(service, {
        connected: false,
        connecting: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(socket: Socket, service: SocketServiceType, userId: string): void {
    socket.on('connect', () => {
      console.log(`✅ Socket connected to ${service} service`);
      this.errorLogged.set(service, false);
      
      this.updateConnectionState(service, {
        connected: true,
        connecting: false,
        lastConnected: Date.now(),
        reconnectAttempts: 0,
        error: undefined,
      });

      // Subscribe to user room
      if (userId) {
        console.log(`📡 Subscribing ${service} socket to user room: user:${userId}`);
        socket.emit('subscribe:user', userId);
      }

      // Replay queued events for this service
      const queuedEvents = socketQueueService.getQueue().filter(e => e.service === service);
      if (queuedEvents.length > 0) {
        console.log(`📦 Replaying ${queuedEvents.length} queued events for ${service} service`);
        socketQueueService.replay((event) => {
          if (event.service === service) {
            socket.emit(event.eventName, event.data);
          }
        });
      }
    });

    socket.on('connect_error', (error) => {
      const now = Date.now();
      const lastError = this.lastErrorTime.get(service) || 0;
      
      // Throttle error logging - only log once per 30 seconds
      if (!this.errorLogged.get(service) || now - lastError > 30000) {
        console.warn(`⚠️ ${service} socket service unavailable. Make sure the ${service} service is running.`);
        this.errorLogged.set(service, true);
        this.lastErrorTime.set(service, now);
      }

      const state = this.connectionStates.get(service);
      if (state) {
        this.updateConnectionState(service, {
          connected: false,
          connecting: false,
          reconnectAttempts: state.reconnectAttempts + 1,
          error: error.message,
        });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 ${service} socket disconnected, reason:`, reason);
      
      this.updateConnectionState(service, {
        connected: false,
        connecting: false,
      });

      // Queue events if disconnected unexpectedly
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log(`📦 Socket disconnected, events will be queued until reconnection`);
      }
    });

    socket.on('error', (error) => {
      console.error(`❌ ${service} socket error:`, error);
    });

    // Handle reconnection attempts
    socket.io.on('reconnect_attempt', (attemptNumber) => {
      const state = this.connectionStates.get(service);
      if (state) {
        this.updateConnectionState(service, {
          reconnectAttempts: attemptNumber,
        });
    }
    });

    socket.io.on('reconnect_failed', () => {
      console.error(`❌ ${service} socket reconnection failed after ${this.maxReconnectAttempts} attempts`);
      this.updateConnectionState(service, {
        connected: false,
        connecting: false,
        error: 'Reconnection failed',
      });
    });
  }

  /**
   * Update connection state
   */
  private updateConnectionState(service: SocketServiceType, updates: Partial<SocketConnectionState>): void {
    const current = this.connectionStates.get(service) || {
      service,
      connected: false,
      connecting: false,
      reconnectAttempts: 0,
    };
    
    this.connectionStates.set(service, {
      ...current,
      ...updates,
    });

    // Dispatch connection state change event
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('socket:connection_state', {
        detail: this.connectionStates.get(service),
      }));
    }
  }

  /**
   * Create a dummy socket for optional services
   */
  private createDummySocket(): Socket {
    // Return a mock socket that does nothing but has all required methods
    const dummyHandlers: Map<string, Set<Function>> = new Map();
    const self = {
      connected: false,
      id: '',
      emit: () => {},
      on: (event: string, handler: Function) => {
        if (!dummyHandlers.has(event)) {
          dummyHandlers.set(event, new Set());
        }
        dummyHandlers.get(event)!.add(handler);
      },
      off: (event: string, handler?: Function) => {
        if (handler && dummyHandlers.has(event)) {
          dummyHandlers.get(event)!.delete(handler);
        } else if (dummyHandlers.has(event)) {
          dummyHandlers.delete(event);
        }
      },
      once: (event: string, handler: Function) => {
        // For once, we can just call on since it won't fire anyway
        self.on(event, handler);
      },
      disconnect: () => {},
      io: {
        on: () => {},
        off: () => {},
      },
    };

    return self as any;
  }

  /**
   * Disconnect all sockets
   */
  disconnect(): void {
    this.sockets.forEach((socket, service) => {
      if (this.userId) {
        socket.emit('unsubscribe:user', this.userId);
      }
      socket.disconnect();
    });

    this.sockets.clear();
    this.connectionStates.clear();
      this.userId = null;

    // Clear reconnect timeouts
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts.clear();
  }

  /**
   * Get socket for a specific service
   */
  getSocket(service: SocketServiceType = 'schedule'): Socket | null {
    return this.sockets.get(service) || null;
  }

  /**
   * Get all sockets
   */
  getSockets(): { schedule: Socket | null; member: Socket | null } {
    return {
      schedule: this.sockets.get('schedule') || null,
      member: this.sockets.get('member') || null,
    };
  }

  /**
   * Check if a service is connected
   */
  isConnected(service: SocketServiceType = 'schedule'): boolean {
    return this.sockets.get(service)?.connected || false;
  }

  /**
   * Check if any service is connected
   */
  isAnyConnected(): boolean {
    return Array.from(this.sockets.values()).some(socket => socket.connected);
  }

  /**
   * Get connection state for a service
   */
  getConnectionState(service: SocketServiceType): SocketConnectionState | undefined {
    return this.connectionStates.get(service);
  }

  /**
   * Get all connection states
   */
  getAllConnectionStates(): Map<SocketServiceType, SocketConnectionState> {
    return new Map(this.connectionStates);
  }

  /**
   * Subscribe to schedule updates
   */
  subscribeToSchedule(scheduleId: string): void {
    const socket = this.sockets.get('schedule');
    if (socket?.connected) {
      socket.emit('subscribe:schedule', scheduleId);
    }
  }

  /**
   * Unsubscribe from schedule updates
   */
  unsubscribeFromSchedule(scheduleId: string): void {
    const socket = this.sockets.get('schedule');
    if (socket?.connected) {
      socket.emit('unsubscribe:schedule', scheduleId);
    }
  }

  /**
   * Subscribe to equipment updates
   */
  subscribeToEquipment(equipmentId: string): void {
    const socket = this.sockets.get('member');
    if (socket?.connected) {
      socket.emit('subscribe:equipment', equipmentId);
    }
  }

  /**
   * Unsubscribe from equipment updates
   */
  unsubscribeFromEquipment(equipmentId: string): void {
    const socket = this.sockets.get('member');
    if (socket?.connected) {
      socket.emit('unsubscribe:equipment', equipmentId);
    }
  }

  /**
   * Emit event with queueing support
   */
  emit(eventName: string, data: any, service: SocketServiceType = 'schedule', priority: 'high' | 'normal' | 'low' = 'normal'): void {
    const socket = this.sockets.get(service);
    
    if (socket?.connected) {
      socket.emit(eventName, data);
    } else {
      // Queue event if socket is not connected
      console.log(`📦 Queueing event ${eventName} for ${service} service (socket not connected)`);
      socketQueueService.enqueue(eventName, data, service, priority);
    }
  }

  /**
   * Restore persisted events on startup
   */
  restorePersistedEvents(): QueuedEvent[] {
    return socketQueueService.restorePersistedEvents();
  }
}

export const socketService = new SocketService();
