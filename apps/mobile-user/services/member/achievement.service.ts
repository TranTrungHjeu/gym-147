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
  // Get base URL from centralized config
  private get baseUrl() {
    const { SERVICE_URLS } = require('@/config/environment');
    return `${SERVICE_URLS.MEMBER}/achievements`;
  }

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

      // Handle different response structures
      let achievements = [];
      const data = response.data as any;
      if (data?.achievements) {
        achievements = data.achievements;
      } else if (data?.data?.achievements) {
        achievements = data.data.achievements;
      } else if (Array.isArray(data)) {
        achievements = data;
      } else if (Array.isArray(data?.data)) {
        achievements = data.data;
      }

      console.log(
        '🏆 Extracted achievements:',
        achievements.length,
        'achievements'
      );
      return { success: true, data: achievements };
    } catch (error: any) {
      console.error('Error fetching achievements:', error);
      // Return empty array instead of error to prevent app crash
      return { success: true, data: [] };
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
      return { success: true, data: response.data as Achievement };
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
      return { success: true, data: response.data as AchievementSummary };
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
      return { success: true, data: response.data as Achievement };
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
      return { success: true, data: response.data as Achievement };
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
      return { success: true, data: response.data as Achievement[] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get leaderboard data
   * @param params - Query parameters for filtering leaderboard (e.g., period, limit)
   */
  async getLeaderboard(params?: {
    period?:
      | 'weekly'
      | 'monthly'
      | 'yearly'
      | 'alltime'
      | 'week'
      | 'month'
      | 'all_time';
    limit?: number;
  }): Promise<{ success: boolean; data?: LeaderboardEntry[]; error?: string }> {
    try {
      const response = await memberApiService.get(
        '/achievements/leaderboard',
        params
      );
      // Return empty array if no data
      const data = response.data as any;
      const leaderboardData = data?.data || data || [];
      return { success: true, data: leaderboardData as LeaderboardEntry[] };
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
      return { success: true, data: [] }; // Return empty array to prevent crashes
    }
  }

  /**
   * Get user rank in leaderboard
   * @param userId - User ID
   * @param period - Time period (weekly, monthly, alltime)
   */
  async getUserRank(
    userId: string,
    period?: string
  ): Promise<LeaderboardEntry | null> {
    try {
      const response = await memberApiService.get(
        `/achievements/leaderboard/user/${userId}`,
        period ? { period } : undefined
      );
      return response.data as LeaderboardEntry;
    } catch (error: any) {
      console.error('Error fetching user rank:', error);
      return null;
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
      return { success: true, data: response.data as Achievement };
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
      return { success: true, data: response.data as AchievementCategory[] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const achievementService = new AchievementService();
export default achievementService;
