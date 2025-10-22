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
      return response.data as HealthMetric[];
    } catch (error) {
      console.error('Error fetching health metrics:', error);
      throw error;
    }
  }

  async getHealthMetricById(
    memberId: string,
    metricId: string
  ): Promise<HealthMetric> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/health-metrics/${metricId}`
      );
      return response.data as HealthMetric;
    } catch (error) {
      console.error('Error fetching health metric:', error);
      throw error;
    }
  }

  async addHealthMetric(
    memberId: string,
    metric: AddMetricRequest
  ): Promise<HealthMetric> {
    try {
      const response = await memberApiService.post(
        `/members/${memberId}/health-metrics`,
        metric
      );
      return response.data as HealthMetric;
    } catch (error) {
      console.error('Error adding health metric:', error);
      throw error;
    }
  }

  async updateHealthMetric(
    memberId: string,
    metricId: string,
    updates: UpdateMetricRequest
  ): Promise<HealthMetric> {
    try {
      const response = await memberApiService.put(
        `/members/${memberId}/health-metrics/${metricId}`,
        updates
      );
      return response.data as HealthMetric;
    } catch (error) {
      console.error('Error updating health metric:', error);
      throw error;
    }
  }

  async deleteHealthMetric(memberId: string, metricId: string): Promise<void> {
    try {
      await memberApiService.delete(
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
      const response = await memberApiService.get(
        `/members/${memberId}/health-trends?period=${period}`
      );
      return response.data as HealthTrend[];
    } catch (error) {
      console.error('Error fetching health trends:', error);
      throw error;
    }
  }

  async getHealthTrend(
    memberId: string,
    type: string,
    period: string = 'weekly'
  ): Promise<HealthTrend> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/health-trends/${type}?period=${period}`
      );
      return response.data as HealthTrend;
    } catch (error) {
      console.error('Error fetching health trend:', error);
      throw error;
    }
  }

  // Health Summary
  async getHealthSummary(memberId: string): Promise<HealthSummary> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/health-summary`
      );
      return response.data as HealthSummary;
    } catch (error) {
      console.error('Error fetching health summary:', error);
      throw error;
    }
  }

  // Metric Goals
  async getMetricGoals(memberId: string): Promise<MetricGoal[]> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/metric-goals`
      );
      return response.data as MetricGoal[];
    } catch (error) {
      console.error('Error fetching metric goals:', error);
      throw error;
    }
  }

  async getMetricGoalById(
    memberId: string,
    goalId: string
  ): Promise<MetricGoal> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/metric-goals/${goalId}`
      );
      return response.data as MetricGoal;
    } catch (error) {
      console.error('Error fetching metric goal:', error);
      throw error;
    }
  }

  async createMetricGoal(
    memberId: string,
    goal: Omit<MetricGoal, 'id' | 'memberId' | 'createdAt' | 'updatedAt'>
  ): Promise<MetricGoal> {
    try {
      const response = await memberApiService.post(
        `/members/${memberId}/metric-goals`,
        goal
      );
      return response.data as MetricGoal;
    } catch (error) {
      console.error('Error creating metric goal:', error);
      throw error;
    }
  }

  async updateMetricGoal(
    memberId: string,
    goalId: string,
    updates: Partial<MetricGoal>
  ): Promise<MetricGoal> {
    try {
      const response = await memberApiService.put(
        `/members/${memberId}/metric-goals/${goalId}`,
        updates
      );
      return response.data as MetricGoal;
    } catch (error) {
      console.error('Error updating metric goal:', error);
      throw error;
    }
  }

  async deleteMetricGoal(memberId: string, goalId: string): Promise<void> {
    try {
      await memberApiService.delete(
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
  ): Promise<HealthAnalytics> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/health-analytics?period=${period}`
      );
      return response.data as HealthAnalytics;
    } catch (error) {
      console.error('Error fetching health analytics:', error);
      throw error;
    }
  }

  // Health Insights
  async getHealthInsights(
    memberId: string,
    period: string = 'monthly'
  ): Promise<string[]> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/health-insights?period=${period}`
      );
      return response.data as string[];
    } catch (error) {
      console.error('Error fetching health insights:', error);
      throw error;
    }
  }

  // Health Recommendations
  async getHealthRecommendations(memberId: string): Promise<string[]> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/health-recommendations`
      );
      return response.data as string[];
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
  ): Promise<Blob> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/health-export?startDate=${startDate}&endDate=${endDate}&format=${format}`,
        {
          responseType: 'blob',
        }
      );
      return response.data as Blob;
    } catch (error) {
      console.error('Error exporting health data:', error);
      throw error;
    }
  }

  // Health Sync
  async syncHealthData(memberId: string, deviceType: string): Promise<void> {
    try {
      await memberApiService.post(`/members/${memberId}/health-sync`, {
        deviceType,
      });
    } catch (error) {
      console.error('Error syncing health data:', error);
      throw error;
    }
  }

  // Health Reminders
  async getHealthReminders(memberId: string): Promise<any[]> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/health-reminders`
      );
      return response.data as any[];
    } catch (error) {
      console.error('Error fetching health reminders:', error);
      throw error;
    }
  }

  async createHealthReminder(memberId: string, reminder: any): Promise<any> {
    try {
      const response = await memberApiService.post(
        `/members/${memberId}/health-reminders`,
        reminder
      );
      return response.data as any;
    } catch (error) {
      console.error('Error creating health reminder:', error);
      throw error;
    }
  }

  async updateHealthReminder(
    memberId: string,
    reminderId: string,
    updates: any
  ): Promise<any> {
    try {
      const response = await memberApiService.put(
        `/members/${memberId}/health-reminders/${reminderId}`,
        updates
      );
      return response.data as any;
    } catch (error) {
      console.error('Error updating health reminder:', error);
      throw error;
    }
  }

  async deleteHealthReminder(
    memberId: string,
    reminderId: string
  ): Promise<void> {
    try {
      await memberApiService.delete(
        `/members/${memberId}/health-reminders/${reminderId}`
      );
    } catch (error) {
      console.error('Error deleting health reminder:', error);
      throw error;
    }
  }
}

export const healthService = new HealthService();
