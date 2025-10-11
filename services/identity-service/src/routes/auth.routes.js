const { Router } = require('express');
const { AuthController } = require('../controllers/auth.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { requireSuperAdmin, requireAdmin } = require('../middleware/role.middleware.js');

const router = Router();
const authController = new AuthController();

// Public routes (không cần authentication)
router.post('/login', (req, res) => authController.login(req, res));
router.post('/send-otp', (req, res) => authController.sendRegistrationOTP(req, res));
router.post('/verify-otp', (req, res) => authController.verifyRegistrationOTP(req, res));
router.post('/register', (req, res) => authController.registerMember(req, res)); // Chỉ tạo MEMBER
router.post('/verify-email', (req, res) => authController.verifyEmail(req, res)); // Verify email với token

// Password reset routes (public)
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));
router.post('/reset-password', (req, res) => authController.resetPassword(req, res));
router.get('/validate-reset-token/:token', (req, res) =>
  authController.validateResetToken(req, res)
);

// Two-Factor Authentication routes (public for login verification)
router.post('/verify-2fa-login', (req, res) => authController.verify2FALogin(req, res));

// Protected routes (cần authentication)
router.post('/logout', authMiddleware, (req, res) => authController.logout(req, res));
router.get('/profile', authMiddleware, (req, res) => authController.getProfile(req, res));
router.post('/resend-email-verification', authMiddleware, (req, res) =>
  authController.resendEmailVerification(req, res)
);

// Session management routes
router.post('/refresh-token', (req, res) => authController.refreshToken(req, res)); // Public for token refresh

// Admin-only routes
router.post('/register-admin', authMiddleware, requireSuperAdmin, (req, res) =>
  authController.registerAdmin(req, res)
);

module.exports = { authRoutes: router };
