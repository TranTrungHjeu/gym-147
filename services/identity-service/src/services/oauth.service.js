const axios = require('axios');
const { prisma } = require('../lib/prisma.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const redisService = require('./redis.service.js');

/**
 * OAuth Service for Google and Facebook authentication
 */
class OAuthService {
  constructor() {
    this.googleClientId = process.env.GOOGLE_CLIENT_ID;
    this.googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/oauth/google/callback';
    this.facebookAppId = process.env.FACEBOOK_APP_ID;
    this.facebookAppSecret = process.env.FACEBOOK_APP_SECRET;
    this.facebookRedirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3001/auth/oauth/facebook/callback';
  }

  /**
   * Generate OAuth state token for CSRF protection
   */
  generateStateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Store state token in Redis with 10 minute expiry
   */
  async storeStateToken(state, userId = null) {
    const key = `oauth:state:${state}`;
    await redisService.set(key, JSON.stringify({ userId, timestamp: Date.now() }), 600); // 10 minutes
  }

  /**
   * Verify state token
   */
  async verifyStateToken(state) {
    const key = `oauth:state:${state}`;
    const data = await redisService.get(key);
    if (!data) {
      return { valid: false, error: 'Invalid or expired state token' };
    }
    await redisService.delete(key); // One-time use
    return { valid: true, data: JSON.parse(data) };
  }

  /**
   * Get Google OAuth authorization URL
   */
  getGoogleAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: this.googleClientId,
      redirect_uri: this.googleRedirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state: state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange Google authorization code for access token
   */
  async exchangeGoogleCode(code) {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.googleClientId,
        client_secret: this.googleClientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: this.googleRedirectUri,
      });

      return {
        success: true,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
      };
    } catch (error) {
      console.error('Error exchanging Google code:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error_description || 'Failed to exchange authorization code',
      };
    }
  }

  /**
   * Get user info from Google
   */
  async getGoogleUserInfo(accessToken) {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        success: true,
        data: {
          provider: 'google',
          provider_id: response.data.id,
          email: response.data.email,
          email_verified: response.data.verified_email || false,
          first_name: response.data.given_name || '',
          last_name: response.data.family_name || '',
          picture: response.data.picture,
          locale: response.data.locale,
        },
      };
    } catch (error) {
      console.error('Error fetching Google user info:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error_description || 'Failed to fetch user info',
      };
    }
  }

  /**
   * Get Facebook OAuth authorization URL
   */
  getFacebookAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: this.facebookAppId,
      redirect_uri: this.facebookRedirectUri,
      response_type: 'code',
      scope: 'email public_profile',
      state: state,
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchange Facebook authorization code for access token
   */
  async exchangeFacebookCode(code) {
    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          client_id: this.facebookAppId,
          client_secret: this.facebookAppSecret,
          redirect_uri: this.facebookRedirectUri,
          code: code,
        },
      });

      return {
        success: true,
        access_token: response.data.access_token,
        expires_in: response.data.expires_in,
      };
    } catch (error) {
      console.error('Error exchanging Facebook code:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to exchange authorization code',
      };
    }
  }

  /**
   * Get user info from Facebook
   */
  async getFacebookUserInfo(accessToken) {
    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/me', {
        params: {
          fields: 'id,name,email,picture',
          access_token: accessToken,
        },
      });

      // Parse name into first_name and last_name
      const nameParts = (response.data.name || '').split(' ');
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';

      return {
        success: true,
        data: {
          provider: 'facebook',
          provider_id: response.data.id,
          email: response.data.email || null,
          email_verified: !!response.data.email,
          first_name: first_name,
          last_name: last_name,
          picture: response.data.picture?.data?.url || null,
        },
      };
    } catch (error) {
      console.error('Error fetching Facebook user info:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to fetch user info',
      };
    }
  }

  /**
   * Find or create user from OAuth provider
   */
  async findOrCreateOAuthUser(providerData, provider = 'google') {
    try {
      // Check if user exists by email
      let user = await prisma.user.findUnique({
        where: { email: providerData.email },
      });

      if (user) {
        // User exists, check if OAuth account is linked
        // For now, we'll just return the user
        // In the future, we could add an OAuthAccounts table to track multiple providers
        return {
          success: true,
          user: user,
          isNewUser: false,
        };
      }

      // Check if user exists by provider_id (if we have OAuthAccounts table)
      // For now, create new user

      // Generate a random password (user won't use it, but it's required)
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      // Create new user
      user = await prisma.user.create({
        data: {
          email: providerData.email,
          password_hash: passwordHash, // Random password, user will use OAuth
          first_name: providerData.first_name,
          last_name: providerData.last_name,
          email_verified: providerData.email_verified || false,
          email_verified_at: providerData.email_verified ? new Date() : null,
          role: 'MEMBER', // Default role for OAuth users
          is_active: true,
        },
      });

      return {
        success: true,
        user: user,
        isNewUser: true,
      };
    } catch (error) {
      console.error('Error finding/creating OAuth user:', error);
      return {
        success: false,
        error: error.message || 'Failed to create user',
      };
    }
  }

  /**
   * Generate JWT tokens for OAuth user
   */
  async generateTokens(user, deviceInfo = null, platform = 'WEB') {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not set');
    }

    const sessionId = crypto.randomUUID();
    const tokenExpiry = 7 * 24 * 60 * 60; // 7 days
    const refreshTokenExpiry = 30 * 24 * 60 * 60; // 30 days

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionId: sessionId,
      },
      jwtSecret,
      { expiresIn: tokenExpiry }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        sessionId: sessionId,
        type: 'refresh',
      },
      jwtSecret,
      { expiresIn: refreshTokenExpiry }
    );

    // Create session in database
    const expiresAt = new Date(Date.now() + tokenExpiry * 1000);
    const session = await prisma.session.create({
      data: {
        id: sessionId,
        user_id: user.id,
        token: token,
        refresh_token: refreshToken,
        device_info: deviceInfo,
        platform: platform,
        expires_at: expiresAt,
        ip_address: null, // Will be set by controller
        user_agent: null, // Will be set by controller
      },
    });

    // Store session in Redis
    const sessionData = {
      id: session.id,
      user_id: session.user_id,
      token: session.token,
      refresh_token: session.refresh_token,
      device_info: session.device_info,
      ip_address: session.ip_address,
      user_agent: session.user_agent,
      expires_at: session.expires_at.toISOString(),
      created_at: session.created_at.toISOString(),
    };
    await redisService.setSession(sessionId, sessionData, tokenExpiry);

    // Update user last login
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    return {
      token,
      refreshToken,
      sessionId,
      expiresAt,
    };
  }
}

module.exports = { OAuthService };


