import { billingApi } from './api';
import { AxiosResponse } from 'axios';

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_TRIAL' | 'FIRST_MONTH_FREE';

export interface DiscountCode {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: DiscountType;
  value: number;
  max_discount?: number | null;
  usage_limit?: number | null;
  usage_count: number;
  usage_limit_per_member?: number | null;
  valid_from: string;
  valid_until?: string | null;
  is_active: boolean;
  applicable_plans: string[];
  minimum_amount?: number | null;
  first_time_only: boolean;
  referrer_member_id?: string | null;
  bonus_days?: number | null;
  referral_reward?: number | null;
  created_at: string;
  updated_at: string;
  _count?: {
    usage_history: number;
  };
}

export interface DiscountUsage {
  id: string;
  discount_code_id: string;
  member_id: string;
  subscription_id?: string | null;
  amount_discounted: number;
  bonus_days_added?: number | null;
  referrer_member_id?: string | null;
  referrer_reward?: number | null;
  used_at: string;
  discount_code?: {
    code: string;
    name: string;
  };
}

export interface CreateDiscountCodeRequest {
  code: string;
  name: string;
  description?: string;
  type: DiscountType;
  value: number;
  max_discount?: number | null;
  usage_limit?: number | null;
  usage_limit_per_member?: number | null;
  valid_from: string;
  valid_until?: string | null;
  is_active?: boolean;
  applicable_plans?: string[];
  minimum_amount?: number | null;
  first_time_only?: boolean;
  referrer_member_id?: string | null;
  bonus_days?: number | null;
  referral_reward?: number | null;
}

export interface UpdateDiscountCodeRequest {
  code?: string;
  name?: string;
  description?: string;
  type?: DiscountType;
  value?: number;
  max_discount?: number | null;
  usage_limit?: number | null;
  usage_limit_per_member?: number | null;
  valid_from?: string;
  valid_until?: string | null;
  is_active?: boolean;
  applicable_plans?: string[];
  minimum_amount?: number | null;
  first_time_only?: boolean;
  referrer_member_id?: string | null;
  bonus_days?: number | null;
  referral_reward?: number | null;
}

export interface DiscountCodeFilters {
  search?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

class CouponService {
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      let response: AxiosResponse<ApiResponse<T>>;

      switch (method) {
        case 'POST':
          response = await billingApi.post<ApiResponse<T>>(endpoint, data);
          break;
        case 'PUT':
          response = await billingApi.put<ApiResponse<T>>(endpoint, data);
          break;
        case 'DELETE':
          response = await billingApi.delete<ApiResponse<T>>(endpoint);
          break;
        default:
          response = await billingApi.get<ApiResponse<T>>(endpoint);
      }

      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data || { message: error.message || 'Unknown error' };
      console.error('Coupon API Error:', errorData);

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
   * Get all discount codes
   */
  async getDiscountCodes(filters?: DiscountCodeFilters): Promise<ApiResponse<DiscountCode[]>> {
    const queryParams = new URLSearchParams();
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.is_active !== undefined)
      queryParams.append('is_active', String(filters.is_active));
    if (filters?.limit) queryParams.append('limit', String(filters.limit));
    if (filters?.offset) queryParams.append('offset', String(filters.offset));

    const endpoint = `/discount-codes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<DiscountCode[]>(endpoint);
  }

  /**
   * Get discount code by ID
   */
  async getDiscountCodeById(
    id: string
  ): Promise<ApiResponse<DiscountCode & { usage_history: DiscountUsage[] }>> {
    return this.request<DiscountCode & { usage_history: DiscountUsage[] }>(`/discount-codes/${id}`);
  }

  /**
   * Create a new discount code
   */
  async createDiscountCode(data: CreateDiscountCodeRequest): Promise<ApiResponse<DiscountCode>> {
    return this.request<DiscountCode>('/discount-codes', 'POST', data);
  }

  /**
   * Update discount code
   */
  async updateDiscountCode(
    id: string,
    data: UpdateDiscountCodeRequest
  ): Promise<ApiResponse<DiscountCode>> {
    return this.request<DiscountCode>(`/discount-codes/${id}`, 'PUT', data);
  }

  /**
   * Delete discount code
   */
  async deleteDiscountCode(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/discount-codes/${id}`, 'DELETE');
  }

  /**
   * Get discount code usage history
   */
  async getUsageHistory(
    id: string,
    filters?: { member_id?: string; limit?: number; offset?: number }
  ): Promise<ApiResponse<DiscountUsage[]>> {
    const queryParams = new URLSearchParams();
    if (filters?.member_id) queryParams.append('member_id', filters.member_id);
    if (filters?.limit) queryParams.append('limit', String(filters.limit));
    if (filters?.offset) queryParams.append('offset', String(filters.offset));

    const endpoint = `/discount-codes/${id}/usage-history${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;
    return this.request<DiscountUsage[]>(endpoint);
  }
}

const couponService = new CouponService();
export default couponService;














