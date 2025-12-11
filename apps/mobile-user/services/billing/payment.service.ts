import type {
  CreatePaymentMethodRequest,
  CreatePaymentRequest,
  Invoice,
  Payment,
  PaymentFilters,
  PaymentMethod,
  Refund,
} from '@/types/billingTypes';
import { ApiResponse } from '../api';
import { billingApiService } from '../billing/api.service';

export class PaymentService {
  // Payment Methods
  async getMemberPaymentMethods(
    memberId: string
  ): Promise<ApiResponse<PaymentMethod[]>> {
    try {
      return await billingApiService.get<PaymentMethod[]>(
        `/members/${memberId}/payment-methods`
      );
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }

  async getPaymentMethodById(
    methodId: string
  ): Promise<ApiResponse<PaymentMethod>> {
    try {
      return await billingApiService.get<PaymentMethod>(
        `/payment-methods/${methodId}`
      );
    } catch (error) {
      console.error('Error fetching payment method:', error);
      throw error;
    }
  }

  async createPaymentMethod(
    memberId: string,
    method: CreatePaymentMethodRequest
  ): Promise<ApiResponse<PaymentMethod>> {
    try {
      return await billingApiService.post<PaymentMethod>(
        `/members/${memberId}/payment-methods`,
        method
      );
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw error;
    }
  }

  async updatePaymentMethod(
    methodId: string,
    updates: Partial<PaymentMethod>
  ): Promise<ApiResponse<PaymentMethod>> {
    try {
      return await billingApiService.put<PaymentMethod>(
        `/payment-methods/${methodId}`,
        updates
      );
    } catch (error) {
      console.error('Error updating payment method:', error);
      throw error;
    }
  }

  async deletePaymentMethod(methodId: string): Promise<ApiResponse<void>> {
    try {
      return await billingApiService.delete<void>(
        `/payment-methods/${methodId}`
      );
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  }

  async setDefaultPaymentMethod(
    memberId: string,
    methodId: string
  ): Promise<ApiResponse<void>> {
    try {
      return await billingApiService.put<void>(
        `/members/${memberId}/payment-methods/${methodId}/default`
      );
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  }

  // Payments
  async getMemberPayments(
    memberId: string,
    filters?: PaymentFilters
  ): Promise<ApiResponse<Payment[]>> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.method) params.append('method', filters.method);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      return await billingApiService.get<Payment[]>(
        `/members/${memberId}/payments?${params}`
      );
    } catch (error) {
      console.error('Error fetching member payments:', error);
      throw error;
    }
  }

