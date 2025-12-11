import type { AxiosResponse } from 'axios';
import { billingApi } from './api';

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
  duration_days?: number;
  duration_months?: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  type?: string;
}

export interface Subscription {
  id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';
  // auto_renew removed from schema
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
      // Log error for debugging (only in development)
      if (import.meta.env.DEV) {
        console.log('Billing Service Error:', {
          code: error.code,
          message: error.message,
          hasResponse: !!error.response,
          hasRequest: !!error.request,
          error: error,
        });
      }

      const errorMessage = (error.message || '').toLowerCase();
      const errorCode = error.code || '';
      
      // Check if it's actually blocked by client FIRST (before other checks)
      // This is the most common issue and should be detected early
      const isBlockedByClient =
        errorCode === 'ERR_BLOCKED_BY_CLIENT' ||
        error.isBlocked === true ||
        errorMessage.includes('err_blocked_by_client') ||
        errorMessage.includes('blocked by client') ||
        errorMessage.includes('net::err_blocked_by_client');
      
      if (isBlockedByClient) {
        const blockedError: any = new Error(
          'Request bị chặn bởi trình chặn quảng cáo hoặc extension trình duyệt. Vui lòng tắt ad blocker cho localhost:8080 hoặc thử lại.'
        );
        blockedError.code = 'ERR_BLOCKED_BY_CLIENT';
        blockedError.isBlocked = true;
        throw blockedError;
      }

      // Check for connection refused (server not running or port not accessible)
      if (
        errorCode === 'ERR_CONNECTION_REFUSED' ||
        error.isConnectionRefused === true ||
        errorMessage.includes('connection refused') ||
        errorMessage.includes('econnrefused')
      ) {
        const connectionError: any = new Error(
          'Không thể kết nối đến server. Vui lòng kiểm tra xem server có đang chạy không hoặc thử lại sau.'
        );
        connectionError.code = 'ERR_CONNECTION_REFUSED';
        connectionError.isConnectionRefused = true;
        throw connectionError;
      }

      // Check for CORS errors (403 with CORS-related message)
      if (
        error.response?.status === 403 &&
        (errorMessage.includes('cors') ||
         errorMessage.includes('origin not allowed') ||
         errorMessage.includes('not allowed by cors'))
      ) {
        const corsError: any = new Error(
          'Request bị chặn bởi CORS policy. Vui lòng kiểm tra cấu hình CORS trên server hoặc liên hệ quản trị viên.'
        );
        corsError.code = 'ERR_CORS';
        corsError.status = 403;
        corsError.isCorsError = true;
        throw corsError;
      }

      // Check for 403 Forbidden (could be auth or CORS)
      if (error.response?.status === 403) {
        const forbiddenError: any = new Error(
          'Truy cập bị từ chối. Vui lòng kiểm tra quyền truy cập hoặc đăng nhập lại.'
        );
        forbiddenError.code = 'ERR_FORBIDDEN';
        forbiddenError.status = 403;
        throw forbiddenError;
      }

      // Check for 503 Service Unavailable (Database unavailable)
      if (error.response?.status === 503) {
        const errorData = error.response?.data || {};
        const serviceError: any = new Error(
          errorData?.message || 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.'
        );
        serviceError.code = 'ERR_SERVICE_UNAVAILABLE';
        serviceError.status = 503;
        serviceError.isServiceUnavailable = true;
        serviceError.errorCode = errorData?.error || 'SERVICE_UNAVAILABLE';
        throw serviceError;
      }

      // Check for 504 Gateway Timeout (Database timeout)
      if (error.response?.status === 504) {
        const errorData = error.response?.data || {};
        const timeoutError: any = new Error(
          errorData?.message || 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại sau.'
        );
        timeoutError.code = 'ERR_GATEWAY_TIMEOUT';
        timeoutError.status = 504;
        timeoutError.isTimeout = true;
        timeoutError.errorCode = errorData?.error || 'GATEWAY_TIMEOUT';
        throw timeoutError;
      }

      // Check for real network errors
      if (
        errorCode === 'ERR_NETWORK' ||
        errorMessage.includes('network error')
      ) {
        const networkError: any = new Error(
          'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.'
        );
        networkError.code = 'ERR_NETWORK';
        networkError.isNetworkError = true;
        throw networkError;
      }

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

