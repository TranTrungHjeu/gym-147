import { billingApi } from '../../../services/api';
import type {
  DashboardAnalytics,
  RevenueReportsResponse,
  RevenueForecast,
  MemberLTV,
  AtRiskMember,
  TopMemberByLTV,
} from './types';

/**
 * Analytics API Service
 */
export const analyticsApi = {
  /**
   * Get dashboard analytics
   */
  async getDashboardAnalytics(period: number = 30) {
    const response = await billingApi.get<{
      success: boolean;
      message: string;
      data: {
        dashboard: DashboardAnalytics;
      };
    }>(`/analytics/dashboard?period=${period}`);
    return response.data;
  },

  /**
   * Get revenue reports
   */
  async getRevenueReports(params: {
    startDate?: string;
    endDate?: string;
    period?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.period) queryParams.append('period', params.period.toString());

    const response = await billingApi.get<RevenueReportsResponse>(
      `/analytics/revenue-reports?${queryParams.toString()}`
    );
    return response.data;
  },

  /**
   * Generate revenue report for a specific date
   */
  async generateRevenueReport(date: string) {
    const response = await billingApi.post<{
      success: boolean;
      message: string;
      data: {
        report: any;
      };
    }>('/analytics/revenue-reports/generate', { date });
    return response.data;
  },

  /**
   * Get revenue forecast
   */
  async getRevenueForecast(days: number = 30) {
    const response = await billingApi.get<RevenueForecast>(
      `/analytics/revenue-forecast?days=${days}`
    );
    return response.data;
  },

  /**
   * Get member LTV
   */
  async getMemberLTV(memberId: string) {
    const response = await billingApi.get<{
      success: boolean;
      message: string;
      data: MemberLTV;
    }>(`/analytics/members/${memberId}/ltv`);
    return response.data;
  },

  /**
   * Update member LTV
   */
  async updateMemberLTV(memberId: string) {
    const response = await billingApi.put<{
      success: boolean;
      message: string;
      data: {
        ltv: any;
      };
    }>(`/analytics/members/${memberId}/ltv`, {});
    return response.data;
  },

  /**
   * Get members at risk of churning
   */
  async getAtRiskMembers(limit: number = 50) {
    const response = await billingApi.get<{
      success: boolean;
      message: string;
      data: {
        members: AtRiskMember[];
        count: number;
      };
    }>(`/analytics/members/at-risk?limit=${limit}`);
    return response.data;
  },

  /**
   * Get top members by LTV
   */
  async getTopMembersByLTV(limit: number = 50) {
    const response = await billingApi.get<{
      success: boolean;
      message: string;
      data: {
        members: TopMemberByLTV[];
        count: number;
      };
    }>(`/analytics/members/top-ltv?limit=${limit}`);
    return response.data;
  },

  /**
   * Export revenue report to PDF
   */
  async exportRevenueReportPDF(params: {
    startDate?: string;
    endDate?: string;
    period?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.period) queryParams.append('period', params.period.toString());

    const response = await billingApi.get(`/analytics/revenue-reports/export/pdf?${queryParams.toString()}`, {
      responseType: 'blob',
    });

    // Create blob and download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `revenue-report-${params.startDate || 'report'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Export revenue report to Excel
   */
  async exportRevenueReportExcel(params: {
    startDate?: string;
    endDate?: string;
    period?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.period) queryParams.append('period', params.period.toString());

    const response = await billingApi.get(`/analytics/revenue-reports/export/excel?${queryParams.toString()}`, {
      responseType: 'blob',
    });

    // Create blob and download
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `revenue-report-${params.startDate || 'report'}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Export member analytics to Excel
   */
  async exportMemberAnalyticsExcel(type: 'at-risk' | 'top-ltv', limit: number = 100) {
    const response = await billingApi.get(
      `/analytics/members/export/excel?type=${type}&limit=${limit}`,
      {
        responseType: 'blob',
      }
    );

    // Create blob and download
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `member-analytics-${type}-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

