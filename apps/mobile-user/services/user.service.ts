import { SERVICE_URLS } from '@/config/environment';
import { User } from '@/types/authTypes';
import { ApiResponse, apiService } from './api';

export interface UpdateProfileData {
  name?: string;
  email?: string;
  profileImage?: string;
  height?: number;
  weight?: number;
  age?: number;
  fitnessGoal?:
    | 'lose_weight'
    | 'gain_muscle'
    | 'increase_endurance'
    | 'improve_flexibility'
    | 'maintain';
  weeklyGoal?: number;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserStats {
  totalWorkouts: number;
  totalDuration: number; // in minutes
  caloriesBurned: number;
  currentStreak: number;
  longestStreak: number;
  averageWorkoutDuration: number;
  favoriteExercise: string;
  weeklyProgress: {
    week: string;
    workouts: number;
    duration: number;
    calories: number;
  }[];
}

export class UserService {
  private readonly baseUrl = SERVICE_URLS.MEMBER;
  private readonly basePath = '/members';

  /**
   * Get user profile
   */
  async getProfile(): Promise<ApiResponse<User>> {
    try {
      const response = await apiService.get<User>(
        `${this.baseUrl}${this.basePath}/profile`
      );
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
   * Update user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<ApiResponse<User>> {
    try {
      const response = await apiService.put<User>(
        `${this.baseUrl}${this.basePath}/profile`,
        data
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update profile',
        errors: error.errors,
      };
    }
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordData): Promise<ApiResponse> {
    try {
      const response = await apiService.put(
        `${this.baseUrl}${this.basePath}/change-password`,
        data
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to change password',
        errors: error.errors,
      };
    }
  }

  /**
   * Upload profile image
   */
  async uploadProfileImage(
    imageUri: string
  ): Promise<ApiResponse<{ imageUrl: string }>> {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);

      const response = await apiService.upload<{ imageUrl: string }>(
        `${this.baseUrl}${this.basePath}/upload-image`,
        formData
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to upload image',
        errors: error.errors,
      };
    }
  }

  /**
   * Delete profile image
   */
  async deleteProfileImage(): Promise<ApiResponse> {
    try {
      const response = await apiService.delete(
        `${this.baseUrl}${this.basePath}/profile-image`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete profile image',
        errors: error.errors,
      };
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<ApiResponse<UserStats>> {
    try {
      const response = await apiService.get<UserStats>(
        `${this.baseUrl}${this.basePath}/stats`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get user statistics',
        errors: error.errors,
      };
    }
  }

  /**
   * Get user achievements
   */
  async getUserAchievements(): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiService.get<any[]>(
        `${this.baseUrl}${this.basePath}/achievements`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get achievements',
        errors: error.errors,
      };
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(password: string): Promise<ApiResponse> {
    try {
      const response = await apiService.post(
        `${this.baseUrl}${this.basePath}/account/delete`,
        {
          password,
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete account',
        errors: error.errors,
      };
    }
  }

  /**
   * Export user data
   */
  async exportData(): Promise<ApiResponse<{ downloadUrl: string }>> {
    try {
      const response = await apiService.get<{ downloadUrl: string }>(
        `${this.baseUrl}${this.basePath}/export`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to export data',
        errors: error.errors,
      };
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<ApiResponse<any>> {
    try {
      const response = await apiService.get(
        `${this.baseUrl}${this.basePath}/preferences`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get preferences',
        errors: error.errors,
      };
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: any): Promise<ApiResponse> {
    try {
      const response = await apiService.put(
        `${this.baseUrl}${this.basePath}/preferences`,
        preferences
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update preferences',
        errors: error.errors,
      };
    }
  }
}

// Export singleton instance
export const userService = new UserService();
export default userService;
