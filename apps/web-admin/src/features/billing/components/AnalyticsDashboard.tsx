import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, Activity, Loader2 } from 'lucide-react';
import { Card, Button, IconBadge } from './index';
import { analyticsApi } from '../api';
import type { DashboardAnalytics } from '../api/types';

interface AnalyticsDashboardProps {
  period?: number;
}

export function AnalyticsDashboard({ period = 30 }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await analyticsApi.getDashboardAnalytics(period);
      if (response.success && response.data.dashboard) {
        setAnalytics(response.data.dashboard);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-16'>
        <div className='flex flex-col items-center gap-4'>
          <Loader2 className='h-8 w-8 animate-spin text-brand-500' />
          <p className='text-sm font-medium text-text-secondary' style={{ fontFamily: 'Inter, sans-serif' }}>
            Đang tải dữ liệu...
          </p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className='flex items-center justify-center py-16'>
        <div className='text-center'>
          <BarChart3 className='h-12 w-12 mx-auto text-text-muted mb-4' />
          <p className='text-sm font-medium text-text-muted' style={{ fontFamily: 'Inter, sans-serif' }}>
            Không có dữ liệu
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Summary Cards */}
      <div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4'>
        <Card className='border border-white/10 bg-surface-800/50 backdrop-blur-sm'>
          <div className='flex items-center justify-between'>
            <div className='flex-1'>
              <p
                className='text-xs font-medium uppercase tracking-wider text-text-muted'
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Tổng doanh thu
              </p>
              <p
                className='mt-3 text-2xl font-bold text-color-success'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {formatCurrency(analytics.totalRevenue)}
              </p>
              <p
                className='mt-2 text-xs font-medium text-text-secondary'
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {analytics.totalTransactions} giao dịch
              </p>
            </div>
            <IconBadge icon={TrendingUp} tone='success' />
          </div>
        </Card>

        <Card className='border border-white/10 bg-surface-800/50 backdrop-blur-sm'>
          <div className='flex items-center justify-between'>
            <div className='flex-1'>
              <p
                className='text-xs font-medium uppercase tracking-wider text-text-muted'
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Đăng ký hoạt động
              </p>
              <p
                className='mt-3 text-3xl font-bold text-brand-400'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {analytics.activeSubscriptions}
              </p>
            </div>
            <IconBadge icon={Users} tone='brand' />
          </div>
        </Card>

        <Card className='border border-white/10 bg-surface-800/50 backdrop-blur-sm'>
          <div className='flex items-center justify-between'>
            <div className='flex-1'>
              <p
                className='text-xs font-medium uppercase tracking-wider text-text-muted'
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Thành viên mới
              </p>
              <p
                className='mt-3 text-3xl font-bold text-text-primary'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {analytics.newMembers}
              </p>
              <p
                className='mt-2 text-xs font-medium text-text-secondary'
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Trong {period} ngày
              </p>
            </div>
            <IconBadge icon={Users} tone='info' />
          </div>
        </Card>

        <Card className='border border-white/10 bg-surface-800/50 backdrop-blur-sm'>
          <div className='flex items-center justify-between'>
            <div className='flex-1'>
              <p
                className='text-xs font-medium uppercase tracking-wider text-text-muted'
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Tổng giao dịch
              </p>
              <p
                className='mt-3 text-3xl font-bold text-text-primary'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {analytics.totalTransactions}
              </p>
            </div>
            <IconBadge icon={Activity} tone='brand' />
          </div>
        </Card>
      </div>

      {/* Revenue by Type */}
      <Card className='border border-white/10 bg-surface-800/50 backdrop-blur-sm'>
        <div className='mb-6 flex items-center justify-between'>
          <h2
            className='text-xl font-bold text-text-primary'
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Doanh thu theo loại
          </h2>
        </div>
        <div className='space-y-3'>
          {analytics.revenueByType.length > 0 ? (
            analytics.revenueByType.map((item, index) => (
              <div
                key={index}
                className='flex items-center justify-between rounded-lg bg-surface-700/30 border border-white/5 p-4 transition-all hover:bg-surface-700/50'
              >
                <div>
                  <p
                    className='font-semibold text-text-primary'
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {item.type}
                  </p>
                  <p
                    className='mt-1 text-xs font-medium text-text-secondary'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {item.count} giao dịch
                  </p>
                </div>
                <p
                  className='text-lg font-bold text-color-success'
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {formatCurrency(item.amount)}
                </p>
              </div>
            ))
          ) : (
            <div className='py-8 text-center'>
              <p className='text-sm text-text-muted' style={{ fontFamily: 'Inter, sans-serif' }}>
                Không có dữ liệu
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Top Plans */}
      <Card className='border border-white/10 bg-surface-800/50 backdrop-blur-sm'>
        <div className='mb-6 flex items-center justify-between'>
          <h2
            className='text-xl font-bold text-text-primary'
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Gói phổ biến nhất
          </h2>
        </div>
        <div className='space-y-3'>
          {analytics.topPlans.length > 0 ? (
            analytics.topPlans.map((item, index) => (
              <div
                key={index}
                className='flex items-center justify-between rounded-lg bg-surface-700/30 border border-white/5 p-4 transition-all hover:bg-surface-700/50'
              >
                <div>
                  <p
                    className='font-semibold text-text-primary'
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {item.plan?.name || 'N/A'}
                  </p>
                  <p
                    className='mt-1 text-xs font-medium text-text-secondary'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {item.plan?.type || ''}
                  </p>
                </div>
                <p
                  className='text-lg font-bold text-brand-400'
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {item.subscriptionCount} đăng ký
                </p>
              </div>
            ))
          ) : (
            <div className='py-8 text-center'>
              <p className='text-sm text-text-muted' style={{ fontFamily: 'Inter, sans-serif' }}>
                Không có dữ liệu
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Payment Stats */}
      <Card className='border border-white/10 bg-surface-800/50 backdrop-blur-sm'>
        <div className='mb-6 flex items-center justify-between'>
          <h2
            className='text-xl font-bold text-text-primary'
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Thống kê thanh toán
          </h2>
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          {analytics.paymentStats.length > 0 ? (
            analytics.paymentStats.map((stat, index) => (
              <div
                key={index}
                className='rounded-lg bg-surface-700/30 border border-white/5 p-4 transition-all hover:bg-surface-700/50'
              >
                <p
                  className='text-xs font-medium uppercase tracking-wider text-text-muted'
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {stat.status}
                </p>
                <p
                  className='mt-2 text-2xl font-bold text-text-primary'
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {stat.count}
                </p>
              </div>
            ))
          ) : (
            <div className='col-span-3 py-8 text-center'>
              <p className='text-sm text-text-muted' style={{ fontFamily: 'Inter, sans-serif' }}>
                Không có dữ liệu
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
