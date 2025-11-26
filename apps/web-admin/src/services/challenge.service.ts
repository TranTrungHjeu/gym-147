import { memberApi } from './api';
import { AxiosResponse } from 'axios';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  category: 'FITNESS' | 'ATTENDANCE' | 'SOCIAL' | 'EQUIPMENT';
  target_value: number;
  target_unit?: string | null;
  reward_points: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_public: boolean;
  max_participants?: number | null;
  created_by?: string | null;
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
  completed_at?: string | null;
  joined_at: string;
  updated_at: string;
  member?: {
    id: string;
    full_name: string;
    membership_number: string;
    profile_photo?: string | null;
  };
}

export interface CreateChallengeRequest {
  title: string;
  description: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  category: 'FITNESS' | 'ATTENDANCE' | 'SOCIAL' | 'EQUIPMENT';
  target_value: number;
  target_unit?: string;
  reward_points: number;
  start_date: string;
  end_date: string;
  is_public?: boolean;
  max_participants?: number;
  created_by?: string;
}

export interface UpdateChallengeRequest {
  title?: string;
  description?: string;
  type?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  category?: 'FITNESS' | 'ATTENDANCE' | 'SOCIAL' | 'EQUIPMENT';
  target_value?: number;
  target_unit?: string;
  reward_points?: number;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  is_public?: boolean;
  max_participants?: number;
}

export interface ChallengeFilters {
  type?: string;
  category?: string;
  is_active?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

class ChallengeService {
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
      console.error('Challenge API Error:', errorData);

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
   * Get all challenges
   */
  async getChallenges(filters?: ChallengeFilters): Promise<ApiResponse<Challenge[]>> {
    const queryParams = new URLSearchParams();
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.category) queryParams.append('category', filters.category);
    if (filters?.is_active !== undefined) queryParams.append('is_active', String(filters.is_active));

    const endpoint = `/challenges${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<Challenge[]>(endpoint);
  }

  /**
   * Get challenge by ID
   */
  async getChallengeById(id: string): Promise<ApiResponse<Challenge>> {
    return this.request<Challenge>(`/challenges/${id}`);
  }

  /**
   * Create a new challenge
   */
  async createChallenge(data: CreateChallengeRequest): Promise<ApiResponse<Challenge>> {
    return this.request<Challenge>('/challenges', 'POST', data);
  }

  /**
   * Update challenge
   */
  async updateChallenge(id: string, data: UpdateChallengeRequest): Promise<ApiResponse<Challenge>> {
    try {
      return await this.request<Challenge>(`/challenges/${id}`, 'PUT', data);
    } catch (error: any) {
      console.error('Update challenge error:', error);
      if (error.response?.status === 404) {
        throw new Error('Không tìm thấy thử thách. Vui lòng làm mới trang và thử lại.');
      }
      throw error;
    }
  }

  /**
   * Delete challenge
   */
  async deleteChallenge(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/challenges/${id}`, 'DELETE');
  }

  /**
   * Get member's challenges
   */
  async getMemberChallenges(memberId: string, status?: string): Promise<ApiResponse<Challenge[]>> {
    const endpoint = `/members/${memberId}/challenges${status ? `?status=${status}` : ''}`;
    return this.request<Challenge[]>(endpoint);
  }

  /**
   * Get challenge leaderboard
   */
  async getChallengeLeaderboard(limit: number = 10, period: string = 'alltime'): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/challenges/leaderboard?limit=${limit}&period=${period}`);
  }
}

export default new ChallengeService();

