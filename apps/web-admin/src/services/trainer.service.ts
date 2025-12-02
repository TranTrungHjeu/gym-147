import { scheduleApi } from './api';
import type { AxiosResponse } from 'axios';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Trainer {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  specializations: string[];
  bio?: string;
  experience_years: number;
  hourly_rate?: number;
  profile_photo?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  rating_average?: number;
  total_classes?: number;
  created_at: string;
  updated_at: string;
}

class TrainerService {
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      let response: AxiosResponse<ApiResponse<T>>;

      switch (method) {
        case 'POST':
          response = await scheduleApi.post<ApiResponse<T>>(endpoint, data);
          break;
        case 'PUT':
          response = await scheduleApi.put<ApiResponse<T>>(endpoint, data);
          break;
        case 'DELETE':
          response = await scheduleApi.delete<ApiResponse<T>>(endpoint);
          break;
        default:
          response = await scheduleApi.get<ApiResponse<T>>(endpoint);
      }

      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data || { message: error.message || 'Unknown error' };
      throw new Error(errorData.message || `HTTP error! status: ${error.response?.status}`);
    }
  }

  async getAllTrainers(): Promise<ApiResponse<Trainer[]>> {
    return this.request<Trainer[]>('/trainers');
  }

  async getTrainerById(id: string): Promise<ApiResponse<Trainer>> {
    return this.request<Trainer>(`/trainers/${id}`);
  }

  async getTrainerByUserId(userId: string): Promise<ApiResponse<Trainer>> {
    return this.request<Trainer>(`/trainers/user/${userId}`);
  }

  async updateTrainer(id: string, data: Partial<Trainer>): Promise<ApiResponse<Trainer>> {
    return this.request<Trainer>(`/trainers/${id}`, 'PUT', data);
  }

  async deleteTrainer(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/trainers/${id}`, 'DELETE');
  }

  async getTrainerCertifications(trainerId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/trainers/${trainerId}/certifications`);
  }

  async syncTrainerSpecializations(trainerId: string): Promise<ApiResponse<Trainer>> {
    return this.request<Trainer>(`/trainers/${trainerId}/sync-specializations`, 'POST');
  }

  async uploadAvatar(
    userId: string,
    base64Image: string,
    mimeType: string = 'image/jpeg',
    filename: string = 'avatar.jpg'
  ): Promise<ApiResponse<{ avatarUrl: string; trainer: Trainer }>> {
    return this.request<{ avatarUrl: string; trainer: Trainer }>(
      `/trainers/user/${userId}/avatar`,
      'POST',
      {
        base64Image,
        mimeType,
        filename,
      }
    );
  }

  async updateTrainerSchedule(
    userId: string,
    scheduleId: string,
    data: {
      class_name?: string;
      description?: string;
      date?: string;
      start_time?: string;
      end_time?: string;
      room_id?: string;
      max_capacity?: number;
      special_notes?: string;
    }
  ): Promise<ApiResponse<{ schedule: any }>> {
    return this.request<{ schedule: any }>(
      `/trainers/user/${userId}/schedules/${scheduleId}`,
      'PUT',
      data
    );
  }
}

export const trainerService = new TrainerService();
