import { memberApi } from './api';
import { AxiosResponse } from 'axios';

export interface Reward {
  id: string;
  title: string;
  description: string;
  category: 'DISCOUNT' | 'FREE_CLASS' | 'MERCHANDISE' | 'MEMBERSHIP_EXTENSION' | 'PREMIUM_FEATURE' | 'OTHER';
  points_cost: number;
  image_url?: string | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  reward_type:
    | 'PERCENTAGE_DISCOUNT'
    | 'FIXED_AMOUNT_DISCOUNT'
    | 'FREE_ITEM'
    | 'MEMBERSHIP_UPGRADE'
    | 'PREMIUM_FEATURE_ACCESS'
    | 'CASHBACK'
    | 'OTHER';
  is_active: boolean;
  stock_quantity?: number | null;
  redemption_limit?: number | null;
  valid_from: string;
  valid_until?: string | null;
  terms_conditions?: string | null;
  created_by?: string | null;
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
  status: 'PENDING' | 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  redeemed_at: string;
  used_at?: string | null;
  expires_at?: string | null;
  code?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  reward?: Reward;
  member?: {
    id: string;
    full_name: string;
    membership_number: string;
    email?: string | null;
    phone?: string | null;
  };
  new_balance?: number;
}

export interface CreateRewardRequest {
  title: string;
  description: string;
  category: 'DISCOUNT' | 'FREE_CLASS' | 'MERCHANDISE' | 'MEMBERSHIP_EXTENSION' | 'PREMIUM_FEATURE' | 'OTHER';
  points_cost: number;
  image_url?: string;
  discount_percent?: number;
  discount_amount?: number;
  reward_type:
    | 'PERCENTAGE_DISCOUNT'
    | 'FIXED_AMOUNT_DISCOUNT'
    | 'FREE_ITEM'
    | 'MEMBERSHIP_UPGRADE'
    | 'PREMIUM_FEATURE_ACCESS'
    | 'CASHBACK'
    | 'OTHER';
  stock_quantity?: number | null;
  redemption_limit?: number | null;
  valid_from: string;
  valid_until?: string | null;
  terms_conditions?: string;
  created_by?: string;
}

export interface UpdateRewardRequest {
  title?: string;
  description?: string;
  category?: 'DISCOUNT' | 'FREE_CLASS' | 'MERCHANDISE' | 'MEMBERSHIP_EXTENSION' | 'PREMIUM_FEATURE' | 'OTHER';
  points_cost?: number;
  image_url?: string;
  discount_percent?: number;
  discount_amount?: number;
  reward_type?:
    | 'PERCENTAGE_DISCOUNT'
    | 'FIXED_AMOUNT_DISCOUNT'
    | 'FREE_ITEM'
    | 'MEMBERSHIP_UPGRADE'
    | 'PREMIUM_FEATURE_ACCESS'
    | 'CASHBACK'
    | 'OTHER';
  is_active?: boolean;
  stock_quantity?: number | null;
  redemption_limit?: number | null;
  valid_from?: string;
  valid_until?: string | null;
  terms_conditions?: string;
}

export interface RewardFilters {
  category?: string;
  min_points?: number;
  max_points?: number;
  is_active?: boolean;
}

export interface RedemptionFilters {
  memberId?: string;
  rewardId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface RewardStats {
  total_rewards?: number;
  active_rewards?: number;
  total_redemptions?: number;
  popular_rewards?: Array<{
    reward_id: string;
    title: string;
    points_cost: number;
    redemption_count: number;
  }>;
  total_redemptions?: number;
  active_redemptions?: number;
  used_redemptions?: number;
  expired_redemptions?: number;
  refunded_redemptions?: number;
  total_points_spent?: number;
  available_stock?: number | null;
}

class RewardService {
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      let response: AxiosResponse<ApiResponse<T>>;

