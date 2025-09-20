const { authService } = require('../services/auth.prisma.service.js');

class AuthController {
  // POST /auth/login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
          data: null
        });
      }

      const result = await authService.login(email, password);

      if (!result) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          data: null
        });
      }

      res.json({
        success: true,
        data: result,
        message: 'Login successful'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to login',
        data: null
      });
    }
  }

  // POST /auth/register
  async register(req, res) {
    try {
      const userData = req.body;

      if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, firstName, and lastName are required',
          data: null
        });
      }

      const result = await authService.register(userData);

      res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to register user',
        data: null
      });
    }
  }

  // GET /auth/profile
  async getProfile(req, res) {
    try {
      const { userId } = req.user; // From auth middleware
      const user = await authService.getUserProfile(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null
        });
      }

      res.json({
        success: true,
        data: user,
        message: 'Profile retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve profile',
        data: null
      });
    }
  }

  // PUT /auth/profile
  async updateProfile(req, res) {
    try {
      const { userId } = req.user; // From auth middleware
      const updates = req.body;

      const user = await authService.updateUserProfile(userId, updates);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null
        });
      }

      res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update profile',
        data: null
      });
    }
  }

  // POST /auth/change-password
  async changePassword(req, res) {
    try {
      const { userId } = req.user; // From auth middleware
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required',
          data: null
        });
      }

      const success = await authService.changePassword(userId, currentPassword, newPassword);

      if (!success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid current password',
          data: null
        });
      }

      res.json({
        success: true,
        data: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to change password',
        data: null
      });
    }
  }

  // POST /auth/verify-token
  async verifyToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token is required',
          data: null
        });
      }

      const user = await authService.verifyToken(token);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
          data: null
        });
      }

      res.json({
        success: true,
        data: user,
        message: 'Token verified successfully'
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message || 'Failed to verify token',
        data: null
      });
    }
  }

  // GET /auth/users (admin only)
  async getAllUsers(req, res) {
    try {
      const { search, role, isActive } = req.query;
      
      const filters = {
        search,
        role,
        isActive: isActive !== undefined ? isActive === 'true' : undefined
      };

      const users = await authService.getAllUsers(filters);

      res.json({
        success: true,
        data: users,
        message: 'Users retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve users',
        data: null
      });
    }
  }
}

module.exports = { AuthController };