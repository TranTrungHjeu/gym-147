import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Users, ChevronRight } from 'lucide-react';
import AdminCard from '../common/AdminCard';
import { scheduleService } from '../../services/schedule.service';
import { formatVietnamDateTime, formatRelativeTime } from '../../utils/dateTime';
import { InlineSpinner } from '../ui/AppLoading';

interface Booking {
  id: string;
  member_id: string;
  schedule_id: string;
  status: string;
  booked_at: string;
  member?: {
    id: string;
    full_name: string;
    email: string;
  };
  schedule?: {
    id: string;
    gym_class?: {
      name: string;
    };
    trainer?: {
      full_name: string;
    };
    room?: {
      name: string;
    };
    start_time: string;
    end_time: string;
  };
}

interface RecentBookingsProps {
  limit?: number;
}

const RecentBookings: React.FC<RecentBookingsProps> = ({ limit = 5 }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        // Get all bookings and take the most recent ones
        const response = await scheduleService.getAllBookings({ limit }).catch(() => ({
          success: false,
          data: { bookings: [] },
        }));

        if (response.success && response.data) {
          const bookingsList = Array.isArray(response.data)
            ? response.data
            : (response.data as any)?.bookings || [];

          // Sort by booked_at descending and take limit
          const sortedBookings = bookingsList
            .sort((a: Booking, b: Booking) => {
              const dateA = new Date(a.booked_at || a.schedule?.start_time || 0);
              const dateB = new Date(b.booked_at || b.schedule?.start_time || 0);
              return dateB.getTime() - dateA.getTime();
            })
            .slice(0, limit);

          setBookings(sortedBookings);
        }
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [limit]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800';
      case 'PENDING':
        return 'bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300 border border-warning-200 dark:border-warning-800';
      case 'CANCELLED':
        return 'bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 border border-error-200 dark:border-error-800';
      case 'WAITLIST':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'Đã xác nhận';
      case 'PENDING':
        return 'Chờ xử lý';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'WAITLIST':
        return 'Chờ danh sách';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <AdminCard padding='sm'>
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white'>
              Đặt chỗ gần đây
            </h3>
          </div>
          <div className='flex items-center justify-center py-8'>
            <InlineSpinner size='md' color='orange' />
          </div>
        </div>
      </AdminCard>
    );
  }

  if (bookings.length === 0) {
    return (
      <AdminCard padding='sm'>
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white'>
              Đặt chỗ gần đây
            </h3>
          </div>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter text-center py-4'>
            Chưa có đặt chỗ nào
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
            Đặt chỗ gần đây
          </h3>
        </div>
        <div className='space-y-2'>
          {bookings.map(booking => (
            <div
              key={booking.id}
              className='flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group'
            >
              <div className='flex-shrink-0 w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center'>
                <Calendar className='w-4.5 h-4.5 text-orange-600 dark:text-orange-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex-1 min-w-0'>
                    <p className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white truncate'>
                      {booking.schedule?.gym_class?.name || 'Lớp học không xác định'}
                    </p>
                    <p className='text-[11px] text-gray-600 dark:text-gray-400 font-inter truncate mt-0.5'>
                      {booking.member?.full_name || 'Hội viên không xác định'}
                    </p>
                    <div className='flex items-center gap-2 mt-1'>
                      <div className='flex items-center gap-1'>
                        <Clock className='w-3 h-3 text-gray-400 dark:text-gray-500' />
                        <span className='text-[11px] text-gray-500 dark:text-gray-400 font-inter'>
                          {booking.schedule?.start_time
                            ? formatVietnamDateTime(booking.schedule.start_time, 'time')
                            : 'N/A'}
                        </span>
                      </div>
                      {booking.schedule?.trainer && (
                        <div className='flex items-center gap-1'>
                          <Users className='w-3 h-3 text-gray-400 dark:text-gray-500' />
                          <span className='text-[11px] text-gray-500 dark:text-gray-400 font-inter truncate'>
                            {booking.schedule.trainer.full_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='flex flex-col items-end gap-1'>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold font-heading rounded-md whitespace-nowrap ${getStatusColor(
                        booking.status
                      )}`}
                    >
                      {getStatusLabel(booking.status)}
                    </span>
                    <span className='text-[10px] text-gray-500 dark:text-gray-400 font-inter'>
                      {formatRelativeTime(booking.booked_at)}
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

export default RecentBookings;
