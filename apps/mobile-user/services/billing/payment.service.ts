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

      console.log('🔍 Fetching payment by reference_id (all statuses):', {
        referenceId,
        paymentType,
        url: `/payments?${paramsWithoutStatus.toString()}`,
      });

      const response = await billingApiService.get(
        `/payments?${paramsWithoutStatus.toString()}`
      );

      console.log('💰 Payment API response:', {
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

      console.log('💰 Extracted payments:', {
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
        console.log('✅ Found matching payment:', {
          paymentId: payment.id,
          referenceId: (payment as any).reference_id,
          status: payment.status,
          payment_type: (payment as any).payment_type,
        });
      } else {
        console.log('⚠️ No matching payment found:', {
          referenceId,
          paymentType,
          totalPayments: payments.length,
          checkedPayments: payments.length > 0,
        });
      }

      return payment || null;
    } catch (error: any) {
      console.error('❌ Error fetching payment by reference_id:', {
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
