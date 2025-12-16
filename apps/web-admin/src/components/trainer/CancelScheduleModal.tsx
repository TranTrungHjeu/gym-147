import { AlertTriangle, X } from 'lucide-react';
import React, { useState } from 'react';
import { trainerService } from '../../services/trainer.service';
import AdminModal from '../common/AdminModal';
import Button from '../ui/Button/Button';
import { ScheduleItem } from '../../services/schedule.service';

interface CancelScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schedule: ScheduleItem | null;
  userId: string;
}

const CancelScheduleModal: React.FC<CancelScheduleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  schedule,
  userId,
}) => {
  const [cancellationReason, setCancellationReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if schedule can be cancelled (at least 24 hours in advance)
  const canCancel = () => {
    if (!schedule?.start_time) return false;

    const scheduleStartTime = new Date(schedule.start_time);
    const twentyFourHoursFromNow = new Date();
    twentyFourHoursFromNow.setHours(twentyFourHoursFromNow.getHours() + 24);

    return scheduleStartTime > twentyFourHoursFromNow;
  };

  const handleCancel = async () => {
    if (!schedule) return;

    setError('');
    setLoading(true);

    try {
      const response = await trainerService.cancelTrainerSchedule(
        userId,
        schedule.id,
        cancellationReason || undefined
      );

      if (response.success) {
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: `Đã hủy lớp thành công. ${response.data.cancelled_bookings} hội viên đã được thông báo.`,
            duration: 5000,
          });
        }
        onSuccess();
        onClose();
        setCancellationReason('');
      } else {
        setError(response.message || 'Không thể hủy lớp. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.error('[ERROR] Error cancelling schedule:', err);
      setError(err.message || 'Có lỗi xảy ra khi hủy lớp. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCancellationReason('');
      setError('');
      onClose();
    }
  };

  if (!schedule) return null;

  const scheduleCanBeCancelled = canCancel();
  const hoursUntilStart = schedule.start_time
    ? Math.round(
        (new Date(schedule.start_time).getTime() - new Date().getTime()) / (1000 * 60 * 60)
      )
    : 0;

  return (
    <AdminModal isOpen={isOpen} onClose={handleClose} title='Hủy lịch dạy'>
      <div className='space-y-4'>
        {/* Warning Message */}
        <div className='bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4'>
          <div className='flex items-start gap-3'>
            <AlertTriangle className='w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5' />
            <div className='flex-1'>
              <h3 className='text-sm font-semibold text-orange-900 dark:text-orange-200 mb-1'>
                Xác nhận hủy lịch dạy
              </h3>
              <p className='text-xs text-orange-800 dark:text-orange-300'>
                {scheduleCanBeCancelled ? (
                  <>
                    Bạn đang hủy lớp <strong>{schedule.gym_class?.name}</strong>. Tất cả hội viên đã
                    đăng ký sẽ nhận được thông báo và được hoàn tiền (nếu đã thanh toán).
                    {schedule.current_bookings > 0 && (
                      <>
                        {' '}
                        <strong>{schedule.current_bookings}</strong> hội viên sẽ bị ảnh hưởng.
                      </>
                    )}
                  </>
                ) : (
                  <>
                    Không thể hủy lớp này vì chỉ còn <strong>{hoursUntilStart} giờ</strong> nữa là
                    đến giờ bắt đầu. Bạn chỉ có thể hủy lớp trước ít nhất <strong>24 giờ</strong>.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Schedule Info */}
        <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2'>
          <div className='text-xs font-medium text-gray-700 dark:text-gray-300'>
            Thông tin lớp học:
          </div>
          <div className='text-sm text-gray-900 dark:text-gray-100'>
            <div className='font-semibold'>{schedule.gym_class?.name || 'N/A'}</div>
            <div className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
              {schedule.date &&
                new Date(schedule.date).toLocaleDateString('vi-VN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
            </div>
            <div className='text-xs text-gray-600 dark:text-gray-400'>
              {schedule.start_time &&
                new Date(schedule.start_time).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
              -{' '}
              {schedule.end_time &&
                new Date(schedule.end_time).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
            </div>
            <div className='text-xs text-gray-600 dark:text-gray-400'>
              Phòng: {schedule.room?.name || 'N/A'} | Đã đăng ký: {schedule.current_bookings || 0}/
              {schedule.max_capacity || 0}
            </div>
          </div>
        </div>

        {/* Cancellation Reason */}
        {scheduleCanBeCancelled && (
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Lý do hủy (tùy chọn)
            </label>
            <textarea
              value={cancellationReason}
              onChange={e => setCancellationReason(e.target.value)}
              placeholder='Nhập lý do hủy lớp (nếu có)...'
              className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none'
              rows={3}
              disabled={loading}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3'>
            <p className='text-xs text-red-800 dark:text-red-300'>{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className='flex gap-3 justify-end pt-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleClose}
            disabled={loading}
            className='text-xs'
          >
            Đóng
          </Button>
          {scheduleCanBeCancelled && (
            <Button
              variant='destructive'
              size='sm'
              onClick={handleCancel}
              disabled={loading}
              className='text-xs'
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận hủy'}
            </Button>
          )}
        </div>
      </div>
    </AdminModal>
  );
};

export default CancelScheduleModal;
