import { identityApi } from './api';

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'ADMIN' | 'MEMBER' | 'TRAINER';
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export class IdentityService {
  // Register new user
  static async register(data: CreateUserRequest): Promise<AuthResponse> {
    const response = await identityApi.post('/auth/register', data);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to register user');
  }

  // Login user
  static async login(email: string, password: string): Promise<AuthResponse> {
    const response = await identityApi.post('/auth/login', { email, password });
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to login');
  }

  // Get user profile
  static async getProfile(token: string): Promise<User> {
    const response = await identityApi.get('/auth/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get profile');
  }

  // Create user for member (internal use)
  static async createUserForMember(memberData: {
    email: string;
    full_name: string;
    phone?: string;
  }): Promise<User> {
    // Generate a temporary password
    const tempPassword = `Temp${Date.now()}!`;

    // Split full name into first and last name
    const nameParts = memberData.full_name.trim().split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';

    const userData: CreateUserRequest = {
      email: memberData.email,
      password: tempPassword,
      firstName,
      lastName,
      phone: memberData.phone,
      role: 'MEMBER',
    };

    const response = await this.register(userData);
    return response.user;
  }

  // Check service health
  static async health() {
    const response = await identityApi.get('/health');
    return response.data;
  }
}
