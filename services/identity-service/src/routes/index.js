const express = require('express');
const { authRoutes } = require('./auth.routes.js');
const { profileRoutes } = require('./profile.routes.js');
const { securityRoutes } = require('./security.routes.js');
const { deviceRoutes } = require('./device.routes.js');
const { analyticsRoutes } = require('./analytics.routes.js');
const { notificationRoutes } = require('./notification.routes.js');
const { systemRoutes } = require('./system.routes.js');
const { tenantRoutes } = require('./tenant.routes.js');
const dashboardRoutes = require('./dashboard.routes.js');

const router = express.Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/security', securityRoutes);
router.use('/devices', deviceRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/system', systemRoutes);
router.use('/tenant', tenantRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = { routes: router };
