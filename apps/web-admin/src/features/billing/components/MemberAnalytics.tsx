import React, { useEffect, useState } from 'react';
import {
  Users,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
  DollarSign,
  Activity,
} from 'lucide-react';
import { Card, Button, IconBadge } from './index';
import { analyticsApi } from '../api';
import type { AtRiskMember, TopMemberByLTV } from '../api/types';

interface MemberAnalyticsProps {
  viewType?: 'at-risk' | 'top-ltv';
}

export function MemberAnalytics({ viewType = 'at-risk' }: MemberAnalyticsProps) {
  const [members, setMembers] = useState<(AtRiskMember | TopMemberByLTV)[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [currentView, setCurrentView] = useState<'at-risk' | 'top-ltv'>(viewType);

  useEffect(() => {
    fetchMembers();
  }, [currentView]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      if (currentView === 'at-risk') {
        const response = await analyticsApi.getAtRiskMembers(50);
        if (response.success && response.data) {
          setMembers(response.data.members || []);
        }
      } else {
        const response = await analyticsApi.getTopMembersByLTV(50);
        if (response.success && response.data) {
          setMembers(response.data.members || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch member analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await analyticsApi.exportMemberAnalyticsExcel(currentView, 100);
    } catch (error) {
      console.error('Failed to export:', error);
    } finally {
      setExporting(false);
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

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-color-error';
    if (score >= 50) return 'text-color-warning';
    return 'text-color-success';
  };

  const getEngagementColor = (score: number) => {
    if (score >= 70) return 'text-color-success';
    if (score >= 50) return 'text-color-warning';
    return 'text-color-error';
  };

  const getRiskBadgeColor = (score: number) => {
    if (score >= 70) return 'bg-color-error/10 border-color-error/40 text-color-error';
    if (score >= 50) return 'bg-color-warning/10 border-color-warning/40 text-color-warning';
    return 'bg-color-success/10 border-color-success/40 text-color-success';
  };

  const getEngagementBadgeColor = (score: number) => {
    if (score >= 70) return 'bg-color-success/10 border-color-success/40 text-color-success';
    if (score >= 50) return 'bg-color-warning/10 border-color-warning/40 text-color-warning';
    return 'bg-color-error/10 border-color-error/40 text-color-error';
  };

  return (
    <div className='space-y-6'>
      {/* Header & Toggle */}
      <Card className='border border-white/10 bg-surface-800/50 backdrop-blur-sm'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => setCurrentView('at-risk')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                currentView === 'at-risk'
                  ? 'bg-color-error/20 text-color-error border border-color-error/40 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-700/30 border border-transparent'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <AlertTriangle className='h-4 w-4' />
              Có nguy cơ rời bỏ
            </button>
            <button
              onClick={() => setCurrentView('top-ltv')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                currentView === 'top-ltv'
                  ? 'bg-color-success/20 text-color-success border border-color-success/40 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-700/30 border border-transparent'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <TrendingUp className='h-4 w-4' />
              Top LTV
            </button>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={handleExport}
            loading={exporting}
            disabled={exporting}
          >
            <FileSpreadsheet className='h-4 w-4' />
            Export Excel
          </Button>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className='grid grid-cols-1 gap-5 md:grid-cols-3'>
        <Card className='border border-white/10 bg-surface-800/50 backdrop-blur-sm'>
          <div className='flex items-center justify-between'>
            <div className='flex-1'>
              <p
                className='text-xs font-medium uppercase tracking-wider text-text-muted'
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Tổng số
              </p>
              <p
                className='mt-3 text-3xl font-bold text-text-primary'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {members.length}
              </p>
            </div>
            <IconBadge icon={Users} tone='brand' />
          </div>
        </Card>

        {currentView === 'at-risk' && (
          <>
            <Card className='border border-white/10 bg-surface-800/50 backdrop-blur-sm'>
              <div className='flex items-center justify-between'>
                <div className='flex-1'>
                  <p
                    className='text-xs font-medium uppercase tracking-wider text-text-muted'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Rủi ro trung bình
                  </p>
                  <p
                    className='mt-3 text-3xl font-bold text-color-error'
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {members.length > 0
                      ? Math.round(
                          members.reduce((sum, m) => sum + m.churn_risk_score, 0) / members.length
                        )
                      : 0}
                  </p>
                </div>
                <IconBadge icon={AlertTriangle} tone='danger' />
              </div>
            </Card>
            <Card className='border border-white/10 bg-surface-800/50 backdrop-blur-sm'>
              <div className='flex items-center justify-between'>
                <div className='flex-1'>
                  <p
                    className='text-xs font-medium uppercase tracking-wider text-text-muted'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Tương tác trung bình
                  </p>
                  <p
                    className='mt-3 text-3xl font-bold text-color-warning'
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {members.length > 0
                      ? Math.round(
                          members.reduce((sum, m) => sum + m.engagement_score, 0) / members.length
                        )
                      : 0}
                  </p>
                </div>
                <IconBadge icon={TrendingDown} tone='warning' />
              </div>
            </Card>
          </>
        )}

        {currentView === 'top-ltv' && (
          <>
            <Card className='border border-white/10 bg-surface-800/50 backdrop-blur-sm'>
              <div className='flex items-center justify-between'>
                <div className='flex-1'>
                  <p
                    className='text-xs font-medium uppercase tracking-wider text-text-muted'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    LTV trung bình
                  </p>
                  <p
                    className='mt-3 text-xl font-bold text-color-success'
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {members.length > 0
                      ? formatCurrency(
                          members.reduce((sum, m) => sum + m.predicted_ltv, 0) / members.length
                        )
                      : formatCurrency(0)}
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
                    Tổng LTV
                  </p>
                  <p
                    className='mt-3 text-xl font-bold text-color-success'
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {formatCurrency(members.reduce((sum, m) => sum + m.predicted_ltv, 0))}
                  </p>
                </div>
                <IconBadge icon={DollarSign} tone='success' />
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Members Table */}
      <Card className='border border-white/10 bg-surface-800/50 backdrop-blur-sm'>
        <h2
          className='mb-6 text-xl font-bold text-text-primary'
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {currentView === 'at-risk' ? 'Hội viên có nguy cơ rời bỏ' : 'Top hội viên theo LTV'}
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
        ) : members.length === 0 ? (
          <div className='flex items-center justify-center py-16'>
            <div className='text-center'>
              <Users className='h-12 w-12 mx-auto text-text-muted mb-4' />
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
                    Hội viên
                  </th>
                  <th
                    className='px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Đã chi tiêu
                  </th>
                  <th
                    className='px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    LTV dự đoán
                  </th>
                  <th
                    className='px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Điểm tương tác
                  </th>
                  <th
                    className='px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Rủi ro rời bỏ
                  </th>
                  <th
                    className='px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Cập nhật lần cuối
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-white/5'>
                {members.map(member => (
                  <tr
                    key={member.member_id}
                    className='transition-colors duration-200 hover:bg-surface-700/30'
                  >
                    <td
                      className='px-6 py-4 font-mono text-xs text-text-secondary'
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      #{member.member_id.substring(0, 8)}...
                    </td>
                    <td
                      className='px-6 py-4 font-bold text-color-success'
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {formatCurrency(member.total_spent)}
                    </td>
                    <td
                      className='px-6 py-4 font-bold text-color-success'
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {formatCurrency(member.predicted_ltv)}
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getEngagementBadgeColor(
                          member.engagement_score
                        )}`}
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        <Activity className='h-3 w-3' />
                        {member.engagement_score}/100
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getRiskBadgeColor(
                          member.churn_risk_score
                        )}`}
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        <AlertTriangle className='h-3 w-3' />
                        {member.churn_risk_score}/100
                      </span>
                    </td>
                    <td
                      className='px-6 py-4 text-sm font-medium text-text-secondary'
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {formatDate(member.last_calculated_at)}
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
