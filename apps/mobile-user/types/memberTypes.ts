export interface Member {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: Gender;
  height?: number;
  weight?: number;
  body_fat_percent?: number;
  profile_photo?: string;
  fitness_goals?: string[];
  medical_conditions?: string[];
  allergies?: string[];
  emergency_contact?: string;
  emergency_phone?: string;
  membership_status: MembershipStatus;
  membership_type: MembershipType;
  created_at: string;
  updated_at: string;
}

export interface MemberStats {
  total_workouts: number;
  total_sessions: number;
  total_duration: number; // in minutes
  current_streak: number;
  longest_streak: number;
  average_session_duration: number;
  favorite_workout_time: string;
  membership_days: number;
}

export interface GymSession {
  id: string;
  member_id: string;
  check_in_time: string;
  check_out_time?: string;
  duration?: number; // in minutes
  workout_type?: string;
  exercises_completed?: number;
  calories_burned?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HealthMetric {
  id: string;
  member_id: string;
  metric_type: MetricType;
  value: number;
  unit: string;
  recorded_at: string;
  notes?: string;
}

export interface HealthTrend {
  date: string;
  value: number;
  unit: string;
}

export interface HealthSummary {
  current_weight?: number;
  current_height?: number;
  current_bmi?: number;
  weight_change_7d?: number;
  weight_change_30d?: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  last_recorded: string;
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum MembershipType {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  VIP = 'VIP',
}

export enum AccessMethod {
  RFID = 'RFID',
  QR_CODE = 'QR_CODE',
  FACE_RECOGNITION = 'FACE_RECOGNITION',
  MANUAL = 'MANUAL',
  MOBILE_APP = 'MOBILE_APP',
}

export enum MetricType {
  WEIGHT = 'WEIGHT',
  HEIGHT = 'HEIGHT',
  BODY_FAT = 'BODY_FAT',
  MUSCLE_MASS = 'MUSCLE_MASS',
  BMI = 'BMI',
  HEART_RATE = 'HEART_RATE',
  BLOOD_PRESSURE = 'BLOOD_PRESSURE',
  FLEXIBILITY = 'FLEXIBILITY',
  ENDURANCE = 'ENDURANCE',
}
