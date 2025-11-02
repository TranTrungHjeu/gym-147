import { memberApiService } from './api.service';

export interface DashboardData {
  total_members: number;
  active_members: number;
  new_members_this_month: number;
  total_check_ins_today: number;
  upcoming_classes: any[]; // Define a proper type for this
  recent_activities: any[]; // Define a proper type for this
  member_birthdays_this_month: any[]; // Define a proper type for this
  activities: any[]; // Assuming this is for the home screen activity feed
}

export interface MemberAnalytics {
  total_members: number;
  active_members: number;
  new_members_by_month: { month: string; count: number }[];
  member_demographics: { gender: string; count: number }[];
  membership_status_distribution: { status: string; count: number }[];
}

export interface SessionAnalytics {
  total_sessions: number;
  average_session_duration: number;
  peak_check_in_times: { hour: number; count: number }[];
  sessions_by_day_of_week: { day: string; count: number }[];
  sessions_by_month: { month: string; count: number }[];
}

export interface HealthAnalytics {
  average_bmi: number;
  bmi_distribution: { category: string; count: number }[];
  average_weight: number;
  weight_trends: { date: string; value: number }[];
}

class AnalyticsService {
  // Get base URL from centralized config
  private get baseUrl() {
    const { SERVICE_URLS } = require('@/config/environment');
    return `${SERVICE_URLS.MEMBER}/analytics`;
  }

  /**
   * Get dashboard data for home screen (admin view)
   */
  async getDashboardData(): Promise<{
    success: boolean;
    data?: DashboardData;
    error?: string;
  }> {
    try {
      const response = await memberApiService.get('/analytics/dashboard');
      return { success: true, data: response.data as DashboardData };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get member-specific dashboard data for home screen
   */
  async getMemberDashboardData(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await memberApiService.get(
        '/analytics/member-dashboard'
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get member analytics
   */
  async getMemberAnalytics(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<{ success: boolean; data?: MemberAnalytics; error?: string }> {
    try {
      const response = await memberApiService.get('/analytics/members', {
        params,
      });
      return { success: true, data: response.data as MemberAnalytics };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get session analytics
   */
  async getSessionAnalytics(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<{ success: boolean; data?: SessionAnalytics; error?: string }> {
    try {
      const response = await memberApiService.get('/analytics/sessions', {
        params,
      });
      return { success: true, data: response.data as SessionAnalytics };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get health analytics
   */
  async getHealthAnalytics(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<{ success: boolean; data?: HealthAnalytics; error?: string }> {
    try {
      const response = await memberApiService.get('/analytics/health', {
        params,
      });
      return { success: true, data: response.data as HealthAnalytics };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
