// Analytics Types
export interface DashboardAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  activeSubscriptions: number;
  newMembers: number;
  revenueByType: RevenueByType[];
  paymentStats: PaymentStats[];
  recentRevenue: RevenueReport[];
  topPlans: TopPlan[];
  period: number;
}

export interface RevenueByType {
  type: string;
  amount: number;
  count: number;
}

export interface PaymentStats {
  status: string;
  count: number;
}

export interface RevenueReport {
  id: string;
  report_date: string;
  subscription_revenue: number;
  class_revenue: number;
  addon_revenue: number;
  other_revenue: number;
  total_revenue: number;
  new_members: number;
  cancelled_members: number;
  active_members: number;
  successful_payments: number;
  failed_payments: number;
  refunds_issued: number;
  refunds_amount: number;
  created_at: string;
}

export interface RevenueReportsResponse {
  success: boolean;
  data: {
    reports: RevenueReport[];
    totals: RevenueTotals;
    period: {
      startDate: string;
      endDate: string;
      days: number;
    };
  };
}

export interface RevenueTotals {
  subscription_revenue: number;
  class_revenue: number;
  addon_revenue: number;
  other_revenue: number;
  total_revenue: number;
  new_members: number;
  cancelled_members: number;
  successful_payments: number;
  failed_payments: number;
  refunds_issued: number;
  refunds_amount: number;
}

export interface RevenueForecast {
  success: boolean;
  data: {
    forecast: ForecastItem[];
    summary: {
      dailyAverage: number;
      growthRate: number;
      totalForecast: number;
      period: number;
    };
  };
}

export interface ForecastItem {
  date: string;
  forecasted_revenue: number;
}

export interface TopPlan {
  plan: {
    id: string;
    name: string;
    type: string;
    price: number;
  } | null;
  subscriptionCount: number;
}

// Member Analytics Types
export interface MemberLTV {
  total_spent: number;
  monthly_average: number;
  predicted_ltv: number;
  membership_duration_days: number;
  engagement_score: number;
  churn_risk_score: number;
}

export interface AtRiskMember {
  member_id: string;
  total_spent: number;
  predicted_ltv: number;
  engagement_score: number;
  churn_risk_score: number;
  last_calculated_at: string;
}

export interface TopMemberByLTV {
  member_id: string;
  total_spent: number;
  predicted_ltv: number;
  engagement_score: number;
  churn_risk_score: number;
  last_calculated_at: string;
}

