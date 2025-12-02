import type {
  AddMetricRequest,
  HealthAnalytics,
  HealthMetric,
  HealthSummary,
  HealthTrend,
  MetricFilters,
  MetricGoal,
  UpdateMetricRequest,
} from '@/types/healthTypes';
import { ApiResponse } from '../api';
import { memberApiService } from './api.service';

export class HealthService {
  // Health Metrics
  async getHealthMetrics(
    memberId: string,
    filters?: MetricFilters
  ): Promise<HealthMetric[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.source) params.append('source', filters.source);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await memberApiService.get(
        `/members/${memberId}/health-metrics?${params}`
      );

      // Handle different response structures
      let metrics = [];
      if (response.data?.health_metrics) {
        metrics = response.data.health_metrics;
      } else if (response.data?.data?.health_metrics) {
        metrics = response.data.data.health_metrics;
      } else if (Array.isArray(response.data)) {
        metrics = response.data;
      } else if (Array.isArray(response.data?.data)) {
        metrics = response.data.data;
      }

      console.log('[DATA] Extracted health metrics:', metrics.length, 'metrics');
      return metrics as HealthMetric[];
    } catch (error) {
      console.error('Error fetching health metrics:', error);
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
  }

  async getHealthMetricById(
    memberId: string,
    metricId: string
  ): Promise<ApiResponse<HealthMetric>> {
    try {
      return await memberApiService.get<HealthMetric>(
        `/members/${memberId}/health-metrics/${metricId}`
      );
    } catch (error) {
      console.error('Error fetching health metric:', error);
      throw error;
    }
  }

  async addHealthMetric(
    memberId: string,
    metric: AddMetricRequest
  ): Promise<ApiResponse<HealthMetric>> {
    try {
      return await memberApiService.post<HealthMetric>(
        `/members/${memberId}/health-metrics`,
        metric
      );
    } catch (error) {
      console.error('Error adding health metric:', error);
      throw error;
    }
  }

  async updateHealthMetric(
    memberId: string,
    metricId: string,
    updates: UpdateMetricRequest
  ): Promise<ApiResponse<HealthMetric>> {
    try {
      return await memberApiService.put<HealthMetric>(
        `/members/${memberId}/health-metrics/${metricId}`,
        updates
      );
    } catch (error) {
      console.error('Error updating health metric:', error);
      throw error;
    }
  }

  async deleteHealthMetric(
    memberId: string,
    metricId: string
  ): Promise<ApiResponse<void>> {
    try {
      return await memberApiService.delete<void>(
        `/members/${memberId}/health-metrics/${metricId}`
      );
    } catch (error) {
      console.error('Error deleting health metric:', error);
      throw error;
    }
  }

  // Health Trends
  async getHealthTrends(
    memberId: string,
    period: string = 'weekly'
  ): Promise<HealthTrend[]> {
    try {
      // Convert period to number of days
      let periodDays = 30; // default
      switch (period) {
        case 'daily':
          periodDays = 1;
          break;
        case 'weekly':
          periodDays = 7;
          break;
        case 'monthly':
          periodDays = 30;
          break;
        case 'yearly':
          periodDays = 365;
          break;
        default:
          // If it's already a number, use it
          const parsed = parseInt(period);
          if (!isNaN(parsed) && parsed > 0) {
            periodDays = parsed;
          }
      }

      const response = await memberApiService.get(
        `/members/${memberId}/health-trends?period=${periodDays}`
      );

      // Handle different response structures
      let trends = [];
      if (response.data?.trends) {
        trends = response.data.trends;
      } else if (response.data?.data?.trends) {
        trends = response.data.data.trends;
      } else if (Array.isArray(response.data)) {
        trends = response.data;
      } else if (Array.isArray(response.data?.data)) {
        trends = response.data.data;
      }

      console.log('[DATA] Extracted health trends:', trends.length, 'trends');
      return trends as HealthTrend[];
    } catch (error) {
      console.error('Error fetching health trends:', error);
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
  }

  async getHealthTrend(
    memberId: string,
    type: string,
    period: string = 'weekly'
  ): Promise<HealthTrend> {
    try {
      // Convert period to number of days
      let periodDays = 30; // default
      switch (period) {
        case 'daily':
          periodDays = 1;
          break;
        case 'weekly':
          periodDays = 7;
          break;
        case 'monthly':
          periodDays = 30;
          break;
        case 'yearly':
          periodDays = 365;
          break;
        default:
          // If it's already a number, use it
          const parsed = parseInt(period);
          if (!isNaN(parsed) && parsed > 0) {
            periodDays = parsed;
          }
      }

      const response = await memberApiService.get(
        `/members/${memberId}/health-trends/${type}?period=${periodDays}`
      );
      return response.data as HealthTrend;
    } catch (error) {
      console.error('Error fetching health trend:', error);
      // Return empty trend instead of throwing
      return {
        type: type,
        period: period,
        direction: 'STABLE',
        changePercentage: 0,
        startValue: 0,
        endValue: 0,
        dataPoints: [],
      } as HealthTrend;
    }
  }

  // Health Summary
  async getHealthSummary(
    memberId: string
  ): Promise<ApiResponse<HealthSummary>> {
    try {
      return await memberApiService.get<HealthSummary>(
        `/members/${memberId}/health-summary`
      );
    } catch (error) {
      console.error('Error fetching health summary:', error);
      throw error;
    }
  }

  // Metric Goals
  async getMetricGoals(memberId: string): Promise<ApiResponse<MetricGoal[]>> {
    try {
      return await memberApiService.get<MetricGoal[]>(
        `/members/${memberId}/metric-goals`
      );
    } catch (error) {
      console.error('Error fetching metric goals:', error);
      throw error;
    }
  }

  async getMetricGoalById(
    memberId: string,
    goalId: string
  ): Promise<ApiResponse<MetricGoal>> {
    try {
      return await memberApiService.get<MetricGoal>(
        `/members/${memberId}/metric-goals/${goalId}`
      );
    } catch (error) {
      console.error('Error fetching metric goal:', error);
      throw error;
    }
  }

  async createMetricGoal(
    memberId: string,
    goal: Omit<MetricGoal, 'id' | 'memberId' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<MetricGoal>> {
    try {
      return await memberApiService.post<MetricGoal>(
        `/members/${memberId}/metric-goals`,
        goal
      );
    } catch (error) {
      console.error('Error creating metric goal:', error);
      throw error;
    }
  }

  async updateMetricGoal(
    memberId: string,
    goalId: string,
    updates: Partial<MetricGoal>
  ): Promise<ApiResponse<MetricGoal>> {
    try {
      return await memberApiService.put<MetricGoal>(
        `/members/${memberId}/metric-goals/${goalId}`,
        updates
      );
    } catch (error) {
      console.error('Error updating metric goal:', error);
      throw error;
    }
  }

  async deleteMetricGoal(
    memberId: string,
    goalId: string
  ): Promise<ApiResponse<void>> {
    try {
      return await memberApiService.delete<void>(
        `/members/${memberId}/metric-goals/${goalId}`
      );
    } catch (error) {
      console.error('Error deleting metric goal:', error);
      throw error;
    }
  }

  // Health Analytics
  async getHealthAnalytics(
    memberId: string,
    period: string = 'monthly'
  ): Promise<ApiResponse<HealthAnalytics>> {
    try {
      return await memberApiService.get<HealthAnalytics>(
        `/members/${memberId}/health-analytics?period=${period}`
      );
    } catch (error) {
      console.error('Error fetching health analytics:', error);
      throw error;
    }
  }

  // Health Insights
  async getHealthInsights(
    memberId: string,
    period: string = 'monthly'
  ): Promise<ApiResponse<string[]>> {
    try {
      return await memberApiService.get<string[]>(
        `/members/${memberId}/health-insights?period=${period}`
      );
    } catch (error) {
      console.error('Error fetching health insights:', error);
      throw error;
    }
  }

  // Health Recommendations
  async getHealthRecommendations(
    memberId: string
  ): Promise<ApiResponse<string[]>> {
    try {
      return await memberApiService.get<string[]>(
        `/members/${memberId}/health-recommendations`
      );
    } catch (error) {
      console.error('Error fetching health recommendations:', error);
      throw error;
    }
  }

  // Health Export
  async exportHealthData(
    memberId: string,
    startDate: string,
    endDate: string,
    format: 'csv' | 'pdf' | 'excel'
  ): Promise<ApiResponse<Blob>> {
    try {
      return await memberApiService.get<Blob>(
        `/members/${memberId}/health-export?startDate=${startDate}&endDate=${endDate}&format=${format}`,
        {
          responseType: 'blob',
        }
      );
    } catch (error) {
      console.error('Error exporting health data:', error);
      throw error;
    }
  }

  // Health Sync
  async syncHealthData(
    memberId: string,
    deviceType: string
  ): Promise<ApiResponse<void>> {
    try {
      return await memberApiService.post<void>(
        `/members/${memberId}/health-sync`,
        {
          deviceType,
        }
      );
    } catch (error) {
      console.error('Error syncing health data:', error);
      throw error;
    }
  }

  // Health Reminders
  async getHealthReminders(memberId: string): Promise<ApiResponse<any[]>> {
    try {
      return await memberApiService.get<any[]>(
        `/members/${memberId}/health-reminders`
      );
    } catch (error) {
      console.error('Error fetching health reminders:', error);
      throw error;
    }
  }

  async createHealthReminder(
    memberId: string,
    reminder: any
  ): Promise<ApiResponse<any>> {
    try {
      return await memberApiService.post<any>(
        `/members/${memberId}/health-reminders`,
        reminder
      );
    } catch (error) {
      console.error('Error creating health reminder:', error);
      throw error;
    }
  }

  async updateHealthReminder(
    memberId: string,
    reminderId: string,
    updates: any
  ): Promise<ApiResponse<any>> {
    try {
      return await memberApiService.put<any>(
        `/members/${memberId}/health-reminders/${reminderId}`,
        updates
      );
    } catch (error) {
      console.error('Error updating health reminder:', error);
      throw error;
    }
  }

  async deleteHealthReminder(
    memberId: string,
    reminderId: string
  ): Promise<ApiResponse<void>> {
    try {
      return await memberApiService.delete<void>(
        `/members/${memberId}/health-reminders/${reminderId}`
      );
    } catch (error) {
      console.error('Error deleting health reminder:', error);
      throw error;
    }
  }
}

export const healthService = new HealthService();
