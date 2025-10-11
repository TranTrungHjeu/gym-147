const API_BASE_URL = 'http://localhost:3001';

export interface AuthResponse {
  success: boolean;
  message: string;
  data: any;
}

export interface LoginRequest {
  email: string;
  password: string;
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

class AuthService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('API Error:', errorData);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
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
  async logout(token: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

export const authService = new AuthService();
