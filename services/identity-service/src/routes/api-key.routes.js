const { Router } = require('express');
const apiKeyController = require('../controllers/api-key.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { requireAdmin } = require('../middleware/role.middleware.js');

const router = Router();

// All API key routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

// API key routes
router.get('/', apiKeyController.getAPIKeys);
router.get('/:id', apiKeyController.getAPIKey);
router.post('/', apiKeyController.createAPIKey);
router.put('/:id', apiKeyController.updateAPIKey);
router.post('/:id/revoke', apiKeyController.revokeAPIKey);
router.delete('/:id', apiKeyController.deleteAPIKey);

module.exports = { apiKeyRoutes: router };

