import { memberApiService } from './api.service';

export interface DailyStreak {
  id: string;
  member_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  streak_started_at: string | null;
  last_updated: string;
}

export interface StreakLeaderboardEntry {
  rank: number;
  memberId: string;
  memberName: string;
  membershipNumber: string | null;
  avatarUrl: string | null;
  membershipType: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  streakStartedAt: string | null;
  isCurrentUser: boolean;
}

export interface TopStreakEntry {
  id: string;
  member_id: string;
  current_streak: number;
  longest_streak: number;
  member: {
    id: string;
    full_name: string;
    membership_number: string;
    profile_photo: string | null;
  };
}

class StreakService {
  private get baseUrl() {
    const { SERVICE_URLS } = require('@/config/environment');
    return `${SERVICE_URLS.MEMBER}/streaks`;
  }

  /**
   * Get member streak
   */
  async getStreak(memberId: string): Promise<{
    success: boolean;
    data?: DailyStreak;
    error?: string;
  }> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/streak`
      );
      return {
        success: response.success,
        data: response.data,
        error: response.message,
      };
    } catch (error: any) {
      console.error('Get streak error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get streak',
      };
    }
  }

  /**
   * Update streak (usually called automatically)
   */
  async updateStreak(
    memberId: string,
    sessionDate?: Date
  ): Promise<{
    success: boolean;
    data?: {
      streak: DailyStreak;
      isNewStreak: boolean;
      milestoneReached?: {
        days: number;
        points: number;
        message: string;
      };
      streakBroken?: boolean;
    };
    error?: string;
  }> {
    try {
      const response = await memberApiService.post(
        `/members/${memberId}/streak/update`,
        {
          sessionDate: sessionDate?.toISOString(),
        }
      );
      return {
        success: response.success,
        data: response.data,
        error: response.message,
      };
    } catch (error: any) {
      console.error('Update streak error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update streak',
      };
    }
  }

  /**
   * Get top streaks leaderboard
   */
  async getLeaderboard(params?: {
    limit?: number;
    type?: 'current' | 'longest';
  }): Promise<{
    success: boolean;
    data?: StreakLeaderboardEntry[];
    error?: string;
  }> {
    try {
      const limit = params?.limit || 50;
      const type = params?.type || 'current';
      const response = await memberApiService.get(
        `/streaks/top?limit=${limit}&type=${type}`
      );
      return {
        success: response.success,
        data: response.data,
        error: response.message,
      };
    } catch (error: any) {
      console.error('Get streaks leaderboard error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get leaderboard',
      };
    }
  }

  /**
   * Get top streaks (deprecated - use getLeaderboard)
   */
  async getTopStreaks(limit: number = 10): Promise<{
    success: boolean;
    data?: TopStreakEntry[];
    error?: string;
  }> {
    return this.getLeaderboard({ limit });
  }
}

export const streakService = new StreakService();
