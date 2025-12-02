const { ChatService } = require('../services/chat.service.js');

class ChatController {
  constructor() {
    this.chatService = new ChatService();
  }

  /**
   * Send a chat message
   * POST /chat/messages
   */
  async sendMessage(req, res) {
    try {
      const userId = req.user.userId;
      const { receiver_id, message } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Message is required',
          data: null,
        });
      }

      const result = await this.chatService.sendMessage(userId, receiver_id, message);

      if (result.success) {
        // Emit Socket.IO event for real-time delivery
        if (global.io) {
          const socketData = {
            id: result.data.id,
            sender_id: result.data.sender_id,
            receiver_id: result.data.receiver_id,
            message: result.data.message,
            created_at: result.data.created_at,
            sender: result.data.sender,
            receiver: result.data.receiver,
          };

          // Emit to receiver if specified
          if (result.data.receiver_id) {
            global.io.to(`user:${result.data.receiver_id}`).emit('chat:message', socketData);
          } else {
            // Emit to all admins/staff for support chat
            global.io.emit('chat:support:message', socketData);
          }

          // Emit to sender for confirmation
          global.io.to(`user:${userId}`).emit('chat:message:sent', socketData);
        }

        res.status(201).json({
          success: true,
          message: 'Message sent successfully',
          data: result.data,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to send message',
          data: null,
        });
      }
    } catch (error) {
      console.error('Error in sendMessage controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get chat history
   * GET /chat/messages
   */
  async getChatHistory(req, res) {
    try {
      const userId = req.user.userId;
      const { other_user_id, limit = 50, offset = 0 } = req.query;

      const result = await this.chatService.getChatHistory(
        userId,
        other_user_id || null,
        parseInt(limit),
        parseInt(offset)
      );

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to get chat history',
          data: null,
        });
      }
    } catch (error) {
      console.error('Error in getChatHistory controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get unread message count
   * GET /chat/unread-count
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.userId;
      const result = await this.chatService.getUnreadCount(userId);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to get unread count',
          data: null,
        });
      }
    } catch (error) {
      console.error('Error in getUnreadCount controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get conversations list
   * GET /chat/conversations
   */
  async getConversations(req, res) {
    try {
      const userId = req.user.userId;
      const result = await this.chatService.getConversations(userId);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to get conversations',
          data: null,
        });
      }
    } catch (error) {
      console.error('Error in getConversations controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Mark messages as read
   * POST /chat/messages/read
   */
  async markAsRead(req, res) {
    try {
      const userId = req.user.userId;
      const { message_ids } = req.body;

      const result = await this.chatService.markAsRead(userId, message_ids || null);

      if (result.success) {
        res.json({
          success: true,
          message: 'Messages marked as read',
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to mark messages as read',
          data: null,
        });
      }
    } catch (error) {
      console.error('Error in markAsRead controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = { ChatController };


