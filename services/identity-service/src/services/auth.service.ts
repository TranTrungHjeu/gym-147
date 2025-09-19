import { AuthResponse, RegisterRequest, UserProfile } from '../types/auth.types.js';

export class AuthService {
  private users: UserProfile[] = [
    {
      id: '1',
      email: 'admin@gym.com',
      firstName: 'Admin',
      lastName: 'User',
      phone: '+84123456789',
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      email: 'member@gym.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+84987654321',
      role: 'member',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  async login(email: string, password: string): Promise<AuthResponse | null> {
    try {
      // Simple mock authentication - in real app, hash and compare passwords
      const user = this.users.find(u => u.email === email && u.isActive);
      
      if (!user) {
        return null;
      }

      // Mock password validation (in real app, use bcrypt)
      if (password !== 'password123') {
        return null;
      }

      // Generate mock JWT token (in real app, use jsonwebtoken)
      const token = `mock-jwt-token-${user.id}-${Date.now()}`;

      return {
        token,
        user
      };
    } catch (error) {
      console.error('AuthService.login error:', error);
      throw error;
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse | null> {
    try {
      // Check if user already exists
      const existingUser = this.users.find(u => u.email === userData.email);
      if (existingUser) {
        return null;
      }

      // Create new user
      const newUser: UserProfile = {
        id: (this.users.length + 1).toString(),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: userData.role || 'member',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.users.push(newUser);

      // Generate mock JWT token
      const token = `mock-jwt-token-${newUser.id}-${Date.now()}`;

      return {
        token,
        user: newUser
      };
    } catch (error) {
      console.error('AuthService.register error:', error);
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const user = this.users.find(u => u.id === userId && u.isActive);
      return user || null;
    } catch (error) {
      console.error('AuthService.getUserProfile error:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const userIndex = this.users.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        return null;
      }

      this.users[userIndex] = {
        ...this.users[userIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      return this.users[userIndex];
    } catch (error) {
      console.error('AuthService.updateUserProfile error:', error);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const user = this.users.find(u => u.id === userId);
      if (!user) {
        return false;
      }

      // Mock password validation (in real app, use bcrypt)
      if (currentPassword !== 'password123') {
        return false;
      }

      // In real app, hash the new password and store it
      console.log(`Password changed for user ${userId}`);
      return true;
    } catch (error) {
      console.error('AuthService.changePassword error:', error);
      throw error;
    }
  }
}