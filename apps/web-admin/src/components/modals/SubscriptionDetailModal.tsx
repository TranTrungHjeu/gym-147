import React from 'react';
import { X, Calendar, Package, User, DollarSign, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import AdminModal from '../common/AdminModal';
import { Subscription } from '../../services/billing.service';
import { formatCurrency } from '../../shared/utils/utils';

interface SubscriptionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription | null;
}

const SubscriptionDetailModal: React.FC<SubscriptionDetailModalProps> = ({ isOpen, onClose, subscription }) => {
  if (!subscription) return null;

  const formatDateVN = (dateString: string | Date): string => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800';
      case 'EXPIRED':
        return 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300 border-error-200 dark:border-error-800';
      case 'CANCELLED':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      case 'SUSPENDED':
        return 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300 border-warning-200 dark:border-warning-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Đang hoạt động';
      case 'EXPIRED':
        return 'Hết hạn';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'SUSPENDED':
        return 'Tạm ngưng';
      default:
        return status;
    }
  };

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title='Chi tiết đăng ký' size='lg'>
      <div className='p-6 space-y-6'>
        {/* Status Badge */}
        <div className='flex items-center justify-between'>
          <span
            className={`px-3 py-1.5 inline-flex text-theme-xs font-semibold font-heading rounded-full border ${getStatusColor(
              subscription.status
            )}`}
          >
            {getStatusText(subscription.status)}
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
                {subscription.member?.full_name || 'N/A'}
              </p>
            </div>
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>Email</p>
              <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                {subscription.member?.email || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Plan Information */}
        <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3'>
          <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2'>
            <Package className='w-4 h-4 text-orange-600 dark:text-orange-400' />
            Thông tin gói tập
          </h3>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>Tên gói</p>
              <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                {subscription.plan?.name || 'N/A'}
              </p>
            </div>
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1'>Giá</p>
              <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                {subscription.plan ? formatCurrency(subscription.plan.price) : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Subscription Details */}
        <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3'>
          <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2'>
            <Calendar className='w-4 h-4 text-orange-600 dark:text-orange-400' />
            Chi tiết đăng ký
          </h3>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1 flex items-center gap-1'>
                <Calendar className='w-3 h-3' />
                Ngày bắt đầu
              </p>
              <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                {formatDateVN(subscription.start_date)}
              </p>
            </div>
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1 flex items-center gap-1'>
                <Calendar className='w-3 h-3' />
                Ngày kết thúc
              </p>
              <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                {formatDateVN(subscription.end_date)}
              </p>
            </div>
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1 flex items-center gap-1'>
                <Clock className='w-3 h-3' />
                Tự động gia hạn
              </p>
              <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                {subscription.auto_renew ? (
                  <span className='text-success-600 dark:text-success-400 flex items-center gap-1'>
                    <CheckCircle2 className='w-3.5 h-3.5' />
                    Có
                  </span>
                ) : (
                  <span className='text-gray-500 dark:text-gray-400 flex items-center gap-1'>
                    <XCircle className='w-3.5 h-3.5' />
                    Không
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter mb-1 flex items-center gap-1'>
                <DollarSign className='w-3 h-3' />
                Trạng thái thanh toán
              </p>
              <p className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                {subscription.payment_status || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className='flex items-center justify-between text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
          <span>Ngày tạo: {formatDateVN(subscription.created_at)}</span>
          <span>Cập nhật: {formatDateVN(subscription.updated_at)}</span>
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

export default SubscriptionDetailModal;