  async getActivePlans(retryCount = 0): Promise<ApiResponse<MembershipPlan[]>> {
    try {
      return await this.request<MembershipPlan[]>('/plans/active');
    } catch (error: any) {
      // Don't retry if blocked by client - it will always fail
      if (error.code === 'ERR_BLOCKED_BY_CLIENT' || error.isBlocked) {
        throw error;
      }
      
      // Retry on network errors only (max 2 retries)
      if (
        (error.code === 'ERR_NETWORK' || error.isNetworkError) &&
        retryCount < 2
      ) {
        // Wait 1 second before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.getActivePlans(retryCount + 1);
      }
      
      // Re-throw for other errors or max retries reached
      throw error;
    }
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
    // auto_renew removed from schema
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

  // Refunds
  async getAllRefunds(filters?: {
    status?: string;
    reason?: string;
    requested_by?: string;
    approved_by?: string;
    payment_id?: string;
    member_id?: string;
    all?: boolean; // Admin flag to view all refunds
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<ApiResponse<{
    refunds: Refund[];
    pagination?: any;
  }>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.reason) params.append('reason', filters.reason);
    if (filters?.requested_by) params.append('requested_by', filters.requested_by);
    if (filters?.approved_by) params.append('approved_by', filters.approved_by);
    if (filters?.payment_id) params.append('payment_id', filters.payment_id);
    if (filters?.member_id) params.append('member_id', filters.member_id);
    if (filters?.all) params.append('all', 'true'); // Add all=true for admin view
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);
    if (filters?.sort_order) params.append('sort_order', filters.sort_order);

    const response = await this.request<Refund[]>(`/refunds?${params}`);
    return {
      ...response,
      data: {
        refunds: response.data || [],
        pagination: (response as any).pagination,
      },
    };
  }

  async getRefundById(id: string): Promise<ApiResponse<Refund>> {
    return this.request<Refund>(`/refunds/${id}`);
  }

  async approveRefund(id: string, approved_by: string): Promise<ApiResponse<Refund>> {
    return this.request<Refund>(`/refunds/${id}/approve`, 'PATCH', { approved_by });
  }

  async processRefund(id: string, processed_by: string): Promise<ApiResponse<Refund>> {
    return this.request<Refund>(`/refunds/${id}/process`, 'PATCH', { processed_by });
  }

  async getRefundTimeline(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/refunds/${id}/timeline`);
  }

  /**
   * Get approved refunds within a date range
   * Used for calculating net revenue (revenue - refunds)
   */
  async getApprovedRefunds(filters?: {
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<ApiResponse<{ refunds: Refund[]; pagination?: any; totalAmount?: number }>> {
    const params = new URLSearchParams();
    params.append('status', 'APPROVED');
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    // Note: Backend might not support 'from'/'to' directly on refunds
    // We'll need to filter client-side if backend doesn't support it
    const response = await this.getAllRefunds({
      status: 'APPROVED',
      limit: filters?.limit || 1000, // Get all approved refunds
      sort_by: 'created_at',
      sort_order: 'desc',
    });

    // Filter by date range client-side if backend doesn't support it
    let filteredRefunds = response.data?.refunds || [];
    if (filters?.from || filters?.to) {
      const fromDate = filters.from ? new Date(filters.from) : null;
      const toDate = filters.to ? new Date(filters.to) : null;

      filteredRefunds = filteredRefunds.filter((refund: Refund) => {
        const refundDate = new Date(refund.created_at);
        if (fromDate && refundDate < fromDate) return false;
        if (toDate) {
          // Include the entire day
          const toDateEnd = new Date(toDate);
          toDateEnd.setHours(23, 59, 59, 999);
          if (refundDate > toDateEnd) return false;
        }
        return true;
      });
    }

    // Calculate total refund amount
    const totalAmount = filteredRefunds.reduce(
      (sum: number, refund: Refund) => sum + (Number(refund.amount) || 0),
      0
    );

    return {
      ...response,
      data: {
        refunds: filteredRefunds,
        pagination: response.data?.pagination,
        totalAmount,
      },
    };
  }

  /**
   * Get processed refunds within a date range
   * Used for calculating net revenue (revenue - refunds)
   * Only PROCESSED refunds are subtracted from revenue (not APPROVED ones)
   */
  async getProcessedRefunds(filters?: {
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<ApiResponse<{ refunds: Refund[]; pagination?: any; totalAmount?: number }>> {
    // Get all processed refunds
    const response = await this.getAllRefunds({
      status: 'PROCESSED',
      limit: filters?.limit || 1000, // Get all processed refunds
      sort_by: 'created_at',
      sort_order: 'desc',
    });

    // Filter by date range client-side if backend doesn't support it
    let filteredRefunds = response.data?.refunds || [];
    if (filters?.from || filters?.to) {
      const fromDate = filters.from ? new Date(filters.from) : null;
      const toDate = filters.to ? new Date(filters.to) : null;

      filteredRefunds = filteredRefunds.filter((refund: Refund) => {
        // Use processed_at if available, otherwise use created_at
        const refundDate = new Date(refund.processed_at || refund.created_at);
        if (fromDate && refundDate < fromDate) return false;
        if (toDate) {
          // Include the entire day
          const toDateEnd = new Date(toDate);
          toDateEnd.setHours(23, 59, 59, 999);
          if (refundDate > toDateEnd) return false;
        }
        return true;
      });
    }

    // Calculate total refund amount
    const totalAmount = filteredRefunds.reduce(
      (sum: number, refund: Refund) => sum + (Number(refund.amount) || 0),
      0
    );

    return {
      ...response,
      data: {
        refunds: filteredRefunds,
        pagination: response.data?.pagination,
        totalAmount,
      },
    };
  }
}

export interface Refund {
  id: string;
  payment_id: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'PROCESSED' | 'FAILED' | 'CANCELLED';
  requested_by: string;
  approved_by?: string;
  processed_by?: string;
  notes?: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  metadata?: any;
  payment?: Payment;
}

export const billingService = new BillingService();

