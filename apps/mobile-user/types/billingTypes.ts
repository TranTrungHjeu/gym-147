export enum PlanType {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  VIP = 'VIP',
  STUDENT = 'STUDENT',
  SENIOR = 'SENIOR',
  CORPORATE = 'CORPORATE',
}

export enum AddonType {
  PERSONAL_TRAINING = 'PERSONAL_TRAINING',
  NUTRITIONIST = 'NUTRITIONIST',
  MASSAGE = 'MASSAGE',
  SAUNA_ACCESS = 'SAUNA_ACCESS',
  POOL_ACCESS = 'POOL_ACCESS',
  LOCKER = 'LOCKER',
  TOWEL_SERVICE = 'TOWEL_SERVICE',
  GUEST_PASS = 'GUEST_PASS',
}

export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  LIFETIME = 'LIFETIME',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  TRIAL = 'TRIAL',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  PAYPAL = 'PAYPAL',
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',
  CASH = 'CASH',
  CHECK = 'CHECK',
}

export enum PaymentType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  ONE_TIME = 'ONE_TIME',
  REFUND = 'REFUND',
  ADDON = 'ADDON',
  LATE_FEE = 'LATE_FEE',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum InvoiceType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  ONE_TIME = 'ONE_TIME',
  ADDON = 'ADDON',
  REFUND = 'REFUND',
}

export enum RefundReason {
  CANCELLATION = 'CANCELLATION',
  DISSATISFACTION = 'DISSATISFACTION',
  TECHNICAL_ISSUE = 'TECHNICAL_ISSUE',
  BILLING_ERROR = 'BILLING_ERROR',
  OTHER = 'OTHER',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSED = 'PROCESSED',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_TRIAL = 'FREE_TRIAL',
}

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  type: PlanType;
  duration: number; // in months
  price: number;
  currency: string;
  benefits: string[];
  classCredits: number;
  guestPasses: number;
  accessHours: string;
  accessAreas: string[];
  iotFeatures: {
    equipmentPriority: boolean;
    ptSessions: number;
    nutritionist: boolean;
    smartWorkoutPlans: boolean;
    wearableIntegration: boolean;
    advancedAnalytics: boolean;
  };
  billingConfig: {
    interval: BillingInterval;
    autoRenew: boolean;
    trialPeriod: number; // in days
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanAddon {
  id: string;
  planId: string;
  name: string;
  description: string;
  price: number;
  type: AddonType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  memberId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  nextBillingDate: string;
  amount: number;
  currency: string;
  usageTracking: {
    classCredits: number;
    guestPasses: number;
    ptSessions: number;
  };
  autoRenew: boolean;
  paymentMethodId?: string;
  cancellationDate?: string;
  cancellationReason?: string;
  trialInfo?: {
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  createdAt: string;
  updatedAt: string;
  plan: MembershipPlan;
  addons: SubscriptionAddon[];
}

export interface SubscriptionAddon {
  id: string;
  subscriptionId: string;
  addonId: string;
  quantity: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  addon: PlanAddon;
}

export interface Payment {
  id: string;
  subscriptionId?: string;
  memberId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  type: PaymentType;
  transactionId?: string;
  gateway: string;
  reference?: string;
  description?: string;
  metadata?: any;
  processing: {
    initiatedAt: string;
    completedAt?: string;
    failedAt?: string;
    failureReason?: string;
  };
  refunds: Refund[];
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  subscriptionId?: string;
  paymentId?: string;
  memberId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  type: InvoiceType;
  amount: number;
  currency: string;
  taxAmount: number;
  totalAmount: number;
  dueDate: string;
  paidDate?: string;
  lineItems: InvoiceLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  taxAmount: number;
}

export interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  reason: RefundReason;
  status: RefundStatus;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  name: string;
  description: string;
  type: DiscountType;
  value: number;
  currency?: string;
  usageLimits: {
    maxUses: number;
    maxUsesPerMember: number;
    currentUses: number;
  };
  validity: {
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  applicability: {
    planIds: string[];
    memberIds: string[];
    minAmount?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DiscountUsage {
  id: string;
  discountCodeId: string;
  memberId: string;
  subscriptionId: string;
  amount: number;
  usedAt: string;
}

export interface RevenueReport {
  id: string;
  date: string;
  totalRevenue: number;
  subscriptionRevenue: number;
  addonRevenue: number;
  refunds: number;
  netRevenue: number;
  currency: string;
  metrics: {
    newSubscriptions: number;
    cancellations: number;
    renewals: number;
    churnRate: number;
  };
  createdAt: string;
}

export interface MemberPaymentMethod {
  id: string;
  memberId: string;
  type: PaymentMethod;
  isDefault: boolean;
  details: {
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    holderName: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionRequest {
  planId: string;
  paymentMethodId?: string;
  startDate?: string;
  addons?: string[];
  discountCode?: string;
  autoRenew?: boolean;
}

export interface UpdateSubscriptionRequest {
  planId?: string;
  paymentMethodId?: string;
  autoRenew?: boolean;
  addons?: string[];
}

export interface CreatePaymentRequest {
  memberId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  type: PaymentType;
  description?: string;
  metadata?: any;
}

export interface CreatePaymentMethodRequest {
  type: PaymentMethod;
  details: {
    token: string;
    holderName: string;
  };
  isDefault?: boolean;
}

export interface PaymentFilters {
  status?: PaymentStatus;
  method?: PaymentMethod;
  type?: PaymentType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface SubscriptionFilters {
  status?: SubscriptionStatus;
  planType?: PlanType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// UI Component Props
export interface SubscriptionCardProps {
  subscription: Subscription;
  onViewDetails?: (subscription: Subscription) => void;
  onUpgrade?: (subscription: Subscription) => void;
  onCancel?: (subscription: Subscription) => void;
}

export interface PaymentMethodCardProps {
  paymentMethod: MemberPaymentMethod;
  onEdit?: (paymentMethod: MemberPaymentMethod) => void;
  onDelete?: (paymentMethod: MemberPaymentMethod) => void;
  onSetDefault?: (paymentMethod: MemberPaymentMethod) => void;
}

export interface InvoiceCardProps {
  invoice: Invoice;
  onView?: (invoice: Invoice) => void;
  onDownload?: (invoice: Invoice) => void;
  onPay?: (invoice: Invoice) => void;
}

export interface PlanCardProps {
  plan: MembershipPlan;
  isSelected?: boolean;
  onSelect?: (plan: MembershipPlan) => void;
  onViewDetails?: (plan: MembershipPlan) => void;
}

export interface AddonCardProps {
  addon: PlanAddon;
  isSelected?: boolean;
  onSelect?: (addon: PlanAddon) => void;
  onViewDetails?: (addon: PlanAddon) => void;
}

export interface DiscountCodeProps {
  code: DiscountCode;
  onApply?: (code: DiscountCode) => void;
  onViewDetails?: (code: DiscountCode) => void;
}

export interface PaymentHistoryProps {
  memberId: string;
  onPaymentSelect?: (payment: Payment) => void;
  onRefresh?: () => void;
}

export interface SubscriptionManagementProps {
  memberId: string;
  onSubscriptionChange?: (subscription: Subscription) => void;
  onPaymentMethodChange?: (method: MemberPaymentMethod) => void;
}

export interface BillingDashboardProps {
  memberId: string;
  onSubscriptionView?: () => void;
  onPaymentHistory?: () => void;
  onInvoices?: () => void;
  onPaymentMethods?: () => void;
}
