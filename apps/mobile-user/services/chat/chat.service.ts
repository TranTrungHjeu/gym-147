import { environment, SERVICE_URLS } from '@/config/environment';
import { getToken } from '@/utils/auth/storage';
import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  receiver?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
}

export interface Conversation {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  lastMessage: ChatMessage;
  unreadCount: number;
}

class ChatService {
  private socket: Socket | null = null;
  private baseUrl: string;

  constructor() {
    this.baseUrl = SERVICE_URLS.IDENTITY;
  }

  /**
   * Initialize Socket.IO connection
   * Similar to NotificationContext - no auth token in handshake, just connect and subscribe
   */
  async connect(userId: string): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Log the URL being used for debugging
    console.log('[CHAT] Connecting to Socket.IO at:', this.baseUrl);
    console.log('[CHAT] SERVICE_URLS.IDENTITY:', this.baseUrl);

    // Extract base URL (without /identity path) for Socket.IO
    // Socket.IO will append the path to the base URL
    // If baseUrl is http://192.168.2.19:8080/identity, we need to:
    // - Use http://192.168.2.19:8080 as base URL
    // - Use /identity/socket.io/ as path
    const url = new URL(this.baseUrl);
    const socketBaseUrl = `${url.protocol}//${url.host}`;
    const socketPath = '/identity/socket.io/';

    console.log('[CHAT] Socket.IO base URL:', socketBaseUrl);
    console.log('[CHAT] Socket.IO path:', socketPath);

    // Create socket connection without auth token in handshake
    // Backend will handle authentication via middleware if needed
    this.socket = io(socketBaseUrl, {
      // Explicitly set path to ensure /identity/socket.io/ is used
      path: socketPath,
      // Prioritize polling for React Native compatibility (same as NotificationContext)
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // Keep trying to reconnect
      timeout: 20000,
      withCredentials: false,
      forceNew: false,
      autoConnect: true,
    });

    // Wait for socket to connect before resolving
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('[ERROR] Chat: Connection timeout after 20 seconds');
        reject(new Error('Socket connection timeout'));
      }, 20000); // 20 second timeout to allow polling retry

      this.socket!.on('connect', () => {
        clearTimeout(timeout);
        console.log(
          '[SUCCESS] Chat: Socket connected, socket.id:',
          this.socket?.id
        );
        // Subscribe to user-specific room after connection (same as NotificationContext)
        this.socket?.emit('subscribe:user', userId);
        console.log('[CHAT] Emitted subscribe:user for userId:', userId);
        resolve(this.socket!);
      });

      this.socket!.on('connect_error', (error) => {
        console.error('[ERROR] Chat: Socket connection error:', error);
        // Don't reject immediately, let it retry with polling
        // Only reject after timeout
      });

      this.socket!.on('reconnect', (attemptNumber) => {
        console.log(
          `[CHAT] Socket reconnected after ${attemptNumber} attempts`
        );
        // Re-subscribe to user room after reconnection (same as NotificationContext)
        if (userId) {
          this.socket?.emit('subscribe:user', userId);
          console.log('[CHAT] Re-subscribed to user room:', userId);
        }
      });

      this.socket!.on('reconnect_attempt', (attemptNumber) => {
        console.log(`[CHAT] Reconnection attempt ${attemptNumber}...`);
      });

      this.socket!.on('reconnect_error', (error) => {
        console.warn('[CHAT] Reconnection error:', error.message);
      });

      this.socket!.on('reconnect_failed', () => {
        console.error('[CHAT] Failed to reconnect after all attempts');
      });

      this.socket!.on('disconnect', (reason) => {
        console.log('[ERROR] Chat: Socket disconnected, reason:', reason);
      });

      this.socket!.on('error', (error) => {
        console.error('[ERROR] Chat: Socket error:', error);
      });
    });
  }

  /**
   * Disconnect Socket.IO
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    receiverId: string | null,
    message: string
  ): Promise<ChatMessage> {
    const token = await getToken();
    const response = await fetch(`${this.baseUrl}/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receiver_id: receiverId,
        message: message,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to send message');
    }

    return data.data;
  }

  /**
   * Get chat history
   */
  async getChatHistory(
    otherUserId: string | null = null,
    limit = 50,
    offset = 0
  ): Promise<ChatMessage[]> {
    const token = await getToken();
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (otherUserId) {
      params.append('other_user_id', otherUserId);
    }

    const response = await fetch(
      `${this.baseUrl}/chat/messages?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to get chat history');
    }

    return data.data;
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<number> {
    const token = await getToken();
    const response = await fetch(`${this.baseUrl}/chat/unread-count`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to get unread count');
    }

    return data.data.count;
  }

  /**
   * Get conversations list
   */
  async getConversations(): Promise<Conversation[]> {
    const token = await getToken();
    const response = await fetch(`${this.baseUrl}/chat/conversations`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to get conversations');
    }

    return data.data;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(messageIds?: string[]): Promise<void> {
    const token = await getToken();
    const response = await fetch(`${this.baseUrl}/chat/messages/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message_ids: messageIds || null,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to mark messages as read');
    }
  }

  /**
   * Listen for new messages
   */
  onMessage(callback: (message: ChatMessage) => void) {
    if (!this.socket) {
      console.warn('Socket not connected. Call connect() first.');
      return () => {};
    }

    // Create wrapper functions to maintain reference for cleanup
    const messageHandler = (message: ChatMessage) => {
      console.log(
        '[CHAT] Received chat:message:',
        message.id,
        'sender_id:',
        message.sender_id,
        'receiver_id:',
        message.receiver_id
      );
      callback(message);
    };

    const sentMessageHandler = (message: ChatMessage) => {
      console.log(
        '[CHAT] Received chat:message:sent:',
        message.id,
        'sender_id:',
        message.sender_id,
        'receiver_id:',
        message.receiver_id
      );
      callback(message);
    };

    // Listen for regular messages (admin replies to member: receiver_id = user.id)
    this.socket.on('chat:message', messageHandler);

    // Listen for message sent confirmation (when member sends support message)
    this.socket.on('chat:message:sent', sentMessageHandler);

    // Note: chat:support:message is only emitted to admin room, members should not listen to it

    return () => {
      this.socket?.off('chat:message', messageHandler);
      this.socket?.off('chat:message:sent', sentMessageHandler);
    };
  }

  /**
   * Listen for typing indicators
   */
  onTyping(
    callback: (data: { sender_id: string; is_typing: boolean }) => void
  ) {
    if (!this.socket) {
      return () => {};
    }

    this.socket.on('chat:typing', callback);

    return () => {
      this.socket?.off('chat:typing', callback);
    };
  }

  /**
   * Send typing indicator
   */
  sendTyping(receiverId: string, isTyping: boolean) {
    if (!this.socket) {
      return;
    }

    this.socket.emit('chat:typing', {
      receiver_id: receiverId,
      is_typing: isTyping,
    });
  }
}

export const chatService = new ChatService();
