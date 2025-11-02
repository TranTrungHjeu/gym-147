import { memberApiService } from './api.service';

export interface CaloriesData {
  labels: string[];
  datasets: {
    data: number[];
  }[];
}

export class CaloriesService {
  async getCaloriesData(
    memberId: string,
    period: 'week' | 'month' | 'year' = 'week'
  ): Promise<CaloriesData | null> {
    try {
      const response = await memberApiService.get(
        `/members/${memberId}/calories-data?period=${period}`
      );
      return response.data?.data || response.data || null;
    } catch (error) {
      console.error('Error fetching calories data:', error);
      return null;
    }
  }
}

export const caloriesService = new CaloriesService();