      switch (method) {
        case 'POST':
          response = await memberApi.post<ApiResponse<T>>(endpoint, data);
          break;
        case 'PUT':
          response = await memberApi.put<ApiResponse<T>>(endpoint, data);
          break;
        case 'DELETE':
          response = await memberApi.delete<ApiResponse<T>>(endpoint);
          break;
        default:
          response = await memberApi.get<ApiResponse<T>>(endpoint);
      }

      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data || { message: error.message || 'Unknown error' };
      console.error('Reward API Error:', errorData);

      const apiError = new Error(
        errorData.message || `HTTP error! status: ${error.response?.status}`
      );
      (apiError as any).response = {
        status: error.response?.status,
        data: errorData,
      };
      throw apiError;
    }
  }

  /**
   * Get all rewards
   */
  async getRewards(filters?: RewardFilters): Promise<ApiResponse<Reward[]>> {
    const queryParams = new URLSearchParams();
    if (filters?.category) queryParams.append('category', filters.category);
    if (filters?.min_points) queryParams.append('min_points', String(filters.min_points));
    if (filters?.max_points) queryParams.append('max_points', String(filters.max_points));
    if (filters?.is_active !== undefined) queryParams.append('is_active', String(filters.is_active));

    const endpoint = `/rewards${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<Reward[]>(endpoint);
  }

  /**
   * Get reward by ID
   */
  async getRewardById(id: string): Promise<ApiResponse<Reward>> {
    return this.request<Reward>(`/rewards/${id}`);
  }

  /**
   * Create a new reward
   */
  async createReward(data: CreateRewardRequest): Promise<ApiResponse<Reward>> {
    return this.request<Reward>('/rewards', 'POST', data);
  }

  /**
   * Update reward
   */
  async updateReward(id: string, data: UpdateRewardRequest): Promise<ApiResponse<Reward>> {
    return this.request<Reward>(`/rewards/${id}`, 'PUT', data);
  }

  /**
   * Delete reward
   */
  async deleteReward(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/rewards/${id}`, 'DELETE');
  }

  /**
   * Get all redemptions (Admin)
   */
  async getAllRedemptions(filters?: RedemptionFilters): Promise<ApiResponse<RewardRedemption[]>> {
    const queryParams = new URLSearchParams();
    if (filters?.memberId) queryParams.append('memberId', filters.memberId);
    if (filters?.rewardId) queryParams.append('rewardId', filters.rewardId);
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.limit) queryParams.append('limit', String(filters.limit));
    if (filters?.offset) queryParams.append('offset', String(filters.offset));

    const endpoint = `/redemptions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<RewardRedemption[]>(endpoint);
  }

  /**
   * Get reward redemptions
   */
  async getRewardRedemptions(rewardId: string, filters?: RedemptionFilters): Promise<ApiResponse<RewardRedemption[]>> {
    return this.getAllRedemptions({ ...filters, rewardId });
  }

  /**
   * Refund redemption
   */
  async refundRedemption(redemptionId: string, reason?: string): Promise<ApiResponse<{ refunded_points: number }>> {
    return this.request<{ refunded_points: number }>(`/redemptions/${redemptionId}/refund`, 'POST', { reason });
  }

  /**
   * Verify redemption code
   */
  async verifyCode(code: string): Promise<ApiResponse<RewardRedemption>> {
    return this.request<RewardRedemption>('/rewards/verify-code', 'POST', { code });
  }

  /**
   * Mark redemption as used
   */
  async markAsUsed(redemptionId: string): Promise<ApiResponse<RewardRedemption>> {
    return this.request<RewardRedemption>(`/redemptions/${redemptionId}/mark-used`, 'PUT');
  }

  /**
   * Get reward statistics
   */
  async getRewardStats(rewardId?: string): Promise<ApiResponse<RewardStats>> {
    const endpoint = `/rewards/stats${rewardId ? `?rewardId=${rewardId}` : ''}`;
    return this.request<RewardStats>(endpoint);
  }

  /**
   * Upload reward image to S3
   */
  async uploadRewardImage(image: string): Promise<ApiResponse<{ image_url: string; key: string }>> {
    return this.request<{ image_url: string; key: string }>('/rewards/image/upload', 'POST', {
      image,
    });
  }
}

export default new RewardService();

