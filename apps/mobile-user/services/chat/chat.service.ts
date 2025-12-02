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
   */
  async connect(userId: string): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = await getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    this.socket = io(this.baseUrl, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
    });

    // Subscribe to user notifications
    this.socket.on('connect', () => {
      console.log('[SUCCESS] Chat: Socket connected');
      this.socket?.emit('subscribe:user', userId);
    });

    this.socket.on('disconnect', () => {
      console.log('[ERROR] Chat: Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('[ERROR] Chat: Socket error:', error);
    });

    return this.socket;
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
  async getChatHistory(otherUserId: string | null = null, limit = 50, offset = 0): Promise<ChatMessage[]> {
    const token = await getToken();
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (otherUserId) {
      params.append('other_user_id', otherUserId);
    }

    const response = await fetch(`${this.baseUrl}/chat/messages?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

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

    this.socket.on('chat:message', callback);

    return () => {
      this.socket?.off('chat:message', callback);
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


