import type {
  CreateSubscriptionRequest,
  MembershipPlan,
  Subscription,
  SubscriptionAddon,
  UpdateSubscriptionRequest,
} from '@/types/billingTypes';
import { billingApiService } from '../billing/api.service';

export class SubscriptionService {
  // Membership Plans
  async getMembershipPlans(): Promise<MembershipPlan[]> {
    try {
      const response = await billingApiService.get('/membership-plans');
      return response.data as MembershipPlan[];
    } catch (error) {
      console.error('Error fetching membership plans:', error);
      throw error;
    }
  }

  async getMembershipPlanById(planId: string): Promise<MembershipPlan> {
    try {
      const response = await billingApiService.get(
        `/membership-plans/${planId}`
      );
      return response.data as MembershipPlan;
    } catch (error) {
      console.error('Error fetching membership plan:', error);
      throw error;
    }
  }

  // Subscriptions
  async getMemberSubscription(memberId: string): Promise<Subscription | null> {
    try {
      const response = await billingApiService.get(
        `/subscriptions/member/${memberId}`
      );
      // API might return { success: true, data: subscription } or just subscription
      const subscriptionData = response.data?.data || response.data;
      
      if (!subscriptionData) return null;

      console.log('[DATE] Raw subscription data from API:', {
        hasData: !!subscriptionData,
        plan_id: subscriptionData.plan_id,
        hasPlan: !!subscriptionData.plan,
        planId: subscriptionData.plan?.id,
        planName: subscriptionData.plan?.name,
        planType: subscriptionData.plan?.type,
        planIdMatch: subscriptionData.plan_id === subscriptionData.plan?.id,
      });
      
      // Verify plan_id matches plan.id - if not, log warning
      if (subscriptionData.plan_id && subscriptionData.plan?.id && 
          subscriptionData.plan_id !== subscriptionData.plan.id) {
        console.warn('[WARN] Plan ID mismatch:', {
          subscriptionPlanId: subscriptionData.plan_id,
          planObjectId: subscriptionData.plan.id,
          planObjectName: subscriptionData.plan.name,
        });
      }
      
      // Ensure dates are properly formatted - convert to Date objects
      const parsedSubscription: Subscription = {
        ...subscriptionData,
        // Use plan_id from subscription, not from plan object (plan_id is source of truth)
        plan_id: subscriptionData.plan_id || subscriptionData.plan?.id, // Ensure plan_id is set
        start_date: subscriptionData.start_date 
          ? new Date(subscriptionData.start_date) 
          : new Date(),
        end_date: subscriptionData.end_date 
          ? new Date(subscriptionData.end_date) 
          : undefined,
        next_billing_date: subscriptionData.next_billing_date 
          ? new Date(subscriptionData.next_billing_date) 
          : new Date(),
        current_period_start: subscriptionData.current_period_start 
          ? new Date(subscriptionData.current_period_start) 
          : new Date(),
        current_period_end: subscriptionData.current_period_end 
          ? new Date(subscriptionData.current_period_end) 
          : new Date(),
        // Ensure plan object is also correctly typed if included
        plan: subscriptionData.plan ? {
          ...subscriptionData.plan,
          id: subscriptionData.plan.id, // Ensure plan.id is set
          price: parseFloat(subscriptionData.plan.price),
          setup_fee: subscriptionData.plan.setup_fee ? parseFloat(subscriptionData.plan.setup_fee) : undefined,
        } : undefined,
      };
      
      console.log('[DATE] Parsed subscription:', {
        plan_id: parsedSubscription.plan_id,
        planId: parsedSubscription.plan?.id,
        planName: parsedSubscription.plan?.name,
        end_date: parsedSubscription.end_date,
        current_period_end: parsedSubscription.current_period_end,
        next_billing_date: parsedSubscription.next_billing_date,
      });
      
      return parsedSubscription;
    } catch (error: any) {
      // 404 is normal when member doesn't have subscription yet
      if (error?.status === 404 || error?.message?.includes('No subscription found')) {
        console.log('No subscription found for member:', memberId);
        return null;
      }
      console.error('Error fetching member subscription:', error);
      throw error;
    }
  }

  async getSubscriptionById(subscriptionId: string): Promise<Subscription> {
    try {
      const response = await billingApiService.get(
        `/subscriptions/${subscriptionId}`
      );
      return response.data as Subscription;
    } catch (error) {
      console.error('Error fetching subscription:', error);
      throw error;
    }
  }

