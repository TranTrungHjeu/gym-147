export enum EquipmentCategory {
  CARDIO = 'CARDIO',
  STRENGTH = 'STRENGTH',
  FREE_WEIGHTS = 'FREE_WEIGHTS',
  FUNCTIONAL = 'FUNCTIONAL',
  STRETCHING = 'STRETCHING',
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

export enum QueueStatus {
  WAITING = 'WAITING',
  NOTIFIED = 'NOTIFIED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum IssueType {
  BROKEN = 'BROKEN',
  DAMAGED = 'DAMAGED',
  DIRTY = 'DIRTY',
  MISSING_PARTS = 'MISSING_PARTS',
  UNSAFE = 'UNSAFE',
  OTHER = 'OTHER',
}

export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface Equipment {
  id: string;
  name: string;
  category: EquipmentCategory;
  brand?: string;
  model?: string;
  serial_number?: string;
  location: string;
  status: EquipmentStatus;
  sensor_id?: string;
  max_weight?: number;
  has_heart_monitor: boolean;
  has_calorie_counter: boolean;
  has_rep_counter: boolean;
  wifi_enabled: boolean;
  usage_hours: number;
  last_maintenance?: string;
  next_maintenance?: string;
  created_at: string;
  updated_at: string;
  _count?: {
    usage_logs: number;
    maintenance_logs: number;
    queue: number;
  };
}

export interface EquipmentUsage {
  id: string;
  member_id: string;
  equipment_id: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  calories_burned?: number;
  sets_completed?: number;
  weight_used?: number;
  reps_completed?: number;
  heart_rate_avg?: number;
  heart_rate_max?: number;
  sensor_data?: any;
  equipment?: {
    id: string;
    name: string;
    category: EquipmentCategory;
    location: string;
  };
}

export interface EquipmentQueue {
  id: string;
  member_id: string;
  equipment_id: string;
  position: number;
  joined_at: string;
  notified_at?: string;
  status: QueueStatus;
  expires_at?: string;
  member?: {
    full_name: string;
    membership_number: string;
  };
}

export interface EquipmentIssueReport {
  id: string;
  equipment_id: string;
  member_id: string;
  issue_type: IssueType;
  description: string;
  severity: Severity;
  status: string;
  images: string[];
  resolved_at?: string;
  created_at: string;
}
