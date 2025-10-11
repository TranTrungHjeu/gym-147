// API Response types
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// User & Auth types
export type Role = 'ADMIN' | 'CASHIER' | 'TRAINER' | 'MEMBER';

export interface User {
  id: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Member types
export interface Member {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  date_of_birth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  emergency_contact?: string;
  membership_status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  rfid_tag?: string;
  joined_at: string;
}

// Package types
export interface Package {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  features: string[];
  is_active: boolean;
}

// Schedule types
export interface ClassSchedule {
  id: string;
  title: string;
  trainer: string;
  room: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked: number;
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
}

// Billing types
export interface Invoice {
  id: string;
  member_name: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: 'PAID' | 'UNPAID' | 'OVERDUE';
  issue_date: string;
  due_date: string;
}