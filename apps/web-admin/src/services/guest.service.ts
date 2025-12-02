import { api } from './api';

export interface GuestPass {
  id: string;
  member_id: string; // Member who issued the guest pass
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_id_number?: string; // CMND/CCCD

  // Pass details
  pass_type: 'SINGLE_DAY' | 'WEEK' | 'MONTH';
  issued_date: string;
  valid_from: string;
  valid_until: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';

  // Usage tracking
  uses_count: number;
  max_uses: number; // Usually 1 for single day, multiple for week/month
  last_used_at?: string;

  // Access tracking
  access_logs?: Array<{
    id: string;
    entry_time: string;
    exit_time?: string;
    entry_method: string;
    gate_id?: string;
  }>;

  // Payment
  price?: number;
  payment_status: 'PAID' | 'INCLUDED' | 'FREE'; // INCLUDED = từ membership benefits
  payment_id?: string;

  // Issuer info
  issuer_membership_id?: string;
  issuer_subscription_id?: string;

  // Notes
  notes?: string;
  cancellation_reason?: string;
  cancelled_at?: string;

  // Relations
  issuer?: {
    id: string;
    full_name: string;
    email: string;
    membership_number: string;
  };

  created_at: string;
  updated_at: string;
}

export interface CreateGuestPassData {
  member_id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_id_number?: string;
  pass_type: 'SINGLE_DAY' | 'WEEK' | 'MONTH';
  valid_from?: string; // Default to now
  valid_until?: string; // Auto-calculated based on pass_type
  max_uses?: number; // Default based on pass_type
  notes?: string;
  price?: number; // If not included in membership
}

export interface UpdateGuestPassData {
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  guest_id_number?: string;
  valid_from?: string;
  valid_until?: string;
  status?: GuestPass['status'];
  notes?: string;
}

export interface GuestPassFilters {
  member_id?: string;
  status?: string;
  pass_type?: string;
  issued_from?: string;
  issued_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GuestPassStats {
  total: number;
  active: number;
  used: number;
  expired: number;
  total_revenue: number;
  today_issued: number;
  today_used: number;
}

class GuestService {
  private baseUrl = '/api/guest-passes';

  async getAllGuestPasses(filters?: GuestPassFilters) {
    try {
      const response = await api.get(this.baseUrl, { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching guest passes:', error);
      throw error;
    }
  }

  async getGuestPassById(id: string) {
    try {
      const response = await api.get(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching guest pass:', error);
      throw error;
    }
  }

  async createGuestPass(data: CreateGuestPassData) {
    try {
      const response = await api.post(this.baseUrl, data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating guest pass:', error);
      throw error;
    }
  }

  async updateGuestPass(id: string, data: UpdateGuestPassData) {
    try {
      const response = await api.put(`${this.baseUrl}/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating guest pass:', error);
      throw error;
    }
  }

  async deleteGuestPass(id: string) {
    try {
      const response = await api.delete(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting guest pass:', error);
      throw error;
    }
  }

  async cancelGuestPass(id: string, reason?: string) {
    try {
      const response = await api.post(`${this.baseUrl}/${id}/cancel`, { reason });
      return response.data;
    } catch (error: any) {
      console.error('Error cancelling guest pass:', error);
      throw error;
    }
  }

  async useGuestPass(
    guestPassId: string,
    accessData: { entry_method?: string; entry_time?: string; gate_id?: string }
  ) {
    try {
      const response = await api.post(`${this.baseUrl}/${guestPassId}/use`, accessData);
      return response.data;
    } catch (error: any) {
      console.error('Error using guest pass:', error);
      throw error;
    }
  }

  async recordAccess(guestPassId: string, entryMethod: string, gateId?: string) {
    // Alias for useGuestPass for backward compatibility
    return this.useGuestPass(guestPassId, {
      entry_method: entryMethod,
      gate_id: gateId,
    });
  }

  async getStats(filters?: { date_from?: string; date_to?: string }) {
    try {
      const response = await api.get(`${this.baseUrl}/stats`, { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching guest pass stats:', error);
      throw error;
    }
  }

  async getMemberGuestPasses(memberId: string, filters?: { status?: string; limit?: number }) {
    try {
      const response = await api.get(`${this.baseUrl}/members/${memberId}`, {
        params: filters,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching member guest passes:', error);
      throw error;
    }
  }

  async validateGuestPass(guestPassId: string) {
    try {
      const response = await api.get(`${this.baseUrl}/${guestPassId}/validate`);
      return response.data;
    } catch (error: any) {
      console.error('Error validating guest pass:', error);
      throw error;
    }
  }
}

export const guestService = new GuestService();
