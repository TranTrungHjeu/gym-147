import {
  ClassCategory,
  Trainer,
  TrainerFilters,
  TrainerStatus,
} from '@/types/classTypes';
import { scheduleApiService } from './api.service';

class TrainerService {
  // Get base URL from centralized config
  private get baseUrl() {
    const { SERVICE_URLS } = require('@/config/environment');
    return `${SERVICE_URLS.SCHEDULE}/trainers`;
  }

  /**
   * Get all trainers
   * @param filters - Optional filters for trainers
   */
  async getTrainers(filters?: TrainerFilters): Promise<{
    success: boolean;
    data?: Trainer[];
    error?: string;
  }> {
    try {
      console.log('👨‍🏫 Getting trainers with filters:', filters);

      const response = await scheduleApiService.get('/trainers', {
        params: filters,
      });

      console.log('👨‍🏫 Trainers API response:', response);

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching trainers:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get trainer by ID
   */
  async getTrainerById(id: string): Promise<{
    success: boolean;
    data?: Trainer;
    error?: string;
  }> {
    try {
      console.log('👨‍🏫 Getting trainer by ID:', id);

      const response = await scheduleApiService.get(`/trainers/${id}`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error fetching trainer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get trainers by specialization
   */
  async getTrainersBySpecialization(specialization: ClassCategory): Promise<{
    success: boolean;
    data?: Trainer[];
    error?: string;
  }> {
    try {
      console.log('👨‍🏫 Getting trainers by specialization:', specialization);

      const response = await scheduleApiService.get('/trainers', {
        params: { specializations: [specialization] },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching trainers by specialization:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active trainers
   */
  async getActiveTrainers(): Promise<{
    success: boolean;
    data?: Trainer[];
    error?: string;
  }> {
    try {
      console.log('👨‍🏫 Getting active trainers');

      const response = await scheduleApiService.get('/trainers', {
        params: { status: TrainerStatus.ACTIVE },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching active trainers:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get top-rated trainers
   */
  async getTopRatedTrainers(limit: number = 10): Promise<{
    success: boolean;
    data?: Trainer[];
    error?: string;
  }> {
    try {
      console.log('👨‍🏫 Getting top-rated trainers, limit:', limit);

      const response = await scheduleApiService.get('/trainers/top-rated', {
        params: { limit },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching top-rated trainers:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search trainers by name
   */
  async searchTrainers(query: string): Promise<{
    success: boolean;
    data?: Trainer[];
    error?: string;
  }> {
    try {
      console.log('👨‍🏫 Searching trainers with query:', query);

      const response = await scheduleApiService.get('/trainers', {
        params: { search: query },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error searching trainers:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get trainer's upcoming classes
   */
  async getTrainerUpcomingClasses(trainerId: string): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      console.log('👨‍🏫 Getting upcoming classes for trainer:', trainerId);

      const response = await scheduleApiService.get(
        `/trainers/${trainerId}/classes`,
        {
          params: {
            date_from: new Date().toISOString(),
            status: 'SCHEDULED',
          },
        }
      );

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching trainer upcoming classes:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get trainer's class history
   */
  async getTrainerClassHistory(trainerId: string): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      console.log('👨‍🏫 Getting class history for trainer:', trainerId);

      const response = await scheduleApiService.get(
        `/trainers/${trainerId}/classes`,
        {
          params: {
            date_to: new Date().toISOString(),
            status: 'COMPLETED',
          },
        }
      );

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching trainer class history:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get trainer statistics
   */
  async getTrainerStats(trainerId: string): Promise<{
    success: boolean;
    data?: {
      total_classes: number;
      upcoming_classes: number;
      completed_classes: number;
      average_rating: number;
      total_students: number;
      specializations: ClassCategory[];
    };
    error?: string;
  }> {
    try {
      console.log('👨‍🏫 Getting stats for trainer:', trainerId);

      const response = await scheduleApiService.get(
        `/trainers/${trainerId}/stats`
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error fetching trainer stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all specializations
   */
  async getSpecializations(): Promise<{
    success: boolean;
    data?: ClassCategory[];
    error?: string;
  }> {
    try {
      console.log('👨‍🏫 Getting all specializations');

      const response = await scheduleApiService.get(
        '/trainers/specializations'
      );

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching specializations:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get trainer certifications
   */
  async getTrainerCertifications(trainerId: string): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      console.log('👨‍🏫 Getting certifications for trainer:', trainerId);

      const response = await scheduleApiService.get(
        `/trainers/${trainerId}/certifications`
      );

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching trainer certifications:', error);
      return { success: false, error: error.message };
    }
  }
}

export const trainerService = new TrainerService();
export default trainerService;
