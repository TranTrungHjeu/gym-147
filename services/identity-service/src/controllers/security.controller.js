const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/prisma.js');

class SecurityController {
  constructor() {
    // Validation helper methods
    this.validatePassword = this.validatePassword.bind(this);
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    if (!password || password.length < 8) {
      return {
        isValid: false,
        message: 'Mật khẩu phải có ít nhất 8 ký tự',
      };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return {
        isValid: false,
        message: 'Mật khẩu phải có ít nhất 1 chữ thường',
      };
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return {
        isValid: false,
        message: 'Mật khẩu phải có ít nhất 1 chữ hoa',
      };
    }

    if (!/(?=.*\d)/.test(password)) {
      return {
        isValid: false,
        message: 'Mật khẩu phải có ít nhất 1 số',
      };
    }

    return { isValid: true };
  }

  // ==================== TWO-FACTOR AUTHENTICATION (2FA) ====================

  /**
   * Verify 2FA token for login
   */
  async verify2FALogin(req, res) {
    try {
      const { userId, twoFactorToken } = req.body;

      if (!userId || !twoFactorToken) {
        return res.status(400).json({
          success: false,
          message: 'User ID và 2FA token là bắt buộc',
          data: null,
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          two_factor_secret: true,
          two_factor_enabled: true,
          is_active: true,
          email: true,
          role: true,
          first_name: true,
          last_name: true,
          phone: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null,
        });
      }

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa',
          data: null,
        });
      }

      if (!user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: '2FA chưa được bật cho tài khoản này',
          data: null,
        });
      }

      // Verify 2FA token
      const is2FAValid = this.verifyTOTPToken(user.two_factor_secret, twoFactorToken);
      if (!is2FAValid) {
        return res.status(401).json({
          success: false,
          message: '2FA token không hợp lệ',
          data: null,
        });
      }

      // Generate tokens and create session
      const refreshToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const session = await prisma.session.create({
        data: {
          user_id: user.id,
          refresh_token: refreshToken,
          device_info: req.headers['user-agent'] || 'Unknown',
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.headers['user-agent'] || 'Unknown',
          expires_at: expiresAt,
        },
      });

      // Store session in Redis with TTL = token expiry (15 minutes for access token)
      const redisService = require('../services/redis.service.js');
      const sessionData = {
        id: session.id,
        user_id: user.id,
        token: null, // 2FA doesn't use access token initially
        refresh_token: refreshToken,
        device_info: session.device_info,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        expires_at: expiresAt.toISOString(),
        created_at: session.created_at.toISOString(),
      };
      const accessTokenTTL = 15 * 60; // 15 minutes in seconds
      await redisService.setSession(session.id, sessionData, accessTokenTTL);

      // Generate JWT token with sessionId
      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          sessionId: session.id,
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '15m' } // Short-lived access token
      );

      // Update session in Redis with access token
      const updatedSessionData = {
        id: session.id,
        user_id: user.id,
        token: accessToken,
        refresh_token: refreshToken,
        device_info: session.device_info,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        expires_at: expiresAt.toISOString(),
        created_at: session.created_at.toISOString(),
      };
      // Reuse accessTokenTTL from above
      await redisService.setSession(session.id, updatedSessionData, accessTokenTTL);

      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: { last_login_at: new Date() },
      });

      res.json({
        success: true,
        message: '2FA verification successful',
        data: {
          accessToken,
          refreshToken,
          expiresIn: 900, // 15 minutes
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
          },
        },
      });
    } catch (error) {
      console.error('Verify 2FA login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Enable 2FA for user
   */
  async enable2FA(req, res) {
    try {
      const userId = req.user.id;

      // Check if 2FA is already enabled
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, two_factor_enabled: true, two_factor_secret: true, email: true },
      });

      if (user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: '2FA đã được bật cho tài khoản này',
          data: null,
        });
      }

      // Generate 2FA secret
      const secret = crypto.randomBytes(20).toString('base32');
      const secretKey = `otpauth://totp/Gym147:${user.email}?secret=${secret}&issuer=Gym147`;

      // Update user with 2FA secret (but don't enable yet)
      await prisma.user.update({
        where: { id: userId },
        data: { two_factor_secret: secret },
      });

      res.json({
        success: true,
        message: '2FA secret generated. Please verify to enable.',
        data: {
          secret: secret,
          qrCodeUrl: secretKey,
          manualEntryKey: secret,
        },
      });
    } catch (error) {
      console.error('Enable 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Verify 2FA setup
   */
  async verify2FA(req, res) {
    try {
      const userId = req.user.id;
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: '2FA token là bắt buộc',
          data: null,
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, two_factor_secret: true, two_factor_enabled: true },
      });

      if (!user.two_factor_secret) {
        return res.status(400).json({
          success: false,
          message: '2FA chưa được thiết lập. Vui lòng enable 2FA trước.',
          data: null,
        });
      }

      if (user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: '2FA đã được bật cho tài khoản này',
          data: null,
        });
      }

      // Verify TOTP token
      const isValid = this.verifyTOTPToken(user.two_factor_secret, token);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: '2FA token không hợp lệ',
          data: null,
        });
      }

      // Enable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: { two_factor_enabled: true },
      });

      res.json({
        success: true,
        message: '2FA đã được bật thành công',
        data: null,
      });
    } catch (error) {
      console.error('Verify 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get 2FA status
   */
  async get2FAStatus(req, res) {
    try {
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          two_factor_enabled: true,
          two_factor_secret: true,
          email: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null,
        });
      }

      // Build response data
      const responseData = {
        enabled: user.two_factor_enabled,
      };

      // If 2FA is not enabled but secret exists, it means setup is pending
      if (!user.two_factor_enabled && user.two_factor_secret) {
        const secretKey = `otpauth://totp/Gym147:${user.email}?secret=${user.two_factor_secret}&issuer=Gym147`;
        responseData.secret = user.two_factor_secret;
        responseData.qrCodeUrl = secretKey;
      }

      res.json({
        success: true,
        message: '2FA status retrieved successfully',
        data: responseData,
      });
    } catch (error) {
      console.error('Get 2FA status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Disable 2FA
   */
  async disable2FA(req, res) {
    try {
      const userId = req.user.id;
      const { password, token } = req.body;

      if (!password || !token) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu và 2FA token là bắt buộc',
          data: null,
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          password_hash: true,
          two_factor_secret: true,
          two_factor_enabled: true,
        },
      });

      if (!user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: '2FA chưa được bật cho tài khoản này',
          data: null,
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu không đúng',
          data: null,
        });
      }

      // Verify 2FA token
      const isTokenValid = this.verifyTOTPToken(user.two_factor_secret, token);
      if (!isTokenValid) {
        return res.status(400).json({
          success: false,
          message: '2FA token không hợp lệ',
          data: null,
        });
      }

      // Disable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: {
          two_factor_enabled: false,
          two_factor_secret: null,
        },
      });

      res.json({
        success: true,
        message: '2FA đã được tắt thành công',
        data: null,
      });
    } catch (error) {
      console.error('Disable 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get 2FA QR code
   */
  async get2FAQRCode(req, res) {
    try {
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, two_factor_secret: true, two_factor_enabled: true },
      });

      if (!user.two_factor_secret) {
        return res.status(400).json({
          success: false,
          message: '2FA chưa được thiết lập. Vui lòng enable 2FA trước.',
          data: null,
        });
      }

      const secretKey = `otpauth://totp/Gym147:${user.email}?secret=${user.two_factor_secret}&issuer=Gym147`;

      res.json({
        success: true,
        message: '2FA QR code retrieved successfully',
        data: {
          qrCodeUrl: secretKey,
          manualEntryKey: user.two_factor_secret,
          isEnabled: user.two_factor_enabled,
        },
      });
    } catch (error) {
      console.error('Get 2FA QR code error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Verify TOTP token (helper method)
   */
  verifyTOTPToken(secret, token) {
    // This is a simplified TOTP verification
    // In production, you should use a proper TOTP library like 'speakeasy'
    // For now, we'll implement a basic version

    const time = Math.floor(Date.now() / 1000 / 30); // 30-second window
    const expectedToken = this.generateTOTP(secret, time);

    return expectedToken === token;
  }

  /**
   * Generate TOTP token (helper method)
   */
  generateTOTP(secret, time) {
    // This is a simplified TOTP generation
    // In production, use a proper TOTP library
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32'));
    hmac.update(Buffer.from(time.toString(16).padStart(16, '0'), 'hex'));
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0xf;
    const code =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    return (code % 1000000).toString().padStart(6, '0');
  }

  // ==================== ADVANCED SECURITY ====================

  /**
   * Add IP to whitelist
   */
  async addIPWhitelist(req, res) {
    try {
      const userId = req.user.id;
      const { ipAddress, description } = req.body;

      if (!ipAddress) {
        return res.status(400).json({
          success: false,
          message: 'IP address là bắt buộc',
          data: null,
        });
      }

      // Check if IP already exists
      const existingIP = await prisma.iPWhitelist.findFirst({
        where: {
          user_id: userId,
          ip_address: ipAddress,
        },
      });

      if (existingIP) {
        return res.status(400).json({
          success: false,
          message: 'IP address này đã có trong whitelist',
          data: null,
        });
      }

      const newIP = await prisma.iPWhitelist.create({
        data: {
          user_id: userId,
          ip_address: ipAddress,
          description,
        },
      });

      res.json({
        success: true,
        message: 'IP address đã được thêm vào whitelist',
        data: newIP,
      });
    } catch (error) {
      console.error('Add IP whitelist error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Remove IP from whitelist
   */
  async removeIPWhitelist(req, res) {
    try {
      const userId = req.user.id;
      const { ipAddress } = req.params;

      if (!ipAddress) {
        return res.status(400).json({
          success: false,
          message: 'IP address là bắt buộc',
          data: null,
        });
      }

      // Find the IP entry first to get its ID or delete by composite key logic if supported,
      // but here we delete by user_id and ip_address
      const deleted = await prisma.iPWhitelist.deleteMany({
        where: {
          user_id: userId,
          ip_address: ipAddress,
        },
      });

      if (deleted.count === 0) {
        return res.status(404).json({
          success: false,
          message: 'IP address không tìm thấy trong whitelist',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'IP address đã được xóa khỏi whitelist',
        data: {
          ipAddress,
          removedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Remove IP whitelist error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get whitelisted IPs
   */
  async getWhitelistedIPs(req, res) {
    try {
      const userId = req.user.id;

      const ips = await prisma.iPWhitelist.findMany({
        where: {
          user_id: userId,
        },
        orderBy: {
          added_at: 'desc',
        },
      });

      res.json({
        success: true,
        message: 'Whitelisted IPs retrieved successfully',
        data: {
          whitelistedIPs: ips,
        },
      });
    } catch (error) {
      console.error('Get whitelisted IPs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Add trusted location
   */
  async addTrustedLocation(req, res) {
    try {
      const userId = req.user.id;
      const { latitude, longitude, address, name } = req.body;

      if (!latitude || !longitude || !address) {
        return res.status(400).json({
          success: false,
          message: 'Latitude, longitude và address là bắt buộc',
          data: null,
        });
      }

      const newLocation = await prisma.trustedLocation.create({
        data: {
          user_id: userId,
          latitude,
          longitude,
          address,
          name,
        },
      });

      res.json({
        success: true,
        message: 'Trusted location đã được thêm thành công',
        data: newLocation,
      });
    } catch (error) {
      console.error('Add trusted location error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get trusted locations
   */
  async getTrustedLocations(req, res) {
    try {
      const userId = req.user.id;

      const locations = await prisma.trustedLocation.findMany({
        where: {
          user_id: userId,
        },
        orderBy: {
          added_at: 'desc',
        },
      });

      res.json({
        success: true,
        message: 'Trusted locations retrieved successfully',
        data: {
          trustedLocations: locations,
        },
      });
    } catch (error) {
      console.error('Get trusted locations error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Block location
   */
  async blockLocation(req, res) {
    try {
      const userId = req.user.id;
      const { latitude, longitude, address, reason } = req.body;

      if (!latitude || !longitude || !address) {
        return res.status(400).json({
          success: false,
          message: 'Latitude, longitude và address là bắt buộc',
          data: null,
        });
      }

      const blockedLocation = await prisma.blockedLocation.create({
        data: {
          user_id: userId,
          latitude,
          longitude,
          address,
          reason,
        },
      });

      res.json({
        success: true,
        message: 'Location đã được chặn thành công',
        data: blockedLocation,
      });
    } catch (error) {
      console.error('Block location error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = { SecurityController };
