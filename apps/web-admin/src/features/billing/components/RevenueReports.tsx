import React, { useEffect, useState } from 'react';
import {
  Calendar,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  Loader2,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  BarChart3,
} from 'lucide-react';
import { Card, Button } from './index';
import { analyticsApi } from '../api';
import type { RevenueReport, RevenueTotals } from '../api/types';

interface RevenueReportsProps {
  period?: number;
}

export function RevenueReports({ period = 30 }: RevenueReportsProps) {
  const [reports, setReports] = useState<RevenueReport[]>([]);
  const [totals, setTotals] = useState<RevenueTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    fetchReports();
  }, [period, startDate, endDate]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      } else {
        params.period = period;
      }

      const response = await analyticsApi.getRevenueReports(params);
      if (response.success && response.data) {
        setReports(response.data.reports || []);
        setTotals(response.data.totals || null);
      }
    } catch (error) {
      console.error('Failed to fetch revenue reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting('pdf');
      const params: any = {};
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      } else {
        params.period = period;
      }
      await analyticsApi.exportRevenueReportPDF(params);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting('excel');
      const params: any = {};
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      } else {
        params.period = period;
      }
      await analyticsApi.exportRevenueReportExcel(params);
    } catch (error) {
      console.error('Failed to export Excel:', error);
    } finally {
      setExporting(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className='space-y-6'>
      {/* Filters & Actions */}
      <Card className='border border-white/10 bg-surface-800/50 backdrop-blur-sm'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-end'>
            <div className='flex-1'>
              <label
                className='mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted'
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Từ ngày
              </label>
              <div className='relative'>
                <Calendar className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted' />
                <input
                  type='date'
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className='w-full rounded-lg border border-white/10 bg-surface-700/50 px-4 py-2.5 pl-10 text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'
                  style={{ fontFamily: 'Inter, sans-serif' }}
                />
              </div>
            </div>
            <div className='flex-1'>
              <label
                className='mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted'
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Đến ngày
              </label>
              <div className='relative'>
                <Calendar className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted' />
                <input
                  type='date'
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className='w-full rounded-lg border border-white/10 bg-surface-700/50 px-4 py-2.5 pl-10 text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'
                  style={{ fontFamily: 'Inter, sans-serif' }}
                />
              </div>
            </div>
            <div className='flex items-end'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                <RefreshCw className='h-4 w-4' />
                Reset
              </Button>
            </div>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleExportPDF}
              loading={exporting === 'pdf'}
              disabled={exporting !== null}
            >
              <FileText className='h-4 w-4' />
              Export PDF
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={handleExportExcel}
              loading={exporting === 'excel'}
              disabled={exporting !== null}
            >
              <FileSpreadsheet className='h-4 w-4' />
              Export Excel
            </Button>
          </div>
        </div>
      </Card>

      {/* Totals Summary */}
      {totals && (
        <Card className='border border-white/10 bg-surface-800/50 backdrop-blur-sm'>
          <h2
            className='mb-6 text-xl font-bold text-text-primary'
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Tổng kết
          </h2>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <div className='rounded-lg bg-surface-700/30 border border-white/5 p-4'>
              <div className='flex items-center gap-2 mb-2'>
                <TrendingUp className='h-4 w-4 text-color-success' />
                <p
                  className='text-xs font-medium uppercase tracking-wider text-text-muted'
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Tổng doanh thu
                </p>
              </div>
              <p
                className='text-2xl font-bold text-color-success'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {formatCurrency(totals.total_revenue)}
              </p>
            </div>
            <div className='rounded-lg bg-surface-700/30 border border-white/5 p-4'>
              <div className='flex items-center gap-2 mb-2'>
                <CheckCircle className='h-4 w-4 text-brand-400' />
                <p
                  className='text-xs font-medium uppercase tracking-wider text-text-muted'
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Doanh thu đăng ký
                </p>
              </div>
              <p
                className='text-xl font-bold text-brand-400'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {formatCurrency(totals.subscription_revenue)}
              </p>
            </div>
            <div className='rounded-lg bg-surface-700/30 border border-white/5 p-4'>
              <div className='flex items-center gap-2 mb-2'>
                <Users className='h-4 w-4 text-text-primary' />
                <p
                  className='text-xs font-medium uppercase tracking-wider text-text-muted'
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Hội viên mới
                </p>
              </div>
              <p
                className='text-2xl font-bold text-text-primary'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {totals.new_members}
              </p>
            </div>
            <div className='rounded-lg bg-surface-700/30 border border-white/5 p-4'>
              <div className='flex items-center gap-2 mb-2'>
                <CheckCircle className='h-4 w-4 text-color-success' />
                <p
                  className='text-xs font-medium uppercase tracking-wider text-text-muted'
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Thanh toán thành công
                </p>
              </div>
              <p
                className='text-2xl font-bold text-color-success'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {totals.successful_payments}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Reports Table */}
      <Card className='border border-white/10 bg-surface-800/50 backdrop-blur-sm'>
        <h2
          className='mb-6 text-xl font-bold text-text-primary'
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          Báo cáo chi tiết
        </h2>
        {loading ? (
          <div className='flex items-center justify-center py-16'>
            <div className='flex flex-col items-center gap-4'>
              <Loader2 className='h-8 w-8 animate-spin text-brand-500' />
              <p
                className='text-sm font-medium text-text-secondary'
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Đang tải...
              </p>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className='flex items-center justify-center py-16'>
            <div className='text-center'>
              <BarChart3 className='h-12 w-12 mx-auto text-text-muted mb-4' />
              <p
                className='text-sm font-medium text-text-muted'
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Không có dữ liệu
              </p>
            </div>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-white/5 text-sm'>
              <thead>
                <tr className='text-left'>
                  <th
                    className='px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Ngày
                  </th>
                  <th
                    className='px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Đăng ký
                  </th>
                  <th
                    className='px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Lớp học
                  </th>
                  <th
                    className='px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Addon
                  </th>
                  <th
                    className='px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Khác
                  </th>
                  <th
                    className='px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Tổng
                  </th>
                  <th
                    className='px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Hội viên mới
                  </th>
                  <th
                    className='px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Thanh toán
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-white/5'>
                {reports.map(report => (
                  <tr
                    key={report.id}
                    className='transition-colors duration-200 hover:bg-surface-700/30'
                  >
                    <td
                      className='px-6 py-4 font-medium text-text-secondary'
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {formatDate(report.report_date)}
                    </td>
                    <td
                      className='px-6 py-4 font-semibold text-color-success'
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {formatCurrency(report.subscription_revenue)}
                    </td>
                    <td
                      className='px-6 py-4 font-medium text-text-secondary'
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {formatCurrency(report.class_revenue)}
                    </td>
                    <td
                      className='px-6 py-4 font-medium text-text-secondary'
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {formatCurrency(report.addon_revenue)}
                    </td>
                    <td
                      className='px-6 py-4 font-medium text-text-secondary'
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {formatCurrency(report.other_revenue)}
                    </td>
                    <td
                      className='px-6 py-4 font-bold text-color-success'
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {formatCurrency(report.total_revenue)}
                    </td>
                    <td
                      className='px-6 py-4 font-medium text-text-primary'
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {report.new_members}
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-2'>
                        <CheckCircle className='h-4 w-4 text-color-success' />
                        <span
                          className='font-semibold text-color-success'
                          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                        >
                          {report.successful_payments}
                        </span>
                        {report.failed_payments > 0 && (
                          <>
                            <XCircle className='h-4 w-4 text-color-error' />
                            <span
                              className='font-medium text-color-error'
                              style={{ fontFamily: 'Inter, sans-serif' }}
                            >
                              {report.failed_payments}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
