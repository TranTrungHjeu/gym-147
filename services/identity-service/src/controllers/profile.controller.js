const bcrypt = require('bcrypt');
const { prisma } = require('../lib/prisma.js');
const scheduleService = require('../services/schedule.service.js');
const memberService = require('../services/member.service.js');
const { OTPService } = require('../services/otp.service.js');

class ProfileController {
  constructor() {
    // Validation helper methods
    this.validatePassword = this.validatePassword.bind(this);
    this.validatePhone = this.validatePhone.bind(this);
    this.otpService = new OTPService();
    // Rate limiting stores for OTP
    this.rateLimitStore = new Map(); // In-memory store for rate limiting
    this.otpCooldownStore = new Map(); // Store for OTP cooldown (60 seconds)
  }

  // ==================== RATE LIMITING HELPERS ====================

  getRateLimitCount(key) {
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

  incrementRateLimit(key) {
    const record = this.rateLimitStore.get(key);
    const now = Date.now();

    if (!record || now - record.timestamp > 60 * 60 * 1000) {
      this.rateLimitStore.set(key, { count: 1, timestamp: now });
    } else {
      this.rateLimitStore.set(key, { count: record.count + 1, timestamp: record.timestamp });
    }
  }

  getOTPCooldown(key) {
    const record = this.otpCooldownStore.get(key);
    if (!record) return 0;

    const now = Date.now();
    const cooldownDuration = 60 * 1000; // 60 seconds

    if (now - record.timestamp >= cooldownDuration) {
      this.otpCooldownStore.delete(key);
      return 0;
    }

    return Math.ceil((cooldownDuration - (now - record.timestamp)) / 1000);
  }

  setOTPCooldown(key) {
    this.otpCooldownStore.set(key, { timestamp: Date.now() });
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

  /**
   * Validate Vietnamese phone number
   */
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

  /**
   * Update email/phone with OTP verification
   */
  async updateEmailPhoneWithOTP(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { verificationMethod, otp, newEmail, newPhone, firstName, lastName } = req.body;

      if (!verificationMethod || !['EMAIL', 'PHONE'].includes(verificationMethod)) {
        return res.status(400).json({
          success: false,
          message: 'Phương thức xác thực không hợp lệ',
          data: null,
        });
      }

      if (!otp || otp.length !== 6) {
        return res.status(400).json({
          success: false,
          message: 'Mã OTP không hợp lệ',
          data: null,
        });
      }

      // Get user information
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          first_name: true,
          last_name: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null,
        });
      }

