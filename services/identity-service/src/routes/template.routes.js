const { Router } = require('express');
const templateController = require('../controllers/template.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { requireAdmin } = require('../middleware/role.middleware.js');

const router = Router();

// All template routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

// Email template routes
router.get('/email', templateController.getEmailTemplates);
router.get('/email/:id', templateController.getEmailTemplate);
router.post('/email', templateController.createEmailTemplate);
router.put('/email/:id', templateController.updateEmailTemplate);
router.delete('/email/:id', templateController.deleteEmailTemplate);

// SMS template routes
router.get('/sms', templateController.getSMSTemplates);
router.get('/sms/:id', templateController.getSMSTemplate);
router.post('/sms', templateController.createSMSTemplate);
router.put('/sms/:id', templateController.updateSMSTemplate);
router.delete('/sms/:id', templateController.deleteSMSTemplate);

module.exports = { templateRoutes: router };

