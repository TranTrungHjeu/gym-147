const { Router } = require('express');
const { OAuthController } = require('../controllers/oauth.controller.js');

const router = Router();
const oauthController = new OAuthController();

// Google OAuth routes
router.get('/google', (req, res) => oauthController.initiateGoogle(req, res));
router.get('/google/callback', (req, res) => oauthController.googleCallback(req, res));
router.post('/google/mobile', (req, res) => oauthController.googleMobile(req, res));

// Facebook OAuth routes
router.get('/facebook', (req, res) => oauthController.initiateFacebook(req, res));
router.get('/facebook/callback', (req, res) => oauthController.facebookCallback(req, res));

module.exports = { oauthRoutes: router };


