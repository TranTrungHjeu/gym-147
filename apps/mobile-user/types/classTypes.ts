// Class Booking System TypeScript Interfaces

export interface Trainer {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  specializations: ClassCategory[];
  bio?: string;
  experience_years: number;
  hourly_rate?: number;
  profile_photo?: string;
  status: TrainerStatus;
  rating_average?: number;
  total_classes: number;
  created_at: string;
  updated_at: string;
}

export interface GymClass {
  id: string;
  name: string;
  description?: string;
  category: ClassCategory;
  duration: number; // minutes
  max_capacity: number;
  difficulty: Difficulty;
  equipment_needed: string[];
  price?: number;
  thumbnail?: string;
  required_certification_level: CertificationLevel;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  area_sqm?: number;
  equipment: string[];
  amenities: string[];
  status: RoomStatus;
  maintenance_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  class_id: string;
  trainer_id?: string;
  room_id: string;
  date: string; // ISO date string
  start_time: string; // ISO datetime string
  end_time: string; // ISO datetime string
  status: ScheduleStatus;
  current_bookings: number;
  max_capacity: number;
  waitlist_count: number;
  check_in_enabled: boolean;
  check_in_opened_at?: string;
  check_in_opened_by?: string;
  auto_checkout_completed: boolean;
  auto_checkout_at?: string;
  price_override?: number;
  special_notes?: string;
  created_at: string;
  updated_at: string;

  // Relations
  gym_class?: GymClass;
  trainer?: Trainer;
  room?: Room;
}

export interface Booking {
  id: string;
  schedule_id: string;
  member_id: string;
  status: BookingStatus;
  booked_at: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  payment_status: string;
  amount_paid?: number;
  special_needs?: string;
  is_waitlist: boolean;
  waitlist_position?: number;
  notes?: string;
  created_at: string;
  updated_at: string;

  // Relations
  schedule?: Schedule;
}

export interface Attendance {
  id: string;
  schedule_id: string;
  member_id: string;
  checked_in_at?: string;
  checked_out_at?: string;
  attendance_method: AttendanceMethod;
  is_auto_checkout: boolean;
  check_in_method: CheckInMethod;
  check_out_method: CheckOutMethod;
  class_rating?: number;
  trainer_rating?: number;
  feedback_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MemberFavorite {
  id: string;
  member_id: string;
  favorite_type: FavoriteType;
  favorite_id: string;
  created_at: string;
}

// Enums
export enum TrainerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
}

export enum ClassCategory {
  CARDIO = 'CARDIO',
  STRENGTH = 'STRENGTH',
  YOGA = 'YOGA',
  PILATES = 'PILATES',
  DANCE = 'DANCE',
  MARTIAL_ARTS = 'MARTIAL_ARTS',
  AQUA = 'AQUA',
  FUNCTIONAL = 'FUNCTIONAL',
  RECOVERY = 'RECOVERY',
  SPECIALIZED = 'SPECIALIZED',
}

export enum Difficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  ALL_LEVELS = 'ALL_LEVELS',
}

export enum CertificationLevel {
  BASIC = 'BASIC',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE',
  CLEANING = 'CLEANING',
  RESERVED = 'RESERVED',
}

export enum ScheduleStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
}

export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  WAITLIST = 'WAITLIST',
  NO_SHOW = 'NO_SHOW',
  COMPLETED = 'COMPLETED',
}

export enum AttendanceMethod {
  MANUAL = 'MANUAL',
  QR_CODE = 'QR_CODE',
  MOBILE_APP = 'MOBILE_APP',
}

export enum CheckInMethod {
  SELF = 'SELF',
  TRAINER_MANUAL = 'TRAINER_MANUAL',
}

export enum CheckOutMethod {
  SELF = 'SELF',
  TRAINER_MANUAL = 'TRAINER_MANUAL',
  AUTO = 'AUTO',
}

export enum FavoriteType {
  CLASS = 'CLASS',
  TRAINER = 'TRAINER',
}

// API Request/Response Types
export interface CreateBookingRequest {
  schedule_id: string;
  special_needs?: string;
  notes?: string;
}

export interface CancelBookingRequest {
  cancellation_reason?: string;
}

export interface BookingFilters {
  status?: BookingStatus;
  date_from?: string;
  date_to?: string;
  class_category?: ClassCategory;
  trainer_id?: string;
}

export interface ScheduleFilters {
  date_from?: string;
  date_to?: string;
  class_category?: ClassCategory;
  trainer_id?: string;
  difficulty?: Difficulty;
  room_id?: string;
  available_only?: boolean;
}

export interface ClassFilters {
  category?: ClassCategory;
  difficulty?: Difficulty;
  is_active?: boolean;
}

export interface TrainerFilters {
  specializations?: ClassCategory[];
  status?: TrainerStatus;
  experience_min?: number;
  rating_min?: number;
}

// UI Component Props
export interface ClassCardProps {
  schedule: Schedule;
  onPress: () => void;
  onBook?: () => void;
  onCancel?: () => void;
  showBookingActions?: boolean;
}

export interface BookingModalProps {
  visible: boolean;
  schedule: Schedule;
  onClose: () => void;
  onConfirm: (bookingData: CreateBookingRequest) => void;
  loading?: boolean;
}

export interface ScheduleCalendarProps {
  schedules: Schedule[];
  selectedDate?: string;
  onDateSelect: (date: string) => void;
  onScheduleSelect: (schedule: Schedule) => void;
}

export interface BookingListProps {
  bookings: Booking[];
  onBookingPress: (booking: Booking) => void;
  onCancelBooking: (bookingId: string) => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

// Statistics and Analytics
export interface BookingStats {
  total_bookings: number;
  upcoming_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  favorite_categories: { category: ClassCategory; count: number }[];
  favorite_trainers: {
    trainer_id: string;
    trainer_name: string;
    count: number;
  }[];
}

export interface ScheduleStats {
  total_schedules: number;
  available_schedules: number;
  fully_booked: number;
  waitlist_count: number;
  popular_classes: { class_id: string; class_name: string; bookings: number }[];
  popular_trainers: {
    trainer_id: string;
    trainer_name: string;
    classes: number;
  }[];
}
