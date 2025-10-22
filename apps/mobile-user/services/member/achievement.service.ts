import {
  Achievement,
  AchievementCategory,
  AchievementSummary,
  LeaderboardEntry,
} from '@/types/achievementTypes';
import { memberApiService } from './api.service';

export interface AchievementCriteria {
  type:
    | 'WORKOUTS_COMPLETED'
    | 'STREAK_DAYS'
    | 'CALORIES_BURNED'
    | 'SESSIONS_ATTENDED'
    | 'WEIGHT_LOST'
    | 'CUSTOM';
  target_value: number;
  current_value?: number;
  unit?: string;
}

export interface CreateAchievementData {
  name: string;
  description: string;
  category: AchievementCategory;
  criteria: AchievementCriteria;
  points: number;
  icon_url?: string;
  is_secret?: boolean;
}

export interface UpdateAchievementData extends Partial<CreateAchievementData> {}

class AchievementService {
  private baseUrl = 'http://10.0.2.2:3002/achievements'; // Direct connection to Member Service

  /**
   * Get all achievements for the current member
   */
  async getAchievements(): Promise<{
    success: boolean;
    data?: Achievement[];
    error?: string;
  }> {
    try {
      const response = await memberApiService.get('/achievements');
      return { success: true, data: response.data.data || response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get achievement by ID
   */
  async getAchievementById(
    id: string
  ): Promise<{ success: boolean; data?: Achievement; error?: string }> {
    try {
      const response = await memberApiService.get(`/achievements/${id}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get achievement summary
   */
  async getAchievementSummary(): Promise<{
    success: boolean;
    data?: AchievementSummary;
    error?: string;
  }> {
    try {
      const response = await memberApiService.get('/achievements/summary');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new achievement (admin only)
   */
  async createAchievement(
    data: CreateAchievementData
  ): Promise<{ success: boolean; data?: Achievement; error?: string }> {
    try {
      const response = await memberApiService.post('/achievements', data);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing achievement (admin only)
   */
  async updateAchievement(
    id: string,
    data: UpdateAchievementData
  ): Promise<{ success: boolean; data?: Achievement; error?: string }> {
    try {
      const response = await memberApiService.put(`/achievements/${id}`, data);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check for new achievements
   */
  async checkAchievements(): Promise<{
    success: boolean;
    data?: Achievement[];
    error?: string;
  }> {
    try {
      const response = await memberApiService.post('/achievements/check');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get leaderboard data
   * @param params - Query parameters for filtering leaderboard (e.g., period, limit)
   */
  async getLeaderboard(params?: {
    period?: 'week' | 'month' | 'all_time';
    limit?: number;
  }): Promise<{ success: boolean; data?: LeaderboardEntry[]; error?: string }> {
    try {
      const response = await memberApiService.get('/achievements/leaderboard', {
        params,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Unlock achievement manually (admin only)
   */
  async unlockAchievement(
    achievementId: string
  ): Promise<{ success: boolean; data?: Achievement; error?: string }> {
    try {
      const response = await memberApiService.post(
        `/achievements/${achievementId}/unlock`
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete achievement (admin only)
   */
  async deleteAchievement(
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await memberApiService.delete(`/achievements/${id}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get achievement categories
   */
  async getAchievementCategories(): Promise<{
    success: boolean;
    data?: AchievementCategory[];
    error?: string;
  }> {
    try {
      const response = await memberApiService.get('/achievements/categories');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const achievementService = new AchievementService();
export default achievementService;
