import { identityApi } from './api';
import { ApiResponse } from './dashboard.service';

export interface Backup {
  id: string;
  name: string;
  type: 'FULL' | 'INCREMENTAL' | 'DATABASE_ONLY' | 'FILES_ONLY';
  size: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface RestoreRequest {
  backup_id: string;
  restore_type: 'FULL' | 'PARTIAL';
  tables?: string[];
}

class BackupService {
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
      console.error('Backup Service Error:', errorData);
      throw new Error(errorData.message || `HTTP error! status: ${error.response?.status}`);
    }
  }

  async getBackups(): Promise<ApiResponse<Backup[]>> {
    return this.request<Backup[]>('/backups');
  }

  async getBackup(id: string): Promise<ApiResponse<Backup>> {
    return this.request<Backup>(`/backups/${id}`);
  }

  async createBackup(data: {
    name: string;
    type: 'FULL' | 'INCREMENTAL' | 'DATABASE_ONLY' | 'FILES_ONLY';
  }): Promise<ApiResponse<Backup>> {
    return this.request<Backup>('/backups', 'POST', data);
  }

  async deleteBackup(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/backups/${id}`, 'DELETE');
  }

  async downloadBackup(id: string): Promise<Blob> {
    const response = await identityApi.get(`/backups/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async restoreBackup(data: RestoreRequest): Promise<ApiResponse<{ status: string; message: string }>> {
    return this.request<{ status: string; message: string }>('/backups/restore', 'POST', data);
  }

  async getBackupStatus(id: string): Promise<ApiResponse<Backup>> {
    return this.request<Backup>(`/backups/${id}/status`);
  }
}

export const backupService = new BackupService();

