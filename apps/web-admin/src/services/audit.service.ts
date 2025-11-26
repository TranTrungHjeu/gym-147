import { identityApi } from './api';
import { ApiResponse } from './dashboard.service';

export interface AuditLog {
  id: string;
  user_id: string;
  user_name?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuditLogFilters {
  user_id?: string;
  action?: string;
  resource_type?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

class AuditService {
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      let response;
      if (method === 'POST') {
        response = await identityApi.post<ApiResponse<T>>(endpoint, data);
      } else {
        response = await identityApi.get<ApiResponse<T>>(endpoint);
      }
      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data || { message: error.message || 'Unknown error' };
      console.error('Audit Service Error:', errorData);
      throw new Error(errorData.message || `HTTP error! status: ${error.response?.status}`);
    }
  }

  async getAuditLogs(filters?: AuditLogFilters): Promise<ApiResponse<{ logs: AuditLog[]; total: number; page: number; limit: number }>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    return this.request<{ logs: AuditLog[]; total: number; page: number; limit: number }>(`/audit-logs${queryString ? `?${queryString}` : ''}`);
  }

  async getAuditLog(id: string): Promise<ApiResponse<AuditLog>> {
    return this.request<AuditLog>(`/audit-logs/${id}`);
  }

  async exportAuditLogs(filters?: AuditLogFilters): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    params.append('export', 'true');
    const response = await identityApi.get(`/audit-logs?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }
}

export const auditService = new AuditService();

