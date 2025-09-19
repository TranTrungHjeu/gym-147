import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { ApiResponse } from '../types/api.types.js';
import { LoginRequest, RegisterRequest, UserProfile } from '../types/auth.types.js';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async login(req: Request<{}, ApiResponse<{ token: string; user: UserProfile }>, LoginRequest>, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
          data: null
        });
      }

      const result = await this.authService.login(email, password);
      
      if (!result) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          data: null
        });
      }

      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async register(req: Request<{}, ApiResponse<{ token: string; user: UserProfile }>, RegisterRequest>, res: Response) {
    try {
      const { email, password, firstName, lastName, phone } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, first name and last name are required',
          data: null
        });
      }

      const result = await this.authService.register({
        email,
        password,
        firstName,
        lastName,
        phone
      });

      if (!result) {
        return res.status(409).json({
          success: false,
          message: 'User already exists',
          data: null
        });
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async getProfile(req: Request<{}, ApiResponse<UserProfile>>, res: Response) {
    try {
      // Assuming user ID is attached to request by auth middleware
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
          data: null
        });
      }

      const user = await this.authService.getUserProfile(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          data: null
        });
      }

      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: user
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      // In a real implementation, you might want to blacklist the token
      // For now, we'll just return a success response
      res.json({
        success: true,
        message: 'Logout successful',
        data: null
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
}