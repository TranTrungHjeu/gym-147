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
      console.error('[ERROR] Error fetching workout plans:', error);
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
      console.error('[ERROR] Error fetching workout plan by ID:', error);
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
      custom_prompt?: string;
    }
  ): Promise<{
    success: boolean;
    data?: WorkoutPlan;
    error?: string;
    isMaxPlansReached?: boolean;
    currentCount?: number;
    maxAllowed?: number;
    membershipType?: string;
  }> {
    try {
      // Route backend: /members/:id/workout-plans/ai
      // Use 10 minutes timeout for AI generation (600 seconds) to match backend server timeout
      const response = await memberApiService.post(
        `/members/${memberId}/workout-plans/ai`,
        params,
        { timeout: 600000 } // 10 minutes for AI processing
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      console.log('[DEBUG] Error caught in generateAIWorkoutPlan:', {
        status: error.status,
        message: error.message,
        error: error,
        errorKeys: Object.keys(error),
      });

      // Check if it's a max plans limit error (403)
      // ApiService throws: { message: "...", status: 403, errors: [...] }
      // Backend message format: "You have reached the maximum number of workout plans (1) for your membership type (PREMIUM). Upgrade to VIP to create up to 3 plans."
      const errorMessage = error.message || '';
      const isMaxPlansError =
        error.status === 403 ||
        errorMessage.includes('maximum number of workout plans') ||
        errorMessage.includes('reached the maximum');

      if (isMaxPlansError) {
        // Parse error message to extract data
        // Format: "You have reached the maximum number of workout plans (X) for your membership type (TYPE)."
        const countMatch = errorMessage.match(/workout plans \((\d+)\)/);
        const typeMatch = errorMessage.match(/membership type \(([A-Z]+)\)/);
        const upgradeMatch = errorMessage.match(/create up to (\d+) plans/);

        const currentCount = countMatch
          ? parseInt(countMatch[1], 10)
          : undefined;
        const membershipType = typeMatch ? typeMatch[1] : undefined;
        const maxAllowed = upgradeMatch
          ? parseInt(upgradeMatch[1], 10)
          : currentCount || 0;

        console.log('[DEBUG] Detected max plans limit:', {
          currentCount,
          maxAllowed,
          membershipType,
          errorMessage,
        });

        return {
          success: false,
          isMaxPlansReached: true,
          currentCount: currentCount || 0,
          maxAllowed: maxAllowed || 0,
          membershipType: membershipType || 'BASIC',
          error: errorMessage || 'Maximum workout plans reached',
        };
      }

      // Parse error message from backend
      let parsedErrorMessage =
        error.message || 'Failed to generate AI workout plan';

      // Check if it's a JSON parsing error from backend
      if (
        parsedErrorMessage.includes('AI response parsing failed') ||
        (parsedErrorMessage.includes('Expected') &&
          parsedErrorMessage.includes('JSON'))
      ) {
        parsedErrorMessage =
          'AI generated invalid response format. Please try again with a different prompt.';
      } else if (
        parsedErrorMessage.includes('500') ||
        parsedErrorMessage.includes('Internal Server Error')
      ) {
        parsedErrorMessage =
          'Server error occurred. The AI service may be experiencing issues. Please try again later.';
      }

      console.error('[ERROR] AI Workout Plan Generation Error:', {
        error: parsedErrorMessage,
        originalError: error.message,
        status: error.status,
      });

      return { success: false, error: parsedErrorMessage };
    }
  }

  /**
   * Get AI-powered workout recommendations
   */
  async getWorkoutRecommendations(
    memberId: string,
    useAI: boolean = true
  ): Promise<{
    success: boolean;
    data?: {
      recommendations: Array<{
        type: string;
        priority: 'HIGH' | 'MEDIUM' | 'LOW';
        title: string;
        message: string;
        action: string;
        data?: any;
        reasoning?: string;
      }>;
      analysis?: any;
      generatedAt?: string;
    };
    error?: string;
  }> {
    try {
      const params = useAI ? { useAI: 'true' } : { useAI: 'false' };
      const response = await memberApiService.get(
        `/members/${memberId}/workout-recommendations`,
        params
      );

      // Extract recommendations from response
      const data = response.data?.data || response.data || {};
      const recommendations = data.recommendations || [];

      return {
        success: true,
        data: {
          recommendations,
          analysis: data.analysis,
          generatedAt: data.generatedAt,
        },
      };
    } catch (error: any) {
      // Handle 503 Service Unavailable gracefully - don't throw error
      const isServiceUnavailable =
        error.response?.status === 503 ||
        error.message?.includes('503') ||
        error.message?.includes('Service Unavailable') ||
        error.message?.includes('service unavailable');

      if (isServiceUnavailable) {
        console.warn(
          '[WARNING] Recommendations service unavailable:',
          error.message
        );
        // Return empty recommendations instead of error
        return {
          success: true, // Return success to avoid showing error to user
          data: {
            recommendations: [],
          },
        };
      }

      console.error('[ERROR] Error fetching workout recommendations:', error);
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

  /**
   * Complete workout plan session and calculate calories
   */
  async completeWorkoutSession(
    memberId: string,
    data: {
      workout_plan_id: string;
      completed_exercises: Array<{
        id?: string;
        name: string;
        sets?: number;
        reps?: number | string;
        duration?: number;
        category?: string;
        intensity?: string;
        rest?: number | string;
      }>;
      duration_minutes?: number;
    }
  ): Promise<{
    success: boolean;
    data?: {
      session: any;
      workoutPlan: { id: string; name: string };
      calories: { from_workout: number; total_in_session: number };
      completed_exercises: number;
      total_exercises: number;
    };
    error?: string;
  }> {
    try {
      console.log('[WORKOUT] Completing workout session:', {
        memberId,
        workout_plan_id: data.workout_plan_id,
        completed_exercises_count: data.completed_exercises?.length || 0,
        duration_minutes: data.duration_minutes,
      });

      const response = await memberApiService.post(
        `/members/${memberId}/workout-sessions/complete`,
        data
      );

      console.log('[WORKOUT] Workout session completed successfully:', {
        hasData: !!response.data,
        calories: response.data?.calories,
      });

      // Check if response has data
      if (!response.data) {
        console.warn('[WORKOUT] Response missing data field:', response);
        return {
          success: false,
          error: 'Invalid response from server. Please try again.',
        };
      }

      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('[WORKOUT] Error completing workout session:', {
        error,
        message: error.message,
        status: error.status,
        responseData: error.response?.data || error.data,
      });

      // Extract error message from various possible locations
      let errorMessage = 'Failed to complete workout session';

      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export const workoutPlanService = new WorkoutPlanService();
export default workoutPlanService;
