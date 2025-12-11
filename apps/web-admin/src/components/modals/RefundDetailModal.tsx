import React, { useState, useEffect } from 'react';
import { X, RotateCcw, CheckCircle, Clock, User, DollarSign, FileText, AlertCircle } from 'lucide-react';
import AdminModal from '../common/AdminModal';
import AdminButton from '../common/AdminButton';
import { Refund } from '../../services/billing.service';
import { formatCurrency } from '../../shared/utils/utils';
import { formatVietnamDateTime } from '../../utils/dateTime';
import { EnumBadge } from '../../shared/components/ui';
import { billingService } from '../../services/billing.service';
import useTranslation from '../../hooks/useTranslation';

interface RefundDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  refund: Refund | null;
  onApprove?: () => void;
  onProcess?: () => void;
  isLoading?: boolean;
}

const RefundDetailModal: React.FC<RefundDetailModalProps> = ({
  isOpen,
  onClose,
  refund,
  onApprove,
  onProcess,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [timeline, setTimeline] = useState<any[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  useEffect(() => {
    if (refund && isOpen) {
      loadTimeline();
    }
  }, [refund, isOpen]);

  const loadTimeline = async () => {
    if (!refund) return;
    try {
      setIsLoadingTimeline(true);
      const response = await billingService.getRefundTimeline(refund.id);
      if (response.success && response.data?.timeline) {
        setTimeline(response.data.timeline);
      }
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  if (!refund) return null;

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
      case 'APPROVED':
        return CheckCircle;
      case 'PENDING':
        return Clock;
      case 'FAILED':
      case 'CANCELLED':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title={t('refundManagement.detail.title')} size='lg'>
      <div className='p-6 space-y-6'>
        {/* Status Badge */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            {React.createElement(getStatusIcon(refund.status), {
              className: `w-5 h-5 ${
                refund.status === 'PROCESSED'
                  ? 'text-success-600'
                  : refund.status === 'APPROVED'
                  ? 'text-blue-600'
                  : refund.status === 'PENDING'
                  ? 'text-warning-600'
                  : 'text-error-600'
              }`,
            })}
            <EnumBadge type='REFUND_STATUS' value={refund.status} size='md' />
          </div>
          {refund.status === 'PENDING' && onApprove && (
            <AdminButton
              variant='primary'
              size='sm'
              icon={CheckCircle}
              onClick={onApprove}
              disabled={isLoading}
              isLoading={isLoading}
            >
              {t('refundManagement.actions.approve')}
            </AdminButton>
          )}
          {refund.status === 'APPROVED' && onProcess && (
            <AdminButton
              variant='success'
              size='sm'
              icon={CheckCircle}
              onClick={onProcess}
              disabled={isLoading}
              isLoading={isLoading}
            >
              {t('refundManagement.actions.process')}
            </AdminButton>
          )}
        </div>

        {/* Member Information */}
        {refund.payment?.member && (
          <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3'>
            <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2'>
              <User className='w-4 h-4 text-orange-600 dark:text-orange-400' />
              {t('refundManagement.detail.memberInfo')}
            </h3>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>
                  {t('refundManagement.detail.memberName')}
                </p>
                <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                  {refund.payment.member.full_name || 'N/A'}
                </p>
              </div>
              <div>
                <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>
                  {t('refundManagement.detail.memberEmail')}
                </p>
                <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                  {refund.payment.member.email || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Refund Details */}
        <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3'>
          <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2'>
            <DollarSign className='w-4 h-4 text-orange-600 dark:text-orange-400' />
            {t('refundManagement.detail.refundInfo')}
          </h3>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>
                {t('refundManagement.detail.amount')}
              </p>
              <p className='text-lg font-bold font-heading text-gray-900 dark:text-white'>
                {formatCurrency(refund.amount)}
              </p>
            </div>
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>
                {t('refundManagement.detail.reason')}
              </p>
              <EnumBadge type='REFUND_REASON' value={refund.reason} size='sm' />
            </div>
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>
                {t('refundManagement.detail.requestedBy')}
              </p>
              <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                {refund.requested_by || 'N/A'}
              </p>
            </div>
            {refund.approved_by && (
              <div>
                <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>
                  {t('refundManagement.detail.approvedBy')}
                </p>
                <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                  {refund.approved_by}
                </p>
              </div>
            )}
            {refund.processed_by && (
              <div>
                <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>
                  {t('refundManagement.detail.processedBy')}
                </p>
                <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                  {refund.processed_by}
                </p>
              </div>
            )}
            {refund.transaction_id && (
              <div>
                <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>
                  {t('refundManagement.detail.transactionId')}
                </p>
                <p className='text-theme-xs font-mono font-heading text-gray-900 dark:text-white'>
                  {refund.transaction_id}
                </p>
              </div>
            )}
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>
                {t('refundManagement.detail.createdAt')}
              </p>
              <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                {refund.created_at
                  ? formatVietnamDateTime(refund.created_at, 'datetime')
                  : 'N/A'}
              </p>
            </div>
            {refund.processed_at && (
              <div>
                <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>
                  {t('refundManagement.detail.processedAt')}
                </p>
                <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                  {formatVietnamDateTime(refund.processed_at, 'datetime')}
                </p>
              </div>
            )}
          </div>
          {refund.notes && (
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>
                {t('refundManagement.detail.notes')}
              </p>
              <p className='text-theme-xs font-heading text-gray-900 dark:text-white bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700'>
                {refund.notes}
              </p>
            </div>
          )}
        </div>

        {/* Timeline */}
        {timeline.length > 0 && (
          <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3'>
            <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2'>
              <Clock className='w-4 h-4 text-orange-600 dark:text-orange-400' />
              {t('refundManagement.detail.timeline')}
            </h3>
            <div className='space-y-2'>
              {timeline.map((item, index) => {
                const StatusIcon = getStatusIcon(item.status);
                return (
                  <div key={index} className='flex items-start gap-3 pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0'>
                    <div className='flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center'>
                      <StatusIcon className='w-4 h-4 text-orange-600 dark:text-orange-400' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                        <span className='text-[10px] text-gray-500 dark:text-gray-400'>
                          {item.timestamp
                            ? formatVietnamDateTime(item.timestamp, 'datetime')
                            : 'N/A'}
                        </span>
                      </div>
                      <p className='text-theme-xs text-gray-700 dark:text-gray-300'>
                        {item.note || item.action || 'N/A'}
                      </p>
                      {item.actor && (
                        <p className='text-[10px] text-gray-500 dark:text-gray-400 mt-1'>
                          {t('refundManagement.detail.by')}: {item.actor}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Reference */}
        {refund.payment && (
          <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3'>
            <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2'>
              <FileText className='w-4 h-4 text-orange-600 dark:text-orange-400' />
              {t('refundManagement.detail.paymentInfo')}
            </h3>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>
                  {t('refundManagement.detail.paymentId')}
                </p>
                <p className='text-theme-xs font-mono font-heading text-gray-900 dark:text-white'>
                  {refund.payment.id.substring(0, 8)}...
                </p>
              </div>
              <div>
                <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>
                  {t('refundManagement.detail.paymentAmount')}
                </p>
                <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                  {formatCurrency(refund.payment.amount || 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
};

export default RefundDetailModal;

