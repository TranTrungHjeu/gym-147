import { useEffect, useState } from 'react';
import Input from '../../components/form/input/InputField';
import Button from '../../components/ui/Button/Button';
import { scheduleService } from '../../services/schedule.service';

interface BookingRecord {
  id: string;
  member_name: string;
  member_email: string;
  class_name: string;
  schedule_date: string;
  schedule_time: string;
  booked_at: string;
  status: string;
  payment_status: string;
  amount_paid?: number;
  special_needs?: string;
  is_waitlist: boolean;
  waitlist_position?: number;
  notes?: string;
}

export default function TrainerBookings() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchBookings();
  }, [selectedDate]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await scheduleService.getTrainerBookingsList(selectedDate);

      if (response.success) {
        // Ensure data is an array
        const data = Array.isArray(response.data) ? response.data : [];
        setBookings(data);
      } else {
        throw new Error(response.message || 'Lỗi tải danh sách đăng ký');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi tải danh sách đăng ký',
          duration: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch =
      booking.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.member_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.class_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusLabel = (status: string) => {
    const statusLabels: { [key: string]: string } = {
      CONFIRMED: 'Đã xác nhận',
      CANCELLED: 'Đã hủy',
      WAITLIST: 'Chờ danh sách',
      NO_SHOW: 'Không đến',
      COMPLETED: 'Hoàn thành',
    };
    return statusLabels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      CONFIRMED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      WAITLIST: 'bg-yellow-100 text-yellow-800',
      NO_SHOW: 'bg-gray-100 text-gray-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusLabel = (status: string) => {
    const statusLabels: { [key: string]: string } = {
      PENDING: 'Chờ thanh toán',
      PAID: 'Đã thanh toán',
      REFUNDED: 'Đã hoàn tiền',
      FAILED: 'Thanh toán thất bại',
    };
    return statusLabels[status] || status;
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      REFUNDED: 'bg-blue-100 text-blue-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600 dark:text-gray-400'>Đang tải danh sách đăng ký...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6'>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-800 dark:text-white/90 mb-2'>
          Danh sách đăng ký
        </h1>
        <p className='text-gray-600 dark:text-gray-400'>
          Xem và quản lý danh sách đăng ký lớp học của học viên
        </p>
      </div>

      {/* Controls */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Chọn ngày
            </label>
            <input
              type='date'
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
            />
          </div>

          <Input
            type='text'
            placeholder='Tìm kiếm học viên...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
          >
            <option value=''>Tất cả trạng thái</option>
            <option value='CONFIRMED'>Đã xác nhận</option>
            <option value='CANCELLED'>Đã hủy</option>
            <option value='WAITLIST'>Chờ danh sách</option>
            <option value='NO_SHOW'>Không đến</option>
            <option value='COMPLETED'>Hoàn thành</option>
          </select>
        </div>
      </div>

      {/* Bookings List */}
      <div className='space-y-4'>
        {filteredBookings.length > 0 ? (
          filteredBookings.map(booking => (
            <div
              key={booking.id}
              className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'
            >
              <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
                {/* Booking Info */}
                <div className='flex-1'>
                  <div className='flex items-start justify-between mb-2'>
                    <div>
                      <h3 className='text-lg font-semibold text-gray-800 dark:text-white/90'>
                        {booking.member_name}
                      </h3>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        {booking.member_email}
                      </p>
                    </div>
                    <div className='flex gap-2'>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}
                      >
                        {getStatusLabel(booking.status)}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getPaymentStatusColor(booking.payment_status)}`}
                      >
                        {getPaymentStatusLabel(booking.payment_status)}
                      </span>
                    </div>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4'>
                    <div>
                      <strong>Lớp học:</strong> {booking.class_name}
                    </div>
                    <div>
                      <strong>Ngày:</strong> {formatDate(booking.schedule_date)}
                    </div>
                    <div>
                      <strong>Thời gian:</strong> {booking.schedule_time}
                    </div>
                    <div>
                      <strong>Đăng ký lúc:</strong> {formatDateTime(booking.booked_at)}
                    </div>
                    {booking.amount_paid && (
                      <div>
                        <strong>Số tiền:</strong> {booking.amount_paid.toLocaleString('vi-VN')} VNĐ
                      </div>
                    )}
                    {booking.is_waitlist && booking.waitlist_position && (
                      <div>
                        <strong>Vị trí chờ:</strong> #{booking.waitlist_position}
                      </div>
                    )}
                  </div>

                  {booking.special_needs && (
                    <div className='mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md'>
                      <p className='text-sm text-blue-800 dark:text-blue-200'>
                        <strong>Nhu cầu đặc biệt:</strong> {booking.special_needs}
                      </p>
                    </div>
                  )}

                  {booking.notes && (
                    <div className='mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md'>
                      <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                        <strong>Ghi chú:</strong> {booking.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className='flex flex-col gap-2'>
                  {booking.status === 'CONFIRMED' && (
                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => {
                          if (window.showToast) {
                            window.showToast({
                              type: 'info',
                              message: 'Chức năng điểm danh đang được phát triển',
                              duration: 3000,
                            });
                          }
                        }}
                      >
                        Điểm danh
                      </Button>
                    </div>
                  )}

                  {booking.status === 'WAITLIST' && (
                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        onClick={() => {
                          if (window.showToast) {
                            window.showToast({
                              type: 'info',
                              message: 'Chức năng xác nhận đang được phát triển',
                              duration: 3000,
                            });
                          }
                        }}
                      >
                        Xác nhận
                      </Button>
                    </div>
                  )}

                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      if (window.showToast) {
                        window.showToast({
                          type: 'info',
                          message: 'Chức năng xem chi tiết đang được phát triển',
                          duration: 3000,
                        });
                      }
                    }}
                  >
                    Chi tiết
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className='text-center py-12'>
            <div className='text-gray-500 dark:text-gray-400'>
              {searchTerm || statusFilter
                ? 'Không tìm thấy đăng ký nào'
                : 'Không có đăng ký nào trong ngày được chọn'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
