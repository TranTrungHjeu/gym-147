export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  points: number;
  badge_icon: string;
  criteria: AchievementCriteria;
  unlocked_at?: string;
  progress?: number; // 0-100
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface AchievementSummary {
  total_achievements: number;
  unlocked_achievements: number;
  total_points: number;
  unlocked_points: number;
  recent_unlocks: Achievement[];
  next_milestones: Achievement[];
}

export interface LeaderboardEntry {
  rank: number;
  member_id: string;
  member_name: string;
  member_photo?: string;
  total_points: number;
  achievements_count: number;
  is_current_user: boolean;
}

export interface AchievementCriteria {
  type:
    | 'WORKOUTS_COMPLETED'
    | 'STREAK_DAYS'
    | 'CALORIES_BURNED'
    | 'SESSIONS_ATTENDED'
    | 'WEIGHT_LOST'
    | 'CUSTOM';
  target_value: number;
  current_value?: number;
  description: string;
}

export enum AchievementCategory {
  FITNESS = 'FITNESS',
  ATTENDANCE = 'ATTENDANCE',
  SOCIAL = 'SOCIAL',
  PERSONAL = 'PERSONAL',
  MILESTONE = 'MILESTONE',
}
