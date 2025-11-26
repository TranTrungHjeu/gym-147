import { api } from './api';

export interface PersonalTrainingSession {
  id: string;
  member_id: string;
  trainer_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  duration: number; // in minutes
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  session_type?: 'IN_PERSON' | 'ONLINE' | 'GROUP';
  location?: string;
  price: number;
  payment_status: 'PENDING' | 'PAID' | 'REFUNDED';
  payment_method?: string;
  
  // Session details
  notes?: string;
  trainer_notes?: string;
  member_feedback?: string;
  rating?: number; // 1-5
  goals?: string[];
  exercises?: Array<{
    name: string;
    sets?: number;
    reps?: number;
    weight?: number;
    duration?: number;
    notes?: string;
  }>;
  
  // Progress tracking
  progress_notes?: string;
  metrics?: Record<string, any>;
  
  // Cancellation
  cancelled_at?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  
  // Relations
  member?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  };
  trainer?: {
    id: string;
    full_name: string;
    email: string;
    hourly_rate?: number;
  };
  
  created_at: string;
  updated_at: string;
}

export interface CreatePTSessionData {
  member_id: string;
  trainer_id: string;
  scheduled_date: string;
  start_time: string;
  duration: number;
  session_type?: 'IN_PERSON' | 'ONLINE' | 'GROUP';
  location?: string;
  price?: number;
  notes?: string;
  goals?: string[];
}

export interface UpdatePTSessionData {
  scheduled_date?: string;
  start_time?: string;
  duration?: number;
  status?: PersonalTrainingSession['status'];
  session_type?: 'IN_PERSON' | 'ONLINE' | 'GROUP';
  location?: string;
  notes?: string;
  trainer_notes?: string;
  goals?: string[];
  exercises?: Array<{
    name: string;
    sets?: number;
    reps?: number;
    weight?: number;
    duration?: number;
    notes?: string;
  }>;
  progress_notes?: string;
  metrics?: Record<string, any>;
}

export interface PTSessionFilters {
  member_id?: string;
  trainer_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface PTSessionStats {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  upcoming_today: number;
  revenue: number;
  avg_rating: number;
}

class PersonalTrainingService {
  private baseUrl = '/api/personal-training';

  async getAllSessions(filters?: PTSessionFilters) {
    try {
      const response = await api.get(this.baseUrl, { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching PT sessions:', error);
      throw error;
    }
  }

  async getSessionById(id: string) {
    try {
      const response = await api.get(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching PT session:', error);
      throw error;
    }
  }

  async createSession(data: CreatePTSessionData) {
    try {
      const response = await api.post(this.baseUrl, data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating PT session:', error);
      throw error;
    }
  }

  async updateSession(id: string, data: UpdatePTSessionData) {
    try {
      const response = await api.put(`${this.baseUrl}/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating PT session:', error);
      throw error;
    }
  }

  async deleteSession(id: string) {
    try {
      const response = await api.delete(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting PT session:', error);
      throw error;
    }
  }

  async cancelSession(id: string, reason?: string) {
    try {
      const response = await api.post(`${this.baseUrl}/${id}/cancel`, { reason });
      return response.data;
    } catch (error: any) {
      console.error('Error cancelling PT session:', error);
      throw error;
    }
  }

  async completeSession(id: string, data: {
    trainer_notes?: string;
    exercises?: Array<{
      name: string;
      sets?: number;
      reps?: number;
      weight?: number;
      duration?: number;
      notes?: string;
    }>;
    progress_notes?: string;
    metrics?: Record<string, any>;
  }) {
    try {
      const response = await api.post(`${this.baseUrl}/${id}/complete`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error completing PT session:', error);
      throw error;
    }
  }

  async getStats(filters?: { date_from?: string; date_to?: string }) {
    try {
      const response = await api.get(`${this.baseUrl}/stats`, { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching PT stats:', error);
      throw error;
    }
  }

  async getTrainerAvailability(trainerId: string, date: string) {
    try {
      const response = await api.get(`${this.baseUrl}/trainers/${trainerId}/availability`, {
        params: { date },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching trainer availability:', error);
      throw error;
    }
  }

  async getMemberSessions(memberId: string, filters?: { status?: string; limit?: number }) {
    try {
      const response = await api.get(`${this.baseUrl}/members/${memberId}/sessions`, {
        params: filters,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching member PT sessions:', error);
      throw error;
    }
  }
}

export const personalTrainingService = new PersonalTrainingService();

