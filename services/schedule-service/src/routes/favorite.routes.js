const { Router } = require('express');
const favoriteController = require('../controllers/favorite.controller.js');

const router = Router();

// ==================== FAVORITE ROUTES ====================
router.post('/members/:member_id/favorites', (req, res) =>
  favoriteController.addFavorite(req, res)
);
router.delete('/members/:member_id/favorites/:id', (req, res) =>
  favoriteController.removeFavorite(req, res)
);
router.get('/members/:member_id/favorites', (req, res) =>
  favoriteController.getMemberFavorites(req, res)
);
router.get('/members/:member_id/favorites/check', (req, res) =>
  favoriteController.checkFavorite(req, res)
);

module.exports = router;
