import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, Copy, User, Gift, Calendar, DollarSign, AlertCircle, QrCode } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import AdminButton from '../../components/common/AdminButton';
import AdminModal from '../../components/common/AdminModal';
import { useToast } from '../../hooks/useToast';
import rewardService, { RewardRedemption } from '../../services/reward.service';
import { formatVietnamDateTime } from '../../utils/dateTime';
import StatusBadge from '../../components/common/StatusBadge';

const VerifyCode: React.FC = () => {
  const { showToast } = useToast();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [redemption, setRedemption] = useState<RewardRedemption | null>(null);
  const [isMarkingUsed, setIsMarkingUsed] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) {
      showToast('Vui lòng nhập mã đổi thưởng', 'error');
      return;
    }

    try {
      setVerifying(true);
      const response = await rewardService.verifyCode(code.trim());

      if (response.success && response.data) {
        setRedemption(response.data);
      } else {
        showToast(response.message || 'Mã không hợp lệ', 'error');
        setRedemption(null);
      }
    } catch (error: any) {
      showToast(error.message || 'Không thể verify mã', 'error');
      setRedemption(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyCode = () => {
    if (redemption?.code) {
      navigator.clipboard.writeText(redemption.code);
      showToast('Đã copy mã!', 'success');
    }
  };

  const handleGenerateQRCode = async () => {
    if (!redemption?.code) return;

    try {
      setLoadingQR(true);
      const response = await rewardService.generateQRCode(redemption.code);
      if (response.success && response.data) {
        setQrCodeUrl(response.data.qr_code_data_url);
        showToast('Đã tạo QR code!', 'success');
      } else {
        showToast('Không thể tạo QR code', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Không thể tạo QR code', 'error');
    } finally {
      setLoadingQR(false);
    }
  };

  const handleMarkAsUsed = async () => {
    if (!redemption) return;

    try {
      setIsMarkingUsed(true);
      const response = await rewardService.markAsUsed(redemption.id);
      if (response.success) {
        showToast('Đã đánh dấu đã sử dụng', 'success');
        setRedemption({
          ...redemption,
          status: 'USED',
          used_at: new Date().toISOString(),
        });
      } else {
        showToast(response.message || 'Không thể đánh dấu', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Không thể đánh dấu', 'error');
    } finally {
      setIsMarkingUsed(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Chờ xử lý',
      ACTIVE: 'Đang hoạt động',
      USED: 'Đã sử dụng',
      EXPIRED: 'Hết hạn',
      CANCELLED: 'Đã hủy',
      REFUNDED: 'Đã hoàn trả',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'USED':
        return 'info';
      case 'EXPIRED':
        return 'warning';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <div className='p-6 space-y-8 bg-gray-50/50 dark:bg-gray-900/50 min-h-screen'>
      {/* Header Section */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
      <div>
          <h1 className='text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent'>
            Verify Mã Đổi thưởng
          </h1>
          <p className='text-gray-500 dark:text-gray-400 mt-2 text-lg'>
            Xác minh mã đổi thưởng của thành viên
          </p>
        </div>
      </div>

      {/* Verify Code Input */}
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden'>
        <div className='p-6'>
        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Nhập mã đổi thưởng
            </label>
            <div className='flex gap-2'>
              <input
                type='text'
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                placeholder='REWARD-XXXX-XXXX'
                  className='flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl font-mono text-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all'
                autoFocus
              />
                <AdminButton onClick={handleVerify} icon={Search} isLoading={verifying}>
                Verify
              </AdminButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Redemption Details */}
      {redemption && (
        <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden'>
          <div className='p-6 space-y-6'>
            {/* Header with Status */}
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-xl font-bold text-gray-900 dark:text-white'>Thông tin Đổi thưởng</h2>
                <p className='text-gray-600 dark:text-gray-400 mt-1'>Chi tiết mã đổi thưởng</p>
              </div>
              <StatusBadge status={getStatusColor(redemption.status) as any} />
            </div>

            {/* Code Display */}
            <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700'>
              <div className='flex items-center justify-between'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Mã đổi thưởng</label>
                  <code className='text-2xl font-mono font-bold text-orange-600 dark:text-orange-400 tracking-wider'>{redemption.code}</code>
                </div>
                <AdminButton onClick={handleCopyCode} icon={Copy} variant='outline' size='sm' className='border-gray-300 dark:border-gray-600'>
                  Copy
                </AdminButton>
              </div>
            </div>

            {/* Status Alert */}
            {redemption.status !== 'ACTIVE' && (
              <div
                className={`p-4 rounded-xl ${
                  redemption.status === 'EXPIRED'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                    : redemption.status === 'USED'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}
              >
                <div className='flex items-start gap-3'>
                  {redemption.status === 'EXPIRED' ? (
                    <XCircle className='w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5' />
                  ) : (
                    <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400 mt-0.5' />
                  )}
                  <div>
                    <h3 className='font-semibold text-gray-900 dark:text-white'>
                      Mã {redemption.status === 'EXPIRED' ? 'đã hết hạn' : 'không thể sử dụng'}
                    </h3>
                    <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                      Trạng thái: {getStatusLabel(redemption.status)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {/* Member Info */}
              <div className='space-y-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/50'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                  <User className='w-5 h-5 text-blue-500' />
                  Thành viên
                </h3>
                <div className='space-y-2'>
                  <div>
                    <label className='block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1'>Họ tên</label>
                    <p className='text-gray-900 dark:text-white font-medium'>{redemption.member?.full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1'>
                      Mã thành viên
                    </label>
                    <p className='text-gray-900 dark:text-white'>#{redemption.member?.membership_number || 'N/A'}</p>
                  </div>
                  {redemption.member?.email && (
                    <div>
                      <label className='block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1'>Email</label>
                      <p className='text-gray-900 dark:text-white'>{redemption.member.email}</p>
                    </div>
                  )}
                  {redemption.member?.phone && (
                    <div>
                      <label className='block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1'>SĐT</label>
                      <p className='text-gray-900 dark:text-white'>{redemption.member.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reward Info */}
              <div className='space-y-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/50'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                  <Gift className='w-5 h-5 text-orange-500' />
                  Phần thưởng
                </h3>
                <div className='space-y-2'>
                  <div>
                    <label className='block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1'>Tiêu đề</label>
                    <p className='text-gray-900 dark:text-white font-medium'>{redemption.reward?.title || 'N/A'}</p>
                  </div>
                  {redemption.reward?.description && (
                    <div>
                      <label className='block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1'>Mô tả</label>
                      <p className='text-gray-900 dark:text-white text-sm'>{redemption.reward.description}</p>
                    </div>
                  )}
                  <div>
                    <label className='block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1'>Điểm đã đổi</label>
                    <p className='text-gray-900 dark:text-white font-medium text-yellow-600 dark:text-yellow-400'>
                      {redemption.points_spent} điểm
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 p-4 rounded-xl bg-gray-50/30 dark:bg-gray-800/50'>
              <div>
                <label className='block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-2'>
                  <Calendar className='w-4 h-4' />
                  Ngày đổi
                </label>
                <p className='text-gray-900 dark:text-white'>{formatVietnamDateTime(redemption.redeemed_at)}</p>
              </div>
              {redemption.expires_at && (
                <div>
                  <label className='block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-2'>
                    <Calendar className='w-4 h-4' />
                    Hết hạn
                  </label>
                  <p
                    className={`${
                      new Date(redemption.expires_at) < new Date() && redemption.status === 'ACTIVE'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {formatVietnamDateTime(redemption.expires_at)}
                  </p>
                </div>
              )}
              {redemption.used_at && (
                <div>
                  <label className='block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-2'>
                    <CheckCircle className='w-4 h-4' />
                    Ngày sử dụng
                  </label>
                  <p className='text-gray-900 dark:text-white'>{formatVietnamDateTime(redemption.used_at)}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {redemption.status === 'ACTIVE' && (
              <div className='pt-4 border-t border-gray-200 dark:border-gray-700'>
                <AdminButton
                  onClick={handleMarkAsUsed}
                  icon={CheckCircle}
                  isLoading={isMarkingUsed}
                  className='w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-none'
                >
                  Đánh dấu đã sử dụng
                </AdminButton>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!redemption && !verifying && code && (
        <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden'>
          <div className='text-center py-20'>
            <div className='w-24 h-24 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6'>
              <Search className='w-12 h-12 text-gray-400' />
            </div>
            <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
              Không tìm thấy mã đổi thưởng
            </h3>
            <p className='text-gray-500 dark:text-gray-400 max-w-sm mx-auto'>
              Vui lòng kiểm tra lại mã đổi thưởng và thử lại.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyCode;

