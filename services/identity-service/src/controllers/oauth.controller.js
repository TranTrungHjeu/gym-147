const { OAuthService } = require('../services/oauth.service.js');

class OAuthController {
  constructor() {
    this.oauthService = new OAuthService();
  }

  /**
   * Initiate Google OAuth flow
   * GET /auth/oauth/google?redirect_uri=...&userId=...
   */
  async initiateGoogle(req, res) {
    try {
      const state = this.oauthService.generateStateToken();
      const userId = req.query.userId || null; // Optional: link to existing account
      const redirectUri = req.query.redirect_uri || req.query.redirectUri || null; // Mobile app redirect URI (deep link, stored in state)

      console.log('[OAUTH_INIT] Received request:', {
        userId: userId,
        redirectUri: redirectUri,
        queryParams: {
          userId: req.query.userId,
          redirect_uri: req.query.redirect_uri,
          redirectUri: req.query.redirectUri,
        },
        note: 'redirectUri is mobile deep link, will be stored in state and used later for redirect back to mobile app',
      });

      // Store state token with redirect_uri for callback
      await this.oauthService.storeStateToken(state, userId, redirectUri);
      console.log('[OAUTH_INIT] Stored state token with redirectUri:', {
        state: state.substring(0, 20) + '...',
        hasRedirectUri: !!redirectUri,
        redirectUri: redirectUri ? redirectUri.substring(0, 50) + '...' : null,
      });

      // Get authorization URL (always uses backend callback URL for Google OAuth, not the mobile deep link)
      const authUrl = this.oauthService.getGoogleAuthUrl(state, redirectUri);

      console.log('[OAUTH_INIT] Generated auth URL (first 150 chars):', authUrl.substring(0, 150));

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

      // Helper function to get redirect URL for errors
      const getErrorRedirectUrl = async errorMessage => {
        let redirectUri = null;
        if (state) {
          // Try to get redirect_uri from state token (even if invalid)
          const stateData = await this.oauthService.getStateTokenData(state);
          if (stateData) {
            redirectUri = stateData.redirectUri || null;
          }
        }
        const fallbackUrl = redirectUri || process.env.FRONTEND_URL || 'http://localhost:5173';
        const callbackUrl = fallbackUrl.includes('://')
          ? fallbackUrl
          : `${fallbackUrl}/auth/callback`;
        return `${callbackUrl}?error=${encodeURIComponent(errorMessage)}`;
      };

      if (error) {
        const errorUrl = await getErrorRedirectUrl(error);
        return res.redirect(errorUrl);
      }

      if (!code || !state) {
        const errorUrl = await getErrorRedirectUrl('Missing code or state');
        return res.redirect(errorUrl);
      }

      // Verify state token
      const stateVerification = await this.oauthService.verifyStateToken(state);
      if (!stateVerification.valid) {
        const redirectUri =
          stateVerification.data?.redirectUri ||
          process.env.FRONTEND_URL ||
          'http://localhost:5173';
        const callbackUrl = redirectUri.includes('://')
          ? redirectUri
          : `${redirectUri}/auth/callback`;
        return res.redirect(`${callbackUrl}?error=${encodeURIComponent('Invalid state token')}`);
      }

      // Get redirect_uri from state token (for mobile apps) or use default (for web)
      const redirectUri = stateVerification.data?.redirectUri || null;
      console.log('[OAUTH_CALLBACK] Retrieved redirect URI from state:', {
        redirectUri: redirectUri,
        isDeepLink: redirectUri && redirectUri.includes('://') && !redirectUri.startsWith('http'),
        stateData: {
          userId: stateVerification.data?.userId,
          redirectUri: stateVerification.data?.redirectUri,
          timestamp: stateVerification.data?.timestamp,
        },
        willRedirectToMobile:
          redirectUri && redirectUri.includes('://') && !redirectUri.startsWith('http'),
      });

      // Exchange code for access token (pass redirect_uri for mobile apps)
      const tokenResult = await this.oauthService.exchangeGoogleCode(code, redirectUri);
      if (!tokenResult.success) {
        const fallbackUrl = redirectUri || process.env.FRONTEND_URL || 'http://localhost:5173';
        const callbackUrl = fallbackUrl.includes('://')
          ? fallbackUrl
          : `${fallbackUrl}/auth/callback`;
        return res.redirect(`${callbackUrl}?error=${encodeURIComponent(tokenResult.error)}`);
      }

      // Get user info
      const userInfoResult = await this.oauthService.getGoogleUserInfo(tokenResult.access_token);
      if (!userInfoResult.success) {
        const fallbackUrl = redirectUri || process.env.FRONTEND_URL || 'http://localhost:5173';
        const callbackUrl = fallbackUrl.includes('://')
          ? fallbackUrl
          : `${fallbackUrl}/auth/callback`;
        return res.redirect(`${callbackUrl}?error=${encodeURIComponent(userInfoResult.error)}`);
      }

      // Find or create user
      const userResult = await this.oauthService.findOrCreateOAuthUser(
        userInfoResult.data,
        'google'
      );
      if (!userResult.success) {
        const fallbackUrl = redirectUri || process.env.FRONTEND_URL || 'http://localhost:5173';
        const callbackUrl = fallbackUrl.includes('://')
          ? fallbackUrl
          : `${fallbackUrl}/auth/callback`;
        return res.redirect(`${callbackUrl}?error=${encodeURIComponent(userResult.error)}`);
      }

      // Generate tokens
      const deviceInfo = req.headers['user-agent'] || 'Unknown';
      const ipAddress = req.ip || req.connection.remoteAddress;
      // Determine platform: if redirectUri is a deep link (contains ://), it's mobile
      const platform =
        redirectUri && redirectUri.includes('://') && !redirectUri.startsWith('http')
          ? 'MOBILE_IOS'
          : 'WEB';
      const tokens = await this.oauthService.generateTokens(userResult.user, deviceInfo, platform);

      // Redirect with tokens
      // If redirectUri is provided (mobile app), use it directly
      // Otherwise, redirect to web frontend
      if (redirectUri && redirectUri.includes('://') && !redirectUri.startsWith('http')) {
        // Mobile app deep link
        const redirectUrl = `${redirectUri}?token=${tokens.token}&refreshToken=${tokens.refreshToken}&isNewUser=${userResult.isNewUser}`;
        console.log('[OAUTH_CALLBACK] Redirecting to mobile deep link:', {
          redirectUri: redirectUri,
          redirectUrl: redirectUrl.substring(0, 100) + '...',
          hasToken: !!tokens.token,
          hasRefreshToken: !!tokens.refreshToken,
          isNewUser: userResult.isNewUser,
        });
        res.redirect(redirectUrl);
      } else {
        // Web frontend
        const frontendUrl = redirectUri || process.env.FRONTEND_URL || 'http://localhost:5173';
        const callbackUrl = frontendUrl.includes('/auth/callback')
          ? frontendUrl
          : `${frontendUrl}/auth/callback`;
        const redirectUrl = `${callbackUrl}?token=${tokens.token}&refreshToken=${tokens.refreshToken}&isNewUser=${userResult.isNewUser}`;
        console.log('[OAUTH_CALLBACK] Redirecting to web frontend:', {
          frontendUrl: frontendUrl,
          callbackUrl: callbackUrl,
          redirectUrl: redirectUrl.substring(0, 100) + '...',
        });
        res.redirect(redirectUrl);
      }
    } catch (error) {
      console.error('Error in Google OAuth callback:', error);
      // Try to get redirect_uri from state for error redirect
      let redirectUri = null;
      if (req.query.state) {
        try {
          const stateData = await this.oauthService.getStateTokenData(req.query.state);
          if (stateData) {
            redirectUri = stateData.redirectUri || null;
          }
        } catch (e) {
          // Ignore errors when getting redirect_uri
        }
      }
      const fallbackUrl = redirectUri || process.env.FRONTEND_URL || 'http://localhost:5173';
      const callbackUrl = fallbackUrl.includes('://')
        ? fallbackUrl
        : `${fallbackUrl}/auth/callback`;
      res.redirect(`${callbackUrl}?error=${encodeURIComponent('OAuth authentication failed')}`);
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
      const response = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
      );

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
          `${
            process.env.FRONTEND_URL || 'http://localhost:5173'
          }/auth/callback?error=${encodeURIComponent(error)}`
        );
      }

      if (!code || !state) {
        return res.redirect(
          `${
            process.env.FRONTEND_URL || 'http://localhost:5173'
          }/auth/callback?error=${encodeURIComponent('Missing code or state')}`
        );
      }

      const stateVerification = await this.oauthService.verifyStateToken(state);
      if (!stateVerification.valid) {
        return res.redirect(
          `${
            process.env.FRONTEND_URL || 'http://localhost:5173'
          }/auth/callback?error=${encodeURIComponent('Invalid state token')}`
        );
      }

      const tokenResult = await this.oauthService.exchangeFacebookCode(code);
      if (!tokenResult.success) {
        return res.redirect(
          `${
            process.env.FRONTEND_URL || 'http://localhost:5173'
          }/auth/callback?error=${encodeURIComponent(tokenResult.error)}`
        );
      }

      const userInfoResult = await this.oauthService.getFacebookUserInfo(tokenResult.access_token);
      if (!userInfoResult.success) {
        return res.redirect(
          `${
            process.env.FRONTEND_URL || 'http://localhost:5173'
          }/auth/callback?error=${encodeURIComponent(userInfoResult.error)}`
        );
      }

      const userResult = await this.oauthService.findOrCreateOAuthUser(
        userInfoResult.data,
        'facebook'
      );
      if (!userResult.success) {
        return res.redirect(
          `${
            process.env.FRONTEND_URL || 'http://localhost:5173'
          }/auth/callback?error=${encodeURIComponent(userResult.error)}`
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
        `${
          process.env.FRONTEND_URL || 'http://localhost:5173'
        }/auth/callback?error=${encodeURIComponent('OAuth authentication failed')}`
      );
    }
  }
}

module.exports = { OAuthController };
