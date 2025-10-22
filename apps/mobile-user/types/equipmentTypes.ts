// Equipment Usage Tracking TypeScript Interfaces

export interface Equipment {
  id: string;
  name: string;
  category: EquipmentCategory;
  description?: string;
  location: string;
  status: EquipmentStatus;
  maintenance_schedule?: string;
  last_maintenance?: string;
  next_maintenance?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface EquipmentUsage {
  id: string;
  member_id: string;
  equipment_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  sets_completed?: number;
  reps_per_set?: number;
  weight_used?: number;
  calories_burned?: number;
  heart_rate_avg?: number;
  heart_rate_max?: number;
  notes?: string;
  created_at: string;
  updated_at: string;

  // Relations
  equipment?: Equipment;
  member?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface MaintenanceLog {
  id: string;
  equipment_id: string;
  maintenance_type: MaintenanceType;
  description: string;
  performed_by: string;
  performed_at: string;
  next_maintenance?: string;
  cost?: number;
  notes?: string;
  created_at: string;
  updated_at: string;

  // Relations
  equipment?: Equipment;
}

export interface EquipmentStats {
  total_equipment: number;
  available_equipment: number;
  in_use_equipment: number;
  maintenance_equipment: number;
  popular_equipment: {
    equipment_id: string;
    equipment_name: string;
    usage_count: number;
  }[];
  usage_by_category: {
    category: EquipmentCategory;
    count: number;
    percentage: number;
  }[];
  maintenance_schedule: {
    equipment_id: string;
    equipment_name: string;
    next_maintenance: string;
    days_until_maintenance: number;
  }[];
}

export interface MemberEquipmentStats {
  total_sessions: number;
  total_duration_minutes: number;
  total_calories_burned: number;
  favorite_equipment: {
    equipment_id: string;
    equipment_name: string;
    usage_count: number;
    total_duration: number;
  }[];
  usage_by_category: {
    category: EquipmentCategory;
    sessions: number;
    duration: number;
    calories: number;
  }[];
  recent_sessions: EquipmentUsage[];
}

// Enums
export enum EquipmentCategory {
  CARDIO = 'CARDIO',
  STRENGTH = 'STRENGTH',
  FREE_WEIGHTS = 'FREE_WEIGHTS',
  MACHINES = 'MACHINES',
  FUNCTIONAL = 'FUNCTIONAL',
  RECOVERY = 'RECOVERY',
  SPECIALIZED = 'SPECIALIZED',
}

export enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_ORDER = 'OUT_OF_ORDER',
  RESERVED = 'RESERVED',
}

export enum MaintenanceType {
  ROUTINE = 'ROUTINE',
  REPAIR = 'REPAIR',
  INSPECTION = 'INSPECTION',
  CLEANING = 'CLEANING',
  CALIBRATION = 'CALIBRATION',
  REPLACEMENT = 'REPLACEMENT',
}

// API Request/Response Types
export interface StartEquipmentUsageRequest {
  equipment_id: string;
  notes?: string;
}

export interface StopEquipmentUsageRequest {
  usage_id: string;
  sets_completed?: number;
  reps_per_set?: number;
  weight_used?: number;
  calories_burned?: number;
  heart_rate_avg?: number;
  heart_rate_max?: number;
  notes?: string;
}

export interface EquipmentFilters {
  category?: EquipmentCategory;
  status?: EquipmentStatus;
  location?: string;
  available_only?: boolean;
}

export interface UsageFilters {
  equipment_id?: string;
  date_from?: string;
  date_to?: string;
  member_id?: string;
}

// UI Component Props
export interface EquipmentCardProps {
  equipment: Equipment;
  onPress: () => void;
  onStartUsage?: () => void;
  showUsageActions?: boolean;
}

export interface WorkoutLoggerProps {
  usage: EquipmentUsage;
  onSave: (data: StopEquipmentUsageRequest) => void;
  onCancel: () => void;
  loading?: boolean;
}

export interface EquipmentListProps {
  equipment: Equipment[];
  onEquipmentPress: (equipment: Equipment) => void;
  onStartUsage: (equipment: Equipment) => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export interface UsageHistoryProps {
  usage: EquipmentUsage[];
  onUsagePress: (usage: EquipmentUsage) => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

// Workout Logging Types
export interface WorkoutSet {
  set_number: number;
  reps: number;
  weight: number;
  rest_seconds?: number;
  notes?: string;
}

export interface WorkoutSession {
  equipment_id: string;
  start_time: string;
  end_time?: string;
  sets: WorkoutSet[];
  total_duration?: number;
  calories_burned?: number;
  heart_rate_avg?: number;
  heart_rate_max?: number;
  notes?: string;
}

// Equipment Reservation Types
export interface EquipmentReservation {
  id: string;
  member_id: string;
  equipment_id: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;

  // Relations
  equipment?: Equipment;
  member?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

// Equipment Analytics Types
export interface EquipmentAnalytics {
  usage_trends: {
    date: string;
    total_sessions: number;
    total_duration: number;
    total_calories: number;
  }[];
  peak_hours: {
    hour: number;
    usage_count: number;
  }[];
  equipment_efficiency: {
    equipment_id: string;
    equipment_name: string;
    utilization_rate: number;
    average_session_duration: number;
    maintenance_frequency: number;
  }[];
  member_engagement: {
    member_id: string;
    member_name: string;
    total_sessions: number;
    favorite_equipment: string[];
    last_activity: string;
  }[];
}

// Equipment Maintenance Types
export interface MaintenanceSchedule {
  id: string;
  equipment_id: string;
  maintenance_type: MaintenanceType;
  scheduled_date: string;
  frequency_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Relations
  equipment?: Equipment;
}

export interface MaintenanceAlert {
  id: string;
  equipment_id: string;
  alert_type: AlertType;
  message: string;
  severity: AlertSeverity;
  is_resolved: boolean;
  created_at: string;
  resolved_at?: string;

  // Relations
  equipment?: Equipment;
}

export enum AlertType {
  MAINTENANCE_DUE = 'MAINTENANCE_DUE',
  OVERDUE_MAINTENANCE = 'OVERDUE_MAINTENANCE',
  EQUIPMENT_ISSUE = 'EQUIPMENT_ISSUE',
  USAGE_ANOMALY = 'USAGE_ANOMALY',
  PARTS_NEEDED = 'PARTS_NEEDED',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}
