const express = require('express');
const router = express.Router();
const guestPassController = require('../controllers/guest-pass.controller.js');

// Static routes (must be before dynamic routes with params)
router.post('/guest-passes', (req, res) => guestPassController.createGuestPass(req, res));
router.get('/guest-passes', (req, res) => guestPassController.getGuestPasses(req, res));
router.get('/guest-passes/stats', (req, res) => guestPassController.getGuestPassStats(req, res));

// Dynamic routes with params (must be after static routes)
router.get('/guest-passes/:id', (req, res) => guestPassController.getGuestPassById(req, res));
router.put('/guest-passes/:id', (req, res) => guestPassController.updateGuestPass(req, res));
router.delete('/guest-passes/:id', (req, res) => guestPassController.deleteGuestPass(req, res));
router.post('/guest-passes/:id/cancel', (req, res) => guestPassController.cancelGuestPass(req, res));
router.post('/guest-passes/:id/use', (req, res) => guestPassController.useGuestPass(req, res));

module.exports = router;


