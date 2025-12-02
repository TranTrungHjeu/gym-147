const { OAuthService } = require('../services/oauth.service.js');

class OAuthController {
  constructor() {
    this.oauthService = new OAuthService();
  }

  /**
   * Initiate Google OAuth flow
   * GET /auth/oauth/google
   */
  async initiateGoogle(req, res) {
    try {
      const state = this.oauthService.generateStateToken();
      const userId = req.query.userId || null; // Optional: link to existing account

      // Store state token
      await this.oauthService.storeStateToken(state, userId);

      // Get authorization URL
      const authUrl = this.oauthService.getGoogleAuthUrl(state);

      res.json({
        success: true,
        data: {
          authUrl: authUrl,
          state: state, // For mobile apps to verify
        },
      });
    } catch (error) {
      console.error('Error initiating Google OAuth:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate Google OAuth',
        data: null,
      });
    }
  }

  /**
   * Google OAuth callback
   * GET /auth/oauth/google/callback
   */
  async googleCallback(req, res) {
    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent(error)}`
        );
      }

      if (!code || !state) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent('Missing code or state')}`
        );
      }

      // Verify state token
      const stateVerification = await this.oauthService.verifyStateToken(state);
      if (!stateVerification.valid) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent('Invalid state token')}`
        );
      }

      // Exchange code for access token
      const tokenResult = await this.oauthService.exchangeGoogleCode(code);
      if (!tokenResult.success) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent(tokenResult.error)}`
        );
      }

      // Get user info
      const userInfoResult = await this.oauthService.getGoogleUserInfo(tokenResult.access_token);
      if (!userInfoResult.success) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent(userInfoResult.error)}`
        );
      }

      // Find or create user
      const userResult = await this.oauthService.findOrCreateOAuthUser(userInfoResult.data, 'google');
      if (!userResult.success) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent(userResult.error)}`
        );
      }

      // Generate tokens
      const deviceInfo = req.headers['user-agent'] || 'Unknown';
      const ipAddress = req.ip || req.connection.remoteAddress;
      const tokens = await this.oauthService.generateTokens(userResult.user, deviceInfo, 'WEB');

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.token}&refreshToken=${tokens.refreshToken}&isNewUser=${userResult.isNewUser}`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error in Google OAuth callback:', error);
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent('OAuth authentication failed')}`
      );
    }
  }

  /**
   * Mobile Google OAuth - Exchange ID token for JWT
   * POST /auth/oauth/google/mobile
   */
  async googleMobile(req, res) {
    try {
      const { idToken, deviceInfo, platform } = req.body;

      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: 'ID token is required',
          data: null,
        });
      }

      // Verify Google ID token
      const axios = require('axios');
      const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);

      if (response.data.aud !== this.oauthService.googleClientId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID token',
          data: null,
        });
      }

      // Get user info from token
      const userInfo = {
        provider: 'google',
        provider_id: response.data.sub,
        email: response.data.email,
        email_verified: response.data.email_verified === 'true',
        first_name: response.data.given_name || '',
        last_name: response.data.family_name || '',
        picture: response.data.picture,
      };

      // Find or create user
      const userResult = await this.oauthService.findOrCreateOAuthUser(userInfo, 'google');
      if (!userResult.success) {
        return res.status(500).json({
          success: false,
          message: userResult.error,
          data: null,
        });
      }

      // Generate tokens
      const tokens = await this.oauthService.generateTokens(
        userResult.user,
        deviceInfo || 'Mobile App',
        platform || 'MOBILE_IOS'
      );

      res.json({
        success: true,
        message: 'OAuth authentication successful',
        data: {
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          user: {
            id: userResult.user.id,
            email: userResult.user.email,
            first_name: userResult.user.first_name,
            last_name: userResult.user.last_name,
            role: userResult.user.role,
          },
          isNewUser: userResult.isNewUser,
        },
      });
    } catch (error) {
      console.error('Error in Google mobile OAuth:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'OAuth authentication failed',
        data: null,
      });
    }
  }

  /**
   * Initiate Facebook OAuth flow
   * GET /auth/oauth/facebook
   */
  async initiateFacebook(req, res) {
    try {
      const state = this.oauthService.generateStateToken();
      const userId = req.query.userId || null;

      await this.oauthService.storeStateToken(state, userId);
      const authUrl = this.oauthService.getFacebookAuthUrl(state);

      res.json({
        success: true,
        data: {
          authUrl: authUrl,
          state: state,
        },
      });
    } catch (error) {
      console.error('Error initiating Facebook OAuth:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate Facebook OAuth',
        data: null,
      });
    }
  }

  /**
   * Facebook OAuth callback
   * GET /auth/oauth/facebook/callback
   */
  async facebookCallback(req, res) {
    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent(error)}`
        );
      }

      if (!code || !state) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent('Missing code or state')}`
        );
      }

      const stateVerification = await this.oauthService.verifyStateToken(state);
      if (!stateVerification.valid) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent('Invalid state token')}`
        );
      }

      const tokenResult = await this.oauthService.exchangeFacebookCode(code);
      if (!tokenResult.success) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent(tokenResult.error)}`
        );
      }

      const userInfoResult = await this.oauthService.getFacebookUserInfo(tokenResult.access_token);
      if (!userInfoResult.success) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent(userInfoResult.error)}`
        );
      }

      const userResult = await this.oauthService.findOrCreateOAuthUser(userInfoResult.data, 'facebook');
      if (!userResult.success) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent(userResult.error)}`
        );
      }

      const deviceInfo = req.headers['user-agent'] || 'Unknown';
      const tokens = await this.oauthService.generateTokens(userResult.user, deviceInfo, 'WEB');

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.token}&refreshToken=${tokens.refreshToken}&isNewUser=${userResult.isNewUser}`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error in Facebook OAuth callback:', error);
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent('OAuth authentication failed')}`
      );
    }
  }
}

module.exports = { OAuthController };


