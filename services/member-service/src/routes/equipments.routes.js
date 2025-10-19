const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipment.controller');

// ==================== EQUIPMENT MANAGEMENT ROUTES ====================

// Get all equipment
router.get('/equipment', (req, res) => equipmentController.getAllEquipment(req, res));

// Get equipment by ID
router.get('/equipment/:id', (req, res) => equipmentController.getEquipmentById(req, res));

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

// Get equipment usage statistics
router.get('/members/:id/equipment-usage/stats', (req, res) =>
  equipmentController.getEquipmentUsageStats(req, res)
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

module.exports = router;
