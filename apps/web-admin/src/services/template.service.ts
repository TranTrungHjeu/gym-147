import { identityApi } from './api';
import { ApiResponse } from './dashboard.service';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  type: 'WELCOME' | 'PASSWORD_RESET' | 'MEMBERSHIP_EXPIRY' | 'CLASS_REMINDER' | 'PAYMENT_RECEIPT' | 'CUSTOM';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SMSTemplate {
  id: string;
  name: string;
  message: string;
  variables: string[];
  type: 'OTP' | 'REMINDER' | 'NOTIFICATION' | 'CUSTOM';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

class TemplateService {
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
      console.error('Template API Error:', errorData);
      throw new Error(errorData.message || `HTTP error! status: ${error.response?.status}`);
    }
  }

  // Email Templates
  async getEmailTemplates(): Promise<ApiResponse<EmailTemplate[]>> {
    return this.request<EmailTemplate[]>('/templates/email');
  }

  async getEmailTemplate(id: string): Promise<ApiResponse<EmailTemplate>> {
    return this.request<EmailTemplate>(`/templates/email/${id}`);
  }

  async createEmailTemplate(template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<EmailTemplate>> {
    return this.request<EmailTemplate>('/templates/email', 'POST', template);
  }

  async updateEmailTemplate(id: string, template: Partial<EmailTemplate>): Promise<ApiResponse<EmailTemplate>> {
    return this.request<EmailTemplate>(`/templates/email/${id}`, 'PUT', template);
  }

  async deleteEmailTemplate(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/templates/email/${id}`, 'DELETE');
  }

  // SMS Templates
  async getSMSTemplates(): Promise<ApiResponse<SMSTemplate[]>> {
    return this.request<SMSTemplate[]>('/templates/sms');
  }

  async getSMSTemplate(id: string): Promise<ApiResponse<SMSTemplate>> {
    return this.request<SMSTemplate>(`/templates/sms/${id}`);
  }

  async createSMSTemplate(template: Omit<SMSTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<SMSTemplate>> {
    return this.request<SMSTemplate>('/templates/sms', 'POST', template);
  }

  async updateSMSTemplate(id: string, template: Partial<SMSTemplate>): Promise<ApiResponse<SMSTemplate>> {
    return this.request<SMSTemplate>(`/templates/sms/${id}`, 'PUT', template);
  }

  async deleteSMSTemplate(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/templates/sms/${id}`, 'DELETE');
  }
}

export const templateService = new TemplateService();

