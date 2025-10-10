import { BaseEntity, BaseFilters, EntityStatus } from './common.types';

// Schedule & Class Types
export interface GymClass extends BaseEntity {
  name: string;
  description: string;
  instructorId: string;
  capacity: number;
  duration: number; // minutes
  price?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string; // yoga, cardio, strength, etc.
  equipment?: string[];
  status: EntityStatus;
}

export interface ClassSchedule extends BaseEntity {
  classId: string;
  instructorId: string;
  date: Date;
  startTime: string;
  endTime: string;
  room?: string;
  capacity: number;
  enrolled: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  notes?: string;
  gymClass?: GymClass;
}

export interface Instructor extends BaseEntity {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  specialties: string[];
  certifications: Certification[];
  hireDate: Date;
  status: EntityStatus;
  avatar?: string;
  bio?: string;
}

export interface Certification {
  name: string;
  issuedBy: string;
  issuedDate: Date;
  expiryDate?: Date;
  certificateUrl?: string;
}

export interface ClassBooking extends BaseEntity {
  scheduleId: string;
  memberId: string;
  bookingDate: Date;
  status: 'confirmed' | 'waitlist' | 'cancelled' | 'completed';
  attended?: boolean;
  cancelledAt?: Date;
  cancelReason?: string;
}

// Statistics
export interface ScheduleStats {
  totalClasses: number;
  todayClasses: number;
  upcomingClasses: number;
  completedClasses: number;
  cancelledClasses: number;
  totalInstructors: number;
  activeInstructors: number;
  averageAttendance: number;
  popularClasses: ClassPopularity[];
}

export interface ClassPopularity {
  classId: string;
  className: string;
  bookings: number;
  attendance: number;
  rating: number;
}

// Filters
export interface ScheduleFilters extends BaseFilters {
  instructorId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  category?: string;
  difficulty?: string;
}

export interface ClassFilters extends BaseFilters {
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  instructorId?: string;
  status?: EntityStatus;
}
