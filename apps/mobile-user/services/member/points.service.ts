import { memberApiService } from './api.service';

export type PointsTransactionType = 'EARNED' | 'SPENT' | 'EXPIRED' | 'REFUNDED';

export interface PointsTransaction {
  id: string;
  member_id: string;
  points: number;
  type: PointsTransactionType;
  source: string | null;
  source_id: string | null;
  description: string | null;
  balance_after: number;
  created_at: string;
}

export interface PointsBalance {
  current: number;
  total_earned: number;
  total_spent: number;
}

export interface LeaderboardEntry {
  rank: number;
  memberId: string;
  memberName: string;
  avatarUrl: string | null;
  membershipType: string;
  points: number;
  isCurrentUser: boolean;
}

export interface TopMemberByPoints {
  member_id: string;
  balance: number;
  last_updated: string;
  member: {
    id: string;
    full_name: string;
    membership_number: string;
    profile_photo: string | null;
  };
}

class PointsService {
  private get baseUrl() {
    const { SERVICE_URLS } = require('@/config/environment');
    return `${SERVICE_URLS.MEMBER}/points`;
  }

  /**
   * Get member points balance
   */
  async getBalance(memberId: string): Promise<{
    success: boolean;
    data?: PointsBalance;
    error?: string;
  }> {
    try {
      const response = await memberApiService.get(`/members/${memberId}/points/balance`);
      return {
        success: response.success,
        data: response.data,
        error: response.message,
      };
    } catch (error: any) {
      console.error('Get points balance error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get points balance',
      };
    }
  }

  /**
   * Get points transaction history
   */
  async getHistory(
    memberId: string,
    filters?: {
      type?: PointsTransactionType;
      source?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    success: boolean;
    data?: PointsTransaction[];
    pagination?: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    error?: string;
  }> {
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.source) params.append('source', filters.source);
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.offset) params.append('offset', String(filters.offset));

      const queryString = params.toString();
      const url = queryString
        ? `/members/${memberId}/points/history?${queryString}`
        : `/members/${memberId}/points/history`;
      const response = await memberApiService.get(url);

      return {
        success: response.success,
        data: response.data,
        pagination: response.pagination,
        error: response.message,
      };
    } catch (error: any) {
      console.error('Get points history error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get points history',
      };
    }
  }

  /**
   * Get top members by points leaderboard
   */
  async getLeaderboard(params?: {
    limit?: number;
    period?: 'weekly' | 'monthly' | 'yearly' | 'alltime';
  }): Promise<{
    success: boolean;
    data?: LeaderboardEntry[];
    error?: string;
  }> {
    try {
      const limit = params?.limit || 50;
      const period = params?.period || 'alltime';
      const response = await memberApiService.get(
        `/points/leaderboard?limit=${limit}&period=${period}`
      );
      return {
        success: response.success,
        data: response.data,
        error: response.message,
      };
    } catch (error: any) {
      console.error('Get points leaderboard error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get leaderboard',
      };
    }
  }

  /**
   * Get top members by points (deprecated - use getLeaderboard)
   */
  async getTopMembersByPoints(limit: number = 10): Promise<{
    success: boolean;
    data?: TopMemberByPoints[];
    error?: string;
  }> {
    return this.getLeaderboard({ limit });
  }
}

export const pointsService = new PointsService();

