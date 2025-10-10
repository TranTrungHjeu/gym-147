const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/prisma.js');
const { OTPService } = require('../services/otp.service.js');

class AuthController {
  constructor() {
    this.otpService = new OTPService();
    this.rateLimitStore = new Map(); // In-memory store for rate limiting
    this.otpCooldownStore = new Map(); // Store for OTP cooldown (30 seconds)
  }

  // Rate limiting helper methods
  async getRateLimitCount(key) {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const attempts = this.rateLimitStore.get(key) || [];

    // Remove expired attempts
    const validAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
    this.rateLimitStore.set(key, validAttempts);

    return validAttempts.length;
  }

  async incrementRateLimit(key) {
    const now = Date.now();
    const attempts = this.rateLimitStore.get(key) || [];
    attempts.push(now);
    this.rateLimitStore.set(key, attempts);
  }

  // OTP cooldown helper methods
  async getOTPCooldown(key) {
    const lastSent = this.otpCooldownStore.get(key);
    if (!lastSent) return 0;

    const now = Date.now();
    const cooldownMs = 30 * 1000; // 30 seconds cooldown
    const timeSinceLastSent = now - lastSent;

    if (timeSinceLastSent >= cooldownMs) {
      this.otpCooldownStore.delete(key);
      return 0;
    }

    return Math.ceil((cooldownMs - timeSinceLastSent) / 1000);
  }

  async setOTPCooldown(key) {
    this.otpCooldownStore.set(key, Date.now());
  }

