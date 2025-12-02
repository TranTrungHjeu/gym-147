import {
  ClassCategory,
  ClassFilters,
  Difficulty,
  GymClass,
} from '@/types/classTypes';
import { scheduleApiService } from './api.service';

export interface ClassRecommendation {
  type: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  action: string;
  data?: {
    classId?: string;
    classCategory?: string;
    trainerId?: string;
    scheduleId?: string;
    suggestedTime?: string;
    classIds?: string[];
    categories?: string[];
  };
  reasoning?: string;
}

export interface SchedulingSuggestion {
  scheduleId: string;
  className: string;
  category: string;
  startTime: string;
  endTime: string;
  trainer?: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
  room?: {
    id: string;
    name: string;
    capacity: number;
  } | null;
  spotsLeft: number;
  maxCapacity: number;
  score: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  isWaitlist: boolean;
}

export interface SchedulingSuggestionsResponse {
  success: boolean;
  suggestions: SchedulingSuggestion[];
  patterns?: {
    preferredHours: { [hour: number]: number };
    preferredDays: { [day: number]: number };
    preferredCategories: { [category: string]: number };
    averageAttendanceRate: number;
    cancellationRate: number;
  };
  availableCount: number;
  generatedAt: string;
}

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
      console.log('[CLASS] Getting gym classes with filters:', filters);

      const response = await scheduleApiService.get('/classes', {
        params: filters,
      });

      console.log('[CLASS] Classes API response:', response);

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching classes:', error);
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
      console.log('[CLASS] Getting class by ID:', id);

      const response = await scheduleApiService.get(`/classes/${id}`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching class:', error);
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
      console.log('[CLASS] Getting classes by category:', category);

      const response = await scheduleApiService.get('/classes', {
        params: { category, is_active: true },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching classes by category:', error);
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
      console.log('[CLASS] Getting classes by difficulty:', difficulty);

      const response = await scheduleApiService.get('/classes', {
        params: { difficulty, is_active: true },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching classes by difficulty:', error);
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
      console.log('[CLASS] Searching classes with query:', query);

      const response = await scheduleApiService.get('/classes', {
        params: { search: query, is_active: true },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('[ERROR] Error searching classes:', error);
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
      console.log('[CLASS] Getting popular classes, limit:', limit);

      const response = await scheduleApiService.get('/classes/popular', {
        params: { limit },
      });

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching popular classes:', error);
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
      console.log('[CLASS] Getting class categories');

      const response = await scheduleApiService.get('/classes/categories');

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching class categories:', error);
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
      console.log('[CLASS] Getting class statistics');

      const response = await scheduleApiService.get('/classes/stats');

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching class statistics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get AI-powered class recommendations
   * Supports vector-based recommendations (new) and AI-based recommendations
   */
  async getClassRecommendations(
    memberId: string,
    useAI: boolean = true,
    useVector: boolean = true
  ): Promise<{
    success: boolean;
    data?: {
      recommendations: ClassRecommendation[];
      analysis?: any;
      generatedAt?: string;
      method?: string;
    };
    error?: string;
  }> {
    try {
      const params: any = {
        useAI: useAI ? 'true' : 'false',
        useVector: useVector ? 'true' : 'false',
      };
      console.log('[API] [getClassRecommendations] Calling API:', {
        memberId,
        params,
        endpoint: `/classes/members/${memberId}/recommendations`,
      });
      
      const response = await scheduleApiService.get(
        `/classes/members/${memberId}/recommendations`,
        { params }
      );

      console.log('[DATA] [getClassRecommendations] API Response:', {
        hasResponse: !!response,
        hasData: !!response.data,
        responseData: response.data,
      });

      // Extract recommendations from response
      const data = response.data?.data || response.data || {};
      const recommendations = data.recommendations || [];

      console.log('[DATA] [getClassRecommendations] Extracted data:', {
        hasData: !!data,
        recommendationsCount: recommendations.length,
        method: data.method,
        recommendations: recommendations.slice(0, 2), // Log first 2 for debugging
      });

      return {
        success: true,
        data: {
          recommendations,
          analysis: data.analysis,
          generatedAt: data.generatedAt,
          method: data.method, // 'vector_embedding', 'ai_based', or 'rule_based'
        },
      };
    } catch (error: any) {
      console.error('[ERROR] [getClassRecommendations] Error fetching class recommendations:', {
        message: error.message,
        status: error.status,
        response: error.response?.data,
        memberId,
      });
      return {
        success: false,
        error: error.message || 'Failed to fetch recommendations',
        data: {
          recommendations: [],
        },
      };
    }
  }

  /**
   * Get smart scheduling suggestions for optimal booking times
   */
  async getSchedulingSuggestions(
    memberId: string,
    options?: {
      classId?: string;
      category?: string;
      trainerId?: string;
      dateRange?: number;
      useAI?: boolean;
    }
  ): Promise<{
    success: boolean;
    data?: SchedulingSuggestionsResponse;
    error?: string;
  }> {
    try {
      const params: any = {};
      if (options?.classId) params.classId = options.classId;
      if (options?.category) params.category = options.category;
      if (options?.trainerId) params.trainerId = options.trainerId;
      if (options?.dateRange) params.dateRange = options.dateRange.toString();
      params.useAI = options?.useAI !== false ? 'true' : 'false';

      const response = await scheduleApiService.get(
        `/classes/members/${memberId}/scheduling-suggestions`,
        { params }
      );

      // Extract suggestions from response
      const data = response.data?.data || response.data || {};

      return {
        success: true,
        data: {
          success: data.success || true,
          suggestions: data.suggestions || [],
          patterns: data.patterns,
          availableCount: data.availableCount || 0,
          generatedAt: data.generatedAt || new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching scheduling suggestions:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch scheduling suggestions',
        data: {
          success: false,
          suggestions: [],
          availableCount: 0,
          generatedAt: new Date().toISOString(),
        },
      };
    }
  }
}

export const classService = new ClassService();
export default classService;
