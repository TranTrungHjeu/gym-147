import { identityApi } from './api';
import { ApiResponse } from './dashboard.service';

export interface ScheduledReport {
  id: string;
  name: string;
  report_type: 'MEMBERS' | 'REVENUE' | 'CLASSES' | 'EQUIPMENT' | 'SYSTEM' | 'CUSTOM';
  format: 'PDF' | 'EXCEL' | 'CSV';
  schedule: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
    day_of_week?: number;
    day_of_month?: number;
    time: string;
    timezone: string;
  };
  recipients: string[];
  filters?: any;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

class ScheduledReportService {
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      let response;
      switch (method) {
        case 'POST':
          response = await identityApi.post<ApiResponse<T>>(endpoint, data);
          break;
        case 'PUT':
          response = await identityApi.put<ApiResponse<T>>(endpoint, data);
          break;
        case 'DELETE':
          response = await identityApi.delete<ApiResponse<T>>(endpoint);
          break;
        default:
          response = await identityApi.get<ApiResponse<T>>(endpoint);
      }
      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data || { message: error.message || 'Unknown error' };
      console.error('Scheduled Report Service Error:', errorData);
      throw new Error(errorData.message || `HTTP error! status: ${error.response?.status}`);
    }
  }

  async getScheduledReports(): Promise<ApiResponse<ScheduledReport[]>> {
    return this.request<ScheduledReport[]>('/scheduled-reports');
  }

  async getScheduledReport(id: string): Promise<ApiResponse<ScheduledReport>> {
    return this.request<ScheduledReport>(`/scheduled-reports/${id}`);
  }

  async createScheduledReport(data: Omit<ScheduledReport, 'id' | 'created_at' | 'updated_at' | 'last_run_at' | 'next_run_at'>): Promise<ApiResponse<ScheduledReport>> {
    return this.request<ScheduledReport>('/scheduled-reports', 'POST', data);
  }

  async updateScheduledReport(id: string, data: Partial<ScheduledReport>): Promise<ApiResponse<ScheduledReport>> {
    return this.request<ScheduledReport>(`/scheduled-reports/${id}`, 'PUT', data);
  }

  async deleteScheduledReport(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/scheduled-reports/${id}`, 'DELETE');
  }

  async runScheduledReport(id: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.request<{ success: boolean; message: string }>(`/scheduled-reports/${id}/run`, 'POST');
  }
}

export const scheduledReportService = new ScheduledReportService();

