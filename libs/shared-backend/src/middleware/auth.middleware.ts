import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../types/common.types.js';

// Mock JWT implementation for now - in real project, install jsonwebtoken
const mockJwt = {
  verify: (token: string, secret: string): JwtPayload => {
    // Simple mock verification - DO NOT use in production!
    if (token.startsWith('mock-jwt-token-')) {
      return {
        userId: '1',
        email: 'user@example.com',
        role: 'member'
      };
    }
    throw new Error('Invalid token');
  },
  JsonWebTokenError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JsonWebTokenError';
    }
  },
  TokenExpiredError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'TokenExpiredError';
    }
  }
};

interface AuthRequest extends Request {
  user?: JwtPayload;
}

export class AuthMiddleware {
  private jwtSecret: string;

  constructor(jwtSecret: string = process.env.JWT_SECRET || 'your-secret-key') {
    this.jwtSecret = jwtSecret;
  }

  // Middleware xác thực JWT token
  authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'Access token required',
          data: null
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      const decoded = mockJwt.verify(token, this.jwtSecret) as JwtPayload;
      req.user = decoded;
      
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      
      if (error instanceof mockJwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          message: 'Invalid token',
          data: null
        });
      } else if (error instanceof mockJwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: 'Token expired',
          data: null
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Authentication failed',
          data: null
        });
      }
    }
  };

  // Middleware kiểm tra quyền truy cập theo role
  authorize = (allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          res.status(401).json({
            success: false,
            message: 'Authentication required',
            data: null
          });
          return;
        }

        if (!allowedRoles.includes(req.user.role)) {
          res.status(403).json({
            success: false,
            message: 'Insufficient permissions',
            data: null
          });
          return;
        }

        next();
      } catch (error) {
        console.error('Authorization error:', error);
        res.status(500).json({
          success: false,
          message: 'Authorization failed',
          data: null
        });
      }
    };
  };

  // Middleware tùy chọn - không bắt buộc đăng nhập
  optionalAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = mockJwt.verify(token, this.jwtSecret) as JwtPayload;
        req.user = decoded;
      }
      
      next();
    } catch (error) {
      // Không throw error, chỉ log và tiếp tục
      console.warn('Optional auth failed:', error);
      next();
    }
  };
}