import { memberApiService } from './api.service';

export type RewardCategory = 'DISCOUNT' | 'FREE_CLASS' | 'MERCHANDISE' | 'MEMBERSHIP_EXTENSION' | 'PREMIUM_FEATURE' | 'OTHER';
export type RewardType = 'PERCENTAGE_DISCOUNT' | 'FIXED_AMOUNT_DISCOUNT' | 'FREE_ITEM' | 'MEMBERSHIP_UPGRADE' | 'PREMIUM_FEATURE_ACCESS' | 'CASHBACK' | 'OTHER';
export type RedemptionStatus = 'PENDING' | 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';

export interface Reward {
  id: string;
  title: string;
  description: string;
  category: RewardCategory;
  points_cost: number;
  image_url: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  reward_type: RewardType;
  is_active: boolean;
  stock_quantity: number | null;
  redemption_limit: number | null;
  valid_from: string;
  valid_until: string | null;
  terms_conditions: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_available?: boolean;
  _count?: {
    redemptions: number;
  };
}

export interface RewardRedemption {
  id: string;
  member_id: string;
  reward_id: string;
  points_spent: number;
  status: RedemptionStatus;
  redeemed_at: string;
  used_at: string | null;
  expires_at: string | null;
  code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  reward?: Reward;
  new_balance?: number;
}

class RewardService {
  private get baseUrl() {
    const { SERVICE_URLS } = require('@/config/environment');
    return `${SERVICE_URLS.MEMBER}/rewards`;
  }

  /**
   * Get all available rewards
   */
  async getRewards(filters?: {
    category?: RewardCategory;
    min_points?: number;
    max_points?: number;
  }): Promise<{
    success: boolean;
    data?: Reward[];
    error?: string;
  }> {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.min_points) params.append('min_points', String(filters.min_points));
      if (filters?.max_points) params.append('max_points', String(filters.max_points));

      const queryString = params.toString();
      const url = queryString ? `/rewards?${queryString}` : '/rewards';
      const response = await memberApiService.get(url);

      return {
        success: response.success,
        data: response.data,
        error: response.message,
      };
    } catch (error: any) {
      console.error('Get rewards error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get rewards',
      };
    }
  }

  /**
   * Get reward by ID
   */
  async getRewardById(rewardId: string): Promise<{
    success: boolean;
    data?: Reward;
    error?: string;
  }> {
    try {
      const response = await memberApiService.get(`/rewards/${rewardId}`);
      return {
        success: response.success,
        data: response.data,
        error: response.message,
      };
    } catch (error: any) {
      console.error('Get reward by ID error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get reward',
      };
    }
  }

  /**
   * Redeem a reward
   */
  async getRecommendedRewards(
    memberId: string
  ): Promise<{
    success: boolean;
    data?: Reward[];
    error?: string;
    preferences?: string[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/rewards/recommendations/${memberId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return {
          success: false,
          error: result.message || 'Failed to get recommended rewards',
        };
      }

      return {
        success: true,
        data: result.data || [],
        preferences: result.preferences || [],
      };
    } catch (error: any) {
      console.error('Get recommended rewards error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get recommended rewards',
      };
    }
  }

  async generateQRCode(code: string): Promise<{
    success: boolean;
    data?: { qr_code_data_url: string; qr_code_svg: string };
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/rewards/qr-code/${code}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return {
          success: false,
          error: result.message || 'Failed to generate QR code',
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error: any) {
      console.error('Generate QR code error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate QR code',
      };
    }
  }

  async redeemReward(
    rewardId: string,
    memberId: string
  ): Promise<{
    success: boolean;
    data?: RewardRedemption;
    error?: string;
    required?: number;
    current?: number;
  }> {
    try {
      const response = await memberApiService.post(`/rewards/${rewardId}/redeem`, {
        memberId,
      });
      return {
        success: response.success,
        data: response.data,
        error: response.message,
        required: response.data?.required,
        current: response.data?.current,
      };
    } catch (error: any) {
      console.error('Redeem reward error:', error);
      return {
        success: false,
        error: error.message || 'Failed to redeem reward',
      };
    }
  }

  /**
   * Get member's redemption history
   */
  async getMemberRedemptions(
    memberId: string,
    filters?: {
      status?: RedemptionStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    success: boolean;
    data?: RewardRedemption[];
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
      if (filters?.status) params.append('status', filters.status);
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.offset) params.append('offset', String(filters.offset));

      const queryString = params.toString();
      const url = queryString
        ? `/members/${memberId}/rewards?${queryString}`
        : `/members/${memberId}/rewards`;
      const response = await memberApiService.get(url);

      return {
        success: response.success,
        data: response.data,
        pagination: response.pagination,
        error: response.message,
      };
    } catch (error: any) {
      console.error('Get member redemptions error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get redemptions',
      };
    }
  }

  /**
   * Verify redemption code
   */
  async verifyCode(code: string): Promise<{
    success: boolean;
    data?: RewardRedemption;
    error?: string;
  }> {
    try {
      const response = await memberApiService.post('/rewards/verify-code', { code });
      return {
        success: response.success,
        data: response.data,
        error: response.message,
      };
    } catch (error: any) {
      console.error('Verify code error:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify code',
      };
    }
  }
}

export const rewardService = new RewardService();

