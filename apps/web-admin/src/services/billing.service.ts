import { billingApi } from './api';
import type { AxiosResponse } from 'axios';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';
  auto_renew: boolean;
  payment_status: string;
  created_at: string;
  updated_at: string;
  plan?: MembershipPlan;
  member?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface Payment {
  id: string;
  subscription_id?: string;
  member_id: string;
  amount: number;
  payment_method: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transaction_id?: string;
  payment_date: string;
  created_at: string;
  updated_at: string;
  member?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface Invoice {
  id: string;
  subscription_id?: string;
  member_id: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  due_date: string;
  issued_date: string;
  created_at: string;
  updated_at: string;
}

export interface BillingStats {
  total_revenue: number;
  monthly_revenue: number;
  active_subscriptions: number;
  pending_payments: number;
  total_plans: number;
  revenue_growth?: number;
}

class BillingService {
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      let response: AxiosResponse<ApiResponse<T>>;

      switch (method) {
        case 'POST':
          response = await billingApi.post<ApiResponse<T>>(endpoint, data);
          break;
        case 'PUT':
          response = await billingApi.put<ApiResponse<T>>(endpoint, data);
          break;
        case 'PATCH':
          response = await billingApi.patch<ApiResponse<T>>(endpoint, data);
          break;
        case 'DELETE':
          response = await billingApi.delete<ApiResponse<T>>(endpoint);
          break;
        default:
          response = await billingApi.get<ApiResponse<T>>(endpoint);
      }

      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data || { message: error.message || 'Unknown error' };
      const apiError: any = new Error(
        errorData?.message || `HTTP error! status: ${error.response?.status}`
      );
      apiError.status = error.response?.status;
      apiError.response = { data: errorData };
      throw apiError;
    }
  }

  // Membership Plans
  async getAllPlans(): Promise<ApiResponse<MembershipPlan[]>> {
    return this.request<MembershipPlan[]>('/plans');
  }

  async getActivePlans(): Promise<ApiResponse<MembershipPlan[]>> {
    return this.request<MembershipPlan[]>('/plans/active');
  }

  async createPlan(plan: Omit<MembershipPlan, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<MembershipPlan>> {
    return this.request<MembershipPlan>('/plans', 'POST', plan);
  }

  async updatePlan(id: string, plan: Partial<MembershipPlan>): Promise<ApiResponse<MembershipPlan>> {
    return this.request<MembershipPlan>(`/plans/${id}`, 'PUT', plan);
  }

  async deletePlan(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/plans/${id}`, 'DELETE');
  }

  // Subscriptions
  async getAllSubscriptions(filters?: {
    status?: string;
    member_id?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ subscriptions: Subscription[]; pagination?: any }>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.member_id) params.append('member_id', filters.member_id);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return this.request<{ subscriptions: Subscription[]; pagination?: any }>(`/subscriptions?${params}`);
  }

  async createSubscription(data: {
    member_id: string;
    plan_id: string;
    start_date: string;
    auto_renew?: boolean;
  }): Promise<ApiResponse<Subscription>> {
    return this.request<Subscription>('/subscriptions', 'POST', data);
  }

  async updateSubscription(id: string, data: Partial<Subscription>): Promise<ApiResponse<Subscription>> {
    return this.request<Subscription>(`/subscriptions/${id}`, 'PUT', data);
  }

  async cancelSubscription(id: string): Promise<ApiResponse<Subscription>> {
    return this.request<Subscription>(`/subscriptions/${id}/cancel`, 'PATCH');
  }

  // Payments
  async getAllPayments(filters?: {
    status?: string;
    member_id?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ payments: Payment[]; pagination?: any }>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.member_id) params.append('member_id', filters.member_id);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return this.request<{ payments: Payment[]; pagination?: any }>(`/payments?${params}`);
  }

  async getPaymentById(id: string): Promise<ApiResponse<Payment>> {
    return this.request<Payment>(`/payments/${id}`);
  }

  async createPayment(data: {
    subscription_id?: string;
    member_id: string;
    amount: number;
    payment_method: string;
  }): Promise<ApiResponse<Payment>> {
    return this.request<Payment>('/payments', 'POST', data);
  }

  async processPayment(id: string): Promise<ApiResponse<Payment>> {
    return this.request<Payment>(`/payments/${id}/process`, 'PATCH');
  }

  async downloadReceipt(id: string): Promise<Blob> {
    try {
      const response = await billingApi.get(`/payments/${id}/receipt`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      throw new Error('Failed to download receipt');
    }
  }

  // Invoices
  async getAllInvoices(filters?: {
    status?: string;
    member_id?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ invoices: Invoice[]; pagination?: any }>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.member_id) params.append('member_id', filters.member_id);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return this.request<{ invoices: Invoice[]; pagination?: any }>(`/invoices?${params}`);
  }

  async createInvoice(data: {
    subscription_id?: string;
    member_id: string;
    amount: number;
    due_date: string;
  }): Promise<ApiResponse<Invoice>> {
    return this.request<Invoice>('/invoices', 'POST', data);
  }

  // Statistics
  async getStats(): Promise<ApiResponse<BillingStats>> {
    return this.request<BillingStats>('/stats');
  }

  // Analytics
  async getDashboardAnalytics(): Promise<ApiResponse<any>> {
    return this.request<any>('/analytics/dashboard');
  }

  async getRevenueReports(filters?: {
    from?: string;
    to?: string;
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);

    return this.request<any>(`/analytics/revenue-reports?${params}`);
  }

  async getRevenueTrends(filters?: {
    from?: string;
    to?: string;
  }): Promise<ApiResponse<{
    dates: string[];
    revenues: number[];
    transactions?: number[];
  }>> {
    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);

    const response = await this.request<any>(`/analytics/revenue-trends?${params}`);
    
    // Transform response data to chart format
    if (response.success && response.data) {
      return {
        ...response,
        data: {
          dates: response.data.dates || response.data.months || [],
          revenues: response.data.revenues || response.data.amounts || [],
          transactions: response.data.transactions || response.data.counts || [],
        },
      };
    }
    
    return response;
  }

  async getRevenueByPlan(filters?: {
    from?: string;
    to?: string;
    period?: number;
  }): Promise<ApiResponse<{
    plans: Array<{
      planId: string;
      planName: string;
      revenue: number;
      transactions: number;
    }>;
    totalRevenue: number;
    totalTransactions: number;
  }>> {
    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.period) params.append('period', filters.period.toString());

    const response = await this.request<any>(`/analytics/revenue-by-plan?${params}`);
    
    // Transform response data to chart format
    if (response.success && response.data) {
      return {
        ...response,
        data: {
          plans: response.data.plans || [],
          totalRevenue: response.data.totalRevenue || 0,
          totalTransactions: response.data.totalTransactions || 0,
        },
      };
    }
    
    return response;
  }

  async validateCoupon(code: string): Promise<ApiResponse<any>> {
    return this.request<any>('/validate-coupon', 'POST', { code });
  }
}

export const billingService = new BillingService();

