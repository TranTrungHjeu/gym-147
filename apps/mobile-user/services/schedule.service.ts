import { SERVICE_URLS } from '@/config/environment';
import { ApiResponse, apiService } from './api';

export interface Schedule {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  workouts: ScheduleWorkout[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleWorkout {
  id: string;
  scheduleId: string;
  workoutId: string;
  workout: any; // Workout object
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  time: string; // HH:MM format
  duration: number; // in minutes
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
  order: number;
}

export interface CreateScheduleData {
  name: string;
  description?: string;
  workouts: Omit<ScheduleWorkout, 'id' | 'scheduleId' | 'workout'>[];
}

export interface UpdateScheduleData {
  name?: string;
  description?: string;
  isActive?: boolean;
  workouts?: Omit<ScheduleWorkout, 'id' | 'scheduleId' | 'workout'>[];
}

export interface ScheduleProgress {
  scheduleId: string;
  scheduleName: string;
  totalWorkouts: number;
  completedWorkouts: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  weeklyProgress: {
    week: string;
    completed: number;
    total: number;
  }[];
}

export interface TodayWorkout {
  id: string;
  scheduleId: string;
  scheduleName: string;
  workoutId: string;
  workout: any; // Workout object
  time: string;
  duration: number;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
}

export class ScheduleService {
  private readonly baseUrl = SERVICE_URLS.SCHEDULE;
  private readonly basePath = '/schedules';

  /**
   * Get user schedules
   */
  async getSchedules(): Promise<ApiResponse<Schedule[]>> {
    try {
      const response = await apiService.get<Schedule[]>(
        `${this.baseUrl}${this.basePath}`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get schedules',
        errors: error.errors,
      };
    }
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(id: string): Promise<ApiResponse<Schedule>> {
    try {
      const response = await apiService.get<Schedule>(
        `${this.baseUrl}${this.basePath}/${id}`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get schedule',
        errors: error.errors,
      };
    }
  }

  /**
   * Create schedule
   */
  async createSchedule(
    data: CreateScheduleData
  ): Promise<ApiResponse<Schedule>> {
    try {
      const response = await apiService.post<Schedule>(
        `${this.baseUrl}${this.basePath}`,
        data
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create schedule',
        errors: error.errors,
      };
    }
  }

  /**
   * Update schedule
   */
  async updateSchedule(
    id: string,
    data: UpdateScheduleData
  ): Promise<ApiResponse<Schedule>> {
    try {
      const response = await apiService.put<Schedule>(
        `${this.baseUrl}${this.basePath}/${id}`,
        data
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update schedule',
        errors: error.errors,
      };
    }
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(id: string): Promise<ApiResponse> {
    try {
      const response = await apiService.delete(
        `${this.baseUrl}${this.basePath}/${id}`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete schedule',
        errors: error.errors,
      };
    }
  }

  /**
   * Activate/deactivate schedule
   */
  async toggleScheduleStatus(
    id: string,
    isActive: boolean
  ): Promise<ApiResponse<Schedule>> {
    try {
      const response = await apiService.patch<Schedule>(
        `${this.baseUrl}${this.basePath}/${id}/status`,
        {
          isActive,
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update schedule status',
        errors: error.errors,
      };
    }
  }

  /**
   * Get today's workouts
   */
  async getTodayWorkouts(): Promise<ApiResponse<TodayWorkout[]>> {
    try {
      const response = await apiService.get<TodayWorkout[]>(
        `${this.baseUrl}${this.basePath}/today`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get today's workouts",
        errors: error.errors,
      };
    }
  }

  /**
   * Get workouts for specific date
   */
  async getWorkoutsByDate(date: string): Promise<ApiResponse<TodayWorkout[]>> {
    try {
      const response = await apiService.get<TodayWorkout[]>(
        `${this.baseUrl}${this.basePath}/date/${date}`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get workouts for date',
        errors: error.errors,
      };
    }
  }

  /**
   * Get workouts for week
   */
  async getWeekWorkouts(
    startDate: string
  ): Promise<ApiResponse<TodayWorkout[]>> {
    try {
      const response = await apiService.get<TodayWorkout[]>(
        `${this.baseUrl}${this.basePath}/week`,
        {
          startDate,
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get week workouts',
        errors: error.errors,
      };
    }
  }

  /**
   * Mark workout as completed
   */
  async markWorkoutCompleted(
    scheduleWorkoutId: string,
    notes?: string
  ): Promise<ApiResponse<ScheduleWorkout>> {
    try {
      const response = await apiService.post<ScheduleWorkout>(
        `${this.baseUrl}${this.basePath}/workouts/${scheduleWorkoutId}/complete`,
        { notes }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to mark workout as completed',
        errors: error.errors,
      };
    }
  }

  /**
   * Mark workout as incomplete
   */
  async markWorkoutIncomplete(
    scheduleWorkoutId: string
  ): Promise<ApiResponse<ScheduleWorkout>> {
    try {
      const response = await apiService.post<ScheduleWorkout>(
        `${this.baseUrl}${this.basePath}/workouts/${scheduleWorkoutId}/incomplete`,
        {}
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to mark workout as incomplete',
        errors: error.errors,
      };
    }
  }

  /**
   * Get schedule progress
   */
  async getScheduleProgress(
    scheduleId: string
  ): Promise<ApiResponse<ScheduleProgress>> {
    try {
      const response = await apiService.get<ScheduleProgress>(
        `${this.baseUrl}${this.basePath}/${scheduleId}/progress`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get schedule progress',
        errors: error.errors,
      };
    }
  }

  /**
   * Get all schedules progress
   */
  async getAllSchedulesProgress(): Promise<ApiResponse<ScheduleProgress[]>> {
    try {
      const response = await apiService.get<ScheduleProgress[]>(
        `${this.baseUrl}${this.basePath}/progress`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get schedules progress',
        errors: error.errors,
      };
    }
  }

  /**
   * Add workout to schedule
   */
  async addWorkoutToSchedule(
    scheduleId: string,
    workoutData: Omit<ScheduleWorkout, 'id' | 'scheduleId' | 'workout'>
  ): Promise<ApiResponse<ScheduleWorkout>> {
    try {
      const response = await apiService.post<ScheduleWorkout>(
        `${this.baseUrl}${this.basePath}/${scheduleId}/workouts`,
        workoutData
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to add workout to schedule',
        errors: error.errors,
      };
    }
  }

  /**
   * Update schedule workout
   */
  async updateScheduleWorkout(
    scheduleId: string,
    workoutId: string,
    data: Partial<Omit<ScheduleWorkout, 'id' | 'scheduleId' | 'workout'>>
  ): Promise<ApiResponse<ScheduleWorkout>> {
    try {
      const response = await apiService.put<ScheduleWorkout>(
        `${this.basePath}/${scheduleId}/workouts/${workoutId}`,
        data
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update schedule workout',
        errors: error.errors,
      };
    }
  }

  /**
   * Remove workout from schedule
   */
  async removeWorkoutFromSchedule(
    scheduleId: string,
    workoutId: string
  ): Promise<ApiResponse> {
    try {
      const response = await apiService.delete(
        `${this.basePath}/${scheduleId}/workouts/${workoutId}`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to remove workout from schedule',
        errors: error.errors,
      };
    }
  }

  /**
   * Get schedule statistics
   */
  async getScheduleStats(): Promise<
    ApiResponse<{
      totalSchedules: number;
      activeSchedules: number;
      totalWorkoutsThisWeek: number;
      completedWorkoutsThisWeek: number;
      completionRate: number;
      currentStreak: number;
      longestStreak: number;
    }>
  > {
    try {
      const response = await apiService.get(`${this.basePath}/stats`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get schedule statistics',
        errors: error.errors,
      };
    }
  }
}

// Export singleton instance
export const scheduleService = new ScheduleService();
export default scheduleService;
