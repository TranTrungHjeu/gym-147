const express = require('express');
const { DeviceController } = require('../controllers/device.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');

const router = express.Router();
const deviceController = new DeviceController();

// Device management routes
router.get('/', authMiddleware, (req, res) => deviceController.getDevices(req, res));
router.delete('/:deviceId', authMiddleware, (req, res) => deviceController.logoutDevice(req, res));
router.post('/revoke-all-sessions', authMiddleware, (req, res) =>
  deviceController.revokeAllSessions(req, res)
);

// Session management routes
router.get('/session-info', authMiddleware, (req, res) =>
  deviceController.getSessionInfo(req, res)
);

module.exports = { deviceRoutes: router };
