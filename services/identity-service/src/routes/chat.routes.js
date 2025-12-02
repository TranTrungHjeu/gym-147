const { Router } = require('express');
const { ChatController } = require('../controllers/chat.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');

const router = Router();
const chatController = new ChatController();

// All chat routes require authentication
router.post('/messages', authMiddleware, (req, res) => chatController.sendMessage(req, res));
router.get('/messages', authMiddleware, (req, res) => chatController.getChatHistory(req, res));
router.get('/unread-count', authMiddleware, (req, res) => chatController.getUnreadCount(req, res));
router.get('/conversations', authMiddleware, (req, res) => chatController.getConversations(req, res));
router.post('/messages/read', authMiddleware, (req, res) => chatController.markAsRead(req, res));

module.exports = { chatRoutes: router };


