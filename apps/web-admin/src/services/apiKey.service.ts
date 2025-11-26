import { identityApi } from './api';
import { ApiResponse } from './dashboard.service';

export interface APIKey {
  id: string;
  name: string;
  key: string;
  key_prefix: string;
  permissions: string[];
  rate_limit?: number;
  expires_at?: string;
  last_used_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

class APIKeyService {
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
      console.error('API Key Service Error:', errorData);
      throw new Error(errorData.message || `HTTP error! status: ${error.response?.status}`);
    }
  }

  async getAPIKeys(): Promise<ApiResponse<APIKey[]>> {
    return this.request<APIKey[]>('/api-keys');
  }

  async getAPIKey(id: string): Promise<ApiResponse<APIKey>> {
    return this.request<APIKey>(`/api-keys/${id}`);
  }

  async createAPIKey(data: {
    name: string;
    permissions: string[];
    rate_limit?: number;
    expires_at?: string;
  }): Promise<ApiResponse<APIKey & { key: string }>> {
    return this.request<APIKey & { key: string }>('/api-keys', 'POST', data);
  }

  async updateAPIKey(id: string, data: Partial<APIKey>): Promise<ApiResponse<APIKey>> {
    return this.request<APIKey>(`/api-keys/${id}`, 'PUT', data);
  }

  async deleteAPIKey(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api-keys/${id}`, 'DELETE');
  }

  async revokeAPIKey(id: string): Promise<ApiResponse<APIKey>> {
    return this.request<APIKey>(`/api-keys/${id}/revoke`, 'POST');
  }
}

export const apiKeyService = new APIKeyService();

