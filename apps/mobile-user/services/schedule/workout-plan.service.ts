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
  private baseUrl = 'http://10.0.2.2:3002/workout-plans'; // Direct connection to Member Service

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
      console.log('📋 Getting workout plans for member:', memberId);
      console.log('📋 Params:', params);

      // Try different endpoints to get workout plans
      let response;
      try {
        // First try: Get all workout plans (templates)
        response = await memberApiService.get('/workout-plans', { params });
        console.log('📋 Workout plans API response (templates):', response);
      } catch (error) {
        console.log(
          '📋 Templates endpoint failed, trying member-specific endpoint...'
        );
        try {
          // Second try: Member-specific workout plans
          response = await memberApiService.get(
            `/members/${memberId}/workout-plans`,
            { params }
          );
          console.log('📋 Workout plans API response (member):', response);
        } catch (memberError) {
          console.log('📋 Both endpoints failed, returning empty array');
          // Both endpoints failed, return empty array instead of throwing
          return { success: true, data: [] };
        }
      }

      console.log('📋 Response data:', response.data);

      // Extract workout plans from response
      const workoutPlans =
        response.data?.data?.workoutPlans ||
        response.data?.workoutPlans ||
        response.data?.data ||
        response.data ||
        [];

      console.log('📋 Extracted workout plans:', workoutPlans.length, 'plans');

      return {
        success: true,
        data: Array.isArray(workoutPlans) ? workoutPlans : [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching workout plans:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
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
      console.log('📋 Getting workout plan by ID:', id);

      // Check if it's a mock ID
      if (id.startsWith('mock-')) {
        console.log('❌ Mock ID detected, cannot fetch from API');
        return {
          success: false,
          error: 'Mock workout plans cannot be fetched from API',
        };
      }

      const response = await memberApiService.get(`/workout-plans/${id}`);
      console.log('📋 Workout plan API response:', response);

      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('❌ Error fetching workout plan by ID:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
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
  async generateAIWorkoutPlan(params: {
    goal: string;
    difficulty: Difficulty;
    duration_weeks: number;
  }): Promise<{ success: boolean; data?: WorkoutPlan; error?: string }> {
    try {
      const response = await memberApiService.post(
        '/workout-plans/generate-ai',
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
      console.log('📋 Getting workout recommendations...');

      // Try different endpoints for recommendations
      const response = await memberApiService.get('/workout-plans');

      console.log('📋 Recommendations API response:', response);
      console.log('📋 Recommendations data:', response.data);

      // Extract recommendations from workout plans
      const recommendations =
        response.data?.data?.workoutPlans ||
        response.data?.workoutPlans ||
        response.data?.data ||
        response.data ||
        [];

      console.log(
        '📋 Extracted recommendations:',
        recommendations.length,
        'recommendations'
      );

      return {
        success: true,
        data: Array.isArray(recommendations) ? recommendations : [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching recommendations:', error);
      console.error('❌ Error details:', error.response?.data || error.message);

      // Return empty array instead of error for recommendations
      console.log('📋 Returning empty recommendations array');
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
