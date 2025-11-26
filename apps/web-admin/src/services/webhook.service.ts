import { identityApi } from './api';
import { ApiResponse } from './dashboard.service';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  is_active: boolean;
  retry_count: number;
  last_triggered_at?: string;
  last_success_at?: string;
  last_failure_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: any;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  response_code?: number;
  response_body?: string;
  attempts: number;
  created_at: string;
  updated_at: string;
}

class WebhookService {
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
      console.error('Webhook Service Error:', errorData);
      throw new Error(errorData.message || `HTTP error! status: ${error.response?.status}`);
    }
  }

  async getWebhooks(): Promise<ApiResponse<Webhook[]>> {
    return this.request<Webhook[]>('/webhooks');
  }

  async getWebhook(id: string): Promise<ApiResponse<Webhook>> {
    return this.request<Webhook>(`/webhooks/${id}`);
  }

  async createWebhook(data: {
    name: string;
    url: string;
    events: string[];
    secret?: string;
  }): Promise<ApiResponse<Webhook>> {
    return this.request<Webhook>('/webhooks', 'POST', data);
  }

  async updateWebhook(id: string, data: Partial<Webhook>): Promise<ApiResponse<Webhook>> {
    return this.request<Webhook>(`/webhooks/${id}`, 'PUT', data);
  }

  async deleteWebhook(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/webhooks/${id}`, 'DELETE');
  }

  async getWebhookEvents(webhookId: string, page = 1, limit = 20): Promise<ApiResponse<{ events: WebhookEvent[]; total: number; page: number; limit: number }>> {
    return this.request<{ events: WebhookEvent[]; total: number; page: number; limit: number }>(`/webhooks/${webhookId}/events?page=${page}&limit=${limit}`);
  }

  async testWebhook(id: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.request<{ success: boolean; message: string }>(`/webhooks/${id}/test`, 'POST');
  }
}

export const webhookService = new WebhookService();

