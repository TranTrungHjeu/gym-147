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
      console.log('[AUTH] AuthService: Attempting login...');
      const response = await identityApiService.post(
        '/auth/login',
        credentials
      );

      if (response.success && response.data) {
        console.log('[AUTH] AuthService response.data:', response.data);

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
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  }

  /**
   * Login user with face recognition
   * @param image - Base64 encoded image string
   */
  async loginWithFace(image: string): Promise<ApiResponse<AuthResponse>> {
    try {
      console.log('[AUTH] AuthService: Attempting face login...');
      const response = await identityApiService.post('/auth/login/face', {
        image,
      });

      if (response.success && response.data) {
        console.log('[AUTH] AuthService face login response.data:', response.data);

        // Store tokens securely
        await this.storeTokens(response.data);

        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        message: response.message || 'Face login failed',
      };
    } catch (error: any) {
      console.error('[AUTH] AuthService face login error:', error);
      return {
        success: false,
        message: error.message || 'Face login failed',
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
      console.log('[AUTH] AuthService: Attempting registration...');
      const response = await identityApiService.post(
        '/auth/register',
        credentials
      );

      if (response.success && response.data) {
        console.log('[AUTH] AuthService registration response:', response.data);

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
      console.error('[AUTH] AuthService registration error:', error);
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
      console.log('[AUTH] AuthService: Attempting logout...');

      // Get stored token
      const token = await this.getStoredToken();

      // Call logout endpoint if we have a token
      if (token) {
        try {
          await identityApiService.post(
            '/auth/logout',
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          console.log('[SUCCESS] Logout API call successful');
        } catch (apiError: any) {
          console.log('[WARN] Logout API call failed:', apiError.message);
          // Continue to clear tokens locally even if API fails
        }
      }

      // ALWAYS clear stored tokens (regardless of token existence or API response)
      await this.clearTokens();

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error: any) {
      console.error('[AUTH] AuthService logout error:', error);

      // ALWAYS clear tokens even if something fails
      try {
        await this.clearTokens();
      } catch (clearError) {
        console.error('[AUTH] Failed to clear tokens:', clearError);
      }

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
      console.log('[AUTH] AuthService: Getting current user...');

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
      console.error('[AUTH] AuthService getCurrentUser error:', error);
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
      console.log('[AUTH] AuthService: Updating profile...');

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
      console.error('[AUTH] AuthService updateProfile error:', error);
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
      console.log('[AUTH] AuthService: Changing password...');

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
      console.error('[AUTH] AuthService changePassword error:', error);
      return {
        success: false,
        message: error.message || 'Failed to change password',
      };
    }
  }

  /**
   * Enable 2FA
   */
  async enable2FA(): Promise<
    ApiResponse<{ secret: string; qrCodeUrl: string }>
  > {
    try {
      console.log('[AUTH] AuthService: Enabling 2FA...');

      const token = await this.getStoredToken();
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found',
        };
      }

      const response = await identityApiService.post(
        '/security/2fa/enable',
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
        message: response.message || 'Failed to enable 2FA',
      };
    } catch (error: any) {
      console.error('[AUTH] AuthService enable2FA error:', error);
      return {
        success: false,
        message: error.message || 'Failed to enable 2FA',
      };
    }
  }

  /**
   * Verify 2FA code
   */
  async verify2FA(token: string): Promise<ApiResponse<void>> {
    try {
      console.log('[AUTH] AuthService: Verifying 2FA...');

      const authToken = await this.getStoredToken();
      if (!authToken) {
        return {
          success: false,
          message: 'No authentication token found',
        };
      }

      const response = await identityApiService.post(
        '/security/2fa/verify',
        { token },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      return {
        success: response.success,
        message: response.message || '2FA verified successfully',
      };
    } catch (error: any) {
      console.error('[AUTH] AuthService verify2FA error:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify 2FA',
      };
    }
  }

  /**
   * Disable 2FA
   */
  async disable2FA(): Promise<ApiResponse<void>> {
    try {
      console.log('[AUTH] AuthService: Disabling 2FA...');

      const token = await this.getStoredToken();
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found',
        };
      }

      const response = await identityApiService.post(
        '/security/2fa/disable',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return {
        success: response.success,
        message: response.message || '2FA disabled successfully',
      };
    } catch (error: any) {
      console.error('[AUTH] AuthService disable2FA error:', error);
      return {
        success: false,
        message: error.message || 'Failed to disable 2FA',
      };
    }
  }

  /**
   * Get 2FA status
   */
  async get2FAStatus(): Promise<
    ApiResponse<{ enabled: boolean; secret?: string; qrCodeUrl?: string }>
  > {
    try {
      console.log('[AUTH] AuthService: Getting 2FA status...');

      const token = await this.getStoredToken();
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found',
        };
      }

      const response = await identityApiService.get(
        '/security/2fa/status',
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
        message: response.message || 'Failed to get 2FA status',
      };
    } catch (error: any) {
      console.error('[AUTH] AuthService get2FAStatus error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get 2FA status',
      };
    }
  }

  /**
   * Get active sessions/devices
   */
  async getActiveSessions(): Promise<
    ApiResponse<{
      devices: Array<{
        id: string;
        device_info: string | null;
        ip_address: string | null;
        location: string | null;
        user_agent: string | null;
        created_at: string;
        last_used_at: string;
        expires_at: string;
      }>;
    }>
  > {
    try {
      console.log('[AUTH] AuthService: Getting active sessions...');

      const token = await this.getStoredToken();
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found',
        };
      }

      const response = await identityApiService.get(
        '/devices',
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
        message: response.message || 'Failed to get active sessions',
      };
    } catch (error: any) {
      console.error('[AUTH] AuthService getActiveSessions error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get active sessions',
      };
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<ApiResponse<void>> {
    try {
      console.log('[AUTH] AuthService: Revoking session...', sessionId);

      const token = await this.getStoredToken();
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found',
        };
      }

      const response = await identityApiService.delete(
        `/devices/${sessionId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return {
        success: response.success,
        message: response.message || 'Session revoked successfully',
      };
    } catch (error: any) {
      console.error('[AUTH] AuthService revokeSession error:', error);
      return {
        success: false,
        message: error.message || 'Failed to revoke session',
      };
    }
  }

  /**
   * Revoke all sessions
   */
  async revokeAllSessions(): Promise<ApiResponse<void>> {
    try {
      console.log('[AUTH] AuthService: Revoking all sessions...');

      const token = await this.getStoredToken();
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found',
        };
      }

      const response = await identityApiService.post(
        '/devices/revoke-all-sessions',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return {
        success: response.success,
        message: response.message || 'All sessions revoked successfully',
      };
    } catch (error: any) {
      console.error('[AUTH] AuthService revokeAllSessions error:', error);
      return {
        success: false,
        message: error.message || 'Failed to revoke all sessions',
      };
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(data: ForgotPasswordData): Promise<ApiResponse<void>> {
    try {
      const response = await identityApiService.post(
        '/auth/forgot-password',
        data
      );

      return {
        success: response.success,
        message: response.message || 'Password reset email sent',
      };
    } catch (error: any) {
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
      const response = await identityApiService.post(
        '/auth/reset-password',
        data
      );

      return {
        success: response.success,
        message: response.message || 'Password reset successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to reset password',
      };
    }
  }

  /**
   * Google OAuth login (mobile)
   */
  async loginWithGoogle(idToken: string, deviceInfo?: string, platform?: string): Promise<ApiResponse<AuthResponse>> {
    try {
      console.log('[AUTH] AuthService: Attempting Google OAuth login...');
      const response = await identityApiService.post('/auth/oauth/google/mobile', {
        idToken,
        deviceInfo: deviceInfo || 'Mobile App',
        platform: platform || 'MOBILE_IOS',
      });

      if (response.success && response.data) {
        // Store tokens securely
        await this.storeTokens({
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          user: response.data.user,
        });

        return {
          success: true,
          data: {
            token: response.data.token,
            refreshToken: response.data.refreshToken,
            user: response.data.user,
            isNewUser: response.data.isNewUser || false,
          },
        };
      }

      return {
        success: false,
        message: response.message || 'Google login failed',
      };
    } catch (error: any) {
      console.error('[AUTH] AuthService Google OAuth error:', error);
      return {
        success: false,
        message: error.message || 'Google login failed',
      };
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    try {
      console.log('[AUTH] AuthService: Verifying email...');

      const response = await identityApiService.post('/auth/verify-email', {
        token,
      });

      return {
        success: response.success,
        message: response.message || 'Email verified successfully',
      };
    } catch (error: any) {
      console.error('[AUTH] AuthService verifyEmail error:', error);
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
      console.log('[AUTH] AuthService: Resending verification email...');

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
      console.error('[AUTH] AuthService resendVerification error:', error);
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
      console.log('[AUTH] AuthService: Refreshing token...');

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
      console.error('[AUTH] AuthService refreshToken error:', error);
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
      console.error('[AUTH] AuthService isAuthenticated error:', error);
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
      console.error('[AUTH] AuthService getStoredToken error:', error);
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
      console.error('[AUTH] AuthService getStoredRefreshToken error:', error);
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
      console.log('[AUTH] Tokens stored successfully');
    } catch (error) {
      console.error('[AUTH] AuthService storeTokens error:', error);
      throw error;
    }
  }

  /**
   * Clear stored tokens
   */
  private async clearTokens(): Promise<void> {
    try {
      const { clearAuthData } = await import('@/utils/auth/storage');
      await clearAuthData();
      console.log('[SUCCESS] Tokens cleared successfully');
    } catch (error) {
      console.error('[AUTH] AuthService clearTokens error:', error);
    }
  }
}

export const authService = new AuthService();
export default authService;
