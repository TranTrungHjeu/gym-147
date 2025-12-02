const express = require('express');
const { authRoutes } = require('./auth.routes.js');
const { oauthRoutes } = require('./oauth.routes.js');
const { profileRoutes } = require('./profile.routes.js');
const { securityRoutes } = require('./security.routes.js');
const { deviceRoutes } = require('./device.routes.js');
const { analyticsRoutes } = require('./analytics.routes.js');
const { notificationRoutes } = require('./notification.routes.js');
const { systemRoutes } = require('./system.routes.js');
const { tenantRoutes } = require('./tenant.routes.js');
const { chatRoutes } = require('./chat.routes.js');
const { legalRoutes } = require('./legal.routes.js');
const { scheduledReportsRoutes } = require('./scheduled-reports.routes.js');
const { backupRoutes } = require('./backup.routes.js');
const { webhookRoutes } = require('./webhook.routes.js');
const { apiKeyRoutes } = require('./api-key.routes.js');
const { templateRoutes } = require('./template.routes.js');
const dashboardRoutes = require('./dashboard.routes.js');

const router = express.Router();

// Root health check endpoint (public)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Identity service is running',
    service: 'identity-service',
    timestamp: new Date().toISOString(),
  });
});

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/auth/oauth', oauthRoutes);
router.use('/profile', profileRoutes);
router.use('/security', securityRoutes);
router.use('/devices', deviceRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/system', systemRoutes);
router.use('/tenant', tenantRoutes);
router.use('/chat', chatRoutes);
router.use('/legal', legalRoutes);
router.use('/scheduled-reports', scheduledReportsRoutes);
router.use('/backups', backupRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/templates', templateRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = { routes: router };
