import { memberApiService } from './api.service';

export interface WorkoutFrequencyData {
  labels: string[];
  datasets: {
    data: number[];
  }[];
}

export class WorkoutFrequencyService {
  async getWorkoutFrequency(
    memberId: string,
    period: 'week' | 'month' | 'year' = 'week'
  ): Promise<WorkoutFrequencyData | null> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/workout-frequency?period=${period}`
      );
      return response.data?.data || response.data || null;
    } catch (error) {
      console.error('Error fetching workout frequency:', error);
      return null;
    }
  }
}

export const workoutFrequencyService = new WorkoutFrequencyService();
