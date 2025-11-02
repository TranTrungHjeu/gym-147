import {
  ClassCategory,
  ClassFilters,
  Difficulty,
  GymClass,
} from '@/types/classTypes';
import { scheduleApiService } from './api.service';

class ClassService {
  // Get base URL from centralized config
  private get baseUrl() {
    const { SERVICE_URLS } = require('@/config/environment');
    return `${SERVICE_URLS.SCHEDULE}/classes`;
  }

  /**
   * Get all gym classes
   * @param filters - Optional filters for classes
   */
  async getClasses(filters?: ClassFilters): Promise<{
    success: boolean;
    data?: GymClass[];
    error?: string;
  }> {
    try {
      console.log('📚 Getting gym classes with filters:', filters);

      const response = await scheduleApiService.get('/classes', {
        params: filters,
      });

      console.log('📚 Classes API response:', response);

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching classes:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get class by ID
   */
  async getClassById(id: string): Promise<{
    success: boolean;
    data?: GymClass;
    error?: string;
  }> {
    try {
      console.log('📚 Getting class by ID:', id);

      const response = await scheduleApiService.get(`/classes/${id}`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error fetching class:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get classes by category
   */
  async getClassesByCategory(category: ClassCategory): Promise<{
    success: boolean;
    data?: GymClass[];
    error?: string;
  }> {
    try {
      console.log('📚 Getting classes by category:', category);

      const response = await scheduleApiService.get('/classes', {
        params: { category, is_active: true },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching classes by category:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get classes by difficulty
   */
  async getClassesByDifficulty(difficulty: Difficulty): Promise<{
    success: boolean;
    data?: GymClass[];
    error?: string;
  }> {
    try {
      console.log('📚 Getting classes by difficulty:', difficulty);

      const response = await scheduleApiService.get('/classes', {
        params: { difficulty, is_active: true },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching classes by difficulty:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search classes by name
   */
  async searchClasses(query: string): Promise<{
    success: boolean;
    data?: GymClass[];
    error?: string;
  }> {
    try {
      console.log('📚 Searching classes with query:', query);

      const response = await scheduleApiService.get('/classes', {
        params: { search: query, is_active: true },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error searching classes:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get popular classes
   */
  async getPopularClasses(limit: number = 10): Promise<{
    success: boolean;
    data?: GymClass[];
    error?: string;
  }> {
    try {
      console.log('📚 Getting popular classes, limit:', limit);

      const response = await scheduleApiService.get('/classes/popular', {
        params: { limit },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching popular classes:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get class categories
   */
  async getClassCategories(): Promise<{
    success: boolean;
    data?: ClassCategory[];
    error?: string;
  }> {
    try {
      console.log('📚 Getting class categories');

      const response = await scheduleApiService.get('/classes/categories');

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching class categories:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get class statistics
   */
  async getClassStats(): Promise<{
    success: boolean;
    data?: {
      total_classes: number;
      active_classes: number;
      categories_count: { [key in ClassCategory]?: number };
      difficulty_distribution: { [key in Difficulty]?: number };
    };
    error?: string;
  }> {
    try {
      console.log('📚 Getting class statistics');

      const response = await scheduleApiService.get('/classes/stats');

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error fetching class statistics:', error);
      return { success: false, error: error.message };
    }
  }
}

export const classService = new ClassService();
export default classService;
