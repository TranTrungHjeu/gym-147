import {
  AuthResponse,
  ForgotPasswordData,
  LoginCredentials,
  RegisterCredentials,
  ResetPasswordData,
  User,
} from '@/types/authTypes';
import { ApiResponse, identityApiService } from './api.service';

class AuthService {
  /**
   * Login user with email/phone and password
   */
  async login(
    credentials: LoginCredentials
  ): Promise<ApiResponse<AuthResponse>> {
    try {
      console.log('🔐 AuthService: Attempting login...');
      const response = await identityApiService.post(
        '/auth/login',
        credentials
      );

      if (response.success && response.data) {
        console.log('🔐 AuthService response.data:', response.data);

        // Store tokens securely
        await this.storeTokens(response.data);

        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        message: response.message || 'Login failed',
      };
    } catch (error: any) {
      console.error('🔐 AuthService login error:', error);
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  }

  /**
   * Register new user
   */
  async register(
    credentials: RegisterCredentials
  ): Promise<ApiResponse<AuthResponse>> {
    try {
      console.log('🔐 AuthService: Attempting registration...');
      const response = await identityApiService.post(
        '/auth/register',
        credentials
      );

      if (response.success && response.data) {
        console.log('🔐 AuthService registration response:', response.data);

        // Store tokens securely
        await this.storeTokens(response.data);

        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        message: response.message || 'Registration failed',
      };
    } catch (error: any) {
      console.error('🔐 AuthService registration error:', error);
      return {
        success: false,
        message: error.message || 'Registration failed',
      };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse<void>> {
    try {
      console.log('🔐 AuthService: Attempting logout...');

      // Get stored token
      const token = await this.getStoredToken();
      if (!token) {
        return {
          success: true,
          message: 'Already logged out',
        };
      }

      // Call logout endpoint
      const response = await identityApiService.post(
        '/auth/logout',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Clear stored tokens regardless of API response
      await this.clearTokens();

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error: any) {
      console.error('🔐 AuthService logout error:', error);

      // Clear tokens even if API call fails
      await this.clearTokens();

      return {
        success: true,
        message: 'Logged out locally',
      };
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      console.log('🔐 AuthService: Getting current user...');

      const token = await this.getStoredToken();
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found',
        };
      }

      const response = await identityApiService.get(
        '/profile/me',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        message: response.message || 'Failed to get user profile',
      };
    } catch (error: any) {
      console.error('🔐 AuthService getCurrentUser error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get user profile',
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      console.log('🔐 AuthService: Updating profile...');

      const token = await this.getStoredToken();
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found',
        };
      }

      const response = await identityApiService.put(
        '/profile/me',
        profileData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        message: response.message || 'Failed to update profile',
      };
    } catch (error: any) {
      console.error('🔐 AuthService updateProfile error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update profile',
      };
    }
  }

  /**
   * Change password
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse<void>> {
    try {
      console.log('🔐 AuthService: Changing password...');

      const token = await this.getStoredToken();
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found',
        };
      }

      const response = await identityApiService.put(
        '/security/change-password',
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return {
        success: response.success,
        message: response.message || 'Password changed successfully',
      };
    } catch (error: any) {
      console.error('🔐 AuthService changePassword error:', error);
      return {
        success: false,
        message: error.message || 'Failed to change password',
      };
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(data: ForgotPasswordData): Promise<ApiResponse<void>> {
    try {
      console.log('🔐 AuthService: Sending forgot password request...');

      const response = await identityApiService.post(
        '/auth/forgot-password',
        data
      );

      return {
        success: response.success,
        message: response.message || 'Password reset email sent',
      };
    } catch (error: any) {
      console.error('🔐 AuthService forgotPassword error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send password reset email',
      };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(data: ResetPasswordData): Promise<ApiResponse<void>> {
    try {
      console.log('🔐 AuthService: Resetting password...');

      const response = await identityApiService.post(
        '/auth/reset-password',
        data
      );

      return {
        success: response.success,
        message: response.message || 'Password reset successfully',
      };
    } catch (error: any) {
      console.error('🔐 AuthService resetPassword error:', error);
      return {
        success: false,
        message: error.message || 'Failed to reset password',
      };
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    try {
      console.log('🔐 AuthService: Verifying email...');

      const response = await identityApiService.post('/auth/verify-email', {
        token,
      });

      return {
        success: response.success,
        message: response.message || 'Email verified successfully',
      };
    } catch (error: any) {
      console.error('🔐 AuthService verifyEmail error:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify email',
      };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(): Promise<ApiResponse<void>> {
    try {
      console.log('🔐 AuthService: Resending verification email...');

      const token = await this.getStoredToken();
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found',
        };
      }

      const response = await identityApiService.post(
        '/auth/resend-verification',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return {
        success: response.success,
        message: response.message || 'Verification email sent',
      };
    } catch (error: any) {
      console.error('🔐 AuthService resendVerification error:', error);
      return {
        success: false,
        message: error.message || 'Failed to resend verification email',
      };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<ApiResponse<AuthResponse>> {
    try {
      console.log('🔐 AuthService: Refreshing token...');

      const refreshToken = await this.getStoredRefreshToken();
      if (!refreshToken) {
        return {
          success: false,
          message: 'No refresh token found',
        };
      }

      const response = await identityApiService.post('/auth/refresh-token', {
        refresh_token: refreshToken,
      });

      if (response.success && response.data) {
        // Store new tokens
        await this.storeTokens(response.data);

        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        message: response.message || 'Failed to refresh token',
      };
    } catch (error: any) {
      console.error('🔐 AuthService refreshToken error:', error);
      return {
        success: false,
        message: error.message || 'Failed to refresh token',
      };
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getStoredToken();
      if (!token) {
        return false;
      }

      // Check if token is expired
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;

      if (payload.exp < now) {
        // Token expired, try to refresh
        const refreshResult = await this.refreshToken();
        return refreshResult.success;
      }

      return true;
    } catch (error) {
      console.error('🔐 AuthService isAuthenticated error:', error);
      return false;
    }
  }

  /**
   * Get stored access token
   */
  async getStoredToken(): Promise<string | null> {
    try {
      const { getToken } = await import('@/utils/auth/storage');
      return await getToken();
    } catch (error) {
      console.error('🔐 AuthService getStoredToken error:', error);
      return null;
    }
  }

  /**
   * Get stored refresh token
   */
  async getStoredRefreshToken(): Promise<string | null> {
    try {
      const { getRefreshToken } = await import('@/utils/auth/storage');
      return await getRefreshToken();
    } catch (error) {
      console.error('🔐 AuthService getStoredRefreshToken error:', error);
      return null;
    }
  }

  /**
   * Store authentication tokens
   */
  private async storeTokens(authData: AuthResponse): Promise<void> {
    try {
      const { storeTokens } = await import('@/utils/auth/storage');
      await storeTokens(authData.accessToken, authData.refreshToken);
      console.log('🔐 Tokens stored successfully');
    } catch (error) {
      console.error('🔐 AuthService storeTokens error:', error);
      throw error;
    }
  }

  /**
   * Clear stored tokens
   */
  private async clearTokens(): Promise<void> {
    try {
      const { clearTokens } = await import('@/utils/auth/storage');
      await clearTokens();
    } catch (error) {
      console.error('🔐 AuthService clearTokens error:', error);
    }
  }
}

export const authService = new AuthService();
export default authService;
