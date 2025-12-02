const { Router } = require('express');
const backupController = require('../controllers/backup.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { requireAdmin, requireSuperAdmin } = require('../middleware/role.middleware.js');

const router = Router();

// All backup routes require authentication and admin role
router.use(authMiddleware);
router.use(requireSuperAdmin); // Only super admin can manage backups

// Backup routes
router.get('/', backupController.getBackups);
router.get('/:id', backupController.getBackup);
router.get('/:id/status', backupController.getBackupStatus);
router.post('/', backupController.createBackup);
router.get('/:id/download', backupController.downloadBackup);
router.post('/restore', backupController.restoreBackup);
router.delete('/:id', backupController.deleteBackup);

module.exports = { backupRoutes: router };

