import { memberApiService } from '../member/api.service';

// ============================================
//  TYPES
// ============================================

export interface QueueEntry {
  id: string;
  member_id: string;
  equipment_id: string;
  position: number;
  status: 'WAITING' | 'NOTIFIED' | 'EXPIRED' | 'CANCELLED' | 'COMPLETED';
  joined_at: string;
  notified_at?: string;
  expires_at?: string;
  member?: {
    id: string;
    full_name: string;
    profile_photo?: string;
  };
  equipment?: {
    id: string;
    name: string;
    category: string;
  };
}

export interface JoinQueueResponse {
  queue_id: string;
  position: number;
  equipment: {
    id: string;
    name: string;
    category: string;
  };
  estimated_wait: number; // in minutes
}

export interface QueuePositionResponse {
  in_queue: boolean;
  queue_id?: string;
  position?: number;
  total_in_queue?: number;
  status?: string;
  equipment?: {
    id: string;
    name: string;
    category: string;
    status: string;
  };
  joined_at?: string;
  notified_at?: string;
  expires_at?: string;
  estimated_wait_minutes?: number;
  message?: string;
}

export interface EquipmentQueueResponse {
  queue_length: number;
  queue: QueueEntry[];
}

// ============================================
//  QUEUE SERVICE
// ============================================

class QueueService {
  /**
   * Join equipment queue
   */
  async joinQueue(
    equipment_id: string
  ): Promise<{ success: boolean; data?: JoinQueueResponse; message?: string }> {
    try {
      const response = await memberApiService.post('/queue/join', {
        equipment_id,
      });

      return {
        success: response.success,
        data: response.data,
        message: response.message,
      };
    } catch (error: any) {
      console.error('Join queue error:', error);
      return {
        success: false,
        message: error.message || 'Failed to join queue',
      };
    }
  }

  /**
   * Leave equipment queue
   */
  async leaveQueue(
    equipment_id: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await memberApiService.post('/queue/leave', {
        equipment_id,
      });

      return {
        success: response.success,
        message: response.message,
      };
    } catch (error: any) {
      console.error('Leave queue error:', error);
      return {
        success: false,
        message: error.message || 'Failed to leave queue',
      };
    }
  }

  /**
   * Get my position in queue for specific equipment
   */
  async getQueuePosition(
    equipment_id: string
  ): Promise<{
    success: boolean;
    data?: QueuePositionResponse;
    message?: string;
  }> {
    try {
      const response = await memberApiService.get(
        `/queue/position/${equipment_id}`
      );

      return {
        success: response.success,
        data: response.data,
        message: response.message,
      };
    } catch (error: any) {
      console.error('Get queue position error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get queue position',
      };
    }
  }

  /**
   * Get all people in queue for specific equipment
   */
  async getEquipmentQueue(
    equipment_id: string
  ): Promise<{
    success: boolean;
    data?: EquipmentQueueResponse;
    message?: string;
  }> {
    try {
      const response = await memberApiService.get(
        `/queue/equipment/${equipment_id}`
      );

      return {
        success: response.success,
        data: response.data,
        message: response.message,
      };
    } catch (error: any) {
      console.error('Get equipment queue error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get equipment queue',
      };
    }
  }
}

export const queueService = new QueueService();
export default queueService;