  async createSubscription(
    memberId: string,
    subscription: CreateSubscriptionRequest
  ): Promise<Subscription> {
    try {
      const response = await billingApiService.post(`/subscriptions`, {
        memberId,
        ...subscription,
      });
      return response.data as Subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  async updateSubscription(
    subscriptionId: string,
    updates: UpdateSubscriptionRequest
  ): Promise<Subscription> {
    try {
      const response = await billingApiService.put(
        `/subscriptions/${subscriptionId}`,
        updates
      );
      return response.data as Subscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  async renewSubscription(
    subscriptionId: string,
    paymentMethod?: string
  ): Promise<Subscription> {
    try {
      console.log('[RENEW] Renewing subscription:', {
        subscriptionId,
        paymentMethod,
        endpoint: `/subscriptions/${subscriptionId}/renew`,
      });
      
      const response = await billingApiService.patch(
        `/subscriptions/${subscriptionId}/renew`,
        paymentMethod ? { payment_method: paymentMethod } : {}
      );
      
      console.log('[SUCCESS] Renew subscription response:', response);
      
      const subscriptionData = response.data?.subscription || response.data?.data || response.data;
      
      // Convert date strings to Date objects
      const parsedSubscription: Subscription = {
        ...subscriptionData,
        start_date: new Date(subscriptionData.start_date),
        end_date: subscriptionData.end_date ? new Date(subscriptionData.end_date) : undefined,
        next_billing_date: subscriptionData.next_billing_date ? new Date(subscriptionData.next_billing_date) : new Date(),
        current_period_start: subscriptionData.current_period_start ? new Date(subscriptionData.current_period_start) : new Date(),
        current_period_end: subscriptionData.current_period_end ? new Date(subscriptionData.current_period_end) : new Date(),
        plan: subscriptionData.plan ? {
          ...subscriptionData.plan,
          price: parseFloat(subscriptionData.plan.price),
          setup_fee: subscriptionData.plan.setup_fee ? parseFloat(subscriptionData.plan.setup_fee) : undefined,
        } : undefined,
      };
      return parsedSubscription;
    } catch (error) {
      console.error('Error renewing subscription:', error);
      throw error;
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    reason?: string
  ): Promise<Subscription> {
    try {
      const response = await billingApiService.put(
        `/subscriptions/${subscriptionId}/cancel`,
        {
          reason,
        }
      );
      return response.data as Subscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  async renewSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const response = await billingApiService.put(
        `/subscriptions/${subscriptionId}/renew`
      );
      return response.data as Subscription;
    } catch (error) {
      console.error('Error renewing subscription:', error);
      throw error;
    }
  }

  // Subscription Addons
  async getSubscriptionAddons(
    subscriptionId: string
  ): Promise<SubscriptionAddon[]> {
    try {
      const response = await billingApiService.get(
        `/subscriptions/${subscriptionId}/addons`
      );
      return response.data as SubscriptionAddon[];
    } catch (error) {
      console.error('Error fetching subscription addons:', error);
      throw error;
    }
  }

  async addSubscriptionAddon(
    subscriptionId: string,
    addonId: string,
    quantity: number = 1
  ): Promise<SubscriptionAddon> {
    try {
      const response = await billingApiService.post(
        `/subscriptions/${subscriptionId}/addons`,
        {
          addonId,
          quantity,
        }
      );
      return response.data as SubscriptionAddon;
    } catch (error) {
      console.error('Error adding subscription addon:', error);
      throw error;
    }
  }

  async removeSubscriptionAddon(
    subscriptionId: string,
    addonId: string
  ): Promise<void> {
    try {
      await billingApiService.delete(
        `/subscriptions/${subscriptionId}/addons/${addonId}`
      );
    } catch (error) {
      console.error('Error removing subscription addon:', error);
      throw error;
    }
  }

  // Usage Tracking
  async getSubscriptionUsage(subscriptionId: string): Promise<any> {
    try {
      const response = await billingApiService.get(
        `/subscriptions/${subscriptionId}/usage`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription usage:', error);
      throw error;
    }
  }

  async updateSubscriptionUsage(
    subscriptionId: string,
    usage: any
  ): Promise<void> {
    try {
      await billingApiService.put(
        `/subscriptions/${subscriptionId}/usage`,
        usage
      );
    } catch (error) {
      console.error('Error updating subscription usage:', error);
      throw error;
    }
  }

  // Discount Codes
  async validateDiscountCode(code: string, planId: string): Promise<any> {
    try {
      const response = await billingApiService.post(
        '/discount-codes/validate',
        {
          code,
          planId,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error validating discount code:', error);
      throw error;
    }
  }

  async applyDiscountCode(
    subscriptionId: string,
    code: string
  ): Promise<Subscription> {
    try {
      const response = await billingApiService.post(
        `/subscriptions/${subscriptionId}/discount`,
        {
          code,
        }
      );
      return response.data as Subscription;
    } catch (error) {
      console.error('Error applying discount code:', error);
      throw error;
    }
  }

  // Subscription Analytics
  async getSubscriptionAnalytics(
    memberId: string,
    period: string = 'monthly'
  ): Promise<any> {
    try {
      const response = await billingApiService.get(
        `/subscriptions/analytics/${memberId}?period=${period}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription analytics:', error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();
