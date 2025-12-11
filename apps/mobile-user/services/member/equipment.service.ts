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

    // Import at runtime to avoid circular dependency
    const { SERVICE_URLS } = require('@/config/environment');
    this.socket = io(SERVICE_URLS.MEMBER);

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

  // Subscribe to user-specific queue notifications
  // Note: Socket rooms use user_id (from Identity Service), not member_id
  // REST API endpoints use member_id (Member.id)
  subscribeToUserQueue(
    userId: string,
    callbacks: {
      onYourTurn?: (data: any) => void;
      onEquipmentAvailable?: (data: any) => void;
      onPositionChanged?: (data: any) => void;
    }
  ) {
    if (!this.socket) this.initWebSocket();

    // Subscribe to user-specific room (uses user_id from Identity Service)
    // Backend emits to user:${user_id} room
    this.socket?.emit('subscribe:user', userId);

    // Listen for queue events
    if (callbacks.onYourTurn) {
      this.socket?.on('queue:your_turn', callbacks.onYourTurn);
    }
    if (callbacks.onEquipmentAvailable) {
      this.socket?.on('equipment:available', callbacks.onEquipmentAvailable);
    }
    if (callbacks.onPositionChanged) {
      this.socket?.on('queue:position_changed', callbacks.onPositionChanged);
    }
  }

  unsubscribeFromUserQueue(userId: string) {
    this.socket?.emit('unsubscribe:user', userId);
    this.socket?.off('queue:your_turn');
    this.socket?.off('equipment:available');
    this.socket?.off('queue:position_changed');
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

  async updateActivityData(
    memberId: string,
    usageId: string,
    data?: {
      heart_rate_avg?: number;
      heart_rate_max?: number;
      sensor_data?: any;
    }
  ) {
    return apiService.post<{ usage: EquipmentUsage }>(
      `/members/${memberId}/equipment/update-activity`,
      { usage_id: usageId, ...data }
    );
  }

  async stopEquipmentUsage(memberId: string, usageId: string, data?: any) {
    return apiService.post<{ usage: EquipmentUsage }>(
      `/members/${memberId}/equipment/stop`,
      { usage_id: usageId, ...data }
    );
  }

  async getActiveUsage(equipmentId: string, memberId: string) {
    return apiService.get<{ activeUsage: EquipmentUsage | null }>(
      `/equipment/${equipmentId}/active-usage/${memberId}`
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

  /**
   * IMPROVEMENT: Get equipment availability prediction
   * GET /equipment/:id/availability
   */
  async getEquipmentAvailability(equipmentId: string) {
    return apiService.get<{
      available: boolean;
      estimatedAvailableAt?: string;
      estimatedWaitTime?: number; // in minutes
      currentUser?: {
        member_id: string;
        started_at: string;
        estimated_end_at: string;
      };
    }>(`/equipment/${equipmentId}/availability`);
  }

  /**
   * IMPROVEMENT: Get queue analytics
   * GET /equipment/:id/queue/analytics
   */
  async getQueueAnalytics(equipmentId: string) {
    return apiService.get<{
      averageWaitTime: number; // in minutes
      averageDuration: number; // in minutes
      currentQueueLength: number;
      historicalSessionsCount: number;
      peakHours?: Array<{ hour: number; count: number }>;
    }>(`/equipment/${equipmentId}/queue/analytics`);
  }

  /**
   * IMPROVEMENT: Get queue position prediction
   * GET /equipment/:id/queue/prediction?position=[position]
   */
  async getQueuePositionPrediction(equipmentId: string, position: number) {
    return apiService.get<{
      estimatedWaitTime: number; // in minutes
      estimatedTurnAt: string; // ISO timestamp
      confidence: number; // 0-1
    }>(`/equipment/${equipmentId}/queue/prediction`, { position });
  }
}

export const equipmentService = new EquipmentService();
