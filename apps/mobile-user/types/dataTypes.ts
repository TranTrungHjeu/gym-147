export interface UserData {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  height: number; // in cm
  weight: number; // in kg
  age: number;
  fitnessGoal: 'lose_weight' | 'gain_muscle' | 'increase_endurance' | 'improve_flexibility' | 'maintain';
  weeklyGoal: number; // workouts per week
}

export interface WorkoutType {
  id: string;
  name: string;
  description: string;
  image: string;
  exercises: number;
  duration: string; // e.g., "30 min"
}

export interface ActivityData {
  id: string;
  title: string;
  progress: number;
  metric: string;
  metricValue: string;
  progressColor: string;
}

export interface DailyGoal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  icon: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  progress: number;
  icon: string;
}

export interface StatItem {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number; // in seconds
  image?: string;
}

export interface WorkoutHistory {
  id: string;
  date: string;
  workoutType: string;
  duration: number; // in minutes
  exercises: number;
  calories: number;
}