const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipment.controller');

// ==================== EQUIPMENT MANAGEMENT ROUTES ====================

// Get all equipment
router.get('/equipment', (req, res) => equipmentController.getAllEquipment(req, res));

// Get equipment usage stats by status (for admin/reports) - MUST be before /equipment/:id routes
router.get('/equipment/usage-stats', (req, res) =>
  equipmentController.getEquipmentUsageStatsByStatus(req, res)
);

// Get equipment by ID
router.get('/equipment/:id', (req, res) => equipmentController.getEquipmentById(req, res));

// Upload equipment photo (must be before /equipment routes)
router.post('/equipment/photo/upload', (req, res) => equipmentController.uploadEquipmentPhoto(req, res));

// Create equipment
router.post('/equipment', (req, res) => equipmentController.createEquipment(req, res));

// Update equipment
router.put('/equipment/:id', (req, res) => equipmentController.updateEquipment(req, res));

// ==================== EQUIPMENT USAGE ROUTES ====================

// Get member's equipment usage
router.get('/members/:id/equipment-usage', (req, res) =>
  equipmentController.getMemberEquipmentUsage(req, res)
);

// Start equipment usage
router.post('/members/:id/equipment/start', (req, res) =>
  equipmentController.startEquipmentUsage(req, res)
);

// Stop equipment usage
router.post('/members/:id/equipment/stop', (req, res) =>
  equipmentController.stopEquipmentUsage(req, res)
);

// Get active usage for equipment and member
router.get('/equipment/:equipmentId/active-usage/:memberId', (req, res) =>
  equipmentController.getActiveUsage(req, res)
);

// Get equipment usage statistics
router.get('/members/:id/equipment-usage/stats', (req, res) =>
  equipmentController.getEquipmentUsageStats(req, res)
);

// Auto-stop expired sessions (internal use or cron)
router.post('/equipment/auto-stop-expired', (req, res) =>
  equipmentController.autoStopExpiredSessions(req, res)
);

// ==================== MAINTENANCE ROUTES ====================

// Get equipment maintenance logs
router.get('/equipment/:id/maintenance', (req, res) =>
  equipmentController.getMaintenanceLogs(req, res)
);

// Create maintenance log
router.post('/equipment/:id/maintenance', (req, res) =>
  equipmentController.createMaintenanceLog(req, res)
);

// ==================== QUEUE ROUTES ====================

// Join equipment queue
router.post('/equipment/:id/queue/join', (req, res) => equipmentController.joinQueue(req, res));

// Leave equipment queue
router.delete('/equipment/queue/:id', (req, res) => equipmentController.leaveQueue(req, res));

// Get equipment queue
router.get('/equipment/:id/queue', (req, res) => equipmentController.getEquipmentQueue(req, res));

// ==================== ISSUE REPORTING ROUTES ====================

// Report equipment issue
router.post('/equipment/:id/issues', (req, res) => equipmentController.reportIssue(req, res));

// Get equipment issues
router.get('/equipment/:id/issues', (req, res) => equipmentController.getEquipmentIssues(req, res));

// ==================== QR CODE ROUTES ====================

// Validate equipment QR code
router.post('/equipment/validate-qr', (req, res) => equipmentController.validateQRCode(req, res));

module.exports = router;
