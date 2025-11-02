const express = require('express');
const queueController = require('../controllers/queue.controller');

const router = express.Router();

// ============================================
//  QUEUE ROUTES
// ============================================

// Join equipment queue
router.post('/join', (req, res) => queueController.joinQueue(req, res));

// Leave equipment queue
router.post('/leave', (req, res) => queueController.leaveQueue(req, res));

// Get my position in queue for specific equipment
router.get('/position/:equipment_id', (req, res) => queueController.getQueuePosition(req, res));

// Get all people in queue for specific equipment
router.get('/equipment/:equipment_id', (req, res) => queueController.getEquipmentQueue(req, res));

module.exports = router;
