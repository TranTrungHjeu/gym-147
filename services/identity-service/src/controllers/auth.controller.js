const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../lib/prisma.js');
const { OTPService } = require('../services/otp.service.js');
const scheduleService = require('../services/schedule.service.js');
const memberService = require('../services/member.service.js');
const redisService = require('../services/redis.service.js');
let rateLimiter = null;
try {
  rateLimiter = require('../../../packages/shared-middleware/src/rate-limit.middleware.js').rateLimiter;
} catch (e) {
  console.warn('⚠️ Shared rate limiter not available, using fallback');
}

// Logger (optional - use if available)
let logger = null;
try {
  logger = require('@gym-147/shared-utils/src/logger.js');
} catch (e) {
  // Fallback to console if logger not available
  logger = {
    info: (...args) => console.log(...args),
    error: (...args) => console.error(...args),
    warn: (...args) => console.warn(...args),
    debug: (...args) => console.log(...args),
    request: () => {},
    errorRequest: () => {},
  };
}

class AuthController {
  constructor() {
    this.otpService = new OTPService();
    this.rateLimitStore = new Map(); // In-memory store for rate limiting
    this.otpCooldownStore = new Map(); // Store for OTP cooldown (60 seconds)
    this.passwordResetCleanupInterval = null;
  }

  // ==================== RATE LIMITING HELPERS ====================

  async getRateLimitCount(key) {
    // Use Redis rate limiter if available
    if (rateLimiter) {
      try {
        const result = await rateLimiter.checkRateLimit(key, 5, 3600); // 5 requests per hour
        return 5 - result.remaining;
      } catch (error) {
        console.error('Redis rate limit error, using fallback:', error);
      }
    }

    // Fallback to in-memory
    const record = this.rateLimitStore.get(key);
    if (!record) return 0;

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (now - record.timestamp > oneHour) {
      this.rateLimitStore.delete(key);
      return 0;
    }

    return record.count;
  }

  async incrementRateLimit(key) {
    // Use Redis rate limiter if available
    if (rateLimiter) {
      try {
        await rateLimiter.increment(key, 5, 3600); // 5 requests per hour
        return;
      } catch (error) {
        console.error('Redis rate limit increment error, using fallback:', error);
      }
    }

    // Fallback to in-memory
    const record = this.rateLimitStore.get(key);
    const now = Date.now();

    if (!record || now - record.timestamp > 60 * 60 * 1000) {
      this.rateLimitStore.set(key, { count: 1, timestamp: now });
    } else {
      record.count++;
      this.rateLimitStore.set(key, record);
    }
  }

  async getOTPCooldown(key) {
    const cooldownKey = `otp:cooldown:${key}`;

    // Check Redis first
    if (redisService.isConnected && redisService.client) {
      try {
        const ttl = await redisService.client.ttl(cooldownKey);
        if (ttl > 0) {
          return ttl;
        }
        return 0;
      } catch (error) {
        console.error('Redis cooldown check error, using fallback:', error);
      }
    }

    // Fallback to in-memory
    const timestamp = this.otpCooldownStore.get(key);
    if (!timestamp) return 0;

    const now = Date.now();
    const cooldownTime = 60 * 1000; // 60 seconds (as per registration plan)
    const remaining = Math.max(0, cooldownTime - (now - timestamp));

    if (remaining === 0) {
      this.otpCooldownStore.delete(key);
    }

    return Math.ceil(remaining / 1000);
  }

  async setOTPCooldown(key) {
    const cooldownKey = `otp:cooldown:${key}`;
    const cooldownSeconds = 60; // 60 seconds

    // Store in Redis first
    if (redisService.isConnected && redisService.client) {
      try {
        await redisService.client.setEx(cooldownKey, cooldownSeconds, '1');
        return;
      } catch (error) {
        console.error('Redis cooldown set error, using fallback:', error);
      }
    }

    // Fallback to in-memory
    this.otpCooldownStore.set(key, Date.now());
  }

  // ==================== PASSWORD RESET CLEANUP ====================

  /**
   * Cleanup expired password reset tokens
   */
  async cleanupExpiredPasswordResetTokens() {
    try {
      const result = await prisma.passwordReset.deleteMany({
        where: {
          expires_at: { lt: new Date() },
        },
      });

      if (result.count > 0) {
        console.log(`Cleaned up ${result.count} expired password reset tokens`);
      }

      return result.count;
    } catch (error) {
      console.error('Error cleaning up expired password reset tokens:', error);
      return 0;
    }
  }