  /**
   * IMPROVEMENT: Get payment history using new endpoint
   * GET /payments/history/:member_id
   */
  async getPaymentHistory(
    memberId: string,
    filters?: PaymentFilters
  ): Promise<ApiResponse<Payment[]>> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.method) params.append('method', filters.method);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const queryString = params.toString();
      const url = `/payments/history/${memberId}${
        queryString ? `?${queryString}` : ''
      }`;

      return await billingApiService.get<Payment[]>(url);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }

  async getPaymentById(paymentId: string): Promise<ApiResponse<Payment>> {
    try {
      return await billingApiService.get<Payment>(`/payments/${paymentId}`);
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  }

  async getPaymentByReferenceId(
    referenceId: string,
    paymentType: string = 'CLASS_BOOKING'
  ): Promise<Payment | null> {
    try {
      // First, try without status filter to find any payment with this reference_id
      const paramsWithoutStatus = new URLSearchParams();
      paramsWithoutStatus.append('reference_id', referenceId);
      paramsWithoutStatus.append('payment_type', paymentType);

      console.log('[SEARCH] Fetching payment by reference_id (all statuses):', {
        referenceId,
        paymentType,
        url: `/payments?${paramsWithoutStatus.toString()}`,
      });

      const response = await billingApiService.get(
        `/payments?${paramsWithoutStatus.toString()}`
      );

      console.log('[PAYMENT] Payment API response:', {
        hasData: !!response.data,
        hasSuccess: response.data?.success,
        dataStructure: response.data ? Object.keys(response.data) : [],
        fullResponse: JSON.stringify(response.data, null, 2),
      });

      // Handle different response structures
      let payments: Payment[] = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        payments = response.data.data;
      } else if (
        response.data?.payments &&
        Array.isArray(response.data.payments)
      ) {
        payments = response.data.payments;
      } else if (Array.isArray(response.data)) {
        payments = response.data;
      }

      console.log('[PAYMENT] Extracted payments:', {
        count: payments.length,
        payments: payments.map((p) => ({
          id: p.id,
          reference_id: (p as any).reference_id,
          status: p.status,
          payment_type: (p as any).payment_type,
        })),
      });

      // Prefer PENDING payment, but accept any payment matching reference_id
      let payment = payments.find(
        (p) => (p as any).reference_id === referenceId && p.status === 'PENDING'
      );

      // If no PENDING payment, get any payment with matching reference_id
      if (!payment) {
        payment = payments.find((p) => (p as any).reference_id === referenceId);
      }

      if (payment) {
        console.log('[SUCCESS] Found matching payment:', {
          paymentId: payment.id,
          referenceId: (payment as any).reference_id,
          status: payment.status,
          payment_type: (payment as any).payment_type,
        });
      } else {
        console.log('[WARN] No matching payment found:', {
          referenceId,
          paymentType,
          totalPayments: payments.length,
          checkedPayments: payments.length > 0,
        });
      }

      return payment || null;
    } catch (error: any) {
      console.error('[ERROR] Error fetching payment by reference_id:', {
        error: error?.message || error,
        referenceId,
        paymentType,
      });
      return null; // Return null instead of throwing to avoid breaking the flow
    }
  }

  async createPayment(
    payment: CreatePaymentRequest
  ): Promise<ApiResponse<Payment>> {
    try {
      return await billingApiService.post<Payment>('/payments', payment);
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  async processPayment(paymentId: string): Promise<ApiResponse<Payment>> {
    try {
      return await billingApiService.post<Payment>(
        `/payments/${paymentId}/process`
      );
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  async retryPayment(paymentId: string): Promise<ApiResponse<Payment>> {
    try {
      return await billingApiService.post<Payment>(
        `/payments/${paymentId}/retry`
      );
    } catch (error) {
      console.error('Error retrying payment:', error);
      throw error;
    }
  }

  // Refunds
  async getPaymentRefunds(paymentId: string): Promise<ApiResponse<Refund[]>> {
    try {
      return await billingApiService.get<Refund[]>(
        `/payments/${paymentId}/refunds`
      );
    } catch (error) {
      console.error('Error fetching payment refunds:', error);
      throw error;
    }
  }

  async createRefund(
    paymentId: string,
    amount: number,
    reason: string
  ): Promise<ApiResponse<Refund>> {
    try {
      return await billingApiService.post<Refund>(
        `/payments/${paymentId}/refunds`,
        {
          amount,
          reason,
        }
      );
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }

  async getRefundById(refundId: string): Promise<ApiResponse<Refund>> {
    try {
      return await billingApiService.get<Refund>(`/refunds/${refundId}`);
    } catch (error) {
      console.error('Error fetching refund:', error);
      throw error;
    }
  }

  /**
   * Get refund by booking ID
   * GET /refunds/booking/:booking_id
   */
  async getRefundByBookingId(
    bookingId: string
  ): Promise<ApiResponse<Refund | null>> {
    try {
      const response = await billingApiService.get<Refund | null>(
        `/refunds/booking/${bookingId}`
      );
      return response;
    } catch (error: any) {
      // If 404, return null instead of throwing
      if (error.response?.status === 404) {
        return {
          success: true,
          data: null,
        };
      }
      console.error('Error fetching refund by booking ID:', error);
      throw error;
    }
  }

  /**
   * Get all refunds for a member
   * GET /refunds?member_id=:member_id
   */
  async getMemberRefunds(
    memberId: string,
    filters?: { status?: string; page?: number; limit?: number }
  ): Promise<
    ApiResponse<{
      refunds: Refund[];
      pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasMore: boolean;
      };
    }>
  > {
    try {
      // Validate memberId
      if (!memberId || memberId.trim() === '') {
        console.error('[REFUND SERVICE] Invalid memberId:', memberId);
        return {
          success: false,
          error: 'Member ID is required',
          data: {
            refunds: [],
          },
        };
      }

      const params: any = { member_id: memberId };
      if (filters?.status) params.status = filters.status;
      if (filters?.page) params.page = filters.page;
      if (filters?.limit) params.limit = filters.limit;

      console.log('[REFUND SERVICE] Requesting refunds with params:', {
        member_id: memberId,
        ...params,
      });

      const response = await billingApiService.get<{
        success?: boolean;
        data?: Refund[];
        refunds?: Refund[];
        pagination?: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
          hasMore: boolean;
        };
      }>('/refunds', params);

      // Handle different response structures
      // Backend returns: { success: true, data: [...refunds], pagination: {...} }
      // API service wraps it: { success: true, data: { success: true, data: [...], pagination: {...} } }
      let refunds: Refund[] = [];
      let pagination = undefined;

      console.log('[REFUND SERVICE] Raw response:', {
        hasData: !!response.data,
        isArray: Array.isArray(response.data),
        dataKeys: response.data ? Object.keys(response.data) : [],
        dataType: typeof response.data,
      });

      if (response.data) {
        // If response.data is an array, use it directly (unlikely but possible)
        if (Array.isArray(response.data)) {
          refunds = response.data;
          console.log(
            '[REFUND SERVICE] Using response.data as array:',
            refunds.length
          );
        }
        // If response.data has a data property (nested structure from backend)
        else if (response.data.data && Array.isArray(response.data.data)) {
          refunds = response.data.data;
          pagination = response.data.pagination;
          console.log(
            '[REFUND SERVICE] Using response.data.data:',
            refunds.length
          );
        }
        // If response.data has refunds property (alternative structure)
        else if (
          response.data.refunds &&
          Array.isArray(response.data.refunds)
        ) {
          refunds = response.data.refunds;
          pagination = response.data.pagination;
          console.log(
            '[REFUND SERVICE] Using response.data.refunds:',
            refunds.length
          );
        }
        // If response.data is an object but no array found, log warning
        else {
          console.warn('[REFUND SERVICE] Unexpected response structure:', {
            data: response.data,
            dataKeys: Object.keys(response.data),
          });
          refunds = [];
        }
      }

      return {
        success: true,
        data: {
          refunds: Array.isArray(refunds) ? refunds : [],
          pagination,
        },
      };
    } catch (error: any) {
      console.error('Error fetching member refunds:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch refunds',
        data: {
          refunds: [],
        },
      };
    }
  }

  /**
   * IMPROVEMENT: Get refund timeline
   * GET /refunds/:id/timeline
   */
  async getRefundTimeline(refundId: string): Promise<
    ApiResponse<{
      refund: {
        id: string;
        amount: string;
        reason: string;
        status: string;
        requested_at: string;
        processed_at?: string;
        failed_at?: string;
      };
      timeline: Array<{
        status: string;
        timestamp: string;
        action: string;
        actor: string;
        transaction_id?: string;
        reason?: string;
      }>;
    }>
  > {
    try {
      return await billingApiService.get<{
        refund: {
          id: string;
          amount: string;
          reason: string;
          status: string;
          requested_at: string;
          processed_at?: string;
          failed_at?: string;
        };
        timeline: Array<{
          status: string;
          timestamp: string;
          action: string;
          actor: string;
          transaction_id?: string;
          reason?: string;
        }>;
      }>(`/refunds/${refundId}/timeline`);
    } catch (error) {
      console.error('Error fetching refund timeline:', error);
      throw error;
    }
  }

  // Invoices
  async getMemberInvoices(
    memberId: string,
    filters?: PaymentFilters
  ): Promise<ApiResponse<Invoice[]>> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      return await billingApiService.get<Invoice[]>(
        `/members/${memberId}/invoices?${params}`
      );
    } catch (error) {
      console.error('Error fetching member invoices:', error);
      throw error;
    }
  }

  async getInvoiceById(invoiceId: string): Promise<ApiResponse<Invoice>> {
    try {
      return await billingApiService.get<Invoice>(`/invoices/${invoiceId}`);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }
  }

  async downloadInvoice(invoiceId: string): Promise<ApiResponse<Blob>> {
    try {
      return await billingApiService.get<Blob>(
        `/invoices/${invoiceId}/download`,
        {
          responseType: 'blob',
        }
      );
    } catch (error) {
      console.error('Error downloading invoice:', error);
      throw error;
    }
  }

  // Payment Analytics
  async getPaymentAnalytics(
    memberId: string,
    period: string = 'monthly'
  ): Promise<ApiResponse<any>> {
    try {
      return await billingApiService.get<any>(
        `/payments/analytics/${memberId}?period=${period}`
      );
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
      throw error;
    }
  }

  // Payment Processing
  async validatePaymentMethod(
    methodId: string
  ): Promise<ApiResponse<{ valid: boolean }>> {
    try {
      return await billingApiService.post<{ valid: boolean }>(
        `/payment-methods/${methodId}/validate`
      );
    } catch (error) {
      console.error('Error validating payment method:', error);
      throw error;
    }
  }

  async getPaymentMethodsByType(
    type: string
  ): Promise<ApiResponse<PaymentMethod[]>> {
    try {
      return await billingApiService.get<PaymentMethod[]>(
        `/payment-methods/type/${type}`
      );
    } catch (error) {
      console.error('Error fetching payment methods by type:', error);
      throw error;
    }
  }

  // Bank Transfer (Sepay Integration)
  async createBankTransfer(
    paymentId: string,
    memberId: string,
    amount: number
  ): Promise<ApiResponse<any>> {
    try {
      return await billingApiService.post<any>('/bank-transfers/create', {
        payment_id: paymentId,
        member_id: memberId,
        amount: amount,
      });
    } catch (error) {
      console.error('Error creating bank transfer:', error);
      throw error;
    }
  }

  async getBankTransfer(paymentId: string): Promise<ApiResponse<any>> {
    try {
      return await billingApiService.get<any>(`/bank-transfers/${paymentId}`);
    } catch (error) {
      console.error('Error fetching bank transfer:', error);
      throw error;
    }
  }

  async verifyBankTransfer(bankTransferId: string): Promise<ApiResponse<any>> {
    try {
      return await billingApiService.post<any>(
        `/bank-transfers/${bankTransferId}/verify`
      );
    } catch (error) {
      console.error('Error verifying bank transfer:', error);
      throw error;
    }
  }

  async cancelBankTransfer(bankTransferId: string): Promise<ApiResponse<any>> {
    try {
      return await billingApiService.post<any>(
        `/bank-transfers/${bankTransferId}/cancel`
      );
    } catch (error) {
      console.error('Error cancelling bank transfer:', error);
      throw error;
    }
  }

  // Receipt Download
  async downloadReceipt(
    paymentId: string
  ): Promise<ApiResponse<{ receiptUrl: string }>> {
    try {
      return await billingApiService.get<{ receiptUrl: string }>(
        `/payments/${paymentId}/receipt`
      );
    } catch (error) {
      console.error('Error downloading receipt:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
