import {
  AuthResponse,
  ForgotPasswordData,
  LoginCredentials,
  RegisterCredentials,
  ResetPasswordData,
  User,
} from '@/types/authTypes';
import { ApiResponse, apiService } from './api';

export class AuthService {
  private readonly basePath = '/auth';

  /**
   * User login
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const endpoint = `${this.basePath}/login`;
      console.log('🔐 AuthService endpoint:', endpoint);
      console.log('🔐 AuthService credentials:', {
        identifier: credentials.identifier,
      });

      const response = await apiService.post<any>(endpoint, credentials);

      console.log('🔐 AuthService response:', response);
      console.log('🔐 AuthService response.data:', response.data);

      // Get basic user info from Identity Service
      const identityUser = response.data?.user;
      const token = response.data?.accessToken;

      // Fetch detailed member profile from Member Service
      let memberProfile = null;
      if (identityUser && token) {
        try {
          console.log('🔍 Fetching member profile...');
          const memberResponse = await apiService.get(`/members/profile`);
          memberProfile = memberResponse.data;
          console.log('✅ Member profile fetched:', memberProfile);
        } catch (memberError: any) {
          console.log(
            '⚠️ Could not fetch member profile:',
            memberError.message
          );
          // Continue with login even if member profile fetch fails
        }
      }

      // Combine user data from both services
      const combinedUser = {
        ...(identityUser || {}),
        ...(memberProfile || {}),
        // Ensure we have the essential fields
        id: identityUser?.id,
        email: identityUser?.email,
        phone: identityUser?.phone,
        firstName: identityUser?.firstName,
        lastName: identityUser?.lastName,
        role: identityUser?.role,
        // Computed fields
        name: `${identityUser?.firstName || ''} ${
          identityUser?.lastName || ''
        }`.trim(),
        fullName: `${identityUser?.firstName || ''} ${
          identityUser?.lastName || ''
        }`.trim(),
      };

      return {
        success: true,
        user: combinedUser,
        token: token,
        message: response.message || 'Login successful',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Login failed',
        errors: error.errors,
      };
    }
  }

  /**
   * User registration
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await apiService.post<any>(
        `${this.basePath}/register`,
        credentials
      );

      return {
        success: true,
        user: response.data?.user,
        token: response.data?.accessToken, // Backend returns accessToken
        message: response.message || 'Registration successful',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Registration failed',
        errors: error.errors,
      };
    }
  }

  /**
   * User logout
   */
  async logout(): Promise<ApiResponse> {
    try {
      const response = await apiService.post(`${this.basePath}/logout`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Logout failed',
      };
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(data: ForgotPasswordData): Promise<ApiResponse> {
    try {
      const response = await apiService.post(
        `${this.basePath}/forgot-password`,
        data
      );

      return {
        success: true,
        message: response.message || 'Password reset email sent',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to send reset email',
        errors: error.errors,
      };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(data: ResetPasswordData): Promise<ApiResponse> {
    try {
      const response = await apiService.post(
        `${this.basePath}/reset-password`,
        data
      );

      return {
        success: true,
        message: response.message || 'Password reset successful',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Password reset failed',
        errors: error.errors,
      };
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<ApiResponse> {
    try {
      const response = await apiService.post(`${this.basePath}/verify-email`, {
        token,
      });

      return {
        success: true,
        message: response.message || 'Email verified successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Email verification failed',
        errors: error.errors,
      };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<ApiResponse> {
    try {
      const response = await apiService.post(
        `${this.basePath}/resend-verification`,
        { email }
      );

      return {
        success: true,
        message: response.message || 'Verification email sent',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to send verification email',
        errors: error.errors,
      };
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>(
        `${this.basePath}/refresh-token`
      );

      return {
        success: true,
        token: response.data?.token,
        message: response.message || 'Token refreshed',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Token refresh failed',
      };
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const response = await apiService.get<User>(`/profile/me`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get user profile',
        errors: error.errors,
      };
    }
  }

  /**
   * Google OAuth login
   */
  async googleLogin(accessToken: string): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>(
        `${this.basePath}/google`,
        { accessToken }
      );

      return {
        success: true,
        user: response.data?.user,
        token: response.data?.token,
        message: response.message || 'Google login successful',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Google login failed',
        errors: error.errors,
      };
    }
  }

  /**
   * Facebook OAuth login
   */
  async facebookLogin(accessToken: string): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>(
        `${this.basePath}/facebook`,
        { accessToken }
      );

      return {
        success: true,
        user: response.data?.user,
        token: response.data?.token,
        message: response.message || 'Facebook login successful',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Facebook login failed',
        errors: error.errors,
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
