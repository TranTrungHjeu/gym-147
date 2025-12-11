import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useToast } from '../../hooks/useToast';
import useTranslation from '../../hooks/useTranslation';
import { billingService, Refund } from '../../services/billing.service';
import {
  RotateCcw,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Filter,
  Download,
} from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import {
  AdminTable,
  AdminTableHeader,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
} from '../../components/common/AdminTable';
import { TableLoading } from '../../components/ui/AppLoading';
import CustomSelect from '../../components/common/CustomSelect';
import AdminButton from '../../components/common/AdminButton';
import { EnumBadge } from '../../shared/components/ui';
import ExportButton from '../../components/common/ExportButton';
import { formatVietnamDateTime } from '../../utils/dateTime';
import RefundDetailModal from '../../components/modals/RefundDetailModal';
import ConfirmModal from '../../components/common/ConfirmModal';

const RefundManagement: React.FC = () => {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isRefundDetailOpen, setIsRefundDetailOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [processingRefundId, setProcessingRefundId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'process' | null;
    refund: Refund | null;
  }>({
    isOpen: false,
    type: null,
    refund: null,
  });

  // Get current user for approval/processing
  const getCurrentUserId = () => {
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        return userData.id || userData.user_id || 'ADMIN';
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return 'ADMIN';
  };

  useEffect(() => {
    loadRefunds();
  }, [statusFilter, reasonFilter, currentPage]);

  const loadRefunds = async () => {
    try {
      setIsLoading(true);
      const filters: any = {
        page: currentPage,
        limit: 50,
        sort_by: 'created_at',
        sort_order: 'desc',
        all: true, // Admin view: allow viewing all refunds
      };
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (reasonFilter !== 'all') filters.reason = reasonFilter;

      const response = await billingService.getAllRefunds(filters);
      if (response.success) {
        const refundsData = Array.isArray(response.data)
          ? response.data
          : response.data?.refunds || [];
        setRefunds(refundsData);
        if (response.data?.pagination) {
          setTotalPages(response.data.pagination.totalPages || 1);
          setTotal(response.data.pagination.total || 0);
        }
      } else {
        showToast(t('refundManagement.errors.loadDataError'), 'error');
      }
    } catch (error: any) {
      console.error('Error loading refunds:', error);
      showToast(
        error.message || t('refundManagement.errors.loadDataError'),
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (refund: Refund) => {
    setConfirmModal({
      isOpen: true,
      type: 'approve',
      refund,
    });
  };

  const handleConfirmApprove = async () => {
    if (!confirmModal.refund) return;

    try {
      setProcessingRefundId(confirmModal.refund.id);
      setConfirmModal({ isOpen: false, type: null, refund: null });
      const approved_by = getCurrentUserId();
      const response = await billingService.approveRefund(confirmModal.refund.id, approved_by);
      if (response.success) {
        showToast(t('refundManagement.messages.approveSuccess'), 'success');
        loadRefunds();
        if (selectedRefund?.id === confirmModal.refund.id) {
          setSelectedRefund(response.data);
        }
      } else {
        showToast(response.message || t('refundManagement.errors.approveError'), 'error');
      }
    } catch (error: any) {
      console.error('Error approving refund:', error);
      showToast(
        error.message || t('refundManagement.errors.approveError'),
        'error'
      );
    } finally {
      setProcessingRefundId(null);
    }
  };

  const handleProcess = async (refund: Refund) => {
    setConfirmModal({
      isOpen: true,
      type: 'process',
      refund,
    });
  };

  const handleConfirmProcess = async () => {
    if (!confirmModal.refund) return;

    try {
      setProcessingRefundId(confirmModal.refund.id);
      setConfirmModal({ isOpen: false, type: null, refund: null });
      const processed_by = getCurrentUserId();
      const response = await billingService.processRefund(confirmModal.refund.id, processed_by);
      if (response.success) {
        showToast(t('refundManagement.messages.processSuccess'), 'success');
        loadRefunds();
        if (selectedRefund?.id === confirmModal.refund.id) {
          setSelectedRefund(response.data);
        }
      } else {
        showToast(response.message || t('refundManagement.errors.processError'), 'error');
      }
    } catch (error: any) {
      console.error('Error processing refund:', error);
      showToast(
        error.message || t('refundManagement.errors.processError'),
        'error'
      );
    } finally {
      setProcessingRefundId(null);
    }
  };

  const handleViewDetail = (refund: Refund) => {
    setSelectedRefund(refund);
    setIsRefundDetailOpen(true);
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return 'N/A';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(numAmount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800';
      case 'APPROVED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'PENDING':
        return 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300 border-warning-200 dark:border-warning-800';
      case 'FAILED':
      case 'CANCELLED':
        return 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300 border-error-200 dark:border-error-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return CheckCircle;
      case 'APPROVED':
        return CheckCircle;
      case 'PENDING':
        return Clock;
      case 'FAILED':
      case 'CANCELLED':
        return XCircle;
      default:
        return Clock;
    }
  };

  // Filter options
  const statusOptions = [
    { value: 'all', label: t('refundManagement.filter.all') },
    { value: 'PENDING', label: t('refundManagement.status.pending') },
    { value: 'APPROVED', label: t('refundManagement.status.approved') },
    { value: 'PROCESSED', label: t('refundManagement.status.processed') },
    { value: 'FAILED', label: t('refundManagement.status.failed') },
    { value: 'CANCELLED', label: t('refundManagement.status.cancelled') },
  ];

  const reasonOptions = [
    { value: 'all', label: t('refundManagement.filter.all') },
    { value: 'CANCELLATION', label: t('refundManagement.reason.cancellation') },
    { value: 'DOWNGRADE', label: t('refundManagement.reason.downgrade') },
    { value: 'OTHER', label: t('refundManagement.reason.other') },
  ];

  // Filtered data
  const filteredRefunds = useMemo(() => {
    return refunds.filter(refund => {
      const matchesSearch =
        refund.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        refund.payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        refund.payment?.member?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        refund.payment?.member?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        refund.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [refunds, searchTerm]);

  // Prepare export data
  const getExportData = useCallback(() => {
    return filteredRefunds.map(refund => ({
      'ID': refund.id,
      'Thành viên': refund.payment?.member?.full_name || 'N/A',
      'Email': refund.payment?.member?.email || 'N/A',
      'Số tiền (VND)': refund.amount || 0,
      'Số tiền (đã format)': formatCurrency(refund.amount),
      'Lý do': refund.reason || 'N/A',
      'Trạng thái': refund.status,
      'Người yêu cầu': refund.requested_by || 'N/A',
      'Người duyệt': refund.approved_by || 'N/A',
      'Người xử lý': refund.processed_by || 'N/A',
      'Ghi chú': refund.notes || 'N/A',
      'Mã giao dịch': refund.transaction_id || 'N/A',
      'Ngày tạo': refund.created_at
        ? formatVietnamDateTime(refund.created_at, 'datetime')
        : 'N/A',
      'Ngày xử lý': refund.processed_at
        ? formatVietnamDateTime(refund.processed_at, 'datetime')
        : 'N/A',
    }));
  }, [filteredRefunds]);

  const exportColumns = [
    { key: 'ID', label: 'ID' },
    { key: 'Thành viên', label: 'Thành viên' },
    { key: 'Email', label: 'Email' },
    { key: 'Số tiền (VND)', label: 'Số tiền (VND)' },
    { key: 'Số tiền (đã format)', label: 'Số tiền (đã format)' },
    { key: 'Lý do', label: 'Lý do' },
    { key: 'Trạng thái', label: 'Trạng thái' },
    { key: 'Người yêu cầu', label: 'Người yêu cầu' },
    { key: 'Người duyệt', label: 'Người duyệt' },
    { key: 'Người xử lý', label: 'Người xử lý' },
    { key: 'Ghi chú', label: 'Ghi chú' },
    { key: 'Mã giao dịch', label: 'Mã giao dịch' },
    { key: 'Ngày tạo', label: 'Ngày tạo' },
    { key: 'Ngày xử lý', label: 'Ngày xử lý' },
  ];

  return (
    <div className='p-3 space-y-3'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold font-heading text-gray-900 dark:text-white'>
            {t('refundManagement.title')}
          </h1>
          <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
            {t('refundManagement.subtitle')}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <AdminButton
            variant='outline'
            size='sm'
            icon={RefreshCw}
            onClick={loadRefunds}
            disabled={isLoading}
          >
            {t('common.actions.refresh')}
          </AdminButton>
          <ExportButton
            data={getExportData()}
            columns={exportColumns}
            filename='refunds'
            label={t('common.export')}
          />
        </div>
      </div>

      {/* Filters */}
      <AdminCard padding='sm'>
        <div className='flex flex-col sm:flex-row gap-3'>
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
            <input
              type='text'
              placeholder={t('refundManagement.search.placeholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='w-full pl-10 pr-4 py-2 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500'
            />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            placeholder={t('refundManagement.filter.status')}
            className='w-full sm:w-48'
          />
          <CustomSelect
            value={reasonFilter}
            onChange={setReasonFilter}
            options={reasonOptions}
            placeholder={t('refundManagement.filter.reason')}
            className='w-full sm:w-48'
          />
        </div>
      </AdminCard>

      {/* Stats */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
        <AdminCard padding='sm'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center'>
              <RotateCcw className='w-4 h-4 text-orange-600 dark:text-orange-400' />
            </div>
            <div>
              <div className='text-xl font-bold text-gray-900 dark:text-white'>
                {total}
              </div>
              <div className='text-theme-xs text-gray-500 dark:text-gray-400'>
                {t('refundManagement.stats.total')}
              </div>
            </div>
          </div>
        </AdminCard>
        <AdminCard padding='sm'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 bg-warning-100 dark:bg-warning-900/30 rounded-lg flex items-center justify-center'>
              <Clock className='w-4 h-4 text-warning-600 dark:text-warning-400' />
            </div>
            <div>
              <div className='text-xl font-bold text-gray-900 dark:text-white'>
                {refunds.filter(r => r.status === 'PENDING').length}
              </div>
              <div className='text-theme-xs text-gray-500 dark:text-gray-400'>
                {t('refundManagement.stats.pending')}
              </div>
            </div>
          </div>
        </AdminCard>
        <AdminCard padding='sm'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center'>
              <CheckCircle className='w-4 h-4 text-blue-600 dark:text-blue-400' />
            </div>
            <div>
              <div className='text-xl font-bold text-gray-900 dark:text-white'>
                {refunds.filter(r => r.status === 'APPROVED').length}
              </div>
              <div className='text-theme-xs text-gray-500 dark:text-gray-400'>
                {t('refundManagement.stats.approved')}
              </div>
            </div>
          </div>
        </AdminCard>
        <AdminCard padding='sm'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center'>
              <CheckCircle className='w-4 h-4 text-success-600 dark:text-success-400' />
            </div>
            <div>
              <div className='text-xl font-bold text-gray-900 dark:text-white'>
                {refunds.filter(r => r.status === 'PROCESSED').length}
              </div>
              <div className='text-theme-xs text-gray-500 dark:text-gray-400'>
                {t('refundManagement.stats.processed')}
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Table */}
      <AdminCard padding='none' className='overflow-hidden'>
        {isLoading ? (
          <TableLoading text={t('refundManagement.messages.loading')} />
        ) : filteredRefunds.length === 0 ? (
          <div className='p-8 text-center'>
            <RotateCcw className='w-12 h-12 text-gray-400 mx-auto mb-3' />
            <p className='text-gray-500 dark:text-gray-400'>
              {t('refundManagement.messages.noRefunds')}
            </p>
          </div>
        ) : (
          <>
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell>Thành viên</AdminTableCell>
                  <AdminTableCell>Số tiền</AdminTableCell>
                  <AdminTableCell>Lý do</AdminTableCell>
                  <AdminTableCell>Trạng thái</AdminTableCell>
                  <AdminTableCell>Ngày tạo</AdminTableCell>
                  <AdminTableCell className='w-32'>Thao tác</AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {filteredRefunds.map(refund => {
                  const StatusIcon = getStatusIcon(refund.status);
                  return (
                    <AdminTableRow key={refund.id}>
                      <AdminTableCell>
                        <div>
                          <div className='font-semibold text-gray-900 dark:text-white'>
                            {refund.payment?.member?.full_name || 'N/A'}
                          </div>
                          <div className='text-theme-xs text-gray-500 dark:text-gray-400'>
                            {refund.payment?.member?.email || 'N/A'}
                          </div>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell className='font-semibold'>
                        {formatCurrency(refund.amount)}
                      </AdminTableCell>
                      <AdminTableCell>
                        <EnumBadge type='REFUND_REASON' value={refund.reason} size='sm' />
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className='flex items-center gap-2'>
                          <StatusIcon
                            className={`w-4 h-4 ${
                              refund.status === 'PROCESSED'
                                ? 'text-success-600'
                                : refund.status === 'APPROVED'
                                ? 'text-blue-600'
                                : refund.status === 'PENDING'
                                ? 'text-warning-600'
                                : 'text-error-600'
                            }`}
                          />
                          <EnumBadge type='REFUND_STATUS' value={refund.status} size='sm' />
                        </div>
                      </AdminTableCell>
                      <AdminTableCell className='text-theme-xs'>
                        {refund.created_at
                          ? formatVietnamDateTime(refund.created_at, 'datetime')
                          : 'N/A'}
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className='flex items-center gap-1'>
                          <AdminButton
                            variant='ghost'
                            size='sm'
                            icon={Eye}
                            onClick={() => handleViewDetail(refund)}
                            title={t('common.view')}
                          />
                          {refund.status === 'PENDING' && (
                            <AdminButton
                              variant='primary'
                              size='sm'
                              icon={CheckCircle}
                              onClick={() => handleApprove(refund)}
                              disabled={processingRefundId === refund.id}
                              isLoading={processingRefundId === refund.id}
                              title={t('refundManagement.actions.approve')}
                            />
                          )}
                          {refund.status === 'APPROVED' && (
                            <AdminButton
                              variant='success'
                              size='sm'
                              icon={CheckCircle}
                              onClick={() => handleProcess(refund)}
                              disabled={processingRefundId === refund.id}
                              isLoading={processingRefundId === refund.id}
                              title={t('refundManagement.actions.process')}
                            />
                          )}
                        </div>
                      </AdminTableCell>
                    </AdminTableRow>
                  );
                })}
              </AdminTableBody>
            </AdminTable>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='p-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between'>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400'>
                  {t('common.showing', {
                    from: (currentPage - 1) * 50 + 1,
                    to: Math.min(currentPage * 50, total),
                    total,
                  })}
                </div>
                <div className='flex items-center gap-2'>
                  <AdminButton
                    variant='outline'
                    size='sm'
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    {t('common.previous')}
                  </AdminButton>
                  <span className='text-theme-xs text-gray-700 dark:text-gray-300'>
                    {currentPage} / {totalPages}
                  </span>
                  <AdminButton
                    variant='outline'
                    size='sm'
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t('common.next')}
                  </AdminButton>
                </div>
              </div>
            )}
          </>
        )}
      </AdminCard>

      {/* Refund Detail Modal */}
      {isRefundDetailOpen && selectedRefund && (
        <RefundDetailModal
          refund={selectedRefund}
          isOpen={isRefundDetailOpen}
          onClose={() => {
            setIsRefundDetailOpen(false);
            setSelectedRefund(null);
          }}
          onApprove={() => {
            handleApprove(selectedRefund);
          }}
          onProcess={() => {
            handleProcess(selectedRefund);
          }}
          isLoading={processingRefundId === selectedRefund.id}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null, refund: null })}
        onConfirm={
          confirmModal.type === 'approve' ? handleConfirmApprove : handleConfirmProcess
        }
        title={
          confirmModal.type === 'approve'
            ? t('refundManagement.confirm.approveTitle')
            : t('refundManagement.confirm.processTitle')
        }
        message={
          confirmModal.refund
            ? confirmModal.type === 'approve'
              ? t('refundManagement.confirm.approve', {
                  amount: formatCurrency(confirmModal.refund.amount),
                })
              : t('refundManagement.confirm.process', {
                  amount: formatCurrency(confirmModal.refund.amount),
                })
            : ''
        }
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant={confirmModal.type === 'approve' ? 'primary' : 'success'}
        isLoading={processingRefundId === confirmModal.refund?.id}
      />
    </div>
  );
};

export default RefundManagement;

