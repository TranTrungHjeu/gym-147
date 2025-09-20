import { del, get, post, put } from './api';

export interface Member {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  membership_status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  rfid_tag?: string;
  joined_at: string;
}

export interface MemberFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface MemberResponse {
  members: Member[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export const memberService = {
  // Get all members with filters
  async getMembers(filters: MemberFilters = {}): Promise<MemberResponse> {
    return get<MemberResponse>(`/member/members?${new URLSearchParams(filters as any)}`);
  },

  // Get single member
  async getMember(id: string): Promise<Member> {
    return get<Member>(`/member/members/${id}`);
  },

  // Create new member
  async createMember(member: Omit<Member, 'id' | 'joined_at'>): Promise<Member> {
    return post<Member>('/member/members', member);
  },

  // Update member
  async updateMember(id: string, updates: Partial<Member>): Promise<Member> {
    return put<Member>(`/member/members/${id}`, updates);
  },

  // Delete member
  async deleteMember(id: string): Promise<void> {
    return del<void>(`/member/members/${id}`);
  },

  // Get member stats
  async getMemberStats() {
    return get('/member/stats');
  },
};