  /**
   * Start password reset cleanup job
   */
  startPasswordResetCleanupJob() {
    // Run cleanup every 2 minutes
    this.passwordResetCleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredPasswordResetTokens();
      } catch (error) {
        console.error('Password reset cleanup job error:', error);
      }
    }, 2 * 60 * 1000); // 2 minutes

    // Run initial cleanup
    this.cleanupExpiredPasswordResetTokens();
    console.log('Password reset cleanup job started - runs every 2 minutes');
  }

  /**
   * Stop password reset cleanup job
   */
  stopPasswordResetCleanupJob() {
    if (this.passwordResetCleanupInterval) {
      clearInterval(this.passwordResetCleanupInterval);
      this.passwordResetCleanupInterval = null;
      console.log('Password reset cleanup job stopped');
    }
  }

  // ==================== VALIDATION HELPERS ====================

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

  validatePhone(phone) {
    const phoneRegex = /^(\+84|84|0)[1-9][0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      return {
        isValid: false,
        message: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam',
      };
    }
    return { isValid: true };
  }

  /**
   * Normalize Vietnamese phone number to +84 format
   * Converts various formats (0xxxxxxxxx, 84xxxxxxxxx, +84xxxxxxxxx) to +84xxxxxxxxx
   * @param {string} phone - Phone number in any valid Vietnamese format
   * @returns {string} Normalized phone number in +84 format, or original if invalid
   */
  normalizePhone(phone) {
    if (!phone) return phone;

    // Remove all spaces
    let normalized = phone.replace(/\s/g, '').trim();

    // Remove all non-digit characters except +
    normalized = normalized.replace(/[^\d+]/g, '');

    // Convert to +84 format
    if (normalized.startsWith('+84')) {
      // Already in +84 format
      return normalized;
    } else if (normalized.startsWith('84')) {
      // Convert 84xxxxxxxxx to +84xxxxxxxxx
      return '+' + normalized;
    } else if (normalized.startsWith('0')) {
      // Convert 0xxxxxxxxx to +84xxxxxxxxx
      return '+84' + normalized.substring(1);
    } else if (/^[1-9][0-9]{8}$/.test(normalized)) {
      // If it's 9 digits starting with 1-9, assume it's missing the 0 prefix
      return '+84' + normalized;
    }

    // Return original if format is not recognized (will fail validation later)
    return phone;
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        message: 'Email không hợp lệ',
      };
    }
    return { isValid: true };
  }

  // ==================== CORE AUTHENTICATION ====================

  /**
   * User login
   */
  async login(req, res) {
    try {
      logger.request(req, 'Login attempt');
      const { identifier, password, twoFactorToken, push_token, push_platform } = req.body; // identifier can be email or phone

      if (!identifier || !password) {
        logger.warn('Login failed: missing credentials', {
          identifier: identifier ? 'provided' : 'missing',
        });
        return res.status(400).json({
          success: false,
          message: 'Email/phone and password are required',
          data: null,
        });
      }

      // Find user by email or phone
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: identifier }, { phone: identifier }],
        },
      });

      if (!user) {
        logger.warn('Login failed: user not found', { identifier });
        // Note: Cannot create access log for non-existent user due to foreign key constraint
        // Access logs will only be created for existing users
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password. Please try again.',
          data: null,
        });
      }

      // Check if account is active
      if (!user.is_active) {
        logger.warn('Login failed: account inactive', { userId: user.id });
        return res.status(401).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa',
          data: null,
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        logger.warn('Login failed: invalid password', { userId: user.id });
        // Log failed login attempt (wrong password)
        try {
          await prisma.accessLog.create({
            data: {
              user_id: user.id,
              access_type: 'LOGIN',
              access_method: 'PASSWORD',
              success: false,
              failure_reason: 'Invalid password',
              timestamp: new Date(),
            },
          });
        } catch (logError) {
          console.error('Failed to create access log:', logError);
        }
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password. Please try again.',
          data: null,
        });
      }

      // Check if 2FA is enabled
      if (user.two_factor_enabled) {
        if (!twoFactorToken) {
          return res.status(200).json({
            success: false,
            message: '2FA token required',
            data: {
              requires2FA: true,
              userId: user.id,
            },
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
      }

      // Handle push notification token
      if (push_token) {
        // SAFEGUARD: Clear this push_token from all other users first
        await prisma.user.updateMany({
          where: {
            push_token: push_token,
            id: { not: user.id },
          },
          data: { push_token: null },
        });
        console.log(`🔔 Cleared push_token from other users`);
      }

      // Update last login time and push token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          last_login_at: new Date(),
          ...(push_token && {
            push_token: push_token,
            push_platform: push_platform || null,
          }),
        },
      });

      if (push_token) {
        console.log(`🔔 Push token registered for user ${user.id}`);
      }

      // Create session
      const accessToken = crypto.randomBytes(32).toString('hex');
      const refreshToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const session = await prisma.session.create({
        data: {
          user_id: user.id,
          token: accessToken,
          refresh_token: refreshToken,
          device_info: req.headers['user-agent'] || 'Unknown',
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.headers['user-agent'] || 'Unknown',
          expires_at: expiresAt,
        },
      });

      // Store session in Redis with TTL = token expiry (30 minutes for access token)
      const sessionData = {
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
      const accessTokenTTL = 30 * 60; // 30 minutes in seconds
      await redisService.setSession(session.id, sessionData, accessTokenTTL);

      // Publish user:login event via Redis Pub/Sub
      try {
        const { redisPubSub } = require('../../../packages/shared-utils/src/redis-pubsub.utils');
        await redisPubSub.publish('user:login', {
          user_id: user.id,
          email: user.email,
          role: user.role,
          session_id: session.id,
          ip_address: session.ip_address,
          device_info: session.device_info,
          timestamp: new Date().toISOString(),
        });
      } catch (pubSubError) {
        console.warn('⚠️ Failed to publish user:login event via Pub/Sub:', pubSubError.message);
        // Don't fail login if Pub/Sub fails
      }

      // Create access log for successful login
      try {
        await prisma.accessLog.create({
          data: {
            user_id: user.id,
            access_type: 'LOGIN',
            access_method: 'PASSWORD',
            success: true,
            location: req.headers['x-forwarded-for'] || req.ip || 'Unknown',
            timestamp: new Date(),
          },
        });
        console.log(`✅ Access log created for successful login: user ${user.id}`);
      } catch (logError) {
        console.error('Failed to create access log:', logError);
        // Don't fail login if logging fails
      }

      // Generate JWT token with sessionId
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          sessionId: session.id,
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '30m' } // Short-lived access token
      );

      // Prepare user data for response
      const userData = {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      };

      // If user is TRAINER, get trainer_id from schedule-service
      if (user.role === 'TRAINER') {
        try {
          const scheduleService = require('../services/schedule.service.js');
          const schedule = new scheduleService();
          const trainerResult = await schedule.getTrainerByUserId(user.id);

          if (trainerResult.success && trainerResult.trainerId) {
            userData.trainerId = trainerResult.trainerId;
            console.log(`✅ Trainer ID found for user ${user.id}: ${trainerResult.trainerId}`);
          } else {
            console.warn(`⚠️ Trainer not found in schedule-service for user ${user.id}`);
            // Continue without trainerId - frontend can handle this
          }
        } catch (error) {
          console.error('❌ Error fetching trainer_id during login:', error.message);
          // Continue without trainerId - don't fail login
        }
      }

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: token,
          refreshToken: refreshToken,
          expiresIn: 1800, // 30 minutes
          user: userData,
        },
      });

      logger.info('Login successful', { userId: user.id, role: user.role, trainerId: userData.trainerId });
    } catch (error) {
      logger.errorRequest(req, error, 'Login error');
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * User logout
   */
  async logout(req, res) {
    try {
      const sessionId = req.user.sessionId;
      const userId = req.user.userId || req.user.id;

      if (sessionId) {
        // Delete session from Redis first
        await redisService.deleteSession(sessionId, userId);
        
        // Delete the current session from database
        await prisma.session.delete({
          where: { id: sessionId },
        });
      }

      // Clear push notification token
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            push_token: null,
            push_platform: null,
          },
        });
        console.log(`🔔 Push token cleared for user ${userId}`);
      }

      res.json({
        success: true,
        message: 'Logout successful',
        data: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout error',
        data: null,
      });
    }
  }

  /**
   * Register new member
   */
  async registerMember(req, res) {
    try {
      const {
        email,
        phone,
        password,
        firstName,
        lastName,
        otp,
        otpType,
        primaryMethod,
        age,
        referralCode,
        couponCode,
      } = req.body;

      // Validate required fields
      if (!password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu, họ và tên là bắt buộc',
          data: null,
        });
      }

      // Validate primary method
      if (!primaryMethod || !['EMAIL', 'PHONE'].includes(primaryMethod)) {
        return res.status(400).json({
          success: false,
          message: 'Phương thức đăng ký chính phải là EMAIL hoặc PHONE',
          data: null,
        });
      }

      // Validate based on primary method
      if (primaryMethod === 'EMAIL' && !email) {
        return res.status(400).json({
          success: false,
          message: 'Email là bắt buộc khi chọn đăng ký bằng email',
          data: null,
        });
      }

      if (primaryMethod === 'PHONE' && !phone) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại là bắt buộc khi chọn đăng ký bằng số điện thoại',
          data: null,
        });
      }

      // Validate email format if provided
      if (email) {
        const emailValidation = this.validateEmail(email);
        if (!emailValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: emailValidation.message,
            data: null,
          });
        }
      }

      // Normalize phone number if provided
      let normalizedPhone = null;
      if (phone) {
        const phoneValidation = this.validatePhone(phone);
        if (!phoneValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: phoneValidation.message,
            data: null,
          });
        }
        // Normalize phone to +84 format
        normalizedPhone = this.normalizePhone(phone);
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message,
          data: null,
        });
      }

      // Check if user already exists (use normalized phone for comparison)
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(email ? [{ email }] : []),
            ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
          ],
        },
      });

      if (existingUser) {
        let message = 'Tài khoản với thông tin này đã tồn tại';
        if (existingUser.email === email) {
          message = 'Email này đã được sử dụng';
        } else if (existingUser.phone === normalizedPhone) {
          message = 'Số điện thoại này đã được sử dụng';
        }
        return res.status(400).json({
          success: false,
          message,
          data: null,
        });
      }

      // Verify OTP if provided (use normalized phone for OTP verification)
      if (otp) {
        const otpIdentifier = primaryMethod === 'EMAIL' ? email : normalizedPhone;
        const otpResult = await this.otpService.verifyOTP(
          otpIdentifier,
          otp,
          primaryMethod // Use primaryMethod ('EMAIL' or 'PHONE'), not otpType
        );

        if (!otpResult.success) {
          return res.status(400).json({
            success: false,
            message: otpResult.message,
            data: null,
          });
        }
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Determine verification status based on primary method
      const emailVerified = primaryMethod === 'EMAIL';
      const phoneVerified = primaryMethod === 'PHONE';

      // Create user (use normalized phone)
      const newUser = await prisma.user.create({
        data: {
          email: email || null,
          phone: normalizedPhone || null,
          password_hash: hashedPassword,
          first_name: firstName,
          last_name: lastName,
          role: 'MEMBER',
          is_active: true,
          email_verified: emailVerified,
          email_verified_at: emailVerified ? new Date() : null,
          phone_verified: phoneVerified,
          phone_verified_at: phoneVerified ? new Date() : null,
        },
      });

      // Email verification is handled by OTPVerification table
      // No need for separate EmailVerification table

      // Create session
      const accessToken = crypto.randomBytes(32).toString('hex');
      const refreshToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const session = await prisma.session.create({
        data: {
          user_id: newUser.id,
          token: accessToken,
          refresh_token: refreshToken,
          device_info: req.headers['user-agent'] || 'Unknown',
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.headers['user-agent'] || 'Unknown',
          expires_at: expiresAt,
        },
      });

      // Generate JWT token with sessionId
      const token = jwt.sign(
        {
          userId: newUser.id,
          email: newUser.email,
          role: newUser.role,
          sessionId: session.id,
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '15m' } // Short-lived access token
      );

      // Update member table in member service
      try {
        const axios = require('axios');
        if (!process.env.MEMBER_SERVICE_URL) {
          throw new Error('MEMBER_SERVICE_URL environment variable is required. Please set it in your .env file.');
        }
        const memberServiceUrl = process.env.MEMBER_SERVICE_URL;
        console.log('🔧 Using memberServiceUrl:', memberServiceUrl);

        await axios.put(
          `${memberServiceUrl}/members/user/${newUser.id}`,
          {
            full_name: `${firstName} ${lastName}`,
            email: newUser.email || email,
            phone: newUser.phone || phone || null,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 5000, // 5 second timeout
          }
        );
        console.log(`✅ Member table updated for user ${newUser.id}`);
      } catch (memberError) {
        console.error('⚠️ Error updating member table (non-critical):', memberError.message);
        // Don't fail the entire request if member update fails
        // Member record will be created when user first accesses member features
      }

      res.status(201).json({
        success: true,
        message: 'Member registered successfully',
        data: {
          accessToken: token,
          refreshToken: refreshToken,
          expiresIn: 900, // 15 minutes
          user: {
            id: newUser.id,
            email: newUser.email,
            phone: newUser.phone,
            firstName: newUser.first_name,
            lastName: newUser.last_name,
            role: newUser.role,
            emailVerified: newUser.email_verified,
            phoneVerified: newUser.phone_verified,
          },
          requiresEmailVerification: !emailVerified,
        },
      });

      logger.info('Member registered successfully', { userId: newUser.id, email: newUser.email });
    } catch (error) {
      logger.errorRequest(req, error, 'Member register error');
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Send OTP for registration
   */
  async sendRegistrationOTP(req, res) {
    try {
      const { identifier, type = 'PHONE' } = req.body;

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: 'Email hoặc số điện thoại là bắt buộc',
          data: null,
        });
      }

      // Rate limiting check
      const rateLimitKey = `otp_attempts:${identifier}`;
      const existingAttempts = await this.getRateLimitCount(rateLimitKey);

      if (existingAttempts >= 5) {
        // Max 5 attempts per hour
        return res.status(429).json({
          success: false,
          message: 'Quá nhiều lần gửi OTP. Vui lòng thử lại sau 1 giờ',
          data: {
            retryAfter: 3600, // seconds
            remainingAttempts: 0,
          },
        });
      }

      // OTP cooldown check (60 seconds between sends)
      const cooldownKey = `otp_cooldown:${identifier}`;
      const cooldownRemaining = await this.getOTPCooldown(cooldownKey);

      if (cooldownRemaining > 0) {
        return res.status(429).json({
          success: false,
          message: `Vui lòng đợi ${cooldownRemaining} giây trước khi gửi lại OTP`,
          data: {
            retryAfter: cooldownRemaining,
            remainingAttempts: 5 - existingAttempts,
          },
        });
      }

      // Normalize phone number if type is PHONE
      let normalizedIdentifier = identifier;
      if (type === 'PHONE') {
        // Validate phone format first
        const phoneValidation = this.validatePhone(identifier);
        if (!phoneValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: phoneValidation.message,
            data: null,
          });
        }
        // Normalize phone to +84 format
        normalizedIdentifier = this.normalizePhone(identifier);
      }

      // Check if user already exists (use normalized identifier for phone)
      let existingUser = null;
      if (type === 'EMAIL') {
        // For email, check case-insensitive by converting to lowercase
        // Note: Prisma doesn't support mode: 'insensitive' for all databases
        // So we'll check both original and lowercase versions
        const emailLower = identifier.toLowerCase().trim();
        existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier },
              { email: emailLower },
            ],
          },
        });
      } else if (type === 'PHONE') {
        // For phone, use normalized identifier
        existingUser = await prisma.user.findFirst({
          where: {
            phone: normalizedIdentifier,
          },
        });
      }

      if (existingUser) {
        let message = '';
        if (type === 'EMAIL') {
          message = 'Email này đã được sử dụng. Vui lòng thử email khác hoặc đăng nhập.';
        } else if (type === 'PHONE') {
          message = 'Số điện thoại này đã được sử dụng. Vui lòng thử số điện thoại khác hoặc đăng nhập.';
        } else {
          message = 'Tài khoản với thông tin này đã tồn tại';
        }

        return res.status(400).json({
          success: false,
          message,
          data: null,
        });
      }

      // Send OTP (use normalized identifier for phone)
      const sendResult = await this.otpService.sendOTP(normalizedIdentifier, type);

      if (!sendResult.success) {
        return res.status(400).json({
          success: false,
          message: sendResult.message,
          data: null,
        });
      }

      // Increment rate limit and set cooldown
      await this.incrementRateLimit(rateLimitKey);
      await this.setOTPCooldown(cooldownKey);

      // Get cooldown remaining time to return to client (after setting, it will be 60 seconds)
      const currentCooldown = await this.getOTPCooldown(cooldownKey);
      const retryAfter = currentCooldown > 0 ? currentCooldown : 60; // Default 60 seconds

      res.json({
        success: true,
        message: sendResult.message,
        data: {
          identifier: normalizedIdentifier,
          type,
          retryAfter, // Return cooldown time in seconds
          remainingAttempts: 5 - (await this.getRateLimitCount(rateLimitKey)),
          ...(process.env.NODE_ENV === 'development' && { otp: sendResult.otp }),
        },
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Verify OTP for registration
   */
  async verifyRegistrationOTP(req, res) {
    try {
      const { identifier, otp, type = 'PHONE' } = req.body;

      if (!identifier || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Email/phone và OTP là bắt buộc',
          data: null,
        });
      }

      // Normalize phone number if type is PHONE (same as when sending OTP)
      let normalizedIdentifier = identifier;
      if (type === 'PHONE') {
        // Validate phone format first
        const phoneValidation = this.validatePhone(identifier);
        if (!phoneValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: phoneValidation.message,
            data: null,
          });
        }
        // Normalize phone to +84 format (same format used when storing OTP)
        normalizedIdentifier = this.normalizePhone(identifier);
        console.log('🔍 Verifying OTP - Original identifier:', identifier, 'Normalized:', normalizedIdentifier);
      }

      const result = await this.otpService.verifyOTP(normalizedIdentifier, otp, type);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: null,
        });
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get user profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.userId || req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          first_name: true,
          last_name: true,
          role: true,
          is_active: true,
          email_verified: true,
          email_verified_at: true,
          phone_verified: true,
          phone_verified_at: true,
          last_login_at: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            firstName: user.first_name,
            lastName: user.last_name,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            isActive: user.is_active,
            emailVerified: user.email_verified,
            phoneVerified: user.phone_verified,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
          },
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { firstName, lastName, email, phone } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email) {
        return res.status(400).json({
          success: false,
          message: 'First name, last name, and email are required',
          data: null,
        });
      }

      // Check if email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email: email,
          id: { not: userId },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken by another user',
          data: null,
        });
      }

      // Update user profile
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone || null,
          updated_at: new Date(),
        },
        select: {
          id: true,
          email: true,
          phone: true,
          first_name: true,
          last_name: true,
          role: true,
          is_active: true,
          email_verified: true,
          email_verified_at: true,
          phone_verified: true,
          phone_verified_at: true,
          last_login_at: true,
          created_at: true,
          updated_at: true,
        },
      });

      // Update related tables based on user role
      if (updatedUser.role === 'TRAINER') {
        try {
          const trainerResult = await scheduleService.updateTrainer(userId, {
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
            phone: updatedUser.phone,
            email: updatedUser.email,
          });

          if (!trainerResult.success) {
            console.warn('Failed to update trainer in schedule service:', trainerResult.error);
            // Continue with response even if schedule service fails
          }
        } catch (error) {
          console.error('Error updating trainer in schedule service:', error);
          // Continue with response even if schedule service fails
        }
      }

      // If user is MEMBER, update member in member service
      if (updatedUser.role === 'MEMBER') {
        try {
          const memberResult = await memberService.updateMember(userId, {
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
            phone: updatedUser.phone,
            email: updatedUser.email,
          });

          if (!memberResult.success) {
            console.warn('Failed to update member in member service:', memberResult.error);
            // Continue with response even if member service fails
          }
        } catch (error) {
          console.error('Error updating member in member service:', error);
          // Continue with response even if member service fails
        }
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            phone: updatedUser.phone,
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
            first_name: updatedUser.first_name,
            last_name: updatedUser.last_name,
            role: updatedUser.role,
            isActive: updatedUser.is_active,
            emailVerified: updatedUser.email_verified,
            phoneVerified: updatedUser.phone_verified,
            createdAt: updatedUser.created_at,
            updatedAt: updatedUser.updated_at,
          },
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== PASSWORD RESET FLOW ====================

  /**
   * Send email reset password
   */
  async forgotPassword(req, res) {
    try {
      const { email, phone } = req.body;

      if (!email && !phone) {
        return res.status(400).json({
          success: false,
          message: 'Email hoặc số điện thoại là bắt buộc',
          data: null,
        });
      }

      // Rate limiting cho forgot password
      const identifier = email || phone;
      const rateLimitKey = `forgot_password:${identifier}`;
      const lastRequest = this.otpCooldownStore.get(rateLimitKey);

      if (lastRequest && Date.now() - lastRequest < 5 * 60 * 1000) {
        // 5 phút
        const remainingTime = Math.ceil((5 * 60 * 1000 - (Date.now() - lastRequest)) / 1000);
        return res.status(429).json({
          success: false,
          message: `Vui lòng đợi ${remainingTime} giây trước khi yêu cầu reset password lại`,
          data: {
            remainingTime,
            cooldownPeriod: 300, // 5 phút
          },
        });
      }

      // Tìm user theo email hoặc phone
      const user = await prisma.user.findFirst({
        where: {
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
        },
        select: {
          id: true,
          email: true,
          phone: true,
          first_name: true,
          last_name: true,
        },
      });

      if (!user) {
        // Thông báo rõ ràng rằng tài khoản chưa được tạo
        return res.status(404).json({
          success: false,
          message: email
            ? 'Email này chưa được đăng ký tài khoản. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới.'
            : 'Số điện thoại này chưa được đăng ký tài khoản. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới.',
          data: {
            accountExists: false,
            suggestion: 'Vui lòng đăng ký tài khoản trước khi sử dụng tính năng quên mật khẩu',
          },
        });
      }

      // Xóa các reset token cũ của user này
      await prisma.passwordReset.deleteMany({
        where: {
          user_id: user.id,
          used_at: null, // Chỉ xóa token chưa dùng
        },
      });

      // Tạo reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

      // Lưu reset token vào database
      await prisma.passwordReset.create({
        data: {
          user_id: user.id,
          token: resetToken,
          expires_at: expiresAt,
        },
      });

      // Set rate limiting
      this.otpCooldownStore.set(rateLimitKey, Date.now());

      // Gửi reset link qua email hoặc SMS
      if (email) {
        try {
          await this.otpService.sendPasswordResetEmail(
            user.email,
            resetToken,
            user.first_name || ''
          );
        } catch (emailError) {
          console.error('Failed to send password reset email:', emailError);
          // Continue to return success even if email fails - security best practice
        }
      } else if (phone) {
        // TODO: Gửi SMS với reset link
        // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        // await smsService.sendPasswordResetSMS(user.phone, resetLink);
        console.log(`Password reset requested for phone: ${phone}`);
      }

      res.json({
        success: true,
        message: email
          ? 'Link đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.'
          : 'Link đặt lại mật khẩu đã được gửi đến số điện thoại của bạn. Vui lòng kiểm tra tin nhắn SMS.',
        data: {
          accountExists: true,
          resetMethod: email ? 'email' : 'phone',
          expiresIn: 300, // 5 phút
          ...(process.env.NODE_ENV === 'development' && { resetToken }),
        },
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Reset password với token
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Token và mật khẩu mới là bắt buộc',
          data: null,
        });
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message,
          data: null,
        });
      }

      // Tìm reset token
      const resetRecord = await prisma.passwordReset.findFirst({
        where: {
          token,
          expires_at: { gt: new Date() },
          used_at: null, // Chưa được sử dụng
        },
        include: { user: true },
      });

      if (!resetRecord) {
        return res.status(400).json({
          success: false,
          message: 'Token không hợp lệ hoặc đã hết hạn',
          data: null,
        });
      }

      // Hash password mới
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Cập nhật password và đánh dấu token đã sử dụng
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetRecord.user_id },
          data: {
            password_hash: hashedPassword,
            failed_login_attempts: 0, // Reset failed attempts
            locked_until: null, // Unlock account
          },
        }),
        prisma.passwordReset.update({
          where: { id: resetRecord.id },
          data: { used_at: new Date() },
        }),
      ]);

      res.json({
        success: true,
        message: 'Mật khẩu đã được reset thành công',
        data: null,
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Validate reset token
   */
  async validateResetToken(req, res) {
    try {
      const { token } = req.params;

      const resetRecord = await prisma.passwordReset.findFirst({
        where: {
          token,
          expires_at: { gt: new Date() },
          used_at: null, // Chưa được sử dụng
        },
      });

      if (!resetRecord) {
        return res.status(400).json({
          success: false,
          message: 'Token không hợp lệ hoặc đã hết hạn',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Token hợp lệ',
        data: { valid: true },
      });
    } catch (error) {
      console.error('Validate reset token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== EMAIL VERIFICATION ====================

  /**
   * Verify email address using OTP
   */
  async verifyEmail(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Email và OTP là bắt buộc',
          data: null,
        });
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null,
        });
      }

      if (user.email_verified) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được xác thực',
          data: null,
        });
      }

      // Verify OTP
      const otpResult = await this.otpService.verifyOTP(email, otp, 'EMAIL');

      if (!otpResult.success) {
        return res.status(400).json({
          success: false,
          message: otpResult.message,
          data: null,
        });
      }

      // Update user email verification status
      await prisma.user.update({
        where: { id: user.id },
        data: {
          email_verified: true,
          email_verified_at: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Email đã được xác thực thành công',
        data: null,
      });
    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Resend email verification OTP
   */
  async resendEmailVerification(req, res) {
    try {
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, email_verified: true },
      });

      if (!user || !user.email) {
        return res.status(400).json({
          success: false,
          message: 'Email không tồn tại',
          data: null,
        });
      }

      if (user.email_verified) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được xác thực',
          data: null,
        });
      }

      // Send OTP for email verification
      const sendResult = await this.otpService.sendOTP(user.email, 'EMAIL');

      if (!sendResult.success) {
        return res.status(400).json({
          success: false,
          message: sendResult.message,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Email OTP đã được gửi lại',
        data: {
          ...(process.env.NODE_ENV === 'development' && { otp: sendResult.otp }),
        },
      });
    } catch (error) {
      console.error('Resend email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== SESSION REFRESH ====================

  /**
   * Refresh access token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token là bắt buộc',
          data: null,
        });
      }

      // Verify refresh token
      const session = await prisma.session.findFirst({
        where: {
          refresh_token: refreshToken,
          expires_at: { gt: new Date() }, // Only non-expired sessions
        },
        include: { user: true },
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token không hợp lệ hoặc đã hết hạn',
          data: null,
        });
      }

      // Check if user is active
      if (!session.user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị khóa',
          data: null,
        });
      }

      // Generate new tokens
      const accessToken = jwt.sign(
        {
          userId: session.user.id,
          email: session.user.email,
          role: session.user.role,
          sessionId: session.id, // ✅ Include sessionId for tracking
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const newRefreshToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Update session with new refresh token
      await prisma.session.update({
        where: { id: session.id },
        data: {
          refresh_token: newRefreshToken,
          expires_at: expiresAt,
          last_used_at: new Date(),
        },
      });

      // Update session in Redis with new TTL (15 minutes for new access token)
      const accessTokenTTL = 15 * 60; // 15 minutes in seconds
      await redisService.refreshSessionTTL(session.id, accessTokenTTL);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: 900, // 15 minutes
        },
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
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
      const accessToken = crypto.randomBytes(32).toString('hex');
      const refreshToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const session = await prisma.session.create({
        data: {
          user_id: user.id,
          token: accessToken,
          refresh_token: refreshToken,
          device_info: req.headers['user-agent'] || 'Unknown',
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.headers['user-agent'] || 'Unknown',
          expires_at: expiresAt,
        },
      });

      // Generate JWT token with sessionId
      const jwtToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          sessionId: session.id,
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '15m' } // Short-lived access token
      );

      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: { last_login_at: new Date() },
      });

      // Prepare user data for response
      const userData = {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      };

      // If user is TRAINER, get trainer_id from schedule-service
      if (user.role === 'TRAINER') {
        try {
          const trainerResult = await scheduleService.getTrainerByUserId(user.id);

          if (trainerResult.success && trainerResult.trainerId) {
            userData.trainerId = trainerResult.trainerId;
            console.log(`✅ Trainer ID found for user ${user.id}: ${trainerResult.trainerId}`);
          } else {
            console.warn(`⚠️ Trainer not found in schedule-service for user ${user.id}`);
          }
        } catch (error) {
          console.error('❌ Error fetching trainer_id during 2FA login:', error.message);
        }
      }

      res.json({
        success: true,
        message: '2FA verification successful',
        data: {
          accessToken: jwtToken,
          refreshToken,
          expiresIn: 900, // 15 minutes
          user: userData,
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

  // ==================== ADMIN REGISTRATION ====================

  /**
   * Register admin or trainer
   * - SUPER_ADMIN can create ADMIN or TRAINER
   * - ADMIN can create TRAINER only
   */
  async registerAdmin(req, res) {
    try {
      const { email, phone, password, firstName, lastName, role = 'ADMIN' } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Email, mật khẩu, họ và tên là bắt buộc',
          data: null,
        });
      }

      // Validate role permissions
      const targetRole = role.toUpperCase();
      const currentUserRole = req.user?.role;

      // Only SUPER_ADMIN can create ADMIN role
      if (targetRole === 'ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Chỉ SUPER_ADMIN mới có quyền tạo tài khoản ADMIN',
          data: null,
        });
      }

      // SUPER_ADMIN and ADMIN can create TRAINER
      if (targetRole === 'TRAINER' && !['SUPER_ADMIN', 'ADMIN'].includes(currentUserRole)) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ ADMIN hoặc SUPER_ADMIN mới có quyền tạo tài khoản TRAINER',
          data: null,
        });
      }

      // Validate that role is valid
      if (!['ADMIN', 'TRAINER'].includes(targetRole)) {
        return res.status(400).json({
          success: false,
          message: 'Role không hợp lệ. Chỉ có thể tạo ADMIN hoặc TRAINER',
          data: null,
        });
      }

      // Validate email format
      const emailValidation = this.validateEmail(email);
      if (!emailValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: emailValidation.message,
          data: null,
        });
      }

      // Validate phone format if provided
      if (phone) {
        const phoneValidation = this.validatePhone(phone);
        if (!phoneValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: phoneValidation.message,
            data: null,
          });
        }
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message,
          data: null,
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, ...(phone ? [{ phone }] : [])],
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Tài khoản với thông tin này đã tồn tại',
          data: null,
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create admin user
      const newAdmin = await prisma.user.create({
        data: {
          email,
          phone: phone || null,
          password_hash: hashedPassword,
          first_name: firstName,
          last_name: lastName,
          role: targetRole,
          is_active: true,
          email_verified: true,
          email_verified_at: new Date(),
          phone_verified: phone ? true : false,
          phone_verified_at: phone ? new Date() : null,
        },
      });

      // If role is TRAINER, create trainer in schedule service
      let scheduleServiceSuccess = true;
      let scheduleServiceError = null;

      if (targetRole === 'TRAINER') {
        try {
          console.log('🔄 Attempting to create trainer in schedule-service for user:', newAdmin.id);
          const trainerResult = await scheduleService.createTrainer({
            id: newAdmin.id,
            firstName: newAdmin.first_name,
            lastName: newAdmin.last_name,
            phone: newAdmin.phone,
            email: newAdmin.email,
          });

          if (!trainerResult.success) {
            scheduleServiceSuccess = false;
            scheduleServiceError = trainerResult.error;
            console.error('❌ Failed to create trainer in schedule service:', {
              error: trainerResult.error,
              status: trainerResult.status,
              responseData: trainerResult.responseData,
            });
            // Log warning but continue - user is created in identity-service
            // Admin can manually sync later if needed
          } else {
            console.log('✅ Trainer successfully created in schedule-service');
          }
        } catch (error) {
          scheduleServiceSuccess = false;
          scheduleServiceError = error.message;
          console.error('❌ Exception while creating trainer in schedule service:', {
            message: error.message,
            stack: error.stack,
          });
          // Continue with response even if schedule service fails
        }
      }

      // Build response message
      let responseMessage = 'Admin đã được tạo thành công';
      if (targetRole === 'TRAINER' && !scheduleServiceSuccess) {
        responseMessage +=
          '. Lưu ý: Trainer chưa được tạo trong schedule-service. Vui lòng kiểm tra logs hoặc tạo lại.';
      }

      res.status(201).json({
        success: true,
        message: responseMessage,
        data: {
          user: {
            id: newAdmin.id,
            email: newAdmin.email,
            phone: newAdmin.phone,
            firstName: newAdmin.first_name,
            lastName: newAdmin.last_name,
            role: newAdmin.role,
            emailVerified: newAdmin.email_verified,
            phoneVerified: newAdmin.phone_verified,
          },
          scheduleServiceCreated: scheduleServiceSuccess,
          scheduleServiceError: scheduleServiceError,
        },
      });
    } catch (error) {
      console.error('Register admin error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Update user profile
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { firstName, lastName, phone, email, isActive } = req.body;

      console.log('📝 updateUser called:', {
        id,
        firstName,
        lastName,
        phone,
        email,
        phoneType: typeof phone,
        emailType: typeof email,
      });

      // Validate required fields
      if (!email || email.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
          data: null,
        });
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null,
        });
      }

      // Normalize phone: null if undefined, empty string, or null
      const phoneValue = phone && phone.trim() !== '' ? phone.trim() : null;
      const emailValue = email.trim();

      // Check if email is already taken by another user
      const emailExists = await prisma.user.findFirst({
        where: {
          email: emailValue,
          id: { not: id },
        },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken by another user',
          data: null,
        });
      }

      // Update user
      const updateData = {
        first_name: firstName,
        last_name: lastName,
        phone: phoneValue,
        email: emailValue,
      };

      // Only update is_active if provided (to allow locking/unlocking accounts)
      if (isActive !== undefined) {
        updateData.is_active = isActive;
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
      });

      console.log('✅ User updated in identity-service:', {
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
      });

      // If user is TRAINER, update trainer in schedule service
      if (existingUser.role === 'TRAINER') {
        try {
          const trainerResult = await scheduleService.updateTrainer(id, {
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
            phone: updatedUser.phone,
            email: updatedUser.email,
          });

          if (!trainerResult.success) {
            console.warn('Failed to update trainer in schedule service:', trainerResult.error);
            // Continue with response even if schedule service fails
          }
        } catch (error) {
          console.error('Error updating trainer in schedule service:', error);
          // Continue with response even if schedule service fails
        }
      }

      // If user is MEMBER, update member in member service
      if (existingUser.role === 'MEMBER') {
        try {
          const memberResult = await memberService.updateMember(id, {
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
            phone: updatedUser.phone,
            email: updatedUser.email,
          });

          if (!memberResult.success) {
            console.warn('Failed to update member in member service:', memberResult.error);
            // Continue with response even if member service fails
          }
        } catch (error) {
          console.error('Error updating member in member service:', error);
          // Continue with response even if member service fails
        }
      }

      res.json({
        success: true,
        message: 'User updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            phone: updatedUser.phone,
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
            role: updatedUser.role,
            emailVerified: updatedUser.email_verified,
            phoneVerified: updatedUser.phone_verified,
          },
        },
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Delete user
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const currentUser = req.user; // User making the request

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null,
        });
      }

      // Prevent ADMIN from deleting SUPER_ADMIN
      if (currentUser.role === 'ADMIN' && existingUser.role === 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Admin không thể xóa Super Admin',
          data: null,
        });
      }

      // Prevent users from deleting themselves
      if (currentUser.userId === id || currentUser.id === id) {
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa chính tài khoản của bạn',
          data: null,
        });
      }

      // If user is TRAINER, delete trainer from schedule service first
      if (existingUser.role === 'TRAINER') {
        try {
          console.log('🗑️ Deleting trainer from schedule service for user:', id);
          const trainerResult = await scheduleService.deleteTrainer(id);

          if (trainerResult.success) {
            console.log('✅ Trainer deleted successfully from schedule service');
          } else {
            console.warn('⚠️ Failed to delete trainer in schedule service:', trainerResult.error);
            // Continue with user deletion even if schedule service fails
          }
        } catch (error) {
          console.error('❌ Error deleting trainer in schedule service:', error);
          // Continue with user deletion even if schedule service fails
        }
      }

      // If user is MEMBER, delete member from member service first
      if (existingUser.role === 'MEMBER') {
        try {
          console.log('🗑️ Deleting member from member service for user:', id);
          const memberResult = await memberService.deleteMember(id);

          if (memberResult.success) {
            console.log('✅ Member deleted successfully from member service');
          } else {
            console.warn('⚠️ Failed to delete member in member service:', memberResult.error);
            // Continue with user deletion even if member service fails
          }
        } catch (error) {
          console.error('❌ Error deleting member in member service:', error);
          // Continue with user deletion even if member service fails
        }
      }

      // Delete related records that have RESTRICT constraint before deleting user
      try {
        // Delete access_logs (has RESTRICT constraint)
        await prisma.accessLog.deleteMany({
          where: { user_id: id },
        });
        console.log('✅ Deleted access logs for user:', id);
      } catch (error) {
        console.warn('⚠️ Error deleting access logs (may not exist):', error.message);
      }

      try {
        // Delete members_ref if exists (has RESTRICT constraint)
        // Model name is Member but table is members_ref
        await prisma.member.deleteMany({
          where: { user_id: id },
        });
        console.log('✅ Deleted members_ref for user:', id);
      } catch (error) {
        console.warn('⚠️ Error deleting members_ref (may not exist):', error.message);
      }

      try {
        // Delete staff_ref if exists (has RESTRICT constraint)
        // Model name is Staff but table is staff_ref
        await prisma.staff.deleteMany({
          where: { user_id: id },
        });
        console.log('✅ Deleted staff_ref for user:', id);
      } catch (error) {
        console.warn('⚠️ Error deleting staff_ref (may not exist):', error.message);
      }

      // Delete user from identity service
      await prisma.user.delete({
        where: { id },
      });

      // Emit socket event for user deletion (to notify if user is currently logged in)
      try {
        if (global.io) {
          const socketPayload = {
            user_id: id,
            id: id,
            action: 'deleted',
            role: existingUser.role,
            data: {
              id: id,
              email: existingUser.email,
              role: existingUser.role,
            },
            timestamp: new Date().toISOString(),
          };

          // Emit to user room (if user is currently logged in, they will receive this)
          global.io.to(`user:${id}`).emit('user:deleted', socketPayload);
          console.log(`📡 Emitted user:deleted event for user ${id} (role: ${existingUser.role})`);
        }
      } catch (socketError) {
        // Log socket error but don't fail the deletion
        console.error('❌ Error emitting user:deleted socket event:', socketError);
      }

      res.json({
        success: true,
        message: 'User deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        data: null,
      });
    }
  }

  // Get user by ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          phone: true,
          first_name: true,
          last_name: true,
          role: true,
          is_active: true,
          email_verified: true,
          phone_verified: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'User retrieved successfully',
        data: { user },
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get all users (for admin)
  async getAllUsers(req, res) {
    try {
      const { role, page = 1, limit = 10 } = req.query;
      const parsedLimit = parseInt(limit);
      const parsedPage = parseInt(page);
      console.log('getAllUsers - Received query params:', { role, page, limit, parsedLimit, parsedPage });
      const skip = (parsedPage - 1) * parsedLimit;

      const whereClause = role ? { role: role.toUpperCase() } : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            email: true,
            phone: true,
            first_name: true,
            last_name: true,
            role: true,
            is_active: true,
            email_verified: true,
            phone_verified: true,
            face_photo_url: true, // Include face_photo_url for avatar fallback
            created_at: true,
            updated_at: true,
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: parsedLimit,
        }),
        prisma.user.count({ where: whereClause }),
      ]);

      console.log('getAllUsers - Returning:', { 
        usersCount: users.length, 
        requestedLimit: parsedLimit,
        total,
        page: parsedPage 
      });

      res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users,
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            pages: Math.ceil(total / parsedLimit),
          },
        },
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get all trainers (public route for other services)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTrainers(req, res) {
    try {
      const trainers = await prisma.user.findMany({
        where: {
          role: 'TRAINER',
          is_active: true,
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          role: true,
          is_active: true,
          email_verified: true,
          phone_verified: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      res.json({
        success: true,
        message: 'Trainers retrieved successfully',
        data: {
          users: trainers,
        },
      });
    } catch (error) {
      console.error('Get trainers error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get all admins and super admins (public route for other services)
   * Used by schedule service to send notifications
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAdmins(req, res) {
    try {
      console.log('📞 getAdmins endpoint called', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        ip: req.ip,
      });

      const admins = await prisma.user.findMany({
        where: {
          role: {
            in: ['ADMIN', 'SUPER_ADMIN'],
          },
          is_active: true,
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          role: true,
          is_active: true,
          email_verified: true,
          phone_verified: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      console.log(`✅ Found ${admins.length} admin/super-admin users`);
      
      if (admins.length === 0) {
        console.warn(`⚠️ [GET_ADMINS] WARNING: No admins/super-admins found in database!`);
        console.warn(`⚠️ [GET_ADMINS] Query conditions: role IN ['ADMIN', 'SUPER_ADMIN'], is_active = true`);
        
        // Check if there are any admins with is_active = false
        const inactiveAdmins = await prisma.user.findMany({
          where: {
            role: {
              in: ['ADMIN', 'SUPER_ADMIN'],
            },
            is_active: false,
          },
          select: {
            id: true,
            email: true,
            role: true,
            is_active: true,
          },
        });
        
        if (inactiveAdmins.length > 0) {
          console.warn(`⚠️ [GET_ADMINS] Found ${inactiveAdmins.length} inactive admin(s)/super-admin(s):`, inactiveAdmins);
        }
        
        // Check total count of admins regardless of is_active
        const totalAdmins = await prisma.user.count({
          where: {
            role: {
              in: ['ADMIN', 'SUPER_ADMIN'],
            },
          },
        });
        
        console.warn(`⚠️ [GET_ADMINS] Total admins/super-admins in database (regardless of is_active): ${totalAdmins}`);
      } else {
        console.log(`📋 [GET_ADMINS] Admin list:`, admins.map(a => ({ id: a.id, email: a.email, role: a.role, is_active: a.is_active })));
      }

      res.json({
        success: true,
        message: 'Admins retrieved successfully',
        data: {
          users: admins,
        },
      });
    } catch (error) {
      console.error('❌ Get admins error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== PUSH NOTIFICATION ====================

  /**
   * Update push notification token
   */
  async updatePushToken(req, res) {
    try {
      const { id } = req.params; // user_id
      const { push_token, push_platform } = req.body;

      if (!push_token) {
        return res.status(400).json({
          success: false,
          message: 'Push token is required',
          data: null,
        });
      }

      // SAFEGUARD: Clear this token from all other users first
      await prisma.user.updateMany({
        where: {
          push_token: push_token,
          id: { not: id },
        },
        data: { push_token: null },
      });

      // Update user's push token
      await prisma.user.update({
        where: { id },
        data: {
          push_token: push_token,
          push_platform: push_platform || null,
          updated_at: new Date(),
        },
      });

      console.log(`🔔 Push token updated for user ${id}`);

      res.json({
        success: true,
        message: 'Push token updated successfully',
        data: null,
      });
    } catch (error) {
      console.error('Update push token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Update push notification preference
   */
  async updatePushPreference(req, res) {
    try {
      const { id } = req.params; // user_id
      const { push_enabled } = req.body;

      if (typeof push_enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'push_enabled must be a boolean',
          data: null,
        });
      }

      await prisma.user.update({
        where: { id },
        data: {
          push_enabled: push_enabled,
          updated_at: new Date(),
        },
      });

      console.log(`🔔 Push preference updated for user ${id}: ${push_enabled}`);

      res.json({
        success: true,
        message: `Push notifications ${push_enabled ? 'enabled' : 'disabled'}`,
        data: { push_enabled },
      });
    } catch (error) {
      console.error('Update push preference error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get user's push notification settings
   */
  async getPushSettings(req, res) {
    try {
      const { id } = req.params; // user_id

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          push_enabled: true,
          push_platform: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Push settings retrieved successfully',
        data: {
          push_enabled: user.push_enabled,
          push_platform: user.push_platform,
        },
      });
    } catch (error) {
      console.error('Get push settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = { AuthController };
