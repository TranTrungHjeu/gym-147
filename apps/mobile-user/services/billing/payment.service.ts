import type {
  CreatePaymentMethodRequest,
  CreatePaymentRequest,
  Invoice,
  Payment,
  PaymentFilters,
  PaymentMethod,
  Refund,
} from '@/types/billingTypes';
import { billingApiService } from '../billing/api.service';

export class PaymentService {
  // Payment Methods
  async getMemberPaymentMethods(memberId: string): Promise<PaymentMethod[]> {
    try {
      const response = await billingApiService.get(
        `/members/${memberId}/payment-methods`
      );
      return response.data as PaymentMethod[];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }

  async getPaymentMethodById(methodId: string): Promise<PaymentMethod> {
    try {
      const response = await billingApiService.get(
        `/payment-methods/${methodId}`
      );
      return response.data as PaymentMethod;
    } catch (error) {
      console.error('Error fetching payment method:', error);
      throw error;
    }
  }

  async createPaymentMethod(
    memberId: string,
    method: CreatePaymentMethodRequest
  ): Promise<PaymentMethod> {
    try {
      const response = await billingApiService.post(
        `/members/${memberId}/payment-methods`,
        method
      );
      return response.data as PaymentMethod;
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw error;
    }
  }

  async updatePaymentMethod(
    methodId: string,
    updates: Partial<PaymentMethod>
  ): Promise<PaymentMethod> {
    try {
      const response = await billingApiService.put(
        `/payment-methods/${methodId}`,
        updates
      );
      return response.data as PaymentMethod;
    } catch (error) {
      console.error('Error updating payment method:', error);
      throw error;
    }
  }

  async deletePaymentMethod(methodId: string): Promise<void> {
    try {
      await billingApiService.delete(`/payment-methods/${methodId}`);
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  }

  async setDefaultPaymentMethod(
    memberId: string,
    methodId: string
  ): Promise<void> {
    try {
      await billingApiService.put(
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
  ): Promise<Payment[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.method) params.append('method', filters.method);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await billingApiService.get(
        `/members/${memberId}/payments?${params}`
      );
      return response.data as Payment[];
    } catch (error) {
      console.error('Error fetching member payments:', error);
      throw error;
    }
  }

  async getPaymentById(paymentId: string): Promise<Payment> {
    try {
      const response = await billingApiService.get(`/payments/${paymentId}`);
      return response.data as Payment;
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  }

  async createPayment(payment: CreatePaymentRequest): Promise<Payment> {
    try {
      const response = await billingApiService.post('/payments', payment);
      return response.data as Payment;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  async processPayment(paymentId: string): Promise<Payment> {
    try {
      const response = await billingApiService.post(
        `/payments/${paymentId}/process`
      );
      return response.data as Payment;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  async retryPayment(paymentId: string): Promise<Payment> {
    try {
      const response = await billingApiService.post(
        `/payments/${paymentId}/retry`
      );
      return response.data as Payment;
    } catch (error) {
      console.error('Error retrying payment:', error);
      throw error;
    }
  }

  // Refunds
  async getPaymentRefunds(paymentId: string): Promise<Refund[]> {
    try {
      const response = await billingApiService.get(
        `/payments/${paymentId}/refunds`
      );
      return response.data as Refund[];
    } catch (error) {
      console.error('Error fetching payment refunds:', error);
      throw error;
    }
  }

  async createRefund(
    paymentId: string,
    amount: number,
    reason: string
  ): Promise<Refund> {
    try {
      const response = await billingApiService.post(
        `/payments/${paymentId}/refunds`,
        {
          amount,
          reason,
        }
      );
      return response.data as Refund;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }

  async getRefundById(refundId: string): Promise<Refund> {
    try {
      const response = await billingApiService.get(`/refunds/${refundId}`);
      return response.data as Refund;
    } catch (error) {
      console.error('Error fetching refund:', error);
      throw error;
    }
  }

  // Invoices
  async getMemberInvoices(
    memberId: string,
    filters?: PaymentFilters
  ): Promise<Invoice[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await billingApiService.get(
        `/members/${memberId}/invoices?${params}`
      );
      return response.data as Invoice[];
    } catch (error) {
      console.error('Error fetching member invoices:', error);
      throw error;
    }
  }

  async getInvoiceById(invoiceId: string): Promise<Invoice> {
    try {
      const response = await billingApiService.get(`/invoices/${invoiceId}`);
      return response.data as Invoice;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }
  }

  async downloadInvoice(invoiceId: string): Promise<Blob> {
    try {
      const response = await billingApiService.get(
        `/invoices/${invoiceId}/download`,
        {
          responseType: 'blob',
        }
      );
      return response.data as Blob;
    } catch (error) {
      console.error('Error downloading invoice:', error);
      throw error;
    }
  }

  // Payment Analytics
  async getPaymentAnalytics(
    memberId: string,
    period: string = 'monthly'
  ): Promise<any> {
    try {
      const response = await billingApiService.get(
        `/payments/analytics/${memberId}?period=${period}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
      throw error;
    }
  }

  // Payment Processing
  async validatePaymentMethod(methodId: string): Promise<boolean> {
    try {
      const response = await billingApiService.post(
        `/payment-methods/${methodId}/validate`
      );
      return response.data.valid;
    } catch (error) {
      console.error('Error validating payment method:', error);
      throw error;
    }
  }

  async getPaymentMethodsByType(type: string): Promise<PaymentMethod[]> {
    try {
      const response = await billingApiService.get(
        `/payment-methods/type/${type}`
      );
      return response.data as PaymentMethod[];
    } catch (error) {
      console.error('Error fetching payment methods by type:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
