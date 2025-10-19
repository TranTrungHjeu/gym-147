const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../lib/prisma.js');
const { OTPService } = require('../services/otp.service.js');
const scheduleService = require('../services/schedule.service.js');

class AuthController {
  constructor() {
    this.otpService = new OTPService();
    this.rateLimitStore = new Map(); // In-memory store for rate limiting
    this.otpCooldownStore = new Map(); // Store for OTP cooldown (30 seconds)
    this.passwordResetCleanupInterval = null;
  }

  // ==================== RATE LIMITING HELPERS ====================

  async getRateLimitCount(key) {
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
    const timestamp = this.otpCooldownStore.get(key);
    if (!timestamp) return 0;

    const now = Date.now();
    const cooldownTime = 60 * 1000; // 30 seconds
    const remaining = Math.max(0, cooldownTime - (now - timestamp));

    if (remaining === 0) {
      this.otpCooldownStore.delete(key);
    }

    return Math.ceil(remaining / 1000);
  }

  async setOTPCooldown(key) {
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
    this.passwordResetCleanupInterval = setInterval(
      async () => {
        try {
          await this.cleanupExpiredPasswordResetTokens();
        } catch (error) {
          console.error('Password reset cleanup job error:', error);
        }
      },
      2 * 60 * 1000
    ); // 2 minutes

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
      const { identifier, password, twoFactorToken } = req.body; // identifier can be email or phone

      if (!identifier || !password) {
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
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
          data: null,
        });
      }

      // Check if account is active
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa',
          data: null,
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
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

      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: { last_login_at: new Date() },
      });

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

      // Generate JWT token with sessionId
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          sessionId: session.id,
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '15m' } // Short-lived access token
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: token,
          refreshToken: refreshToken,
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
      console.error('Login error:', error);
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

      if (sessionId) {
        // Delete the current session
        await prisma.session.delete({
          where: { id: sessionId },
        });
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
          OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
        },
      });

      if (existingUser) {
        let message = 'Tài khoản với thông tin này đã tồn tại';
        if (existingUser.email === email) {
          message = 'Email này đã được sử dụng';
        } else if (existingUser.phone === phone) {
          message = 'Số điện thoại này đã được sử dụng';
        }
        return res.status(400).json({
          success: false,
          message,
          data: null,
        });
      }

      // Verify OTP if provided
      if (otp && otpType) {
        const otpResult = await this.otpService.verifyOTP(
          primaryMethod === 'EMAIL' ? email : phone,
          otp,
          otpType
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

      // Create user
      const newUser = await prisma.user.create({
        data: {
          email: email || null,
          phone: phone || null,
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
    } catch (error) {
      console.error('Member register error:', error);
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

      // OTP cooldown check (30 seconds between sends)
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

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email: identifier }, { phone: identifier }],
        },
      });

      if (existingUser) {
        let message = 'Tài khoản với thông tin này đã tồn tại';

        if (existingUser.email === identifier) {
          message = 'Email này đã được sử dụng. Vui lòng thử email khác hoặc đăng nhập.';
        } else if (existingUser.phone === identifier) {
          message =
            'Số điện thoại này đã được sử dụng. Vui lòng thử số điện thoại khác hoặc đăng nhập.';
        }

        return res.status(400).json({
          success: false,
          message,
          data: null,
        });
      }

      // Send OTP
      const sendResult = await this.otpService.sendOTP(identifier, type);

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

      res.json({
        success: true,
        message: sendResult.message,
        data: {
          identifier,
          type,
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

      const result = await this.otpService.verifyOTP(identifier, otp, type);

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
          // Update trainer table in schedule service
          const axios = require('axios');
          await axios.put(
            `http://localhost:3003/trainers/user/${userId}`,
            {
              full_name: `${firstName} ${lastName}`,
              email: email,
              phone: phone || null,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        } catch (trainerError) {
          console.error('Error updating trainer table:', trainerError);
          // Don't fail the entire request if trainer update fails
        }
      }
      // TODO: Update member table when member service is ready
      // else if (updatedUser.role === 'MEMBER') {
      //   try {
      //     // Update member table in member service
      //     const axios = require('axios');
      //     await axios.put(
      //       `http://localhost:3002/members/user/${userId}`,
      //       {
      //         full_name: `${firstName} ${lastName}`,
      //         email: email,
      //         phone: phone || null,
      //       },
      //       {
      //         headers: {
      //           'Content-Type': 'application/json',
      //         },
      //       }
      //     );
      //   } catch (memberError) {
      //     console.error('Error updating member table:', memberError);
      //     // Don't fail the entire request if member update fails
      //   }
      // }

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
        // TODO: Gửi email với reset link
        // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        // await emailService.sendPasswordResetEmail(user.email, resetLink);
        console.log(`Password reset requested for email: ${email}`);
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
          expires_at: { gt: new Date() },
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

      // Generate new tokens
      const accessToken = jwt.sign(
        {
          userId: session.user.id,
          email: session.user.email,
          role: session.user.role,
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

      res.json({
        success: true,
        message: '2FA verification successful',
        data: {
          accessToken: jwtToken,
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
   * Register admin (Super Admin only)
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
          role: role.toUpperCase(),
          is_active: true,
          email_verified: true,
          email_verified_at: new Date(),
          phone_verified: phone ? true : false,
          phone_verified_at: phone ? new Date() : null,
        },
      });

      // If role is TRAINER, create trainer in schedule service
      if (role.toUpperCase() === 'TRAINER') {
        try {
          const trainerResult = await scheduleService.createTrainer({
            id: newAdmin.id,
            firstName: newAdmin.first_name,
            lastName: newAdmin.last_name,
            phone: newAdmin.phone,
            email: newAdmin.email,
          });

          if (!trainerResult.success) {
            console.warn('Failed to create trainer in schedule service:', trainerResult.error);
            // Continue with response even if schedule service fails
          }
        } catch (error) {
          console.error('Error creating trainer in schedule service:', error);
          // Continue with response even if schedule service fails
        }
      }

      res.status(201).json({
        success: true,
        message: 'Admin đã được tạo thành công',
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
      const { firstName, lastName, phone, email } = req.body;

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

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          email,
        },
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

      // If user is TRAINER, delete trainer from schedule service first
      if (existingUser.role === 'TRAINER') {
        try {
          const trainerResult = await scheduleService.deleteTrainer(id);

          if (!trainerResult.success) {
            console.warn('Failed to delete trainer in schedule service:', trainerResult.error);
            // Continue with user deletion even if schedule service fails
          }
        } catch (error) {
          console.error('Error deleting trainer in schedule service:', error);
          // Continue with user deletion even if schedule service fails
        }
      }

      // Delete user from identity service
      await prisma.user.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'User deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
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
      const skip = (parseInt(page) - 1) * parseInt(limit);

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
            created_at: true,
            updated_at: true,
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: parseInt(limit),
        }),
        prisma.user.count({ where: whereClause }),
      ]);

      res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
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
}

module.exports = { AuthController };
