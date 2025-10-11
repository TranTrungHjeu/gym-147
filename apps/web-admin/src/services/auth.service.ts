const API_BASE_URL = 'http://localhost:3001';

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
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    // Get token from localStorage
    const token = localStorage.getItem('accessToken');

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('API Error:', errorData);
      const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
      (error as any).response = { status: response.status, data: errorData };
      throw error;
    }

    return response.json();
  }

  // Login
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // Send OTP for registration
  async sendOTP(data: SendOTPRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Verify OTP
  async verifyOTP(data: VerifyOTPRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Register member
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get profile (requires authentication)
  async getProfile(token: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Logout (requires authentication)
  async logout(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/logout', {
      method: 'POST',
    });
  }

  // Forgot password
  async forgotPassword(data: ForgotPasswordRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Reset password
  async resetPassword(data: ResetPasswordRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Validate reset token
  async validateResetToken(token: string): Promise<AuthResponse> {
    return this.request<AuthResponse>(`/auth/validate-reset-token/${token}`, {
      method: 'GET',
    });
  }

  // Verify 2FA for login
  async verify2FALogin(userId: string, twoFactorToken: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/verify-2fa-login', {
      method: 'POST',
      body: JSON.stringify({ userId, twoFactorToken }),
    });
  }

  // Refresh token
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  // Register admin/trainer (for SUPER_ADMIN and ADMIN)
  async registerAdmin(data: RegisterAdminRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register-admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const authService = new AuthService();
