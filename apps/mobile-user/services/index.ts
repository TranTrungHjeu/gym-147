// API Service
export { default as apiService } from './api';
export type { ApiError, ApiResponse } from './api';

// Auth Service
export { AuthService, default as authService } from './auth.service';

// User Service
export { UserService, default as userService } from './user.service';
export type {
  ChangePasswordData,
  UpdateProfileData,
  UserStats,
} from './user.service';

// Workout Service
export { WorkoutService, default as workoutService } from './workout.service';
export type {
  CreateWorkoutData,
  Exercise,
  UpdateWorkoutData,
  Workout,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSet,
} from './workout.service';

// Schedule Service
export {
  ScheduleService,
  default as scheduleService,
} from './schedule.service';
export type {
  CreateScheduleData,
  Schedule,
  ScheduleProgress,
  ScheduleWorkout,
  TodayWorkout,
  UpdateScheduleData,
} from './schedule.service';



