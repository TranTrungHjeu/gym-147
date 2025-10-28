import type {
  Equipment,
  EquipmentIssueReport,
  EquipmentQueue,
  EquipmentUsage,
} from '@/types/equipmentTypes';
import { Socket, io } from 'socket.io-client';
import apiService from './api.service';

class EquipmentService {
  private socket: Socket | null = null;

  // Initialize WebSocket
  initWebSocket() {
    if (this.socket) return;

    const MEMBER_SERVICE_URL =
      process.env.EXPO_PUBLIC_MEMBER_SERVICE_URL || 'http://192.168.2.19:3002';
    this.socket = io(MEMBER_SERVICE_URL);

    this.socket.on('connect', () => {
      console.log('Equipment WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Equipment WebSocket disconnected');
    });
  }

  subscribeToEquipment(equipmentId: string, callback: (data: any) => void) {
    if (!this.socket) this.initWebSocket();
    this.socket?.emit('subscribe:equipment', equipmentId);
    this.socket?.on('equipment:status:changed', callback);
    this.socket?.on('equipment:queue:updated', callback);
  }

  unsubscribeFromEquipment(equipmentId: string) {
    this.socket?.emit('unsubscribe:equipment', equipmentId);
    this.socket?.off('equipment:status:changed');
    this.socket?.off('equipment:queue:updated');
  }

  // Equipment CRUD
  async getEquipment(params?: {
    category?: string;
    status?: string;
    location?: string;
    page?: number;
    limit?: number;
  }) {
    return apiService.get<{ equipment: Equipment[]; pagination: any }>(
      '/equipment',
      params
    );
  }

  async getEquipmentById(id: string) {
    return apiService.get<{ equipment: Equipment }>(`/equipment/${id}`);
  }

  // Usage tracking
  async startEquipmentUsage(
    memberId: string,
    equipmentId: string,
    data?: { weight_used?: number; reps_completed?: number }
  ) {
    return apiService.post<{ usage: EquipmentUsage }>(
      `/members/${memberId}/equipment/start`,
      { equipment_id: equipmentId, ...data }
    );
  }

  async stopEquipmentUsage(memberId: string, usageId: string, data?: any) {
    return apiService.post<{ usage: EquipmentUsage }>(
      `/members/${memberId}/equipment/stop`,
      { usage_id: usageId, ...data }
    );
  }

  async getMemberEquipmentUsage(
    memberId: string,
    params?: {
      equipment_id?: string;
      start_date?: string;
      end_date?: string;
      page?: number;
    }
  ) {
    return apiService.get<{ usage: EquipmentUsage[]; pagination: any }>(
      `/members/${memberId}/equipment-usage`,
      params
    );
  }

  async getEquipmentUsageStats(memberId: string, period: number = 30) {
    return apiService.get<{
      stats: any;
      equipmentStats: any[];
      recentUsage: EquipmentUsage[];
    }>(`/members/${memberId}/equipment-usage/stats`, { period });
  }

  // Queue management
  async joinQueue(equipmentId: string, memberId: string) {
    return apiService.post<{ queue: EquipmentQueue }>(
      `/equipment/${equipmentId}/queue/join`,
      { member_id: memberId }
    );
  }

  async leaveQueue(queueId: string) {
    return apiService.delete(`/equipment/queue/${queueId}`);
  }

  async getEquipmentQueue(equipmentId: string) {
    return apiService.get<{ queue: EquipmentQueue[] }>(
      `/equipment/${equipmentId}/queue`
    );
  }

  // Issue reporting
  async reportIssue(
    equipmentId: string,
    data: {
      member_id: string;
      issue_type: string;
      description: string;
      severity: string;
      images?: string[];
    }
  ) {
    return apiService.post<{ report: EquipmentIssueReport }>(
      `/equipment/${equipmentId}/issues`,
      data
    );
  }

  async getEquipmentIssues(equipmentId: string, status?: string) {
    return apiService.get<{ issues: EquipmentIssueReport[] }>(
      `/equipment/${equipmentId}/issues`,
      { status }
    );
  }

  // QR validation
  async validateQRCode(qrCode: string) {
    return apiService.post<{ equipment: Equipment }>('/equipment/validate-qr', {
      qr_code: qrCode,
    });
  }

  // Maintenance
  async getMaintenanceLogs(equipmentId: string) {
    return apiService.get<{ logs: any[] }>(
      `/equipment/${equipmentId}/maintenance`
    );
  }
}

export const equipmentService = new EquipmentService();
