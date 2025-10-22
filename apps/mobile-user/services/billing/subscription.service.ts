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
      return response.data as Subscription;
    } catch (error) {
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
