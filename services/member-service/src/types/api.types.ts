export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MemberFilters extends PaginationParams {
  search?: string;
  status?: string;
}

export interface Member {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  date_of_birth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  emergency_contact?: string;
  membership_status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  rfid_tag?: string;
  joined_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMemberData {
  full_name: string;
  phone: string;
  email: string;
  date_of_birth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  emergency_contact?: string;
}

export interface UpdateMemberData {
  full_name?: string;
  phone?: string;
  email?: string;
  date_of_birth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  emergency_contact?: string;
  membership_status?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
}

export interface MemberStats {
  total: number;
  active: number;
  expired: number;
  suspended: number;
  newThisMonth: number;
}