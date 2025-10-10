import { BaseEntity, BaseFilters, EntityStatus } from './common.types';

// Member Types
export interface Member extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  emergencyContact?: EmergencyContact;
  joinDate: Date;
  status: EntityStatus;
  membershipNumber: string;
  notes?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface MemberStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  newThisMonth: number;
  expiringThisMonth: number;
}

export interface MemberFilters extends BaseFilters {
  status?: EntityStatus;
  gender?: 'male' | 'female' | 'other';
  joinDateFrom?: string;
  joinDateTo?: string;
  hasActiveSubscription?: boolean;
}

// Member Activities
export interface MemberActivity extends BaseEntity {
  memberId: string;
  type: 'check_in' | 'check_out' | 'class_booking' | 'payment' | 'subscription';
  description: string;
  metadata?: Record<string, any>;
}

export interface MemberCheckIn extends BaseEntity {
  memberId: string;
  checkInAt: Date;
  checkOutAt?: Date;
  duration?: number; // minutes
  facilityUsed?: string[];
}
