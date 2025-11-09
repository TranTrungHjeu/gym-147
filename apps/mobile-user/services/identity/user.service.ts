import { SERVICE_URLS } from '@/config/environment';
import { User } from '@/types/authTypes';
import { ApiResponse, identityApiService } from './api.service';

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  profileImage?: string;
  height?: number;
  weight?: number;
  dateOfBirth?: string;
  phone?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  preferences?: {
    notifications: boolean;
    emailUpdates: boolean;
    smsUpdates: boolean;
  };
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface DeleteAccountData {
  password: string;
  reason?: string;
}

class UserService {
  private baseUrl = SERVICE_URLS.IDENTITY;

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<User>> {
    try {
      const response = await identityApiService.get('/profile');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch profile',
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<ApiResponse<User>> {
    try {
      const response = await identityApiService.put('/profile', data);
      return {
        success: true,
        data: response.data?.user || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update profile',
      };
    }
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordData): Promise<ApiResponse<void>> {
    try {
      const response = await identityApiService.put(
        '/security/change-password',
        data
      );
      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to change password',
      };
    }
  }

  /**
   * Upload profile image
   */
  async uploadProfileImage(
    imageFile: File
  ): Promise<ApiResponse<{ imageUrl: string }>> {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await identityApiService.post(
        '/profile/upload-image',
        formData
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to upload profile image',
      };
    }
  }

  /**
   * Delete profile image
   */
  async deleteProfileImage(): Promise<ApiResponse<void>> {
    try {
      const response = await identityApiService.delete('/profile/delete-image');
      return {
        success: true,
        message: 'Profile image deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete profile image',
      };
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<ApiResponse<any>> {
    try {
      const response = await identityApiService.get('/profile/stats');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch user statistics',
      };
    }
  }

  /**
   * Get user achievements
   */
  async getUserAchievements(): Promise<ApiResponse<any[]>> {
    try {
      const response = await identityApiService.get('/profile/achievements');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch user achievements',
      };
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(data: DeleteAccountData): Promise<ApiResponse<void>> {
    try {
      const response = await identityApiService.delete(
        '/security/delete-account',
        {
          data,
        }
      );
      return {
        success: true,
        message: 'Account deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete account',
      };
    }
  }

  /**
   * Export user data
   */
  async exportUserData(): Promise<ApiResponse<{ downloadUrl: string }>> {
    try {
      const response = await identityApiService.get('/profile/export-data');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to export user data',
      };
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<ApiResponse<any>> {
    try {
      const response = await identityApiService.get('/profile/preferences');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch user preferences',
      };
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences: any): Promise<ApiResponse<any>> {
    try {
      const response = await identityApiService.put(
        '/profile/preferences',
        preferences
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update user preferences',
      };
    }
  }

  /**
   * Get user activity log
   */
  async getUserActivityLog(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any[]>> {
    try {
      const response = await identityApiService.get('/profile/activity-log', {
        params,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch user activity log',
      };
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(params?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any[]>> {
    try {
      const response = await identityApiService.get('/profile/notifications', {
        params,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch user notifications',
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(
    notificationId: string
  ): Promise<ApiResponse<void>> {
    try {
      const response = await identityApiService.put(
        `/profile/notifications/${notificationId}/read`
      );
      return {
        success: true,
        message: 'Notification marked as read',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to mark notification as read',
      };
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    try {
      const response = await identityApiService.put(
        '/profile/notifications/read-all'
      );
      return {
        success: true,
        message: 'All notifications marked as read',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to mark all notifications as read',
      };
    }
  }
}

export const userService = new UserService();
export default userService;
