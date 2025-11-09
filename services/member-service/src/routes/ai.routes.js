const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');

// ==================== AI ROUTES ====================

// Generate class recommendations
router.post('/class-recommendations', (req, res) =>
  aiController.generateClassRecommendations(req, res)
);

// Generate smart scheduling suggestions
router.post('/scheduling-suggestions', (req, res) =>
  aiController.generateSchedulingSuggestions(req, res)
);

module.exports = router;
