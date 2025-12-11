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
  async getChatHistory(userId, otherUserId = null, limit = 50, offset = 0, userRole = null) {
    try {
      // Check if user is admin/staff
      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

      let where;

      if (otherUserId) {
        // Specific conversation with another user
        where = {
          OR: [
            {
              AND: [{ sender_id: userId }, { receiver_id: otherUserId }],
            },
            {
              AND: [{ sender_id: otherUserId }, { receiver_id: userId }],
            },
          ],
        };

        // For admins, also include support messages from this member
        if (isAdmin) {
          where.OR.push({
            AND: [{ sender_id: otherUserId }, { receiver_id: null }],
          });
        }
      } else if (isAdmin) {
        // For admins without otherUserId, include all support messages
        where = {
          OR: [
            { sender_id: userId },
            { receiver_id: userId },
            { receiver_id: null }, // All support messages
          ],
        };
      } else {
        // For members: include their support messages (receiver_id = null) and admin replies (receiver_id = userId)
        where = {
          OR: [
            { AND: [{ sender_id: userId }, { receiver_id: null }] }, // Member sent support message
            { receiver_id: userId }, // Admin replied to member
          ],
        };
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
      const markReadWhere = {
        OR: [{ receiver_id: userId }],
        is_read: false,
      };

      // For admins, also mark support messages as read
      if (isAdmin) {
        if (otherUserId) {
          // Mark support messages from this specific member
          markReadWhere.OR.push({
            AND: [{ receiver_id: null }, { sender_id: otherUserId }],
          });
        } else {
          // Mark all support messages
          markReadWhere.OR.push({ receiver_id: null });
        }
      }

      await prisma.chatMessage.updateMany({
        where: markReadWhere,
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
  async getUnreadCount(userId, userRole = null) {
    try {
      // Check if user is admin/staff
      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

      const where = {
        OR: [{ receiver_id: userId }],
        is_read: false,
      };

      // For admins, also count support messages (receiver_id is null)
      if (isAdmin) {
        where.OR.push({ receiver_id: null });
      }

      const count = await prisma.chatMessage.count({ where });

      if (isAdmin) {
        console.log(`[CHAT] Unread count for admin ${userId} (role: ${userRole}): ${count}`);
      }

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
  async getConversations(userId, userRole = null) {
    try {
      // Check if user is admin/staff
      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

      // Get distinct users from chat history
      const where = {
        OR: [{ sender_id: userId }, { receiver_id: userId }],
      };

      // For admins, also include support messages (receiver_id is null)
      if (isAdmin) {
        where.OR.push({ receiver_id: null });
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
      });

      // Group by other user and get latest message
      const conversationsMap = new Map();
      messages.forEach(msg => {
        // For admin/staff: if receiver_id is null, the sender is the member
        // For members: if receiver_id is null, skip (they're talking to admin)
        let otherUser;
        if (!msg.receiver_id) {
          // Support chat: receiver_id is null means member is talking to admin
          // For admin viewing, otherUser is the sender (member)
          otherUser = msg.sender;
        } else {
          // Regular chat: otherUser is the opposite party
          otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;
        }

        if (!otherUser) return; // Skip if no other user found

        const otherUserId = otherUser.id;
        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            user: otherUser,
            lastMessage: msg,
            unreadCount: 0,
          });
        }

        // Update unread count
        // For regular messages: receiver_id === userId
        // For support messages (admins): receiver_id is null
        if ((msg.receiver_id === userId || (isAdmin && !msg.receiver_id)) && !msg.is_read) {
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
  async markAsRead(userId, messageIds = null, userRole = null) {
    try {
      // Check if user is admin/staff
      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

      const where = {
        OR: [{ receiver_id: userId }],
        is_read: false,
      };

      // For admins, also allow marking support messages as read
      if (isAdmin) {
        where.OR.push({ receiver_id: null });
      }

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
