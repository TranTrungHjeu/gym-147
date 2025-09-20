const { prisma } = require('../lib/prisma.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class AuthService {
  // Login user
  async login(email, password) {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          role: true,
          permissions: {
            include: {
              permission: true
            }
          }
        }
      });

      if (!user || !user.is_active) {
        return null;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return null;
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { last_login_at: new Date() }
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role.name 
        },
        process.env.JWT_SECRET || 'gym-secret-key',
        { expiresIn: '24h' }
      );

      return {
        token,
        user: this.mapPrismaToUser(user)
      };
    } catch (error) {
      console.error('AuthService.login error:', error);
      throw error;
    }
  }

  // Register new user
  async register(userData) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // Get default role (member)
      let defaultRole = await prisma.role.findUnique({
        where: { name: userData.role || 'member' }
      });

      if (!defaultRole) {
        // Create member role if doesn't exist
        defaultRole = await prisma.role.create({
          data: {
            name: 'member',
            description: 'Regular gym member'
          }
        });
      }

      // Create user
      const newUser = await prisma.user.create({
        data: {
          email: userData.email,
          password_hash: passwordHash,
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone,
          role_id: defaultRole.id,
          is_active: true,
          email_verified: false,
        },
        include: {
          role: true,
          permissions: {
            include: {
              permission: true
            }
          }
        }
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: newUser.id, 
          email: newUser.email, 
          role: newUser.role.name 
        },
        process.env.JWT_SECRET || 'gym-secret-key',
        { expiresIn: '24h' }
      );

      return {
        token,
        user: this.mapPrismaToUser(newUser)
      };
    } catch (error) {
      console.error('AuthService.register error:', error);
      throw error;
    }
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
          permissions: {
            include: {
              permission: true
            }
          },
          face_encodings: true,
          access_logs: {
            take: 10,
            orderBy: { accessed_at: 'desc' }
          }
        }
      });

      return user ? this.mapPrismaToUser(user) : null;
    } catch (error) {
      console.error('AuthService.getUserProfile error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(userId, updates) {
    try {
      const updateData = {};
      
      if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
      if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      
      updateData.updated_at = new Date();

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          role: true,
          permissions: {
            include: {
              permission: true
            }
          }
        }
      });

      return this.mapPrismaToUser(user);
    } catch (error) {
      console.error('AuthService.updateUserProfile error:', error);
      if (error.code === 'P2025') {
        return null; // User not found
      }
      throw error;
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user with current password
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return false;
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return false;
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { 
          password_hash: newPasswordHash,
          updated_at: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('AuthService.changePassword error:', error);
      throw error;
    }
  }

  // Verify JWT token
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gym-secret-key');
      const user = await this.getUserProfile(decoded.userId);
      return user;
    } catch (error) {
      console.error('AuthService.verifyToken error:', error);
      return null;
    }
  }

  // Get all users (admin only)
  async getAllUsers(filters = {}) {
    try {
      const where = {};
      
      if (filters.search) {
        where.OR = [
          { email: { contains: filters.search, mode: 'insensitive' } },
          { first_name: { contains: filters.search, mode: 'insensitive' } },
          { last_name: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      if (filters.role) {
        where.role = { name: filters.role };
      }

      if (filters.isActive !== undefined) {
        where.is_active = filters.isActive;
      }

      const users = await prisma.user.findMany({
        where,
        include: {
          role: true,
          permissions: {
            include: {
              permission: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      return users.map(this.mapPrismaToUser);
    } catch (error) {
      console.error('AuthService.getAllUsers error:', error);
      throw error;
    }
  }

  // Helper method to map Prisma result to User
  mapPrismaToUser(prismaResult) {
    return {
      id: prismaResult.id,
      email: prismaResult.email,
      firstName: prismaResult.first_name,
      lastName: prismaResult.last_name,
      phone: prismaResult.phone,
      role: prismaResult.role?.name || 'member',
      isActive: prismaResult.is_active,
      emailVerified: prismaResult.email_verified,
      lastLoginAt: prismaResult.last_login_at,
      createdAt: prismaResult.created_at,
      updatedAt: prismaResult.updated_at,
      // Include additional data if available
      permissions: prismaResult.permissions?.map(p => p.permission.name) || [],
      faceEncodings: prismaResult.face_encodings || [],
      recentAccessLogs: prismaResult.access_logs || []
    };
  }
}

// Export singleton instance
const authService = new AuthService();
module.exports = { authService, AuthService };