      // Determine identifier based on verification method (use current email/phone)
      const identifier = verificationMethod === 'EMAIL' ? user.email : user.phone;

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message:
            verificationMethod === 'EMAIL'
              ? 'Email hiện tại không tồn tại'
              : 'Số điện thoại hiện tại không tồn tại',
          data: null,
        });
      }

      // Verify OTP first
      const otpResult = await this.otpService.verifyOTP(identifier, otp, verificationMethod);

      if (!otpResult.success) {
        return res.status(400).json({
          success: false,
          message: otpResult.message || 'Mã OTP không đúng hoặc đã hết hạn',
          data: {
            remainingAttempts: otpResult.remainingAttempts || 0,
          },
        });
      }

      // Prepare update data
      const updateData = {};

      if (firstName !== undefined && firstName !== null && firstName !== '') {
        updateData.first_name = firstName.trim();
      }
      if (lastName !== undefined && lastName !== null && lastName !== '') {
        updateData.last_name = lastName.trim();
      }

      // Update email if provided and changed
      if (newEmail && newEmail.trim() !== '' && newEmail !== user.email) {
        const trimmedEmail = newEmail.trim().toLowerCase();

        // Check if email is already used by another user
        const emailExists = await prisma.user.findFirst({
          where: {
            email: trimmedEmail,
            id: { not: userId },
          },
        });

        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: 'Email này đã được sử dụng',
            data: null,
          });
        }

        updateData.email = trimmedEmail;
        updateData.email_verified = false; // Reset verification status
        updateData.email_verified_at = null;
      }

      // Update phone if provided and changed
      if (newPhone && newPhone.trim() !== '' && newPhone !== user.phone) {
        const trimmedPhone = newPhone.trim();
        const phoneValidation = this.validatePhone(trimmedPhone);

        if (!phoneValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: phoneValidation.message,
            data: null,
          });
        }

        // Check if phone is already used by another user
        const phoneExists = await prisma.user.findFirst({
          where: {
            phone: trimmedPhone,
            id: { not: userId },
          },
        });

        if (phoneExists) {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại này đã được sử dụng',
            data: null,
          });
        }

        updateData.phone = trimmedPhone;
        updateData.phone_verified = false; // Reset verification status
        updateData.phone_verified_at = null;
      }

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có dữ liệu để cập nhật',
          data: null,
        });
      }

      // Update user profile
      updateData.updated_at = new Date();
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
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

      // Update related tables based on user role
      if (updatedUser.role === 'TRAINER') {
        try {
          await scheduleService.updateTrainer(userId, {
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
            phone: updatedUser.phone,
            email: updatedUser.email,
          });
        } catch (error) {
          console.error('Error updating trainer in schedule service:', error);
        }
      }

      if (updatedUser.role === 'MEMBER') {
        try {
          await memberService.updateMember(userId, {
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
            phone: updatedUser.phone,
            email: updatedUser.email,
          });
        } catch (error) {
          console.error('Error updating member in member service:', error);
        }
      }

      res.json({
        success: true,
        message: 'Thông tin đã được cập nhật thành công',
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
            createdAt: updatedUser.created_at,
            updatedAt: updatedUser.updated_at,
          },
        },
      });
    } catch (error) {
      console.error('Update email/phone with OTP error:', error);
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
      const { firstName, lastName, phone } = req.body;

      const updateData = {};

      // Add firstName and lastName if provided
      if (firstName !== undefined && firstName !== null && firstName !== '') {
        updateData.first_name = firstName.trim();
      }
      if (lastName !== undefined && lastName !== null && lastName !== '') {
        updateData.last_name = lastName.trim();
      }

      // Validate phone if provided
      if (phone) {
        const trimmedPhone = phone.trim();
        const phoneValidation = this.validatePhone(trimmedPhone);
        if (!phoneValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: phoneValidation.message,
            data: null,
          });
        }

        // Check if phone is already used by another user
        const existingUser = await prisma.user.findFirst({
          where: {
            phone: trimmedPhone,
            id: { not: userId },
          },
        });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại này đã được sử dụng',
            data: null,
          });
        }

        updateData.phone = trimmedPhone;
      }

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có dữ liệu để cập nhật',
          data: null,
        });
      }

      // Update user profile
      updateData.updated_at = new Date();
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
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
        message: 'Profile đã được cập nhật thành công',
        data: { user: updatedUser },
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

  /**
   * Change password
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc',
          data: null,
        });
      }

      // Validate new password strength
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message,
          data: null,
        });
      }

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password_hash: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null,
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu hiện tại không đúng',
          data: null,
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password_hash: hashedNewPassword,
          updated_at: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Mật khẩu đã được thay đổi thành công',
        data: null,
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(req, res) {
    try {
      const userId = req.user.userId || req.user.id;

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Please select an image file.',
          data: null,
        });
      }

      // Get current user to check for existing avatar
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, face_photo_url: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null,
        });
      }

      // Get S3 upload service
      const s3UploadService = require('../services/s3-upload.service.js');

      // Validate S3 configuration
      const configValidation = s3UploadService.validateConfiguration();
      if (!configValidation.valid) {
        console.warn('[WARNING] S3 configuration invalid:', configValidation.message);
        return res.status(500).json({
          success: false,
          message: 'File upload service is not configured. Please contact administrator.',
          data: null,
        });
      }

      // When using multer-s3, req.file.location contains the S3 URL
      const avatarUrl = req.file.location || req.file.path;

      // Delete old avatar from S3 if exists
      if (user.face_photo_url) {
        try {
          const oldKey = s3UploadService.extractKeyFromUrl(user.face_photo_url);
          if (oldKey) {
            await s3UploadService.deleteFile(oldKey);
            console.log(`[DELETE] Deleted old avatar: ${oldKey}`);
          }
        } catch (deleteError) {
          console.warn('[WARNING] Failed to delete old avatar:', deleteError.message);
          // Continue even if deletion fails
        }
      }

      // Update user.face_photo_url in database
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          face_photo_url: avatarUrl,
        },
        select: {
          id: true,
          face_photo_url: true,
        },
      });

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          url: avatarUrl,
          key: req.file.key,
        },
      });
    } catch (error) {
      console.error('Upload avatar error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Deactivate account
   */
  async deactivateAccount(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu là bắt buộc để vô hiệu hóa tài khoản',
          data: null,
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password_hash: true, is_active: true },
      });

      if (!user.is_active) {
        return res.status(400).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa',
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

      // Deactivate account
      await prisma.user.update({
        where: { id: userId },
        data: { is_active: false },
      });

      // Revoke all sessions
      await prisma.session.deleteMany({
        where: { user_id: userId },
      });

      res.json({
        success: true,
        message: 'Tài khoản đã được vô hiệu hóa thành công',
        data: null,
      });
    } catch (error) {
      console.error('Deactivate account error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Soft delete account
   */
  async deleteAccount(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu là bắt buộc để xóa tài khoản',
          data: null,
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password_hash: true, first_name: true, last_name: true },
      });

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu không đúng',
          data: null,
        });
      }

      // Soft delete - mark as inactive and clear sensitive data
      await prisma.user.update({
        where: { id: userId },
        data: {
          is_active: false,
          email: null,
          phone: null,
          password_hash: 'DELETED',
          two_factor_secret: null,
          face_encoding: null,
          face_photo_url: null,
        },
      });

      // Revoke all sessions
      await prisma.session.deleteMany({
        where: { user_id: userId },
      });

      res.json({
        success: true,
        message: 'Tài khoản đã được xóa thành công',
        data: null,
      });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Reactivate account (Admin only)
   */
  async reactivateAccount(req, res) {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, is_active: true, first_name: true, last_name: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null,
        });
      }

      if (user.is_active) {
        return res.status(400).json({
          success: false,
          message: 'Tài khoản đã được kích hoạt',
          data: null,
        });
      }

      // Reactivate account
      await prisma.user.update({
        where: { id: userId },
        data: { is_active: true },
      });

      res.json({
        success: true,
        message: `Tài khoản của ${user.first_name} ${user.last_name} đã được kích hoạt lại`,
        data: null,
      });
    } catch (error) {
      console.error('Reactivate account error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Send OTP for email/phone change verification
   */
  async sendOTPForEmailPhoneChange(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { verificationMethod, newEmail, newPhone } = req.body;

      if (!verificationMethod || !['EMAIL', 'PHONE'].includes(verificationMethod)) {
        return res.status(400).json({
          success: false,
          message: 'Phương thức xác thực không hợp lệ. Vui lòng chọn EMAIL hoặc PHONE',
          data: null,
        });
      }

      // Get user information
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          first_name: true,
          last_name: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null,
        });
      }

      // Determine identifier based on verification method (use current email/phone)
      const identifier = verificationMethod === 'EMAIL' ? user.email : user.phone;

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message:
            verificationMethod === 'EMAIL'
              ? 'Email hiện tại không tồn tại. Vui lòng liên hệ admin.'
              : 'Số điện thoại hiện tại không tồn tại. Vui lòng liên hệ admin.',
          data: null,
        });
      }

      // Rate limiting check - prevent spam
      const rateLimitKey = `otp_email_phone_change:${userId}:${identifier}`;
      const existingAttempts = this.getRateLimitCount(rateLimitKey);

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
      const cooldownKey = `otp_cooldown_email_phone_change:${userId}:${identifier}`;
      const cooldownRemaining = this.getOTPCooldown(cooldownKey);

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

      // Send OTP to current email/phone
      const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || identifier;
      const sendResult = await this.otpService.sendOTP(identifier, verificationMethod, userName);

      if (!sendResult.success) {
        return res.status(400).json({
          success: false,
          message: sendResult.message || 'Không thể gửi OTP',
          data: null,
        });
      }

      // Increment rate limit and set cooldown after successful send
      this.incrementRateLimit(rateLimitKey);
      this.setOTPCooldown(cooldownKey);

      res.json({
        success: true,
        message: sendResult.message || 'Mã OTP đã được gửi thành công',
        data: {
          verificationMethod,
          identifier:
            verificationMethod === 'EMAIL'
              ? identifier.replace(/(.{2})(.*)(@.*)/, '$1****$3') // Mask email
              : identifier.replace(/(\d{4})(\d+)/, '****$2'), // Mask phone
          remainingAttempts: 5 - this.getRateLimitCount(rateLimitKey),
          retryAfter: 60, // 60 seconds cooldown
          ...(process.env.NODE_ENV === 'development' && { otp: sendResult.otp }),
        },
      });
    } catch (error) {
      console.error('Send OTP for email/phone change error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Send OTP for password change
   */
  async sendOTPForPasswordChange(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { verificationMethod } = req.body;

      if (!verificationMethod || !['EMAIL', 'PHONE'].includes(verificationMethod)) {
        return res.status(400).json({
          success: false,
          message: 'Phương thức xác thực không hợp lệ. Vui lòng chọn EMAIL hoặc PHONE',
          data: null,
        });
      }

      // Get user information
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          first_name: true,
          last_name: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null,
        });
      }

      // Determine identifier based on verification method
      const identifier = verificationMethod === 'EMAIL' ? user.email : user.phone;

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message:
            verificationMethod === 'EMAIL'
              ? 'Email không tồn tại. Vui lòng cập nhật email trước.'
              : 'Số điện thoại không tồn tại. Vui lòng cập nhật số điện thoại trước.',
          data: null,
        });
      }

      // Rate limiting check - prevent spam
      const rateLimitKey = `otp_password_change:${userId}:${identifier}`;
      const existingAttempts = this.getRateLimitCount(rateLimitKey);

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
      const cooldownKey = `otp_cooldown_password_change:${userId}:${identifier}`;
      const cooldownRemaining = this.getOTPCooldown(cooldownKey);

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

      // Send OTP
      const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || identifier;
      const sendResult = await this.otpService.sendOTP(identifier, verificationMethod, userName);

      if (!sendResult.success) {
        return res.status(400).json({
          success: false,
          message: sendResult.message || 'Không thể gửi OTP',
          data: null,
        });
      }

      // Increment rate limit and set cooldown after successful send
      this.incrementRateLimit(rateLimitKey);
      this.setOTPCooldown(cooldownKey);

      res.json({
        success: true,
        message: sendResult.message || 'Mã OTP đã được gửi thành công',
        data: {
          verificationMethod,
          identifier:
            verificationMethod === 'EMAIL'
              ? identifier.replace(/(.{2})(.*)(@.*)/, '$1****$3') // Mask email
              : identifier.replace(/(\d{4})(\d+)/, '****$2'), // Mask phone
          remainingAttempts: 5 - this.getRateLimitCount(rateLimitKey),
          retryAfter: 60, // 60 seconds cooldown
          ...(process.env.NODE_ENV === 'development' && { otp: sendResult.otp }),
        },
      });
    } catch (error) {
      console.error('Send OTP for password change error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Change password with OTP verification
   */
  async changePasswordWithOTP(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { verificationMethod, otp, newPassword } = req.body;

      if (!verificationMethod || !['EMAIL', 'PHONE'].includes(verificationMethod)) {
        return res.status(400).json({
          success: false,
          message: 'Phương thức xác thực không hợp lệ',
          data: null,
        });
      }

      if (!otp || otp.length !== 6) {
        return res.status(400).json({
          success: false,
          message: 'Mã OTP không hợp lệ',
          data: null,
        });
      }

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới là bắt buộc',
          data: null,
        });
      }

      // Get user information
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          password_hash: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null,
        });
      }

      // Determine identifier based on verification method
      const identifier = verificationMethod === 'EMAIL' ? user.email : user.phone;

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message:
            verificationMethod === 'EMAIL' ? 'Email không tồn tại' : 'Số điện thoại không tồn tại',
          data: null,
        });
      }

      // Verify OTP first
      const otpResult = await this.otpService.verifyOTP(identifier, otp, verificationMethod);

      if (!otpResult.success) {
        return res.status(400).json({
          success: false,
          message: otpResult.message || 'Mã OTP không đúng hoặc đã hết hạn',
          data: {
            remainingAttempts: otpResult.remainingAttempts || 0,
          },
        });
      }

      // Validate new password strength
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message,
          data: null,
        });
      }

      // Compare with old password
      const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới không được trùng với mật khẩu cũ',
          data: null,
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password_hash: hashedNewPassword,
          updated_at: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Mật khẩu đã được thay đổi thành công',
        data: null,
      });
    } catch (error) {
      console.error('Change password with OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== FACE RECOGNITION MANAGEMENT ====================

  /**
   * Update face encoding for user
   * PUT /profile/face-encoding
   * Supports two ways:
   * 1. Send image (base64) - automatically extracts encoding
   * 2. Send face_encoding (already extracted) - backward compatible
   */
  async updateFaceEncoding(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const { image, face_encoding, face_photo_url } = req.body;

      // Validate: need either image or face_encoding
      if (!image && !face_encoding) {
        return res.status(400).json({
          success: false,
          message: 'Either image (base64) or face_encoding is required',
        });
      }

      let encodingBuffer;

      // Method 1: Auto-extract encoding from image
      if (image) {
        try {
          const faceRecognitionService = require('../services/face-recognition.service');

          // Extract face encoding from image
          const encodingResult = await faceRecognitionService.extractFaceEncoding(image);

          if (!encodingResult.faceDetected) {
            return res.status(400).json({
              success: false,
              message:
                'No face detected in image. Please ensure your face is clearly visible and well-lit.',
            });
          }

          if (!encodingResult.descriptor) {
            return res.status(400).json({
              success: false,
              message: 'Failed to extract face encoding from image',
            });
          }

          // Convert descriptor (Float32Array) to Buffer
          encodingBuffer = Buffer.from(encodingResult.descriptor.buffer);
        } catch (extractError) {
          console.error('[FACE-RECOGNITION] Extract encoding error:', extractError);
          return res.status(400).json({
            success: false,
            message: `Failed to process image: ${extractError.message}`,
          });
        }
      } else {
        // Method 2: Use provided face_encoding (backward compatible)
        // Convert encoding to Buffer if it's a string
        if (typeof face_encoding === 'string') {
          // If it's a string, assume it's base64 or JSON
          if (face_encoding.startsWith('data:')) {
            // Base64 data URL
            const base64Data = face_encoding.replace(/^data:.*,/, '');
            encodingBuffer = Buffer.from(base64Data, 'base64');
          } else {
            // JSON string or plain string - store as UTF-8
            encodingBuffer = Buffer.from(face_encoding, 'utf-8');
          }
        } else if (Buffer.isBuffer(face_encoding)) {
          encodingBuffer = face_encoding;
        } else {
          // JSON object - stringify it
          encodingBuffer = Buffer.from(JSON.stringify(face_encoding), 'utf-8');
        }
      }

      // Update user's face encoding
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          face_encoding: encodingBuffer,
          face_photo_url: face_photo_url || undefined,
          updated_at: new Date(),
        },
        select: {
          id: true,
          face_photo_url: true,
        },
      });

      res.json({
        success: true,
        message: 'Face encoding enrolled successfully',
        data: {
          updated: true,
          hasFaceEncoding: true,
        },
      });
    } catch (error) {
      console.error('[FACE-RECOGNITION] Update face encoding error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update face encoding',
        error: error.message,
      });
    }
  }

  /**
   * Get face encoding status
   * GET /profile/face-encoding/status
   */
  async getFaceEncodingStatus(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          face_encoding: true,
          face_photo_url: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        data: {
          enrolled: !!user.face_encoding,
          hasFaceEncoding: !!user.face_encoding,
          hasFacePhoto: !!user.face_photo_url,
        },
      });
    } catch (error) {
      console.error('[FACE-RECOGNITION] Get face encoding status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get face encoding status',
        error: error.message,
      });
    }
  }

  /**
   * Delete face encoding
   * DELETE /profile/face-encoding
   */
  async deleteFaceEncoding(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Update user to remove face encoding
      await prisma.user.update({
        where: { id: userId },
        data: {
          face_encoding: null,
          face_photo_url: null, // Optionally remove photo URL too
          updated_at: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Face encoding deleted successfully',
        data: {
          deleted: true,
        },
      });
    } catch (error) {
      console.error('[FACE-RECOGNITION] Delete face encoding error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete face encoding',
        error: error.message,
      });
    }
  }
}

module.exports = { ProfileController };
