import {
  Equipment,
  EquipmentAnalytics,
  EquipmentFilters,
  EquipmentReservation,
  EquipmentStats,
  EquipmentUsage,
  MaintenanceAlert,
  MaintenanceLog,
  MemberEquipmentStats,
  StartEquipmentUsageRequest,
  StopEquipmentUsageRequest,
  UsageFilters,
} from '@/types/equipmentTypes';
import { memberApiService } from './api.service';

class EquipmentService {
  private baseUrl = 'http://10.0.2.2:3002/equipment'; // Member Service

  /**
   * Get all equipment with optional filters
   * @param filters - Optional filters for equipment
   */
  async getEquipment(filters?: EquipmentFilters): Promise<{
    success: boolean;
    data?: Equipment[];
    error?: string;
  }> {
    try {
      console.log('🏋️ Getting equipment with filters:', filters);

      const response = await memberApiService.get('/equipment', {
        params: filters,
      });

      console.log('🏋️ Equipment API response:', response);

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching equipment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get equipment by ID
   */
  async getEquipmentById(id: string): Promise<{
    success: boolean;
    data?: Equipment;
    error?: string;
  }> {
    try {
      console.log('🏋️ Getting equipment by ID:', id);

      const response = await memberApiService.get(`/equipment/${id}`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error fetching equipment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get equipment by category
   */
  async getEquipmentByCategory(category: string): Promise<{
    success: boolean;
    data?: Equipment[];
    error?: string;
  }> {
    try {
      console.log('🏋️ Getting equipment by category:', category);

      const response = await memberApiService.get('/equipment', {
        params: { category },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching equipment by category:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available equipment
   */
  async getAvailableEquipment(): Promise<{
    success: boolean;
    data?: Equipment[];
    error?: string;
  }> {
    try {
      console.log('🏋️ Getting available equipment');

      const response = await memberApiService.get('/equipment', {
        params: { available_only: true },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching available equipment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start equipment usage
   */
  async startEquipmentUsage(
    memberId: string,
    usageData: StartEquipmentUsageRequest
  ): Promise<{
    success: boolean;
    data?: EquipmentUsage;
    error?: string;
  }> {
    try {
      console.log('🏋️ Starting equipment usage:', { memberId, usageData });

      const response = await memberApiService.post(
        `/members/${memberId}/equipment/start`,
        usageData
      );

      console.log('🏋️ Equipment usage started:', response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error starting equipment usage:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop equipment usage
   */
  async stopEquipmentUsage(
    memberId: string,
    usageId: string,
    stopData: StopEquipmentUsageRequest
  ): Promise<{
    success: boolean;
    data?: EquipmentUsage;
    error?: string;
  }> {
    try {
      console.log('🏋️ Stopping equipment usage:', {
        memberId,
        usageId,
        stopData,
      });

      const response = await memberApiService.post(
        `/members/${memberId}/equipment/stop`,
        { usage_id: usageId, ...stopData }
      );

      console.log('🏋️ Equipment usage stopped:', response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error stopping equipment usage:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get member's equipment usage history
   */
  async getMemberUsageHistory(
    memberId: string,
    filters?: UsageFilters
  ): Promise<{
    success: boolean;
    data?: EquipmentUsage[];
    error?: string;
  }> {
    try {
      console.log('🏋️ Getting member usage history:', { memberId, filters });

      const response = await memberApiService.get(
        `/members/${memberId}/equipment-usage`,
        {
          params: filters,
        }
      );

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching member usage history:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get member's equipment usage statistics
   */
  async getMemberUsageStats(memberId: string): Promise<{
    success: boolean;
    data?: MemberEquipmentStats;
    error?: string;
  }> {
    try {
      console.log('🏋️ Getting member usage stats:', memberId);

      const response = await memberApiService.get(
        `/members/${memberId}/equipment-usage/stats`
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error fetching member usage stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get equipment statistics
   */
  async getEquipmentStats(): Promise<{
    success: boolean;
    data?: EquipmentStats;
    error?: string;
  }> {
    try {
      console.log('🏋️ Getting equipment statistics');

      const response = await memberApiService.get('/equipment/stats');

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error fetching equipment statistics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get equipment analytics
   */
  async getEquipmentAnalytics(): Promise<{
    success: boolean;
    data?: EquipmentAnalytics;
    error?: string;
  }> {
    try {
      console.log('🏋️ Getting equipment analytics');

      const response = await memberApiService.get('/equipment/analytics');

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error fetching equipment analytics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search equipment
   */
  async searchEquipment(query: string): Promise<{
    success: boolean;
    data?: Equipment[];
    error?: string;
  }> {
    try {
      console.log('🏋️ Searching equipment with query:', query);

      const response = await memberApiService.get('/equipment', {
        params: { search: query },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error searching equipment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get equipment reservations
   */
  async getEquipmentReservations(memberId: string): Promise<{
    success: boolean;
    data?: EquipmentReservation[];
    error?: string;
  }> {
    try {
      console.log('🏋️ Getting equipment reservations for member:', memberId);

      const response = await memberApiService.get(
        `/members/${memberId}/equipment-reservations`
      );

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching equipment reservations:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create equipment reservation
   */
  async createEquipmentReservation(
    memberId: string,
    reservationData: {
      equipment_id: string;
      start_time: string;
      end_time: string;
    }
  ): Promise<{
    success: boolean;
    data?: EquipmentReservation;
    error?: string;
  }> {
    try {
      console.log('🏋️ Creating equipment reservation:', {
        memberId,
        reservationData,
      });

      const response = await memberApiService.post(
        `/members/${memberId}/equipment-reservations`,
        reservationData
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error creating equipment reservation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel equipment reservation
   */
  async cancelEquipmentReservation(
    memberId: string,
    reservationId: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('🏋️ Cancelling equipment reservation:', {
        memberId,
        reservationId,
      });

      await memberApiService.delete(
        `/members/${memberId}/equipment-reservations/${reservationId}`
      );

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error cancelling equipment reservation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get maintenance logs for equipment
   */
  async getEquipmentMaintenanceLogs(equipmentId: string): Promise<{
    success: boolean;
    data?: MaintenanceLog[];
    error?: string;
  }> {
    try {
      console.log('🏋️ Getting maintenance logs for equipment:', equipmentId);

      const response = await memberApiService.get(
        `/equipment/${equipmentId}/maintenance`
      );

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching maintenance logs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get maintenance alerts
   */
  async getMaintenanceAlerts(): Promise<{
    success: boolean;
    data?: MaintenanceAlert[];
    error?: string;
  }> {
    try {
      console.log('🏋️ Getting maintenance alerts');

      const response = await memberApiService.get(
        '/equipment/maintenance/alerts'
      );

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching maintenance alerts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current usage for equipment
   */
  async getCurrentUsage(equipmentId: string): Promise<{
    success: boolean;
    data?: EquipmentUsage[];
    error?: string;
  }> {
    try {
      console.log('🏋️ Getting current usage for equipment:', equipmentId);

      const response = await memberApiService.get(
        `/equipment/${equipmentId}/current-usage`
      );

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching current usage:', error);
      return { success: false, error: error.message };
    }
  }
}

export const equipmentService = new EquipmentService();
export default equipmentService;
