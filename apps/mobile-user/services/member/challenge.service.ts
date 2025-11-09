import { memberApiService } from './api.service';

export type ChallengeType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  category: string;
  target_value: number;
  target_unit: string | null;
  reward_points: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_public: boolean;
  max_participants: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  progress?: ChallengeProgress[];
  _count?: {
    progress: number;
  };
}

export interface ChallengeProgress {
  id: string;
  challenge_id: string;
  member_id: string;
  current_value: number;
  target_value: number;
  completed: boolean;
  completed_at: string | null;
  joined_at: string;
  updated_at: string;
  challenge?: Challenge;
  member?: {
    id: string;
    full_name: string;
    membership_number: string;
    profile_photo: string | null;
  };
}

class ChallengeService {
  private get baseUrl() {
    const { SERVICE_URLS } = require('@/config/environment');
    return `${SERVICE_URLS.MEMBER}/challenges`;
  }

  /**
   * Get all challenges
   */
  async getChallenges(filters?: {
    type?: ChallengeType;
    category?: string;
    is_active?: boolean;
  }): Promise<{
    success: boolean;
    data?: Challenge[];
    error?: string;
  }> {
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));

      const queryString = params.toString();
      const url = queryString ? `/challenges?${queryString}` : '/challenges';
      const response = await memberApiService.get(url);

      return {
        success: response.success,
        data: response.data,
        error: response.message,
      };
    } catch (error: any) {
      console.error('Get challenges error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get challenges',
      };
    }
  }

  /**
   * Get challenge by ID
   */
  async getChallengeById(challengeId: string): Promise<{
    success: boolean;
    data?: Challenge;
    error?: string;
  }> {
    try {
      const response = await memberApiService.get(`/challenges/${challengeId}`);
      return {
        success: response.success,
        data: response.data,
        error: response.message,
      };
    } catch (error: any) {
      console.error('Get challenge by ID error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get challenge',
      };
    }
  }

  /**
   * Join a challenge
   */
  async joinChallenge(
    challengeId: string,
    memberId: string
  ): Promise<{
    success: boolean;
    data?: ChallengeProgress;
    error?: string;
  }> {
    try {
      const response = await memberApiService.post(`/challenges/${challengeId}/join`, {
        memberId,
      });
      return {
        success: response.success,
        data: response.data,
        error: response.message,
      };
    } catch (error: any) {
      console.error('Join challenge error:', error);
      return {
        success: false,
        error: error.message || 'Failed to join challenge',
      };
    }
  }

  /**
   * Update challenge progress
   */
  async updateProgress(
    challengeId: string,
    memberId: string,
    increment: number = 1
  ): Promise<{
    success: boolean;
    data?: {
      progress: ChallengeProgress;
      completed: boolean;
      wasNewlyCompleted: boolean;
    };
    error?: string;
  }> {
    try {
      const response = await memberApiService.post(`/challenges/${challengeId}/progress`, {
        memberId,
        increment,
      });
      return {
        success: response.success,
        data: response.data,
        error: response.message,
      };
    } catch (error: any) {
      console.error('Update challenge progress error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update progress',
      };
    }
  }

  /**
   * Get member's challenges
   */
  async getMemberChallenges(
    memberId: string,
    status?: 'active' | 'completed' | 'all'
  ): Promise<{
    success: boolean;
    data?: ChallengeProgress[];
    error?: string;
  }> {
    try {
      const params = status ? `?status=${status}` : '';
      const response = await memberApiService.get(`/members/${memberId}/challenges${params}`);
      return {
        success: response.success,
        data: response.data,
        error: response.message,
      };
    } catch (error: any) {
      console.error('Get member challenges error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get member challenges',
      };
    }
  }

  /**
   * Get challenge leaderboard
   */
  async getLeaderboard(params?: {
    limit?: number;
    period?: 'weekly' | 'monthly' | 'yearly' | 'alltime';
  }): Promise<{
    success: boolean;
    data?: Array<{
      rank: number;
      memberId: string;
      memberName: string;
      avatarUrl: string | null;
      membershipType: string;
      completedChallenges: number;
      isCurrentUser: boolean;
    }>;
    error?: string;
  }> {
    try {
      const limit = params?.limit || 50;
      const period = params?.period || 'alltime';
      const response = await memberApiService.get(
        `/challenges/leaderboard?limit=${limit}&period=${period}`
      );
      return {
        success: response.success,
        data: response.data,
        error: response.message,
      };
    } catch (error: any) {
      console.error('Get challenge leaderboard error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get leaderboard',
      };
    }
  }
}

export const challengeService = new ChallengeService();

