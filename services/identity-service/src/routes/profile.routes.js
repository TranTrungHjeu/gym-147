const express = require('express');
const { ProfileController } = require('../controllers/profile.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { requireAdmin } = require('../middleware/role.middleware.js');

const router = express.Router();
const profileController = new ProfileController();

// Profile management routes
router.get('/', authMiddleware, (req, res) => profileController.getProfile(req, res));
router.put('/', authMiddleware, (req, res) => profileController.updateProfile(req, res));
router.put('/change-password', authMiddleware, (req, res) => profileController.changePassword(req, res));
router.post('/upload-avatar', authMiddleware, (req, res) => profileController.uploadAvatar(req, res));

// Account management routes
router.post('/deactivate-account', authMiddleware, (req, res) => profileController.deactivateAccount(req, res));
router.post('/delete-account', authMiddleware, (req, res) => profileController.deleteAccount(req, res));

// Admin-only routes
router.post('/reactivate-account/:userId', authMiddleware, requireAdmin, (req, res) => profileController.reactivateAccount(req, res));

module.exports = { profileRoutes: router };
