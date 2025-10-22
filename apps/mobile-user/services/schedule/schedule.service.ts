import { Schedule, ScheduleFilters, ScheduleStats } from '@/types/classTypes';
import { scheduleApiService } from './api.service';

class ScheduleService {
  private baseUrl = 'http://10.0.2.2:3001/schedules'; // Schedule Service

  /**
   * Get all schedules with optional filters
   * @param filters - Optional filters for schedules
   */
  async getSchedules(filters?: ScheduleFilters): Promise<{
    success: boolean;
    data?: Schedule[];
    error?: string;
  }> {
    try {
      console.log('📅 Getting schedules with filters:', filters);

      const response = await scheduleApiService.get('/schedules', {
        params: filters,
      });

      console.log('📅 Schedules API response:', response);

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching schedules:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(id: string): Promise<{
    success: boolean;
    data?: Schedule;
    error?: string;
  }> {
    try {
      console.log('📅 Getting schedule by ID:', id);

      const response = await scheduleApiService.get(`/schedules/${id}`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error fetching schedule:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get schedules for a specific date
   */
  async getSchedulesByDate(date: string): Promise<{
    success: boolean;
    data?: Schedule[];
    error?: string;
  }> {
    try {
      console.log('📅 Getting schedules for date:', date);

      const response = await scheduleApiService.get('/schedules', {
        params: {
          date_from: date,
          date_to: date,
        },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching schedules by date:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get schedules for a date range
   */
  async getSchedulesByDateRange(
    startDate: string,
    endDate: string
  ): Promise<{
    success: boolean;
    data?: Schedule[];
    error?: string;
  }> {
    try {
      console.log('📅 Getting schedules for date range:', {
        startDate,
        endDate,
      });

      const response = await scheduleApiService.get('/schedules', {
        params: {
          date_from: startDate,
          date_to: endDate,
        },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching schedules by date range:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available schedules (not fully booked)
   */
  async getAvailableSchedules(filters?: ScheduleFilters): Promise<{
    success: boolean;
    data?: Schedule[];
    error?: string;
  }> {
    try {
      console.log('📅 Getting available schedules with filters:', filters);

      const response = await scheduleApiService.get('/schedules', {
        params: {
          ...filters,
          available_only: true,
        },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching available schedules:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get schedules by class category
   */
  async getSchedulesByCategory(category: string): Promise<{
    success: boolean;
    data?: Schedule[];
    error?: string;
  }> {
    try {
      console.log('📅 Getting schedules by category:', category);

      const response = await scheduleApiService.get('/schedules', {
        params: { class_category: category },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching schedules by category:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get schedules by trainer
   */
  async getSchedulesByTrainer(trainerId: string): Promise<{
    success: boolean;
    data?: Schedule[];
    error?: string;
  }> {
    try {
      console.log('📅 Getting schedules by trainer:', trainerId);

      const response = await scheduleApiService.get('/schedules', {
        params: { trainer_id: trainerId },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching schedules by trainer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get today's schedules
   */
  async getTodaySchedules(): Promise<{
    success: boolean;
    data?: Schedule[];
    error?: string;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log("📅 Getting today's schedules:", today);

      return await this.getSchedulesByDate(today);
    } catch (error: any) {
      console.error("❌ Error fetching today's schedules:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get this week's schedules
   */
  async getThisWeekSchedules(): Promise<{
    success: boolean;
    data?: Schedule[];
    error?: string;
  }> {
    try {
      const today = new Date();
      const startOfWeek = new Date(
        today.setDate(today.getDate() - today.getDay())
      );
      const endOfWeek = new Date(
        today.setDate(today.getDate() - today.getDay() + 6)
      );

      const startDate = startOfWeek.toISOString().split('T')[0];
      const endDate = endOfWeek.toISOString().split('T')[0];

      console.log("📅 Getting this week's schedules:", { startDate, endDate });

      return await this.getSchedulesByDateRange(startDate, endDate);
    } catch (error: any) {
      console.error("❌ Error fetching this week's schedules:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get schedule statistics
   */
  async getScheduleStats(): Promise<{
    success: boolean;
    data?: ScheduleStats;
    error?: string;
  }> {
    try {
      console.log('📅 Getting schedule statistics');

      const response = await scheduleApiService.get('/schedules/stats');

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error fetching schedule statistics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search schedules
   */
  async searchSchedules(query: string): Promise<{
    success: boolean;
    data?: Schedule[];
    error?: string;
  }> {
    try {
      console.log('📅 Searching schedules with query:', query);

      const response = await scheduleApiService.get('/schedules', {
        params: { search: query },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error searching schedules:', error);
      return { success: false, error: error.message };
    }
  }
}

export const scheduleService = new ScheduleService();
export default scheduleService;
