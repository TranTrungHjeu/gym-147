import { CheckCircle, Copy, DollarSign, Eye, Gift, RefreshCw } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminButton from '../../components/common/AdminButton';
import AdminCard from '../../components/common/AdminCard';
import AdminModal from '../../components/common/AdminModal';
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHeader,
  AdminTableRow,
} from '../../components/common/AdminTable';
import AdvancedFilters from '../../components/common/AdvancedFilters';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ExportButton from '../../components/common/ExportButton';
import Pagination from '../../components/common/Pagination';
import { EnumBadge } from '../../shared/components/ui';
import { TableLoading } from '../../components/ui/AppLoading';
import { useToast } from '../../context/ToastContext';
import useTranslation from '../../hooks/useTranslation';
import rewardService, { RewardRedemption } from '../../services/reward.service';
import { formatVietnamDateTime } from '../../utils/dateTime';

const RedemptionManagement: React.FC = () => {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    memberId: '',
    rewardId: '',
    startDate: '',
    endDate: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [redemptionToRefund, setRedemptionToRefund] = useState<RewardRedemption | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [selectedRedemption, setSelectedRedemption] = useState<RewardRedemption | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Load redemptions only once on mount
  const loadRedemptions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await rewardService.getAllRedemptions({});

      if (response.success) {
        const redemptionsList = Array.isArray(response.data) ? response.data : [];
        setRedemptions(redemptionsList);
      }
    } catch (error: any) {
      showToast({ message: t('redemptionManagement.messages.loadError'), type: 'error' });
      console.error('Error loading redemptions:', error);
      setRedemptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadRedemptions();
  }, [loadRedemptions]);

  // Client-side filtering - no API call needed
  const filteredRedemptions = useMemo(() => {
    let filtered = [...redemptions];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        redemption =>
          redemption.code?.toLowerCase().includes(searchLower) ||
          redemption.member?.full_name.toLowerCase().includes(searchLower) ||
          redemption.reward?.title.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(redemption => redemption.status === filters.status);
    }

    // Member ID filter
    if (filters.memberId) {
      filtered = filtered.filter(
        redemption => redemption.member?.id?.toString() === filters.memberId
      );
    }

    // Reward ID filter
    if (filters.rewardId) {
      filtered = filtered.filter(
        redemption => redemption.reward?.id?.toString() === filters.rewardId
      );
    }

    // Date range filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(redemption => {
        const redeemedAt = new Date(redemption.redeemed_at);
        return redeemedAt >= startDate;
      });
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(redemption => {
        const redeemedAt = new Date(redemption.redeemed_at);
        return redeemedAt <= endDate;
      });
    }

    return filtered;
  }, [redemptions, filters]);

  const paginatedRedemptions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRedemptions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRedemptions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRedemptions.length / itemsPerPage);

  const handleViewDetails = (redemption: RewardRedemption) => {
    setSelectedRedemption(redemption);
    setIsDetailModalOpen(true);
  };

  const handleRefund = (redemption: RewardRedemption) => {
    setRedemptionToRefund(redemption);
    setRefundReason('');
    setIsRefundDialogOpen(true);
  };

  const confirmRefund = async () => {
    if (!redemptionToRefund) return;

    try {
      setIsRefunding(true);
      const response = await rewardService.refundRedemption(redemptionToRefund.id, refundReason);
      if (response.success) {
        showToast({
          message: t('redemptionManagement.messages.refundSuccess', {
            points: response.data?.refunded_points || redemptionToRefund.points_spent,
          }),
          type: 'success',
        });
        loadRedemptions();
      } else {
        showToast({
          message: response.message || t('redemptionManagement.messages.refundError'),
          type: 'error',
        });
      }
    } catch (error: any) {
      showToast({
        message: error.message || t('redemptionManagement.messages.refundError'),
        type: 'error',
      });
    } finally {
      setIsRefunding(false);
      setIsRefundDialogOpen(false);
      setRedemptionToRefund(null);
      setRefundReason('');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast({ message: t('redemptionManagement.messages.copyCodeSuccess'), type: 'success' });
  };

  const handleMarkAsUsed = async (redemption: RewardRedemption) => {
    try {
      const response = await rewardService.markAsUsed(redemption.id);
      if (response.success) {
        showToast({
          message: t('redemptionManagement.messages.markAsUsedSuccess'),
          type: 'success',
        });
        loadRedemptions();
        if (isDetailModalOpen && selectedRedemption?.id === redemption.id) {
          setSelectedRedemption(response.data as RewardRedemption);
        }
      } else {
        showToast({
          message: response.message || t('redemptionManagement.messages.markAsUsedError'),
          type: 'error',
        });
      }
    } catch (error: any) {
      showToast({
        message: error.message || t('redemptionManagement.messages.markAsUsedError'),
        type: 'error',
      });
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: t('redemptionManagement.status.PENDING'),
      ACTIVE: t('redemptionManagement.status.ACTIVE'),
      USED: t('redemptionManagement.status.USED'),
      EXPIRED: t('redemptionManagement.status.EXPIRED'),
      CANCELLED: t('redemptionManagement.status.CANCELLED'),
      REFUNDED: t('redemptionManagement.status.REFUNDED'),
    };
    return labels[status] || status;
  };

  const getStatusEnumType = (
    status: string
  ): { type: 'MEMBERSHIP_STATUS' | 'BOOKING_STATUS' | 'PAYMENT_STATUS'; value: string } => {
    switch (status) {
      case 'ACTIVE':
        return { type: 'MEMBERSHIP_STATUS', value: 'ACTIVE' };
      case 'USED':
        return { type: 'BOOKING_STATUS', value: 'COMPLETED' };
      case 'EXPIRED':
        return { type: 'MEMBERSHIP_STATUS', value: 'EXPIRED' };
      case 'REFUNDED':
        return { type: 'PAYMENT_STATUS', value: 'REFUNDED' };
      default:
        return { type: 'MEMBERSHIP_STATUS', value: 'INACTIVE' };
    }
  };

  const stats = useMemo(() => {
    return {
      total: redemptions.length,
      active: redemptions.filter(r => r.status === 'ACTIVE').length,
      used: redemptions.filter(r => r.status === 'USED').length,
      expired: redemptions.filter(r => r.status === 'EXPIRED').length,
      refunded: redemptions.filter(r => r.status === 'REFUNDED').length,
      totalPointsSpent: redemptions.reduce((sum, r) => sum + r.points_spent, 0),
    };
  }, [redemptions]);

  const getExportData = () => {
    return filteredRedemptions.map(redemption => ({
      'Mã đổi': redemption.code || '',
      'Hội viên': redemption.member?.full_name || '',
      'Phần thưởng': redemption.reward?.title || '',
      'Điểm đã đổi': redemption.points_spent,
      'Trạng thái': getStatusLabel(redemption.status),
      'Ngày đổi': formatVietnamDateTime(redemption.redeemed_at),
      'Ngày sử dụng': redemption.used_at ? formatVietnamDateTime(redemption.used_at) : '',
      'Ngày hết hạn': redemption.expires_at ? formatVietnamDateTime(redemption.expires_at) : '',
      'Ghi chú': redemption.notes || '',
    }));
  };

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-start'>
        <div>
          <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
            {t('redemptionManagement.title')}
          </h1>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
            {t('redemptionManagement.subtitle')}
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <AdminButton onClick={loadRedemptions} icon={RefreshCw} variant='outline' size='sm'>
            {t('equipmentManagement.filter.refresh')}
          </AdminButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <Gift className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.total}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  {t('redemptionManagement.stats.total')}
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <CheckCircle className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.active}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  {t('redemptionManagement.stats.active')}
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <CheckCircle className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.used}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  {t('redemptionManagement.stats.used')}
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <DollarSign className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.totalPointsSpent.toLocaleString()}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  {t('redemptionManagement.stats.totalPointsSpent')}
                </div>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters
        filters={{
          search: filters.search,
          dateRange: {
            from: filters.startDate || undefined,
            to: filters.endDate || undefined,
          },
          customFilters: {
            status: filters.status !== 'all' ? filters.status : '',
            memberId: filters.memberId,
            rewardId: filters.rewardId,
          },
        }}
        onFiltersChange={newFilters => {
          setFilters({
            search: newFilters.search || '',
            status: newFilters.customFilters?.status || 'all',
            memberId: newFilters.customFilters?.memberId || '',
            rewardId: newFilters.customFilters?.rewardId || '',
            startDate: newFilters.dateRange?.from || '',
            endDate: newFilters.dateRange?.to || '',
          });
          setCurrentPage(1);
        }}
        showDateRange={true}
        showCategory={false}
        customFilterFields={[
          {
            key: 'status',
            label: t('redemptionManagement.table.status'),
            type: 'select',
            options: [
              { value: 'PENDING', label: t('redemptionManagement.status.PENDING') },
              { value: 'ACTIVE', label: t('redemptionManagement.status.ACTIVE') },
              { value: 'USED', label: t('redemptionManagement.status.USED') },
              { value: 'EXPIRED', label: t('redemptionManagement.status.EXPIRED') },
              { value: 'CANCELLED', label: t('redemptionManagement.status.CANCELLED') },
              { value: 'REFUNDED', label: t('redemptionManagement.status.REFUNDED') },
            ],
          },
          {
            key: 'memberId',
            label: t('redemptionManagement.filter.memberId'),
            type: 'text',
          },
          {
            key: 'rewardId',
            label: t('redemptionManagement.filter.rewardId'),
            type: 'text',
          },
        ]}
      />

      {/* Export and Actions */}
      <div className='flex justify-between items-center'>
        <div className='text-sm text-gray-600 dark:text-gray-400'>
          {t('redemptionManagement.stats.totalCount', { count: filteredRedemptions.length })}
        </div>
        {filteredRedemptions.length > 0 && (
          <ExportButton
            data={getExportData()}
            columns={[
              { key: 'Mã đổi', label: t('redemptionManagement.table.code') },
              { key: 'Hội viên', label: t('redemptionManagement.table.member') },
              { key: 'Phần thưởng', label: t('redemptionManagement.table.reward') },
              { key: 'Điểm đã đổi', label: t('redemptionManagement.table.pointsSpent') },
              { key: 'Trạng thái', label: t('redemptionManagement.table.status') },
              { key: 'Ngày đổi', label: t('redemptionManagement.table.redeemedAt') },
            ]}
            filename={t('redemptionManagement.export.filename')}
            title={t('redemptionManagement.export.title')}
            variant='outline'
            size='sm'
          />
        )}
      </div>

      {/* Redemptions List */}
      {isLoading ? (
        <TableLoading text={t('redemptionManagement.messages.loading')} />
      ) : filteredRedemptions.length === 0 ? (
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12'>
          <div className='flex flex-col items-center justify-center gap-3'>
            <Gift className='w-12 h-12 text-gray-300 dark:text-gray-600' />
            <div className='text-theme-xs font-heading text-gray-500 dark:text-gray-400'>
              {filters.search || filters.status !== 'all'
                ? t('redemptionManagement.empty.noResults')
                : t('redemptionManagement.empty.noRedemptions')}
            </div>
          </div>
        </div>
      ) : (
        <>
          <AdminCard padding='sm' className='p-0'>
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell header>
                    {t('redemptionManagement.table.code').toUpperCase()}
                  </AdminTableCell>
                  <AdminTableCell header>
                    {t('redemptionManagement.table.member').toUpperCase()}
                  </AdminTableCell>
                  <AdminTableCell header>
                    {t('redemptionManagement.table.reward').toUpperCase()}
                  </AdminTableCell>
                  <AdminTableCell header>
                    {t('redemptionManagement.table.pointsSpent').toUpperCase()}
                  </AdminTableCell>
                  <AdminTableCell header>
                    {t('redemptionManagement.table.time').toUpperCase()}
                  </AdminTableCell>
                  <AdminTableCell header>
                    {t('redemptionManagement.table.status').toUpperCase()}
                  </AdminTableCell>
                  <AdminTableCell header className='text-right'>
                    {t('redemptionManagement.table.actions').toUpperCase()}
                  </AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {paginatedRedemptions.map((redemption, index) => (
                  <AdminTableRow
                    key={redemption.id}
                    className={`group relative border-l-4 border-l-transparent hover:border-l-orange-500 transition-all duration-200 ${
                      index % 2 === 0
                        ? 'bg-white dark:bg-gray-900'
                        : 'bg-gray-50/50 dark:bg-gray-800/50'
                    } hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 dark:hover:from-orange-900/20 dark:hover:to-orange-800/10`}
                  >
                    <AdminTableCell className='overflow-hidden relative'>
                      <div className='absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-orange-500 dark:bg-orange-500 transition-all duration-200 pointer-events-none z-0' />
                      <div className='min-w-0 flex-1 relative z-10'>
                        <div className='flex items-center gap-2 group'>
                          <code className='text-sm font-mono font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2.5 py-1 rounded-lg border border-orange-100 dark:border-orange-900/30'>
                            {redemption.code || 'N/A'}
                          </code>
                          {redemption.code && (
                            <button
                              onClick={() => handleCopyCode(redemption.code!)}
                              className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity'
                              title={t('redemptionManagement.actions.copyCode')}
                            >
                              <Copy className='w-4 h-4' />
                            </button>
                          )}
                        </div>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div>
                        <div className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200'>
                          {redemption.member?.full_name || 'N/A'}
                        </div>
                        {redemption.member?.membership_number && (
                          <div className='text-[10px] text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                            #{redemption.member.membership_number}
                          </div>
                        )}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200 max-w-xs'>
                        {redemption.reward?.title || 'N/A'}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className='flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-medium'>
                        <DollarSign className='w-3.5 h-3.5' />
                        <span>{redemption.points_spent}</span>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className='text-sm space-y-1'>
                        <div className='text-gray-900 dark:text-white'>
                          {formatVietnamDateTime(redemption.redeemed_at).split(' ')[0]}
                        </div>
                        {redemption.expires_at && (
                          <div
                            className={`text-xs ${
                              new Date(redemption.expires_at) < new Date() &&
                              redemption.status === 'ACTIVE'
                                ? 'text-red-500 font-medium'
                                : 'text-gray-500'
                            }`}
                          >
                            {t('redemptionManagement.table.expiresAt')}:{' '}
                            {formatVietnamDateTime(redemption.expires_at).split(' ')[0]}
                          </div>
                        )}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      {(() => {
                        const statusEnum = getStatusEnumType(redemption.status);
                        return (
                          <EnumBadge
                            type={statusEnum.type}
                            value={statusEnum.value}
                            size='sm'
                            showIcon={true}
                          />
                        );
                      })()}
                    </AdminTableCell>
                    <AdminTableCell className='text-right'>
                      <div className='flex items-center justify-end gap-2'>
                        <AdminButton
                          onClick={() => handleViewDetails(redemption)}
                          icon={Eye}
                          variant='outline'
                          size='sm'
                          className='text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-none'
                        >
                          {t('redemptionManagement.actions.viewDetails')}
                        </AdminButton>
                        {redemption.status === 'ACTIVE' && (
                          <>
                            <AdminButton
                              onClick={() => handleMarkAsUsed(redemption)}
                              icon={CheckCircle}
                              variant='outline'
                              size='sm'
                              className='text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 border-none'
                              title={t('redemptionManagement.actions.markAsUsed')}
                            />
                            <AdminButton
                              onClick={() => handleRefund(redemption)}
                              icon={DollarSign}
                              variant='outline'
                              size='sm'
                              className='text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 border-none'
                              title={t('redemptionManagement.actions.refund')}
                            />
                          </>
                        )}
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          </AdminCard>
        </>
      )}

      {totalPages > 1 && (
        <div className='flex justify-center'>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredRedemptions.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Detail Modal */}
      <AdminModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title='Chi tiết Đổi thưởng'
        size='md'
        footer={
          <div className='flex justify-end gap-3'>
            <AdminButton
              onClick={() => setIsDetailModalOpen(false)}
              variant='outline'
              className='border-gray-300'
            >
              Đóng
            </AdminButton>
            {selectedRedemption?.status === 'ACTIVE' && (
              <>
                <AdminButton
                  onClick={() => {
                    if (selectedRedemption) handleMarkAsUsed(selectedRedemption);
                  }}
                  className='bg-green-600 hover:bg-green-700 text-white border-none'
                >
                  Đánh dấu đã dùng
                </AdminButton>
                <AdminButton
                  onClick={() => {
                    if (selectedRedemption) handleRefund(selectedRedemption);
                  }}
                  className='bg-orange-500 hover:bg-orange-600 text-white border-none'
                >
                  {t('redemptionManagement.actions.refund')}
                </AdminButton>
              </>
            )}
          </div>
        }
      >
        {selectedRedemption && (
          <div className='space-y-3'>
            <div className='bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700'>
              <div className='flex items-center justify-between mb-1.5'>
                <span className='text-[10px] font-medium text-gray-500 dark:text-gray-400 font-inter uppercase tracking-wide'>
                  {t('redemptionManagement.table.code')}
                </span>
                {(() => {
                  const statusEnum = getStatusEnumType(selectedRedemption.status);
                  return (
                    <EnumBadge
                      type={statusEnum.type}
                      value={statusEnum.value}
                      size='sm'
                      showIcon={true}
                    />
                  );
                })()}
              </div>
              <div className='flex items-center gap-2'>
                <code className='text-base font-mono font-bold text-orange-600 tracking-wider font-inter'>
                  {selectedRedemption.code || 'N/A'}
                </code>
                {selectedRedemption.code && (
                  <AdminButton
                    onClick={() => handleCopyCode(selectedRedemption.code!)}
                    icon={Copy}
                    variant='outline'
                    size='sm'
                    className='text-gray-400 hover:text-gray-600 border-none'
                  />
                )}
              </div>
            </div>

            <div className='space-y-2.5'>
              <div className='flex items-start gap-2.5 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700'>
                <div className='w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 flex-shrink-0'>
                  <Gift className='w-3.5 h-3.5' />
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-[10px] font-medium text-gray-500 dark:text-gray-400 font-inter mb-0.5 uppercase tracking-wide'>
                    {t('redemptionManagement.table.reward')}
                  </p>
                  <p className='font-semibold text-gray-900 dark:text-white text-xs'>
                    {selectedRedemption.reward?.title || 'N/A'}
                  </p>
                  {selectedRedemption.reward?.description && (
                    <p className='text-[10px] text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2 font-inter'>
                      {selectedRedemption.reward.description}
                    </p>
                  )}
                </div>
              </div>

              <div className='grid grid-cols-2 gap-2.5'>
                <div className='p-2.5 rounded-lg border border-gray-100 dark:border-gray-700'>
                  <p className='text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 font-inter uppercase tracking-wide'>
                    {t('redemptionManagement.table.member')}
                  </p>
                  <p className='font-semibold text-gray-900 dark:text-white text-xs'>
                    {selectedRedemption.member?.full_name || 'N/A'}
                  </p>
                  <p className='text-[9px] text-gray-500 mt-0.5 font-inter'>
                    #{selectedRedemption.member?.membership_number || 'N/A'}
                  </p>
                </div>
                <div className='p-2.5 rounded-lg border border-gray-100 dark:border-gray-700'>
                  <p className='text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 font-inter uppercase tracking-wide'>
                    {t('redemptionManagement.table.pointsSpent')}
                  </p>
                  <p className='font-bold text-yellow-600 dark:text-yellow-400 text-sm'>
                    -{selectedRedemption.points_spent}
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-2.5'>
                <div className='p-2.5 rounded-lg border border-gray-100 dark:border-gray-700'>
                  <p className='text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 font-inter uppercase tracking-wide'>
                    {t('redemptionManagement.table.redeemedAt')}
                  </p>
                  <p className='font-semibold text-gray-900 dark:text-white text-xs'>
                    {formatVietnamDateTime(selectedRedemption.redeemed_at)}
                  </p>
                </div>
                {selectedRedemption.expires_at && (
                  <div className='p-2.5 rounded-lg border border-gray-100 dark:border-gray-700'>
                    <p className='text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 font-inter uppercase tracking-wide'>
                      {t('redemptionManagement.table.expiresAt')}
                    </p>
                    <p className='font-semibold text-gray-900 dark:text-white text-xs'>
                      {formatVietnamDateTime(selectedRedemption.expires_at)}
                    </p>
                  </div>
                )}
                {selectedRedemption.used_at && (
                  <div className='p-2.5 rounded-lg border border-gray-100 dark:border-gray-700'>
                    <p className='text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 font-inter uppercase tracking-wide'>
                      {t('redemptionManagement.table.usedAt')}
                    </p>
                    <p className='font-semibold text-gray-900 dark:text-white text-xs'>
                      {formatVietnamDateTime(selectedRedemption.used_at)}
                    </p>
                  </div>
                )}
              </div>

              {selectedRedemption.notes && (
                <div className='p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
                  <p className='text-[10px] font-medium text-gray-900 dark:text-white mb-1 font-inter uppercase tracking-wide'>
                    {t('redemptionManagement.table.notes')}
                  </p>
                  <p className='text-[10px] text-gray-600 dark:text-gray-400 font-inter'>
                    {selectedRedemption.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </AdminModal>

      {/* Refund Dialog */}
      <ConfirmDialog
        isOpen={isRefundDialogOpen}
        onClose={() => setIsRefundDialogOpen(false)}
        onConfirm={confirmRefund}
        title={t('redemptionManagement.refund.title')}
        message={
          <div className='space-y-3'>
            <p>
              Bạn có chắc chắn muốn hoàn trả{' '}
              <span className='font-bold text-orange-600'>
                {redemptionToRefund?.points_spent} điểm
              </span>{' '}
              cho hội viên{' '}
              <span className='font-bold'>{redemptionToRefund?.member?.full_name}</span>?
            </p>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'>
                {t('redemptionManagement.refund.reason')}
              </label>
              <textarea
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                rows={3}
                className='w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all'
                placeholder={t('redemptionManagement.refund.reasonPlaceholder')}
              />
            </div>
          </div>
        }
        confirmText={t('redemptionManagement.refund.confirmText')}
        cancelText={t('common.cancel')}
        isLoading={isRefunding}
        variant='warning'
      />
    </div>
  );
};

export default RedemptionManagement;
