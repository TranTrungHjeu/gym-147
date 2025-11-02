import {
  Difficulty,
  WorkoutPlan,
  WorkoutRecommendation,
} from '@/types/workoutTypes';
import { memberApiService } from '../member/api.service';

export interface CreateWorkoutPlanData {
  name: string;
  description?: string;
  difficulty: Difficulty;
  duration_weeks: number;
  exercises: {
    exercise_id: string;
    sets: number;
    reps: string;
    duration_minutes?: number;
    order: number;
  }[];
  target_muscles?: string[];
  equipment_needed?: string[];
  is_template?: boolean;
}

export interface UpdateWorkoutPlanData extends Partial<CreateWorkoutPlanData> {}

class WorkoutPlanService {
  // Get base URL from centralized config
  private get baseUrl() {
    const { SERVICE_URLS } = require('@/config/environment');
    return `${SERVICE_URLS.MEMBER}/workout-plans`;
  }

  /**
   * Get all workout plans
   * @param params - Query parameters for filtering plans (e.g., difficulty, active_only)
   */
  async getWorkoutPlans(
    memberId: string,
    params?: {
      difficulty?: Difficulty;
      active_only?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ success: boolean; data?: WorkoutPlan[]; error?: string }> {
    try {
      // Try different endpoints to get workout plans
      let response;
      try {
        // First try: Get all workout plans (templates)
        response = await memberApiService.get('/workout-plans', { params });
      } catch (error) {
        try {
          // Second try: Member-specific workout plans
          response = await memberApiService.get(
            `/members/${memberId}/workout-plans`,
            { params }
          );
        } catch (memberError) {
          // Both endpoints failed, return empty array instead of throwing
          return { success: true, data: [] };
        }
      }

      // Extract workout plans from response
      const workoutPlans =
        response.data?.data?.workoutPlans ||
        response.data?.workoutPlans ||
        response.data?.data ||
        response.data ||
        [];

      return {
        success: true,
        data: Array.isArray(workoutPlans) ? workoutPlans : [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching workout plans:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get workout plan by ID
   */
  async getWorkoutPlanById(
    id: string
  ): Promise<{ success: boolean; data?: WorkoutPlan; error?: string }> {
    try {
      // Check if it's a mock ID
      if (id.startsWith('mock-')) {
        return {
          success: false,
          error: 'Mock workout plans cannot be fetched from API',
        };
      }

      const response = await memberApiService.get(`/workout-plans/${id}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('❌ Error fetching workout plan by ID:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new workout plan
   */
  async createWorkoutPlan(
    data: CreateWorkoutPlanData
  ): Promise<{ success: boolean; data?: WorkoutPlan; error?: string }> {
    try {
      const response = await memberApiService.post('/workout-plans', data);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing workout plan
   */
  async updateWorkoutPlan(
    id: string,
    data: UpdateWorkoutPlanData
  ): Promise<{ success: boolean; data?: WorkoutPlan; error?: string }> {
    try {
      const response = await memberApiService.put(`/workout-plans/${id}`, data);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Activate workout plan
   */
  async activateWorkoutPlan(
    id: string
  ): Promise<{ success: boolean; data?: WorkoutPlan; error?: string }> {
    try {
      const response = await memberApiService.put(
        `/workout-plans/${id}/activate`
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete workout plan
   */
  async deleteWorkoutPlan(
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await memberApiService.delete(`/workout-plans/${id}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate AI workout plan
   */
  async generateAIWorkoutPlan(
    memberId: string,
    params: {
      goal: string;
      difficulty: Difficulty;
      duration_weeks: number;
    }
  ): Promise<{ success: boolean; data?: WorkoutPlan; error?: string }> {
    try {
      const response = await memberApiService.post(
        `/members/${memberId}/workout-plans/ai`,
        params
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get workout recommendations
   */
  async getWorkoutRecommendations(): Promise<{
    success: boolean;
    data?: WorkoutRecommendation[];
    error?: string;
  }> {
    try {
      // Try different endpoints for recommendations
      const response = await memberApiService.get('/workout-plans');

      // Extract recommendations from workout plans
      const recommendations =
        response.data?.data?.workoutPlans ||
        response.data?.workoutPlans ||
        response.data?.data ||
        response.data ||
        [];

      return {
        success: true,
        data: Array.isArray(recommendations) ? recommendations : [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching recommendations:', error);
      // Return empty array instead of error for recommendations
      return { success: true, data: [] };
    }
  }

  /**
   * Get workout plan progress
   */
  async getWorkoutPlanProgress(
    planId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await memberApiService.get(
        `/workout-plans/${planId}/progress`
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const workoutPlanService = new WorkoutPlanService();
export default workoutPlanService;
