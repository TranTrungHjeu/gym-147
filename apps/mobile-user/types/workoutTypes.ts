export interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  duration_weeks: number;
  goal: string;
  exercises: WorkoutExercise[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  description: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number; // in seconds
  rest_time?: number; // in seconds
  instructions: string[];
  muscle_groups: string[];
  equipment?: string;
  image_url?: string;
}

export interface WorkoutRecommendation {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  duration_weeks: number;
  goal: string;
  reason: string;
  match_score: number; // 0-100
  created_at: string;
}

export enum Difficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}