  async login(req, res) {
    try {
      const { identifier, password } = req.body; // identifier can be email or phone

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

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
          data: null,
        });
      }

      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: { last_login_at: new Date() },
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
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

  // Gửi OTP cho đăng ký
  async sendRegistrationOTP(req, res) {
    try {
      const { identifier, type = 'PHONE' } = req.body; // identifier = email or phone

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

      // Generate OTP
      const otp = this.otpService.generateOTP();

      // Store OTP
      await this.otpService.storeOTP(identifier, otp, type);

      // Increment rate limit counter
      await this.incrementRateLimit(rateLimitKey);

      // Set OTP cooldown
      await this.setOTPCooldown(cooldownKey);

      // Send OTP
      let sendResult;
      if (type === 'PHONE') {
        sendResult = await this.otpService.sendSMSOTP(identifier, otp);
      } else {
        sendResult = await this.otpService.sendEmailVerification(identifier, otp);
      }

      res.json({
        success: true,
        message: sendResult.message,
        data: {
          identifier,
          type,
          remainingAttempts: 5 - (await this.getRateLimitCount(rateLimitKey)),
          // Only include OTP in development
          ...(process.env.NODE_ENV === 'development' && { otp }),
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

  // Xác thực OTP
  async verifyRegistrationOTP(req, res) {
    try {
      const { identifier, otp, type = 'PHONE' } = req.body;

      if (!identifier || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Email/số điện thoại và mã OTP là bắt buộc',
          data: null,
        });
      }

      // Verify OTP
      const verificationResult = await this.otpService.verifyOTP(identifier, otp, type);

      if (!verificationResult.success) {
        return res.status(400).json({
          success: false,
          message: verificationResult.message,
          data: {
            remainingAttempts: verificationResult.remainingAttempts,
          },
        });
      }

      res.json({
        success: true,
        message: 'Xác thực thành công',
        data: {
          identifier,
          type,
          verified: true,
        },
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Đăng ký thành viên thường (sau khi xác thực OTP)
  async registerMember(req, res) {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        otp,
        otpType = 'PHONE',
        primaryMethod,
      } = req.body;

      // Determine primary method if not provided
      const primaryMethodType = primaryMethod || (email ? 'EMAIL' : 'PHONE');

      // Validate required fields - email OR phone is required
      if ((!email && !phone) || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Email or phone, password, firstName, and lastName are required',
          data: null,
        });
      }

      // Validate primary method consistency
      if (primaryMethodType === 'EMAIL' && !email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required when primary method is EMAIL',
          data: null,
        });
      }

      if (primaryMethodType === 'PHONE' && !phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone is required when primary method is PHONE',
          data: null,
        });
      }

      // Validate OTP is required for primary method
      if (!otp) {
        return res.status(400).json({
          success: false,
          message: 'OTP is required for primary method verification',
          data: null,
        });
      }

      // Validate email format if provided
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            success: false,
            message: 'Email format is invalid',
            data: null,
          });
        }
      }

      // Validate phone format if provided
      if (phone) {
        const phoneRegex = /^(\+84|84|0)[0-9]{9,10}$/;
        if (!phoneRegex.test(phone)) {
          return res.status(400).json({
            success: false,
            message:
              'Phone format is invalid. Please use Vietnamese format (0xxxxxxxxx or +84xxxxxxxxx)',
            data: null,
          });
        }
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
          data: null,
        });
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          success: false,
          message:
            'Password must contain at least one uppercase letter, one lowercase letter, and one number',
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
          message: 'User with this email or phone already exists',
          data: null,
        });
      }

      // Check if OTP was already verified (for registration flow)
      if (otp) {
        const identifier = phone || email;
        const otpRecord = await prisma.oTPVerification.findFirst({
          where: {
            identifier,
            type: otpType,
            expires_at: { gt: new Date() },
            verified_at: { not: null }, // Only accept already verified OTPs
          },
        });

        if (!otpRecord) {
          return res.status(400).json({
            success: false,
            message: 'OTP chưa được xác thực hoặc đã hết hạn. Vui lòng xác thực OTP trước',
            data: null,
          });
        }
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Determine verification status based on primary method
      const now = new Date();
      const emailVerified = primaryMethodType === 'EMAIL' ? true : false;
      const phoneVerified = primaryMethodType === 'PHONE' ? true : false;

      // Create new user with MEMBER role only
      const newUser = await prisma.user.create({
        data: {
          email: email || null,
          password_hash: hashedPassword,
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          role: 'MEMBER', // Chỉ cho phép tạo MEMBER
          is_active: true,
          email_verified: emailVerified,
          email_verified_at: emailVerified ? now : null,
          phone_verified: phoneVerified,
          phone_verified_at: phoneVerified ? now : null,
        },
      });

      // Create email verification record if email not verified and email exists
      if (!emailVerified && newUser.email) {
        const emailToken = jwt.sign(
          { userId: newUser.id, email: newUser.email },
          process.env.JWT_SECRET || 'default_secret',
          { expiresIn: '24h' }
        );

        await prisma.emailVerification.create({
          data: {
            user_id: newUser.id,
            token: emailToken,
            email: newUser.email,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
        });
      }

      // Delete used OTP after successful user creation
      if (otp) {
        const identifier = phone || email;
        await prisma.oTPVerification.deleteMany({
          where: {
            identifier,
            type: otpType,
            verified_at: { not: null },
          },
        });
      }

      // Log registration
      await prisma.accessLog.create({
        data: {
          user_id: newUser.id,
          access_type: 'LOGIN',
          access_method: 'PASSWORD',
          success: true,
          location: 'Registration',
          sensor_data: {
            action: 'REGISTER_MEMBER',
            registration_method: phone ? 'PHONE_OTP' : 'EMAIL_ONLY',
            phone_verified: phoneVerified,
            email_verified: emailVerified,
          },
        },
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: newUser.id,
          email: newUser.email,
          role: newUser.role,
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '24h' }
      );

      res.status(201).json({
        success: true,
        message: 'Member registered successfully',
        data: {
          token,
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

  // Đăng ký ADMIN (chỉ SUPER_ADMIN mới có thể tạo)
  async registerAdmin(req, res) {
    try {
      const { email, password, firstName, lastName, adminSecret } = req.body;

      // Validate admin secret key
      if (adminSecret !== process.env.ADMIN_REGISTRATION_SECRET) {
        return res.status(403).json({
          success: false,
          message: 'Invalid admin registration secret',
          data: null,
        });
      }

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, firstName, and lastName are required',
          data: null,
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
          data: null,
        });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create new admin user
      const newUser = await prisma.user.create({
        data: {
          email,
          password_hash: hashedPassword,
          first_name: firstName,
          last_name: lastName,
          role: 'ADMIN',
          is_active: true,
          email_verified: true, // Admin accounts auto-verified
        },
      });

      // Log admin creation
      await prisma.accessLog.create({
        data: {
          user_id: req.user.id,
          access_type: 'LOGIN',
          access_method: 'PASSWORD',
          success: true,
          location: 'Admin Panel',
          sensor_data: {
            action: 'CREATE_ADMIN',
            created_user_id: newUser.id,
            created_user_role: 'ADMIN',
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Admin user created successfully',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.first_name,
            lastName: newUser.last_name,
            role: newUser.role,
          },
        },
      });
    } catch (error) {
      console.error('Admin register error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Đăng ký TRAINER (SUPER_ADMIN và ADMIN có thể tạo)
  async registerTrainer(req, res) {
    try {
      const { email, password, firstName, lastName, phone, specialization } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, firstName, and lastName are required',
          data: null,
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
          data: null,
        });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create new trainer user
      const newUser = await prisma.user.create({
        data: {
          email,
          password_hash: hashedPassword,
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          role: 'TRAINER',
          is_active: true,
          email_verified: true, // Trainer accounts auto-verified
        },
      });

      // Log trainer creation
      await prisma.accessLog.create({
        data: {
          user_id: req.user.id,
          access_type: 'LOGIN',
          access_method: 'PASSWORD',
          success: true,
          location: 'Admin Panel',
          sensor_data: {
            action: 'CREATE_TRAINER',
            created_user_id: newUser.id,
            created_user_role: 'TRAINER',
            specialization: specialization || null,
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Trainer user created successfully',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.first_name,
            lastName: newUser.last_name,
            role: newUser.role,
            phone: newUser.phone,
          },
        },
      });
    } catch (error) {
      console.error('Trainer register error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async logout(req, res) {
    try {
      res.json({
        success: true,
        message: 'Logout successful',
        data: null,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Logout error',
        data: null,
      });
    }
  }

  // Verify email address
  async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required',
          data: null,
        });
      }

      // Find email verification record
      const emailVerification = await prisma.emailVerification.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!emailVerification) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification token',
          data: null,
        });
      }

      // Check if token is expired
      if (emailVerification.expires_at < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Verification token has expired',
          data: null,
        });
      }

      // Check if already verified
      if (emailVerification.verified_at) {
        return res.status(400).json({
          success: false,
          message: 'Email already verified',
          data: null,
        });
      }

      // Update email verification status
      const now = new Date();
      await prisma.$transaction([
        // Update user email verification status
        prisma.user.update({
          where: { id: emailVerification.user_id },
          data: {
            email_verified: true,
            email_verified_at: now,
          },
        }),
        // Mark email verification as completed
        prisma.emailVerification.update({
          where: { id: emailVerification.id },
          data: { verified_at: now },
        }),
      ]);

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: {
            id: emailVerification.user.id,
            email: emailVerification.user.email,
            emailVerified: true,
          },
        },
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Resend email verification
  async resendEmailVerification(req, res) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
          data: null,
        });
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
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
          message: 'Email already verified',
          data: null,
        });
      }

      // Create new email verification token
      const emailToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '24h' }
      );

      await prisma.emailVerification.create({
        data: {
          user_id: user.id,
          token: emailToken,
          email: user.email,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      res.json({
        success: true,
        message: 'Email verification sent successfully',
        data: null,
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

  async getProfile(req, res) {
    try {
      // Get user ID from JWT middleware (req.user should be set by auth middleware)
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized - No user ID found',
          data: null,
        });
      }

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          first_name: true,
          last_name: true,
          role: true,
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
        message: 'Profile retrieved successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
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
}

module.exports = { AuthController };
