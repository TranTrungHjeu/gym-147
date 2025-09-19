export interface Subscription {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  autoRenew: boolean;
  price: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationMonths: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  currency: string;
  type: 'subscription' | 'class_booking' | 'personal_training' | 'other';
  referenceId?: string; // subscription ID, booking ID, etc.
  method: 'cash' | 'card' | 'bank_transfer' | 'e_wallet';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  description: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CreateSubscriptionRequest {
  memberId: string;
  planId: string;
  startDate: string;
  autoRenew?: boolean;
}

export interface UpdateSubscriptionRequest {
  endDate?: string;
  status?: 'active' | 'expired' | 'cancelled' | 'suspended';
  autoRenew?: boolean;
}

export interface CreatePlanRequest {
  name: string;
  description: string;
  price: number;
  currency: string;
  durationMonths: number;
  features: string[];
}

export interface UpdatePlanRequest {
  name?: string;
  description?: string;
  price?: number;
  durationMonths?: number;
  features?: string[];
  isActive?: boolean;
}

export interface CreatePaymentRequest {
  memberId: string;
  amount: number;
  currency: string;
  type: 'subscription' | 'class_booking' | 'personal_training' | 'other';
  referenceId?: string;
  method: 'cash' | 'card' | 'bank_transfer' | 'e_wallet';
  description: string;
}

export interface UpdatePaymentRequest {
  status?: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  paidAt?: string;
}

export interface CreateInvoiceRequest {
  memberId: string;
  items: Omit<InvoiceItem, 'id'>[];
  dueDate: string;
  tax?: number;
}

export interface UpdateInvoiceRequest {
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate?: string;
  items?: Omit<InvoiceItem, 'id'>[];
}

export interface BillingFilters {
  memberId?: string;
  status?: string;
  type?: string;
  method?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaymentSummary {
  totalRevenue: number;
  totalPayments: number;
  pendingAmount: number;
  refundedAmount: number;
  currency: string;
}