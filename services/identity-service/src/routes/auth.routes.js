const { Router } = require('express');
const { AuthController } = require('../controllers/auth.controller.js');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware.js');

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/login', authController.login.bind(authController));
router.post('/register', authController.register.bind(authController));
router.post('/verify-token', authController.verifyToken.bind(authController));

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile.bind(authController));
router.put('/profile', authenticateToken, authController.updateProfile.bind(authController));
router.post('/change-password', authenticateToken, authController.changePassword.bind(authController));

// Admin only routes
router.get('/users', authenticateToken, requireAdmin, authController.getAllUsers.bind(authController));

module.exports = { authRoutes: router };