import { SERVICE_URLS } from '@/config/environment';
import { ApiResponse, apiService } from './api';

export interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  muscleGroups: string[];
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
  tips: string[];
  imageUrl?: string;
  videoUrl?: string;
}

export interface Workout {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  exercises: WorkoutExercise[];
  calories: number;
  imageUrl?: string;
  isCustom: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExercise {
  exerciseId: string;
  exercise: Exercise;
  sets: number;
  reps?: number;
  duration?: number; // in seconds for time-based exercises
  weight?: number; // in kg
  restTime: number; // in seconds
  notes?: string;
  order: number;
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  workout: Workout;
  userId: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in minutes
  caloriesBurned?: number;
  exercises: WorkoutSessionExercise[];
  notes?: string;
  status: 'in_progress' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSessionExercise {
  exerciseId: string;
  exercise: Exercise;
  sets: WorkoutSet[];
  notes?: string;
  order: number;
}

export interface WorkoutSet {
  setNumber: number;
  reps?: number;
  duration?: number; // in seconds
  weight?: number; // in kg
  restTime?: number; // in seconds
  completed: boolean;
  notes?: string;
}

export interface CreateWorkoutData {
  name: string;
  description: string;
  category: string;
  exercises: Omit<WorkoutExercise, 'exercise'>[];
}

export interface UpdateWorkoutData {
  name?: string;
  description?: string;
  category?: string;
  exercises?: Omit<WorkoutExercise, 'exercise'>[];
}

export class WorkoutService {
  private readonly baseUrl = SERVICE_URLS.MEMBER;
  private readonly basePath = '/workout-plans';

  /**
   * Get all workouts
   */
  async getWorkouts(params?: {
    category?: string;
    difficulty?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<
    ApiResponse<{
      workouts: Workout[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    try {
      const response = await apiService.get<{
        workouts: Workout[];
        total: number;
        page: number;
        limit: number;
      }>(`${this.baseUrl}${this.basePath}`, params);
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get workouts',
        errors: error.errors,
      };
    }
  }

  /**
   * Get workout by ID
   */
  async getWorkoutById(id: string): Promise<ApiResponse<Workout>> {
    try {
      const response = await apiService.get<Workout>(
        `${this.baseUrl}${this.basePath}/${id}`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get workout',
        errors: error.errors,
      };
    }
  }

  /**
   * Create custom workout
   */
  async createWorkout(data: CreateWorkoutData): Promise<ApiResponse<Workout>> {
    try {
      const response = await apiService.post<Workout>(
        `${this.baseUrl}${this.basePath}`,
        data
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create workout',
        errors: error.errors,
      };
    }
  }

  /**
   * Update workout
   */
  async updateWorkout(
    id: string,
    data: UpdateWorkoutData
  ): Promise<ApiResponse<Workout>> {
    try {
      const response = await apiService.put<Workout>(
        `${this.baseUrl}${this.basePath}/${id}`,
        data
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update workout',
        errors: error.errors,
      };
    }
  }

  /**
   * Delete workout
   */
  async deleteWorkout(id: string): Promise<ApiResponse> {
    try {
      const response = await apiService.delete(
        `${this.baseUrl}${this.basePath}/${id}`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete workout',
        errors: error.errors,
      };
    }
  }

  /**
   * Get user's custom workouts
   */
  async getUserWorkouts(): Promise<ApiResponse<Workout[]>> {
    try {
      const response = await apiService.get<Workout[]>(
        `${this.baseUrl}${this.basePath}/my-workouts`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get user workouts',
        errors: error.errors,
      };
    }
  }

  /**
   * Start workout session
   */
  async startWorkoutSession(
    workoutId: string
  ): Promise<ApiResponse<WorkoutSession>> {
    try {
      const response = await apiService.post<WorkoutSession>(
        `${this.baseUrl}${this.basePath}/${workoutId}/start`,
        {}
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to start workout session',
        errors: error.errors,
      };
    }
  }

  /**
   * Update workout session
   */
  async updateWorkoutSession(
    sessionId: string,
    data: Partial<WorkoutSession>
  ): Promise<ApiResponse<WorkoutSession>> {
    try {
      const response = await apiService.put<WorkoutSession>(
        `${this.baseUrl}${this.basePath}/sessions/${sessionId}`,
        data
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update workout session',
        errors: error.errors,
      };
    }
  }

  /**
   * Complete workout session
   */
  async completeWorkoutSession(
    sessionId: string
  ): Promise<ApiResponse<WorkoutSession>> {
    try {
      const response = await apiService.post<WorkoutSession>(
        `${this.baseUrl}${this.basePath}/sessions/${sessionId}/complete`,
        {}
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to complete workout session',
        errors: error.errors,
      };
    }
  }

  /**
   * Get workout sessions
   */
  async getWorkoutSessions(params?: {
    workoutId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<
    ApiResponse<{
      sessions: WorkoutSession[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    try {
      const response = await apiService.get<{
        sessions: WorkoutSession[];
        total: number;
        page: number;
        limit: number;
      }>(`${this.basePath}/sessions`, params);
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get workout sessions',
        errors: error.errors,
      };
    }
  }

  /**
   * Get workout session by ID
   */
  async getWorkoutSessionById(
    id: string
  ): Promise<ApiResponse<WorkoutSession>> {
    try {
      const response = await apiService.get<WorkoutSession>(
        `${this.basePath}/sessions/${id}`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get workout session',
        errors: error.errors,
      };
    }
  }

  /**
   * Get all exercises
   */
  async getExercises(params?: {
    category?: string;
    muscleGroup?: string;
    equipment?: string;
    difficulty?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<
    ApiResponse<{
      exercises: Exercise[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    try {
      const response = await apiService.get<{
        exercises: Exercise[];
        total: number;
        page: number;
        limit: number;
      }>(`${this.basePath}/exercises`, params);
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get exercises',
        errors: error.errors,
      };
    }
  }

  /**
   * Get exercise by ID
   */
  async getExerciseById(id: string): Promise<ApiResponse<Exercise>> {
    try {
      const response = await apiService.get<Exercise>(
        `${this.basePath}/exercises/${id}`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get exercise',
        errors: error.errors,
      };
    }
  }

  /**
   * Get workout categories
   */
  async getWorkoutCategories(): Promise<ApiResponse<string[]>> {
    try {
      const response = await apiService.get<string[]>(
        `${this.basePath}/categories`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get workout categories',
        errors: error.errors,
      };
    }
  }

  /**
   * Get exercise categories
   */
  async getExerciseCategories(): Promise<ApiResponse<string[]>> {
    try {
      const response = await apiService.get<string[]>(
        `${this.basePath}/exercises/categories`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get exercise categories',
        errors: error.errors,
      };
    }
  }

  /**
   * Get muscle groups
   */
  async getMuscleGroups(): Promise<ApiResponse<string[]>> {
    try {
      const response = await apiService.get<string[]>(
        `${this.basePath}/exercises/muscle-groups`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get muscle groups',
        errors: error.errors,
      };
    }
  }
}

// Export singleton instance
export const workoutService = new WorkoutService();
export default workoutService;
