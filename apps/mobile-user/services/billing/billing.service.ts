import {
  DiscountCode,
  MembershipPlan,
  Payment,
  PaymentGatewayResponse,
  PaymentMethod,
  Subscription,
} from '../../types/billingTypes';
import { billingApiService } from './api.service';

class BillingService {
  private billingApi = billingApiService;

  // Get active membership plans
  async getActivePlans(): Promise<MembershipPlan[]> {
    try {
      const response = await this.billingApi.get<MembershipPlan[]>(
        '/plans/active'
      );
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching active plans:', error);
      throw error;
    }
  }

  // Validate discount/coupon code
  async validateCoupon(
    code: string,
    planId?: string,
    memberId?: string
  ): Promise<DiscountCode> {
    try {
      const response = await this.billingApi.post<DiscountCode>(
        '/validate-coupon',
        {
          code,
          plan_id: planId,
          member_id: memberId,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error validating coupon:', error);
      throw error;
    }
  }

  // Create subscription with discount
  async createSubscriptionWithDiscount(data: {
    member_id: string;
    plan_id: string;
    start_date?: Date;
    discount_code?: string;
    bonus_days?: number;
  }): Promise<Subscription> {
    try {
      const response = await this.billingApi.post<Subscription>(
        '/subscriptions/with-discount',
        data
      );
      return response.data;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Initiate payment
  async initiatePayment(data: {
    member_id: string;
    subscription_id?: string;
    amount: number;
    payment_method: PaymentMethod;
    return_url?: string;
    cancel_url?: string;
  }): Promise<PaymentGatewayResponse> {
    try {
      const response = await this.billingApi.post<PaymentGatewayResponse>(
        '/payments/initiate',
        data
      );
      return response.data;
    } catch (error) {
      console.error('Error initiating payment:', error);
      throw error;
    }
  }

  // Get payment details
  async getPayment(paymentId: string): Promise<Payment> {
    try {
      const response = await this.billingApi.get<Payment>(
        `/payments/${paymentId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  }

  // Get subscription details
  async getSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const response = await this.billingApi.get<Subscription>(
        `/subscriptions/${subscriptionId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription:', error);
      throw error;
    }
  }

  // Get all subscriptions for a member
  async getMemberSubscriptions(memberId: string): Promise<Subscription[]> {
    try {
      const response = await this.billingApi.get<any>(
        `/subscriptions?member_id=${memberId}`
      );
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('Error fetching member subscriptions:', error);
      throw error;
    }
  }
}

export const billingService = new BillingService();
