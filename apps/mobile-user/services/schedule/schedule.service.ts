import { Schedule, ScheduleFilters, ScheduleStats } from '@/types/classTypes';
import { scheduleApiService } from './api.service';

class ScheduleService {
  // Get base URL from centralized config
  private get baseUrl() {
    const { SERVICE_URLS } = require('@/config/environment');
    return `${SERVICE_URLS.SCHEDULE}/schedules`;
  }

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
      console.log('[DATE] Getting schedules with filters:', filters);

      const response = await scheduleApiService.get('/schedules', {
        params: filters,
      });

      console.log('[DATE] Schedules API response:', response);

      // Handle different response structures
      let schedules = [];
      if (response.data?.schedules) {
        schedules = response.data.schedules;
      } else if (response.data?.data?.schedules) {
        schedules = response.data.data.schedules;
      } else if (Array.isArray(response.data)) {
        schedules = response.data;
      } else if (Array.isArray(response.data?.data)) {
        schedules = response.data.data;
      }

      console.log('[DATE] Extracted schedules:', schedules.length, 'schedules');

      return {
        success: true,
        data: schedules,
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching schedules:', error);
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
      console.log('[DATE] Getting schedule by ID:', id);

      const response = await scheduleApiService.get(`/schedules/${id}`);

      // Backend returns: { success: true, data: { schedule: ... } }
      // ApiService.handleResponse already unwraps the response.data
      // So response.data is already the inner data object
      const schedule = response.data?.schedule || response.data;

      if (!schedule) {
        return {
          success: false,
          error: 'Schedule data not found in response',
        };
      }

      return {
        success: true,
        data: schedule,
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching schedule:', error);
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
      console.log('[DATE] Getting schedules for date:', date);

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
      console.error('[ERROR] Error fetching schedules by date:', error);
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
      console.log('[DATE] Getting schedules for date range:', {
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
      console.error('[ERROR] Error fetching schedules by date range:', error);
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
      console.log('[DATE] Getting available schedules with filters:', filters);

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
      console.error('[ERROR] Error fetching available schedules:', error);
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
      console.log('[DATE] Getting schedules by category:', category);

      const response = await scheduleApiService.get('/schedules', {
        params: { class_category: category },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching schedules by category:', error);
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
      console.log('[DATE] Getting schedules by trainer:', trainerId);

      const response = await scheduleApiService.get('/schedules', {
        params: { trainer_id: trainerId },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching schedules by trainer:', error);
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
      console.log("[DATE] Getting today's schedules:", today);

      return await this.getSchedulesByDate(today);
    } catch (error: any) {
      console.error("[ERROR] Error fetching today's schedules:", error);
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
      // Week starts on Monday (day 1), not Sunday (day 0)
      // getDay() returns: 0=Sunday, 1=Monday, ..., 6=Saturday
      const dayOfWeek = today.getDay();
      // If Sunday (0), go back 6 days to previous Monday
      // Otherwise, go back (dayOfWeek - 1) days to current week's Monday
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - daysToSubtract);
      // End date is Sunday (6 days after Monday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startDate = startOfWeek.toISOString().split('T')[0];
      const endDate = endOfWeek.toISOString().split('T')[0];

      console.log("[DATE] Getting this week's schedules:", { startDate, endDate });

      return await this.getSchedulesByDateRange(startDate, endDate);
    } catch (error: any) {
      console.error("[ERROR] Error fetching this week's schedules:", error);
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
      console.log('[DATE] Getting schedule statistics');

      const response = await scheduleApiService.get('/schedules/stats');

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching schedule statistics:', error);
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
      console.log('[DATE] Searching schedules with query:', query);

      const response = await scheduleApiService.get('/schedules', {
        params: { search: query },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('[ERROR] Error searching schedules:', error);
      return { success: false, error: error.message };
    }
  }
}

export const scheduleService = new ScheduleService();
export default scheduleService;
