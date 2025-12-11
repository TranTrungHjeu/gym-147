import { scheduleApi } from './api';
import type { AxiosResponse } from 'axios';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface SalaryRequest {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: {
    trainer_id: string;
    trainer_user_id: string;
    trainer_name: string;
    trainer_email: string;
    requested_at: string;
    action_route?: string;
  };
  is_read: boolean;
  created_at: string;
}

export interface SalaryStatistics {
  trainer: {
    id: string;
    full_name: string;
    email: string;
    hourly_rate: number | null;
  };
  teaching_hours: number;
  total_classes: number;
  total_students: number;
  salary: number | null;
}

export interface TrainerSalaryStatistics {
  trainer: {
    id: string;
    full_name: string;
    email: string;
    hourly_rate: number | null;
  };
  period: {
    month: number;
    year: number;
    start_date: string;
    end_date: string;
  };
  teaching_hours: {
    totalHours: number;
    totalClasses: number;
    totalStudents: number;
    breakdown: Array<{
      schedule_id: string;
      class_name: string;
      start_time: string;
      end_time: string;
      hours: number;
      attendance_count: number;
    }>;
  };
  salary: {
    hours: number;
    rate: number;
    total: number;
    totalClasses: number;
    totalStudents: number;
  } | null;
}

class SalaryService {
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    params?: any
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
          response = await scheduleApi.get<ApiResponse<T>>(endpoint, { params });
      }

      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data || { message: error.message || 'Unknown error' };
      throw new Error(errorData.message || `HTTP error! status: ${error.response?.status}`);
    }
  }

  /**
   * Get all salary requests (from notifications)
   */
  async getSalaryRequests(params?: {
    status?: string;
    trainer_id?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ requests: SalaryRequest[]; pagination: any }>> {
    return this.request<{ requests: SalaryRequest[]; pagination: any }>(
      '/salary/requests',
      'GET',
      undefined,
      params
    );
  }

  /**
   * Set trainer salary
   */
  async setTrainerSalary(
    trainerId: string,
    hourlyRate: number,
    notes?: string
  ): Promise<ApiResponse<{ trainer: any }>> {
    return this.request<{ trainer: any }>(`/trainers/${trainerId}/salary`, 'PUT', {
      hourly_rate: hourlyRate,
      notes,
    });
  }

  /**
   * Get trainer salary status
   */
  async getTrainerSalaryStatus(trainerId: string): Promise<ApiResponse<{
    trainer_id: string;
    hasSalary: boolean;
    hourly_rate: number | null;
  }>> {
    return this.request<{
      trainer_id: string;
      hasSalary: boolean;
      hourly_rate: number | null;
    }>(`/trainers/${trainerId}/salary-status`);
  }

  /**
   * Get salary statistics for all trainers
   */
  async getAllTrainersSalaryStatistics(
    month?: number,
    year?: number
  ): Promise<ApiResponse<{
    month: number;
    year: number;
    statistics: SalaryStatistics[];
  }>> {
    return this.request<{
      month: number;
      year: number;
      statistics: SalaryStatistics[];
    }>('/salary/statistics', 'GET', undefined, { month, year });
  }

  /**
   * Get salary statistics for a specific trainer
   */
  async getTrainerSalaryStatistics(
    trainerId: string,
    month?: number,
    year?: number
  ): Promise<ApiResponse<TrainerSalaryStatistics>> {
    return this.request<TrainerSalaryStatistics>(
      `/salary/statistics/${trainerId}`,
      'GET',
      undefined,
      { month, year }
    );
  }

  /**
   * Get current trainer's salary statistics (by user_id from token)
   */
  async getMySalaryStatistics(
    month?: number,
    year?: number
  ): Promise<ApiResponse<TrainerSalaryStatistics>> {
    return this.request<TrainerSalaryStatistics>(
      `/salary/my-statistics`,
      'GET',
      undefined,
      { month, year }
    );
  }
}

export const salaryService = new SalaryService();

