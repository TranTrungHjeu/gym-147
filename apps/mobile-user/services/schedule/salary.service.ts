import { ApiResponse, scheduleApiService } from '../api';
import { SCHEDULE_SERVICE_URL } from '@/config/environment';

export interface SalaryRequestResponse {
  success: boolean;
  message: string;
  data: {
    trainer_id: string;
    notifications_sent: number;
  };
}

export interface SalaryStatusResponse {
  success: boolean;
  message: string;
  data: {
    trainer_id: string;
    hasSalary: boolean;
    hourly_rate: number | null;
  };
}

export interface SalaryStatisticsResponse {
  success: boolean;
  message: string;
  data: {
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
  };
}

class SalaryService {
  /**
   * Request salary setup (send notification to admin)
   */
  async requestSalary(trainerId: string): Promise<ApiResponse<SalaryRequestResponse>> {
    try {
      const response = await scheduleApiService.post<SalaryRequestResponse>(
        '/salary/request',
        {
          trainer_id: trainerId,
        }
      );

      return {
        success: response.success || false,
        data: response.data,
        message: response.message || 'Salary request sent successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to send salary request',
        data: null,
      };
    }
  }

  /**
   * Get salary status for a trainer
   */
  async getSalaryStatus(trainerId: string): Promise<ApiResponse<SalaryStatusResponse>> {
    try {
      const response = await scheduleApiService.get<SalaryStatusResponse>(
        `/trainers/${trainerId}/salary-status`
      );

      return {
        success: response.success || false,
        data: response.data,
        message: response.message || 'Salary status retrieved successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get salary status',
        data: null,
      };
    }
  }

  /**
   * Get salary statistics for a trainer
   */
  async getSalaryStatistics(
    trainerId: string,
    month?: number,
    year?: number
  ): Promise<ApiResponse<SalaryStatisticsResponse>> {
    try {
      const params = new URLSearchParams();
      if (month) params.append('month', month.toString());
      if (year) params.append('year', year.toString());

      const queryString = params.toString();
      const url = `/salary/statistics/${trainerId}${queryString ? `?${queryString}` : ''}`;

      const response = await scheduleApiService.get<SalaryStatisticsResponse>(url);

      return {
        success: response.success || false,
        data: response.data,
        message: response.message || 'Salary statistics retrieved successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get salary statistics',
        data: null,
      };
    }
  }
}

export const salaryService = new SalaryService();

