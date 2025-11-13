import React, { useEffect, useState } from 'react';
import { CreditCard, Clock, TrendingUp, DollarSign } from 'lucide-react';
import AdminCard from '../common/AdminCard';
import { billingService, Payment } from '../../services/billing.service';
import { formatVietnamDateTime, formatRelativeTime } from '../../utils/dateTime';
import { formatCurrency } from '../../shared/utils/utils';
import { InlineSpinner } from '../ui/AppLoading';

interface RecentPaymentsProps {
  limit?: number;
}

const RecentPayments: React.FC<RecentPaymentsProps> = ({ limit = 5 }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setIsLoading(true);
        const response = await billingService.getAllPayments({ limit }).catch(() => ({
          success: false,
          data: { payments: [] },
        }));

        if (response.success && response.data) {
          const paymentsList = Array.isArray(response.data)
            ? response.data
            : response.data.payments || [];

          // Sort by payment_date or created_at descending
          const sortedPayments = paymentsList
            .sort((a: Payment, b: Payment) => {
              const dateA = new Date(a.payment_date || a.created_at || 0);
              const dateB = new Date(b.payment_date || b.created_at || 0);
              return dateB.getTime() - dateA.getTime();
            })
            .slice(0, limit);

          setPayments(sortedPayments);
        }
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [limit]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800';
      case 'PENDING':
        return 'bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300 border border-warning-200 dark:border-warning-800';
      case 'FAILED':
        return 'bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 border border-error-200 dark:border-error-800';
      case 'REFUNDED':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Hoàn thành';
      case 'PENDING':
        return 'Chờ xử lý';
      case 'FAILED':
        return 'Thất bại';
      case 'REFUNDED':
        return 'Đã hoàn tiền';
      default:
        return status;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'Tiền mặt';
      case 'BANK_TRANSFER':
        return 'Chuyển khoản';
      case 'CREDIT_CARD':
        return 'Thẻ tín dụng';
      case 'DEBIT_CARD':
        return 'Thẻ ghi nợ';
      case 'MOMO':
        return 'MoMo';
      case 'ZALOPAY':
        return 'ZaloPay';
      case 'VNPAY':
        return 'VNPay';
      default:
        return method;
    }
  };

  if (isLoading) {
    return (
      <AdminCard padding='sm'>
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white'>
              Thanh toán gần đây
            </h3>
          </div>
          <div className='flex items-center justify-center py-8'>
            <InlineSpinner size='md' color='orange' />
          </div>
        </div>
      </AdminCard>
    );
  }

  if (payments.length === 0) {
    return (
      <AdminCard padding='sm'>
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white'>
              Thanh toán gần đây
            </h3>
          </div>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter text-center py-4'>
            Chưa có thanh toán nào
          </p>
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard padding='sm'>
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white'>
            Thanh toán gần đây
          </h3>
        </div>
        <div className='space-y-2'>
          {payments.map((payment) => (
            <div
              key={payment.id}
              className='flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group'
            >
              <div className='flex-shrink-0 w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center'>
                <CreditCard className='w-4.5 h-4.5 text-green-600 dark:text-green-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex-1 min-w-0'>
                    <p className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white truncate'>
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className='text-[11px] text-gray-600 dark:text-gray-400 font-inter truncate mt-0.5'>
                      {payment.member?.full_name || 'Thành viên không xác định'}
                    </p>
                    <div className='flex items-center gap-2 mt-1'>
                      <span className='text-[11px] text-gray-500 dark:text-gray-400 font-inter'>
                        {getPaymentMethodLabel(payment.payment_method)}
                      </span>
                      {payment.payment_date && (
                        <div className='flex items-center gap-1'>
                          <Clock className='w-3 h-3 text-gray-400 dark:text-gray-500' />
                          <span className='text-[11px] text-gray-500 dark:text-gray-400 font-inter'>
                            {formatVietnamDateTime(payment.payment_date, 'time')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='flex flex-col items-end gap-1'>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold font-heading rounded-md whitespace-nowrap ${getStatusColor(
                        payment.status
                      )}`}
                    >
                      {getStatusLabel(payment.status)}
                    </span>
                    <span className='text-[10px] text-gray-500 dark:text-gray-400 font-inter'>
                      {formatRelativeTime(payment.payment_date || payment.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminCard>
  );
};

export default RecentPayments;

