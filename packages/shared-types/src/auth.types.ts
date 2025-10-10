import { BaseEntity, EntityStatus } from './common.types';

// User & Authentication Types
export interface User extends BaseEntity {
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: UserRole;
  status: EntityStatus;
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
}

export type UserRole = 'admin' | 'staff' | 'trainer' | 'member';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  confirmPassword: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: UserRole;
  permissions?: string[];
}

// JWT Payload
export interface JWTPayload {
  sub: string; // user ID
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}
