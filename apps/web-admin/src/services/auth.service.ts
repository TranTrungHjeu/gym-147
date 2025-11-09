import type { AxiosResponse } from 'axios';
import { identityApi } from './api';

export interface AuthResponse {
  success: boolean;
  message: string;
  data: any;
}

export interface LoginRequest {
  identifier: string; // Can be email or phone
  password: string;
  twoFactorToken?: string; // Optional 2FA token
}

export interface SendOTPRequest {
  identifier: string;
  type: 'PHONE' | 'EMAIL';
}

export interface VerifyOTPRequest {
  identifier: string;
  otp: string;
  type: 'PHONE' | 'EMAIL';
}

export interface RegisterRequest {
  email?: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  otp?: string;
  otpType?: 'PHONE' | 'EMAIL';
  primaryMethod?: 'EMAIL' | 'PHONE';
  age?: number;
  referralCode?: string;
  couponCode?: string;
}

export interface ForgotPasswordRequest {
  email?: string;
  phone?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ValidateResetTokenRequest {
  token: string;
}

export interface RegisterAdminRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'ADMIN' | 'TRAINER';
}

class AuthService {
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    data?: any,
    customHeaders?: Record<string, string>
  ): Promise<T> {
    try {
      let response: AxiosResponse<T>;

      const config = customHeaders ? { headers: customHeaders } : {};

      switch (method) {
        case 'POST':
          response = await identityApi.post<T>(endpoint, data, config);
          break;
        default:
          response = await identityApi.get<T>(endpoint, config);
      }

      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data || { message: error.message || 'Unknown error' };
      console.error('API Error:', errorData);
      const errorMessage = errorData.message || `HTTP error! status: ${error.response?.status}`;
      const apiError = new Error(errorMessage);
      (apiError as any).response = {
        status: error.response?.status,
        data: errorData,
      };
      throw apiError;
    }
  }

  // Login
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', 'POST', credentials);
  }

  // Send OTP for registration
  async sendOTP(data: SendOTPRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/send-otp', 'POST', data);
  }

  // Verify OTP
  async verifyOTP(data: VerifyOTPRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/verify-otp', 'POST', data);
  }

  // Register member
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', 'POST', data);
  }

  // Get profile (requires authentication)
  async getProfile(token: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/profile', 'GET', undefined, {
      Authorization: `Bearer ${token}`,
    });
  }

  // Logout (requires authentication)
  async logout(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/logout', 'POST');
  }

  // Forgot password
  async forgotPassword(data: ForgotPasswordRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/forgot-password', 'POST', data);
  }

  // Reset password
  async resetPassword(data: ResetPasswordRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/reset-password', 'POST', data);
  }

  // Validate reset token
  async validateResetToken(token: string): Promise<AuthResponse> {
    return this.request<AuthResponse>(`/auth/validate-reset-token/${token}`, 'GET');
  }

  // Verify 2FA for login
  async verify2FALogin(userId: string, twoFactorToken: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/verify-2fa-login', 'POST', {
      userId,
      twoFactorToken,
    });
  }

  // Refresh token
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/refresh-token', 'POST', { refreshToken });
  }

  // Register admin/trainer (for SUPER_ADMIN and ADMIN)
  async registerAdmin(data: RegisterAdminRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register-admin', 'POST', data);
  }
}

export const authService = new AuthService();
