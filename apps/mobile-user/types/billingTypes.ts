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
  setup_fee?: number;
  benefits: string[];
  class_credits?: number;
  guest_passes?: number;
  personal_training_sessions?: number;
  nutritionist_consultations?: number;
  smart_workout_plans: boolean;
  wearable_integration: boolean;
  advanced_analytics: boolean;
  equipment_priority: boolean;
  is_featured: boolean;
}

export interface Subscription {
  id: string;
  member_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  start_date: Date;
  end_date: Date;
  base_amount: number;
  discount_amount?: number;
  total_amount: number;
  classes_remaining?: number;
  auto_renew: boolean;
  plan?: MembershipPlan;
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

export interface DiscountCode {
  code: string;
  type: DiscountType;
  value: number;
  maxDiscount?: number;
  bonusDays?: number;
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
