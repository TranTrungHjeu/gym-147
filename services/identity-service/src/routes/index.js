const express = require('express');
const { authRoutes } = require('./auth.routes.js');
const { oauthRoutes } = require('./oauth.routes.js');
const { profileRoutes } = require('./profile.routes.js');
const { securityRoutes } = require('./security.routes.js');
const { deviceRoutes } = require('./device.routes.js');
const { analyticsRoutes } = require('./analytics.routes.js');
const { notificationRoutes } = require('./notification.routes.js');
const { systemRoutes } = require('./system.routes.js');
// tenantRoutes removed - not needed
const { chatRoutes } = require('./chat.routes.js');
const { legalRoutes } = require('./legal.routes.js');
// scheduledReportsRoutes removed - not needed
// backupRoutes removed - not needed
// Webhook routes removed - not needed
// API key routes removed - not needed
// Template routes removed - not needed
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
// tenant routes removed - not needed
router.use('/chat', chatRoutes);
router.use('/legal', legalRoutes);
// scheduled-reports routes removed - not needed
// backups routes removed - not needed
// Webhooks route removed - not needed
// API keys route removed - not needed
// Templates route removed - not needed
router.use('/dashboard', dashboardRoutes);

module.exports = { routes: router };
