import { memberApi } from './api';

export interface Member {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  date_of_birth?: Date | string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  address?: string;
  height?: number;
  weight?: number;
  body_fat_percent?: number;
  emergency_contact?: string;
  emergency_phone?: string;
  membership_status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  rfid_tag?: string;
  joined_at: Date;
  created_at: Date;
  updated_at: Date;
  current_membership?: any;
}

export interface CreateMemberRequest {
  user_id?: string;
  full_name: string;
  phone: string;
  email: string;
  date_of_birth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  emergency_contact?: string;
  address?: string;
  membership_type?: string;
}

export interface UpdateMemberRequest {
  full_name?: string;
  phone?: string;
  email?: string;
  date_of_birth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  address?: string;
  height?: number;
  weight?: number;
  body_fat_percent?: number;
  emergency_contact?: string;
  emergency_phone?: string;
  membership_status?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
}

export interface MemberFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
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

export interface MemberStats {
  total: number;
  active: number;
  expired: number;
  suspended: number;
  newThisMonth: number;
}

export class MemberService {
  // Get all members with filters and pagination
  static async getMembers(filters: MemberFilters = {}): Promise<PaginationResult<Member>> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);

    const response = await memberApi.get(`/members?${params.toString()}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get members');
  }

  // Get member by ID
  static async getMemberById(id: string): Promise<Member> {
    const response = await memberApi.get(`/members/${id}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get member');
  }

  // Create new member
  static async createMember(data: CreateMemberRequest): Promise<Member> {
    const response = await memberApi.post('/members', data);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to create member');
  }

  // Update member
  static async updateMember(id: string, data: UpdateMemberRequest): Promise<Member> {
    const response = await memberApi.put(`/members/${id}`, data);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to update member');
  }

  // Delete member
  static async deleteMember(id: string): Promise<void> {
    const response = await memberApi.delete(`/members/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete member');
    }
  }

  // Get member statistics - Try analytics endpoint first
  static async getMemberStats(): Promise<MemberStats> {
    try {
      // Try analytics endpoint
      const response = await memberApi.get('/analytics/members');
      if (response.data?.success && response.data?.data?.analytics) {
        const analytics = response.data.data.analytics;
        return {
          total: analytics.totalMembers || 0,
          active: analytics.activeMembers || 0,
          expired: 0, // Would need additional query
          suspended: 0, // Would need additional query
          newThisMonth: analytics.newMembers || 0,
        };
      }
    } catch (error) {
      console.log('Analytics endpoint not available, trying stats endpoint:', error);
    }

    // Fallback: Try stats endpoint (if exists)
    try {
      const response = await memberApi.get('/members/stats');
      if (response.data?.success) {
        return response.data.data;
      }
    } catch (error) {
      console.log('Stats endpoint not available:', error);
    }

    // Final fallback: Return empty stats
    throw new Error('Member statistics endpoint not available');
  }

  // Check service health
  static async health() {
    const response = await memberApi.get('/health');
    return response.data;
  }

  // Get member memberships
  static async getMemberMemberships(memberId: string) {
    const response = await memberApi.get(`/members/${memberId}/memberships`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get member memberships');
  }

  // Create membership for member
  static async createMembership(memberId: string, membershipData: any) {
    const response = await memberApi.post(`/members/${memberId}/memberships`, membershipData);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to create membership');
  }

  // Get member access logs
  static async getMemberAccessLogs(memberId: string, page: number = 1, limit: number = 20) {
    const response = await memberApi.get(
      `/members/${memberId}/access-logs?page=${page}&limit=${limit}`
    );
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get access logs');
  }

  // Member check-in
  static async checkInMember(memberId: string, method: string = 'MANUAL', location?: string) {
    const response = await memberApi.post(`/members/${memberId}/checkin`, { method, location });
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to check in member');
  }

  // Member check-out
  static async checkOutMember(memberId: string) {
    const response = await memberApi.post(`/members/${memberId}/checkout`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to check out member');
  }
}
