const express = require('express');
const { ProfileController } = require('../controllers/profile.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { requireAdmin } = require('../middleware/role.middleware.js');
const s3UploadService = require('../services/s3-upload.service.js');

const router = express.Router();
const profileController = new ProfileController();

// Profile management routes
router.get('/', authMiddleware, (req, res) => profileController.getProfile(req, res));
router.put('/', authMiddleware, (req, res) => profileController.updateProfile(req, res));
router.put('/change-password', authMiddleware, (req, res) =>
  profileController.changePassword(req, res)
);
router.post('/send-otp-for-password-change', authMiddleware, (req, res) =>
  profileController.sendOTPForPasswordChange(req, res)
);
router.post('/change-password-with-otp', authMiddleware, (req, res) =>
  profileController.changePasswordWithOTP(req, res)
);
router.post('/send-otp-for-email-phone-change', authMiddleware, (req, res) =>
  profileController.sendOTPForEmailPhoneChange(req, res)
);
router.put('/update-email-phone-with-otp', authMiddleware, (req, res) =>
  profileController.updateEmailPhoneWithOTP(req, res)
);
router.post(
  '/upload-avatar',
  authMiddleware,
  s3UploadService.getUploadMiddleware('avatar'),
  (req, res) => profileController.uploadAvatar(req, res)
);

// Account management routes
router.post('/deactivate-account', authMiddleware, (req, res) =>
  profileController.deactivateAccount(req, res)
);
router.post('/delete-account', authMiddleware, (req, res) =>
  profileController.deleteAccount(req, res)
);

// Admin-only routes
router.post('/reactivate-account/:userId', authMiddleware, requireAdmin, (req, res) =>
  profileController.reactivateAccount(req, res)
);

// ==================== FACE RECOGNITION ROUTES ====================

// Update face encoding
router.put('/face-encoding', authMiddleware, (req, res) =>
  profileController.updateFaceEncoding(req, res)
);

// Get face encoding status
router.get('/face-encoding/status', authMiddleware, (req, res) =>
  profileController.getFaceEncodingStatus(req, res)
);

// Delete face encoding
router.delete('/face-encoding', authMiddleware, (req, res) =>
  profileController.deleteFaceEncoding(req, res)
);

module.exports = { profileRoutes: router };
