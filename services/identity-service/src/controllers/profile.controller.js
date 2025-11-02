const bcrypt = require('bcrypt');
const { prisma } = require('../lib/prisma.js');

class ProfileController {
  constructor() {
    // Validation helper methods
    this.validatePassword = this.validatePassword.bind(this);
    this.validatePhone = this.validatePhone.bind(this);
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
      console.log('🔑 Identity Service - req.user:', req.user);
      const userId = req.user.userId || req.user.id;
      console.log('🔑 Identity Service - userId:', userId);

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
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { firstName, lastName, phone } = req.body;

      const updateData = {};

      // Add firstName and lastName if provided
      if (firstName !== undefined) {
        updateData.first_name = firstName.trim();
      }
      if (lastName !== undefined) {
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
      const userId = req.user.id;
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
      const userId = req.user.id;

      // TODO: Implement file upload logic
      // This would typically involve:
      // 1. Validate file type and size
      // 2. Upload to cloud storage (AWS S3, Cloudinary, etc.)
      // 3. Update user.face_photo_url in database

      res.json({
        success: true,
        message: 'Avatar upload functionality will be implemented',
        data: null,
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
}

module.exports = { ProfileController };
