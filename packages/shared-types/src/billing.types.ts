import { BaseEntity, BaseFilters, EntityStatus, PaymentStatus } from './common.types';

// Billing & Subscription Types
export interface MembershipPlan extends BaseEntity {
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: number; // in months
  features: string[];
  isPopular?: boolean;
  status: EntityStatus;
  maxMembers?: number;
  category: 'basic' | 'premium' | 'vip' | 'family';
}

export interface Subscription extends BaseEntity {
  memberId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  autoRenew: boolean;
  cancelledAt?: Date;
  cancelReason?: string;
  plan?: MembershipPlan;
}

export interface Payment extends BaseEntity {
  subscriptionId: string;
  memberId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'online';
  transactionId?: string;
  paymentDate: Date;
  dueDate?: Date;
  description?: string;
  metadata?: Record<string, any>;
}

export interface Invoice extends BaseEntity {
  paymentId: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

// Statistics
export interface BillingStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  totalPlans: number;
  averageRevenuePerUser: number;
  churnRate: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  subscriptions: number;
  newMembers: number;
}

// Filters
export interface BillingFilters extends BaseFilters {
  status?: PaymentStatus;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  memberId?: string;
  planId?: string;
}
