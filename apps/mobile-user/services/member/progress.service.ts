import { healthService } from './health.service';
import { memberService } from './member.service';

export interface ProgressData {
  weight?: {
    labels: string[];
    datasets: {
      data: number[];
    }[];
  };
  bodyFat?: {
    labels: string[];
    datasets: {
      data: number[];
    }[];
  };
}

export class ProgressService {
  async getProgressData(userId: string): Promise<ProgressData | null> {
    try {
      console.log('📊 Fetching progress data for user:', userId);

      // Get member profile for current weight/body fat
      const profileResponse = await memberService.getMemberProfile();
      const profile = profileResponse?.data;

      console.log('👤 Member profile:', {
        weight: profile?.weight,
        body_fat: profile?.body_fat_percent,
      });

      // Get last 12 months of health metrics
      // Note: Backend will convert user_id to member_id automatically
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);

      const metrics = await healthService.getHealthMetrics(userId, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 1000,
      });

      console.log('📋 Health metrics count:', metrics.length);

      // Group by month
      const weightMap: { [key: string]: number[] } = {};
      const bodyFatMap: { [key: string]: number[] } = {};

      metrics.forEach((metric: any) => {
        const date = new Date(metric.recorded_at || metric.recordedAt);
        const monthKey = date.toISOString().substring(0, 7); // YYYY-MM

        if (metric.metric_type === 'WEIGHT' || metric.metricType === 'WEIGHT') {
          if (!weightMap[monthKey]) weightMap[monthKey] = [];
          weightMap[monthKey].push(metric.value);
        } else if (
          metric.metric_type === 'BODY_FAT' ||
          metric.metricType === 'BODY_FAT'
        ) {
          if (!bodyFatMap[monthKey]) bodyFatMap[monthKey] = [];
          bodyFatMap[monthKey].push(metric.value);
        }
      });

      // Add current month data from profile if available
      const currentMonth = new Date().toISOString().substring(0, 7);
      if (profile?.weight && !weightMap[currentMonth]) {
        weightMap[currentMonth] = [profile.weight];
        console.log('✅ Added current weight from profile:', profile.weight);
      }
      if (profile?.body_fat_percent && !bodyFatMap[currentMonth]) {
        bodyFatMap[currentMonth] = [profile.body_fat_percent];
        console.log(
          '✅ Added current body fat from profile:',
          profile.body_fat_percent
        );
      }

      // Generate labels for last 12 months
      const labels: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        labels.push(date.toISOString().substring(0, 7));
      }

      // Calculate average for each month
      const weightData = labels.map((label) => {
        const values = weightMap[label] || [];
        return values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0;
      });

      const bodyFatData = labels.map((label) => {
        const values = bodyFatMap[label] || [];
        return values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0;
      });

      console.log('📊 Progress data:', {
        weightData,
        bodyFatData,
      });

      return {
        weight: {
          labels,
          datasets: [{ data: weightData }],
        },
        bodyFat: {
          labels,
          datasets: [{ data: bodyFatData }],
        },
      };
    } catch (error) {
      console.error('Error fetching progress data:', error);
      return null;
    }
  }
}

export const progressService = new ProgressService();
