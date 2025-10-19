const { Router } = require('express');
const roomController = require('../controllers/room.controller.js');

const router = Router();

// ==================== ROOM ROUTES ====================
router.get('/', (req, res) => roomController.getAllRooms(req, res));
router.get('/available', (req, res) => roomController.getAvailableRooms(req, res));
router.get('/:id', (req, res) => roomController.getRoomById(req, res));
router.post('/', (req, res) => roomController.createRoom(req, res));
router.put('/:id', (req, res) => roomController.updateRoom(req, res));
router.delete('/:id', (req, res) => roomController.deleteRoom(req, res));

module.exports = router;
