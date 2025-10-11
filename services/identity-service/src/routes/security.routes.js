const express = require('express');
const { SecurityController } = require('../controllers/security.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');

const router = express.Router();
const securityController = new SecurityController();

// Two-Factor Authentication routes (public for login verification)
router.post('/verify-2fa-login', (req, res) => securityController.verify2FALogin(req, res));

// Two-Factor Authentication routes (protected for setup/management)
router.post('/enable-2fa', authMiddleware, (req, res) => securityController.enable2FA(req, res));
router.post('/verify-2fa', authMiddleware, (req, res) => securityController.verify2FA(req, res));
router.post('/disable-2fa', authMiddleware, (req, res) => securityController.disable2FA(req, res));
router.get('/2fa-qr-code', authMiddleware, (req, res) => securityController.get2FAQRCode(req, res));

// Advanced security routes
router.post('/whitelist-ip', authMiddleware, (req, res) =>
  securityController.addIPWhitelist(req, res)
);
router.delete('/whitelist-ip/:ipAddress', authMiddleware, (req, res) =>
  securityController.removeIPWhitelist(req, res)
);
router.get('/whitelist-ips', authMiddleware, (req, res) =>
  securityController.getWhitelistedIPs(req, res)
);
router.post('/trusted-locations', authMiddleware, (req, res) =>
  securityController.addTrustedLocation(req, res)
);
router.get('/trusted-locations', authMiddleware, (req, res) =>
  securityController.getTrustedLocations(req, res)
);
router.post('/block-location', authMiddleware, (req, res) =>
  securityController.blockLocation(req, res)
);

module.exports = { securityRoutes: router };
