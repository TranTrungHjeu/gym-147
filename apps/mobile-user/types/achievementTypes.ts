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
  memberId: string;
  memberName: string;
  avatarUrl?: string;
  points: number;
  achievements: number;
  workouts: number;
  membershipType?: string;
  isCurrentUser: boolean;
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
