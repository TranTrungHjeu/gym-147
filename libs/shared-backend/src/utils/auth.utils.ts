import { JwtConfig, JwtPayload } from '../types/common.types.js';

// Mock implementations for bcrypt and jwt - in real project, install these packages
const mockBcrypt = {
  hash: async (password: string, saltRounds: number): Promise<string> => {
    // Simple mock hash - DO NOT use in production!
    return `hashed_${password}_${saltRounds}`;
  },
  compare: async (password: string, hash: string): Promise<boolean> => {
    // Simple mock compare - DO NOT use in production!
    return hash.includes(password);
  }
};

const mockJwt = {
  sign: (payload: any, secret: string, options?: any): string => {
    // Simple mock token generation - DO NOT use in production!
    const tokenData = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (options?.expiresIn === '7d' ? 7 * 24 * 60 * 60 : 60 * 60)
    };
    return `mock-jwt-token-${Buffer.from(JSON.stringify(tokenData)).toString('base64')}`;
  },
  verify: (token: string, secret: string): any => {
    // Simple mock verification - DO NOT use in production!
    if (token.startsWith('mock-jwt-token-')) {
      const data = token.replace('mock-jwt-token-', '');
      return JSON.parse(Buffer.from(data, 'base64').toString());
    }
    throw new Error('Invalid token');
  }
};

export class AuthUtils {
  // Hash password using bcrypt
  static async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = 12;
      const hashedPassword = await mockBcrypt.hash(password, saltRounds);
      return hashedPassword;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Password hashing failed');
    }
  }

  // Compare password with hash
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const isMatch = await mockBcrypt.compare(password, hashedPassword);
      return isMatch;
    } catch (error) {
      console.error('Error comparing password:', error);
      throw new Error('Password comparison failed');
    }
  }

  // Generate JWT token
  static generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>, config: JwtConfig): string {
    try {
      const token = mockJwt.sign(
        payload,
        config.secret,
        { 
          expiresIn: config.expiresIn,
          issuer: 'gym-management-system'
        }
      );
      return token;
    } catch (error) {
      console.error('Error generating token:', error);
      throw new Error('Token generation failed');
    }
  }

  // Generate refresh token
  static generateRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>, config: JwtConfig): string {
    try {
      if (!config.refreshSecret || !config.refreshExpiresIn) {
        throw new Error('Refresh token configuration missing');
      }

      const refreshToken = mockJwt.sign(
        payload,
        config.refreshSecret,
        { 
          expiresIn: config.refreshExpiresIn,
          issuer: 'gym-management-system'
        }
      );
      return refreshToken;
    } catch (error) {
      console.error('Error generating refresh token:', error);
      throw new Error('Refresh token generation failed');
    }
  }

  // Verify JWT token
  static verifyToken(token: string, secret: string): JwtPayload {
    try {
      const decoded = mockJwt.verify(token, secret) as JwtPayload;
      return decoded;
    } catch (error) {
      console.error('Error verifying token:', error);
      throw new Error('Token verification failed');
    }
  }

  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  // Generate random string (for session IDs, etc.)
  static generateRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}