const { Router } = require('express');
const classController = require('../controllers/class.controller.js');

const router = Router();

// ==================== CLASS ROUTES ====================
router.get('/', (req, res) => classController.getAllClasses(req, res));
router.get('/:id', (req, res) => classController.getClassById(req, res));
router.post('/', (req, res) => classController.createClass(req, res));
router.put('/:id', (req, res) => classController.updateClass(req, res));
router.delete('/:id', (req, res) => classController.deleteClass(req, res));

// ==================== TRAINER-SPECIFIC ROUTES ====================
router.get('/trainers/:trainerId/available-categories', (req, res) => classController.getAvailableCategories(req, res));

module.exports = router;
