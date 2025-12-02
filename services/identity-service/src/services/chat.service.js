const { prisma } = require('../lib/prisma.js');

/**
 * Chat Service for Live Chat Support
 */
class ChatService {
  /**
   * Send a message
   */
  async sendMessage(senderId, receiverId, message) {
    try {
      const chatMessage = await prisma.chatMessage.create({
        data: {
          sender_id: senderId,
          receiver_id: receiverId || null, // null for admin/staff support
          message: message.trim(),
        },
        include: {
          sender: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      return {
        success: true,
        data: chatMessage,
      };
    } catch (error) {
      console.error('Error sending chat message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message',
      };
    }
  }

  /**
   * Get chat history for a user
   */
  async getChatHistory(userId, otherUserId = null, limit = 50, offset = 0) {
    try {
      const where = {
        OR: [
          { sender_id: userId },
          { receiver_id: userId },
        ],
      };

      if (otherUserId) {
        where.OR = [
          {
            AND: [
              { sender_id: userId },
              { receiver_id: otherUserId },
            ],
          },
          {
            AND: [
              { sender_id: otherUserId },
              { receiver_id: userId },
            ],
          },
        ];
      }

      const messages = await prisma.chatMessage.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        take: limit,
        skip: offset,
      });

      // Mark messages as read
      await prisma.chatMessage.updateMany({
        where: {
          receiver_id: userId,
          is_read: false,
        },
        data: {
          is_read: true,
          read_at: new Date(),
        },
      });

      return {
        success: true,
        data: messages.reverse(), // Reverse to show oldest first
      };
    } catch (error) {
      console.error('Error getting chat history:', error);
      return {
        success: false,
        error: error.message || 'Failed to get chat history',
      };
    }
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId) {
    try {
      const count = await prisma.chatMessage.count({
        where: {
          receiver_id: userId,
          is_read: false,
        },
      });

      return {
        success: true,
        data: { count },
      };
    } catch (error) {
      console.error('Error getting unread count:', error);
      return {
        success: false,
        error: error.message || 'Failed to get unread count',
      };
    }
  }

  /**
   * Get chat conversations for a user (list of users they've chatted with)
   */
  async getConversations(userId) {
    try {
      // Get distinct users from chat history
      const messages = await prisma.chatMessage.findMany({
        where: {
          OR: [
            { sender_id: userId },
            { receiver_id: userId },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // Group by other user and get latest message
      const conversationsMap = new Map();
      messages.forEach(msg => {
        const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;
        if (!otherUser) return; // Skip if no receiver (admin support)

        const otherUserId = otherUser.id;
        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            user: otherUser,
            lastMessage: msg,
            unreadCount: 0,
          });
        }

        // Update unread count
        if (msg.receiver_id === userId && !msg.is_read) {
          const conv = conversationsMap.get(otherUserId);
          conv.unreadCount++;
        }
      });

      const conversations = Array.from(conversationsMap.values());

      return {
        success: true,
        data: conversations,
      };
    } catch (error) {
      console.error('Error getting conversations:', error);
      return {
        success: false,
        error: error.message || 'Failed to get conversations',
      };
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(userId, messageIds = null) {
    try {
      const where = {
        receiver_id: userId,
        is_read: false,
      };

      if (messageIds && messageIds.length > 0) {
        where.id = { in: messageIds };
      }

      await prisma.chatMessage.updateMany({
        where,
        data: {
          is_read: true,
          read_at: new Date(),
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return {
        success: false,
        error: error.message || 'Failed to mark messages as read',
      };
    }
  }
}

module.exports = { ChatService };


