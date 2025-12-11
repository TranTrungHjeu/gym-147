import { identityApi } from './api';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/config/api.config';

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
    this.baseUrl = API_CONFIG.SERVICES.IDENTITY;
  }

  /**
   * Initialize Socket.IO connection
   */
  async connect(userId: string): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Use WS_IDENTITY_URL if available, otherwise fallback to baseUrl
    const socketUrl = API_CONFIG.WS_IDENTITY_URL || this.baseUrl;

    this.socket = io(socketUrl, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
    });

    // Wait for socket to connect before resolving
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
      }, 10000); // 10 second timeout

      this.socket!.on('connect', () => {
        clearTimeout(timeout);
        console.log('[SUCCESS] Chat: Socket connected, socket.id:', this.socket?.id);
        this.socket?.emit('subscribe:user', userId);
        console.log('[CHAT] Emitted subscribe:user for userId:', userId);
        // Subscribe to admin room for support messages
        this.socket?.emit('subscribe:admin');
        console.log('[CHAT] Emitted subscribe:admin');
        resolve(this.socket!);
      });

      this.socket!.on('connect_error', error => {
        clearTimeout(timeout);
        console.error('[ERROR] Chat: Socket connection error:', error);
        reject(error);
      });

      this.socket!.on('disconnect', () => {
        console.log('[ERROR] Chat: Socket disconnected');
      });

      this.socket!.on('error', error => {
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
  async sendMessage(receiverId: string | null, message: string): Promise<ChatMessage> {
    const response = await identityApi.post('/chat/messages', {
      receiver_id: receiverId,
      message: message,
    });

    return response.data.data;
  }

  /**
   * Get chat history
   */
  async getChatHistory(
    otherUserId: string | null = null,
    limit = 50,
    offset = 0
  ): Promise<ChatMessage[]> {
    const params: any = {
      limit: limit.toString(),
      offset: offset.toString(),
    };
    if (otherUserId) {
      params.other_user_id = otherUserId;
    }

    const response = await identityApi.get('/chat/messages', { params });
    return response.data.data;
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<number> {
    const response = await identityApi.get('/chat/unread-count');
    return response.data.data.count;
  }

  /**
   * Get conversations list
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await identityApi.get('/chat/conversations');
    return response.data.data;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(messageIds?: string[]): Promise<void> {
    await identityApi.post('/chat/messages/read', {
      message_ids: messageIds || null,
    });
  }

  /**
   * Listen for new messages
   */
  onMessage(callback: (message: ChatMessage) => void) {
    if (!this.socket) {
      console.warn('Socket not connected. Call connect() first.');
      return () => {};
    }

    // Listen for regular messages
    this.socket.on('chat:message', message => {
      console.log('[CHAT] Received chat:message:', message.id);
      callback(message);
    });

    // Listen for support messages (when receiver_id is null)
    this.socket.on('chat:support:message', message => {
      console.log('[CHAT] Received chat:support:message:', message.id, message.sender_id);
      callback(message);
    });

    // Listen for message sent confirmation
    this.socket.on('chat:message:sent', message => {
      console.log('[CHAT] Received chat:message:sent:', message.id);
      callback(message);
    });

    return () => {
      this.socket?.off('chat:message', callback);
      this.socket?.off('chat:support:message', callback);
      this.socket?.off('chat:message:sent', callback);
    };
  }

  /**
   * Listen for typing indicators
   */
  onTyping(callback: (data: { sender_id: string; is_typing: boolean }) => void) {
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
  sendTyping(receiverId: string | null, isTyping: boolean) {
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
