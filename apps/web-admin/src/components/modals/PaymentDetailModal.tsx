import React from 'react';
import { X, Calendar, CreditCard, User, DollarSign, CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react';
import AdminModal from '../common/AdminModal';
import { Payment } from '../../services/billing.service';
import { formatCurrency } from '../../shared/utils/utils';

interface PaymentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
}

const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({ isOpen, onClose, payment }) => {
  if (!payment) return null;

  const formatDateVN = (dateString: string | Date): string => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'COMPLETED':
        return 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800';
      case 'PENDING':
        return 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300 border-warning-200 dark:border-warning-800';
      case 'FAILED':
        return 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300 border-error-200 dark:border-error-800';
      case 'REFUNDED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'COMPLETED':
        return 'Đã thanh toán';
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

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title='Chi tiết thanh toán' size='lg'>
      <div className='p-6 space-y-6'>
        {/* Status Badge */}
        <div className='flex items-center justify-between'>
          <span
            className={`px-3 py-1.5 inline-flex text-theme-xs font-semibold font-heading rounded-full border ${getStatusColor(
              payment.status
            )}`}
          >
            {getStatusText(payment.status)}
          </span>
        </div>

        {/* Member Information */}
        <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3'>
          <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2'>
            <User className='w-4 h-4 text-orange-600 dark:text-orange-400' />
            Thông tin thành viên
          </h3>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>Họ tên</p>
              <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                {payment.member?.full_name || 'N/A'}
              </p>
            </div>
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>Email</p>
              <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                {payment.member?.email || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3'>
          <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2'>
            <DollarSign className='w-4 h-4 text-orange-600 dark:text-orange-400' />
            Thông tin thanh toán
          </h3>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1 flex items-center gap-1'>
                <DollarSign className='w-3 h-3' />
                Số tiền
              </p>
              <p className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                {formatCurrency(payment.amount)}
              </p>
            </div>
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1 flex items-center gap-1'>
                <CreditCard className='w-3 h-3' />
                Phương thức
              </p>
              <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                {payment.payment_method || 'N/A'}
              </p>
            </div>
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1 flex items-center gap-1'>
                <Calendar className='w-3 h-3' />
                Ngày thanh toán
              </p>
              <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                {formatDateVN(payment.payment_date)}
              </p>
            </div>
            {payment.transaction_id && (
              <div>
                <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1 flex items-center gap-1'>
                  <FileText className='w-3 h-3' />
                  Mã giao dịch
                </p>
                <p className='text-theme-xs font-heading text-gray-900 dark:text-white font-mono'>
                  {payment.transaction_id}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className='flex items-center justify-between text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
          <span>Ngày tạo: {formatDateVN(payment.created_at)}</span>
          {payment.updated_at && <span>Cập nhật: {formatDateVN(payment.updated_at)}</span>}
        </div>

        {/* Actions */}
        <div className='flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800'>
          <button
            onClick={onClose}
            className='px-5 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95'
          >
            Đóng
          </button>
        </div>
      </div>
    </AdminModal>
  );
};

export default PaymentDetailModal;

