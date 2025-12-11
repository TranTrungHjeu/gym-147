import type { AxiosResponse } from 'axios';
import { memberApi } from './api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface EquipmentUsageLog {
  id: string;
  member_id: string;
  start_time: string;
  end_time?: string;
  member?: {
    id: string;
    full_name: string;
    membership_number: string;
    email: string;
  };
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OUT_OF_ORDER' | 'RESERVED';
  location: string;
  photo?: string; // Real photo URL of the equipment
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  warranty_until?: string;
  sensor_id?: string;
  last_maintenance?: string;
  next_maintenance?: string;
  usage_hours?: number;
  max_weight?: number;
  has_heart_monitor?: boolean;
  has_calorie_counter?: boolean;
  has_rep_counter?: boolean;
  wifi_enabled?: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    usage_logs?: number;
    maintenance_logs?: number;
    queue?: number;
  };
  usage_logs?: EquipmentUsageLog[]; // Last usage log with member info
}

export interface EquipmentUsage {
  id: string;
  equipment_id: string;
  member_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
}

class EquipmentService {
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
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      throw new Error(errorMessage);
    }
  }

  async getAllEquipment(): Promise<
    ApiResponse<Equipment[] | { equipment: Equipment[]; pagination: any }>
  > {
    return this.request<Equipment[] | { equipment: Equipment[]; pagination: any }>('/equipment');
  }

  async getEquipmentById(id: string): Promise<ApiResponse<{ equipment: Equipment } | Equipment>> {
    return this.request<{ equipment: Equipment } | Equipment>(`/equipment/${id}`);
  }

  async createEquipment(data: Partial<Equipment>): Promise<ApiResponse<Equipment>> {
    return this.request<Equipment>('/equipment', 'POST', data);
  }

  async updateEquipment(id: string, data: Partial<Equipment>): Promise<ApiResponse<Equipment>> {
    return this.request<Equipment>(`/equipment/${id}`, 'PUT', data);
  }

  async getMaintenanceLogs(equipmentId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/equipment/${equipmentId}/maintenance`);
  }

  async createMaintenanceLog(equipmentId: string, data: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/equipment/${equipmentId}/maintenance`, 'POST', data);
  }

  async uploadEquipmentPhoto(photo: string): Promise<ApiResponse<{ photo: string; key: string }>> {
    return this.request<{ photo: string; key: string }>('/equipment/photo/upload', 'POST', {
      photo,
    });
  }

  async getEquipmentUsageData(): Promise<
    ApiResponse<
      {
        status: string;
        count: number;
      }[]
    >
  > {
    const response = await this.request<any>('/equipment/usage-stats');

    // Transform response data to chart format
    if (response.success && response.data) {
      // If data is already in correct format, return as is
      if (
        Array.isArray(response.data) &&
        response.data.every((item: any) => item.status && typeof item.count === 'number')
      ) {
        return response;
      }

      // Transform from object format { AVAILABLE: 10, IN_USE: 5, ... }
      if (typeof response.data === 'object' && !Array.isArray(response.data)) {
        const usageData = Object.entries(response.data).map(([status, count]) => ({
          status,
          count: count as number,
        }));
        return {
          ...response,
          data: usageData,
        };
      }
    }

    return response;
  }

  async deleteEquipment(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/equipment/${id}`, 'DELETE');
  }

  async generateQRCode(id: string): Promise<
    ApiResponse<{
      equipment_id: string;
      equipment_name: string;
      sensor_id: string;
      qr_code_data_url: string;
      qr_code_svg: string;
    }>
  > {
    return this.request<{
      equipment_id: string;
      equipment_name: string;
      sensor_id: string;
      qr_code_data_url: string;
      qr_code_svg: string;
    }>(`/equipment/${id}/qr-code`);
  }
}

export const equipmentService = new EquipmentService();
