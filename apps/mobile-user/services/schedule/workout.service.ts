import { SERVICE_URLS } from '@/config/environment';
import { ApiResponse, scheduleApiService } from './api.service';

export interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  muscleGroups: string[];
  equipment: string[];
  instructions: string[];
  tips?: string[];
  videoUrl?: string;
  imageUrl?: string;
}

export interface Workout {
  id: string;
  name: string;
  description: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration: number; // in minutes
  exercises: WorkoutExercise[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  order: number;
  sets: number;
  reps: string;
  weight?: number;
  duration?: number; // in seconds
  restTime?: number; // in seconds
  notes?: string;
  exercise: Exercise;
}

export interface CreateWorkoutData {
  name: string;
  description: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration: number;
  exercises: {
    exerciseId: string;
    order: number;
    sets: number;
    reps: string;
    weight?: number;
    duration?: number;
    restTime?: number;
    notes?: string;
  }[];
}

export interface UpdateWorkoutData {
  name?: string;
  description?: string;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration?: number;
  exercises?: {
    exerciseId: string;
    order: number;
    sets: number;
    reps: string;
    weight?: number;
    duration?: number;
    restTime?: number;
    notes?: string;
  }[];
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in minutes
  completed: boolean;
  notes?: string;
  exercises: WorkoutSessionExercise[];
}

export interface WorkoutSessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  sets: WorkoutSet[];
  notes?: string;
  exercise: Exercise;
}

export interface WorkoutSet {
  id: string;
  sessionExerciseId: string;
  setNumber: number;
  reps: number;
  weight?: number;
  duration?: number; // in seconds
  restTime?: number; // in seconds
  completed: boolean;
  notes?: string;
}

class WorkoutService {
  private baseUrl = SERVICE_URLS.SCHEDULE;

  /**
   * Get all workouts
   */
  async getWorkouts(params?: {
    difficulty?: string;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Workout[]>> {
    try {
      const response = await scheduleApiService.get('/workouts', { params });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch workouts',
      };
    }
  }

  /**
   * Get workout by ID
   */
  async getWorkoutById(id: string): Promise<ApiResponse<Workout>> {
    try {
      const response = await scheduleApiService.get(`/workouts/${id}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch workout',
      };
    }
  }

  /**
   * Create new workout
   */
  async createWorkout(data: CreateWorkoutData): Promise<ApiResponse<Workout>> {
    try {
      const response = await scheduleApiService.post('/workouts', data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create workout',
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
      const response = await scheduleApiService.put(`/workouts/${id}`, data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update workout',
      };
    }
  }

  /**
   * Delete workout
   */
  async deleteWorkout(id: string): Promise<ApiResponse<void>> {
    try {
      await scheduleApiService.delete(`/workouts/${id}`);
      return {
        success: true,
        message: 'Workout deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete workout',
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
      const response = await scheduleApiService.post(
        `/workouts/${workoutId}/start`
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to start workout session',
      };
    }
  }

  /**
   * End workout session
   */
  async endWorkoutSession(
    sessionId: string,
    notes?: string
  ): Promise<ApiResponse<WorkoutSession>> {
    try {
      const response = await scheduleApiService.post(
        `/workout-sessions/${sessionId}/end`,
        {
          notes,
        }
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to end workout session',
      };
    }
  }

  /**
   * Get workout session by ID
   */
  async getWorkoutSession(
    sessionId: string
  ): Promise<ApiResponse<WorkoutSession>> {
    try {
      const response = await scheduleApiService.get(
        `/workout-sessions/${sessionId}`
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch workout session',
      };
    }
  }

  /**
   * Get user's workout sessions
   */
  async getUserWorkoutSessions(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<WorkoutSession[]>> {
    try {
      const response = await scheduleApiService.get('/workout-sessions', {
        params,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch workout sessions',
      };
    }
  }

  /**
   * Update workout set
   */
  async updateWorkoutSet(
    sessionId: string,
    exerciseId: string,
    setNumber: number,
    data: {
      reps?: number;
      weight?: number;
      duration?: number;
      restTime?: number;
      completed?: boolean;
      notes?: string;
    }
  ): Promise<ApiResponse<WorkoutSet>> {
    try {
      const response = await scheduleApiService.put(
        `/workout-sessions/${sessionId}/exercises/${exerciseId}/sets/${setNumber}`,
        data
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update workout set',
      };
    }
  }

  /**
   * Get workout progress
   */
  async getWorkoutProgress(workoutId: string): Promise<ApiResponse<any>> {
    try {
      const response = await scheduleApiService.get(
        `/workouts/${workoutId}/progress`
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch workout progress',
      };
    }
  }

  /**
   * Get workout statistics
   */
  async getWorkoutStats(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await scheduleApiService.get('/workouts/stats', {
        params,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch workout statistics',
      };
    }
  }

  /**
   * Get exercise categories
   */
  async getExerciseCategories(): Promise<ApiResponse<string[]>> {
    try {
      const response = await scheduleApiService.get('/exercises/categories');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch exercise categories',
      };
    }
  }

  /**
   * Get muscle groups
   */
  async getMuscleGroups(): Promise<ApiResponse<string[]>> {
    try {
      const response = await scheduleApiService.get('/exercises/muscle-groups');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch muscle groups',
      };
    }
  }

  /**
   * Get equipment list
   */
  async getEquipmentList(): Promise<ApiResponse<string[]>> {
    try {
      const response = await scheduleApiService.get('/exercises/equipment');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch equipment list',
      };
    }
  }
}

export const workoutService = new WorkoutService();
export default workoutService;
