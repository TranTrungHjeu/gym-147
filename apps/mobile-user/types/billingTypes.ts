export enum PlanType {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  VIP = 'VIP',
  STUDENT = 'STUDENT',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  TRIAL = 'TRIAL',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

export enum RefundReason {
  CANCELLATION = 'CANCELLATION',
  SUBSCRIPTION_CANCELLATION = 'SUBSCRIPTION_CANCELLATION',
  SUBSCRIPTION_DOWNGRADE = 'SUBSCRIPTION_DOWNGRADE',
  OTHER = 'OTHER',
}

export enum PaymentMethod {
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_TRIAL = 'FREE_TRIAL',
  FIRST_MONTH_FREE = 'FIRST_MONTH_FREE',
}

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  type: PlanType;
  duration_months: number;
  price: number;
  benefits: string[];
  smart_workout_plans: boolean;
  is_featured: boolean;
}

export interface Subscription {
  id: string;
  member_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  start_date: Date | string;
  end_date?: Date | string;
  current_period_start?: Date | string;
  current_period_end?: Date | string;
  next_billing_date?: Date | string;
  base_amount: number;
  discount_amount?: number;
  total_amount: number;
  plan?: MembershipPlan;
  addons?: any[];
  amount?: number;
  currency?: string;
  nextBillingDate?: Date | string;
}

export interface Payment {
  id: string;
  subscription_id?: string;
  member_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  transaction_id?: string;
  gateway?: string;
  payment_type?: string;
  reference_id?: string; // Booking ID, invoice ID, etc.
  processed_at?: Date;
  failed_at?: Date;
  failure_reason?: string;
}

export interface Refund {
  id: string;
  payment_id: string;
  amount: string | number;
  reason: RefundReason | string;
  status: RefundStatus | string;
  transaction_id?: string;
  processed_at?: string | Date;
  failed_at?: string | Date;
  failure_reason?: string;
  requested_by: string;
  approved_by?: string;
  notes?: string;
  metadata?: {
    timeline?: Array<{
      status: string;
      timestamp: string;
      action: string;
      actor: string;
      transaction_id?: string;
      reason?: string;
    }>;
  };
  created_at?: string | Date;
  updated_at?: string | Date;
  payment?: Payment;
}

export interface DiscountCode {
  code: string;
  type: DiscountType;
  value: number;
  maxDiscount?: number;
  bonusDays?: number;
  isTrialCode?: boolean; // IMPROVEMENT: Flag to indicate trial code
}

export interface PaymentGatewayResponse {
  payment: Payment;
  paymentUrl?: string;
  gatewayData: {
    paymentId: string;
    gateway: string;
    amount: number;
    bankInfo?: {
      bankName: string;
      accountNumber: string;
      accountName: string;
      content: string;
    };
    bankTransferId?: string;
    qrCodeDataURL?: string;
  };
}

export interface RegistrationData {
  // Step 1: Basic info
  email?: string;
  phone?: string;
  password: string;
  firstName: string;
  lastName: string;
  primaryMethod: 'EMAIL' | 'PHONE';

  // Step 2: OTP
  otp?: string;

  // Step 3: Plan
  planId?: string;

  // Step 4: Discount
  discountCode?: string;

  // Step 5: Payment
  paymentMethod?: PaymentMethod;

  // Step 6: Personal info
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  height?: number;
  weight?: number;
  bodyFatPercent?: number;
  fitnessGoals?: string[];
  medicalConditions?: string;
  allergies?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
}
