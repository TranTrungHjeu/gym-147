const { Router } = require('express');
const webhookController = require('../controllers/webhook.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { requireAdmin } = require('../middleware/role.middleware.js');

const router = Router();

// All webhook routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

// Webhook routes
router.get('/', webhookController.getWebhooks);
router.get('/:id', webhookController.getWebhook);
router.post('/', webhookController.createWebhook);
router.put('/:id', webhookController.updateWebhook);
router.delete('/:id', webhookController.deleteWebhook);
router.get('/:id/events', webhookController.getWebhookEvents);
router.post('/:id/test', webhookController.testWebhook);

module.exports = { webhookRoutes: router };

