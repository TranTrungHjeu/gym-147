import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Clock, Printer, Search, Users, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AdminCard from '../../components/common/AdminCard';
import AdminModal from '../../components/common/AdminModal';
import CustomSelect from '../../components/common/CustomSelect';
import DatePicker from '../../components/common/DatePicker';
import ExportButton from '../../components/common/ExportButton';
import MetricCard from '../../components/dashboard/MetricCard';
import Button from '../../components/ui/Button/Button';
import { MemberService } from '../../services/member.service';
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
  const [filteredBookings, setFilteredBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'time' | 'status'>('name');
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [memberDetails, setMemberDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Memoize fetchBookings to prevent unnecessary re-renders
  const fetchBookings = useCallback(async () => {
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
  }, [selectedDate]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Filter and sort bookings
  useEffect(() => {
    let filtered = [...bookings];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        booking =>
          booking.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.member_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.class_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.member_name.localeCompare(b.member_name);
        case 'time':
          return new Date(a.schedule_time).getTime() - new Date(b.schedule_time).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    setFilteredBookings(filtered);
  }, [bookings, statusFilter, searchTerm, sortBy]);

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
      CONFIRMED:
        'bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/20 text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)]',
      CANCELLED:
        'bg-[var(--color-gray-200)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)]',
      WAITLIST:
        'bg-[var(--color-orange-200)] dark:bg-[var(--color-orange-800)]/30 text-[var(--color-orange-800)] dark:text-[var(--color-orange-300)]',
      NO_SHOW:
        'bg-[var(--color-gray-200)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)]',
      COMPLETED:
        'bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/20 text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)]',
    };
    return (
      colors[status] ||
      'bg-[var(--color-gray-100)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-800)] dark:text-[var(--color-gray-200)]'
    );
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
      PENDING:
        'bg-[var(--color-orange-200)] dark:bg-[var(--color-orange-800)]/30 text-[var(--color-orange-800)] dark:text-[var(--color-orange-300)]',
      PAID: 'bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/20 text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)]',
      REFUNDED:
        'bg-[var(--color-gray-200)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)]',
      FAILED:
        'bg-[var(--color-gray-200)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)]',
    };
    return (
      colors[status] ||
      'bg-[var(--color-gray-100)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-800)] dark:text-[var(--color-gray-200)]'
    );
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

  const handleConfirmWaitlistBooking = async (bookingId: string) => {
    try {
      setProcessingBookingId(bookingId);
      const response = await scheduleService.confirmWaitlistBooking(bookingId);

      if (response.success) {
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: 'Đã xác nhận đăng ký từ danh sách chờ',
            duration: 3000,
          });
        }
        // Refresh bookings list
        await fetchBookings();
      } else {
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: response.message || 'Không thể xác nhận đăng ký',
            duration: 3000,
          });
        }
      }
    } catch (error: any) {
      console.error('Error confirming waitlist booking:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: error.message || 'Lỗi khi xác nhận đăng ký',
          duration: 3000,
        });
      }
    } finally {
      setProcessingBookingId(null);
    }
  };

  const handleAttendance = async (bookingId: string, scheduleId: string) => {
    // Navigate to schedule page with attendance modal open
    // For now, show a message that this should be done from the schedule page
    if (window.showToast) {
      window.showToast({
        type: 'info',
        message: 'Vui lòng sử dụng chức năng điểm danh trong trang Lịch dạy',
        duration: 3000,
      });
    }
  };

  const handleViewDetails = async (booking: BookingRecord) => {
    try {
      setSelectedBooking(booking);
      setIsDetailModalOpen(true);
      setLoadingDetails(true);

      // Fetch booking details
      const bookingResponse = await scheduleService.getBookingById(booking.id);
      if (bookingResponse.success && bookingResponse.data?.booking) {
        setBookingDetails(bookingResponse.data.booking);

        // Try to fetch member details if member_id is available
        if (bookingResponse.data.booking.member_id) {
          try {
            const member = await MemberService.getMemberById(
              bookingResponse.data.booking.member_id
            );
            setMemberDetails(member);
          } catch (memberError) {
            console.error('Error fetching member details:', memberError);
            // Continue without member details
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching booking details:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi khi tải chi tiết đăng ký',
          duration: 3000,
        });
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedBooking(null);
    setBookingDetails(null);
    setMemberDetails(null);
  };

  // Calculate stats
  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    waitlist: bookings.filter(b => b.status === 'WAITLIST').length,
    cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-orange-600)] mx-auto mb-4'></div>
          <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
            Đang tải danh sách đăng ký...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen-full bg-gradient-to-br from-[var(--color-gray-50)] via-[var(--color-white)] to-[var(--color-gray-100)] dark:from-[var(--color-gray-900)] dark:via-[var(--color-gray-800)] dark:to-[var(--color-gray-900)]'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 h-full flex flex-col'>
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className='mb-2 flex-shrink-0'
        >
          <div className='grid grid-cols-1 lg:grid-cols-5 gap-4'>
            {/* Title Section */}
            <div className='lg:col-span-1 space-y-0.5'>
              <h1 className='text-xl lg:text-2xl font-bold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-heading'>
                Đăng ký lớp học
              </h1>
              <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] text-xs font-sans'>
                Quản lý và theo dõi đăng ký lớp học của học viên
              </p>
            </div>

            {/* Stats Overview */}
            <div className='lg:col-span-3'>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                <MetricCard
                  icon={Users}
                  label='Tổng đăng ký'
                  value={stats.total}
                  iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                  iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                />
                <MetricCard
                  icon={CheckCircle2}
                  label='Đã xác nhận'
                  value={stats.confirmed}
                  iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                  iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                />
                <MetricCard
                  icon={Clock}
                  label='Chờ danh sách'
                  value={stats.waitlist}
                  iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                  iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                />
                <MetricCard
                  icon={XCircle}
                  label='Đã hủy'
                  value={stats.cancelled}
                  iconBgColor='bg-[var(--color-gray-200)] dark:bg-[var(--color-gray-700)]'
                  iconColor='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)]'
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className='lg:col-span-1'>
              <div className='relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg shadow-sm border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] p-3'>
                <div className='text-center mb-3'>
                  <h3 className='text-sm font-bold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                    Thao tác
                  </h3>
                </div>
                <div className='space-y-2'>
                  {/* Export Button */}
                  {filteredBookings.length > 0 && (
                    <ExportButton
                      data={filteredBookings.map(booking => ({
                        'Tên học viên': booking.member_name,
                        Email: booking.member_email,
                        'Lớp học': booking.class_name,
                        Ngày: booking.schedule_date,
                        'Thời gian': booking.schedule_time,
                        'Trạng thái': getStatusLabel(booking.status),
                        'Đăng ký lúc': formatDateTime(booking.booked_at),
                        'Thanh toán': getPaymentStatusLabel(booking.payment_status),
                        'Số tiền': booking.amount_paid || 0,
                        'Danh sách chờ': booking.is_waitlist
                          ? `Vị trí #${booking.waitlist_position || ''}`
                          : 'Không',
                      }))}
                      columns={[
                        { key: 'Tên học viên', label: 'Tên học viên' },
                        { key: 'Email', label: 'Email' },
                        { key: 'Lớp học', label: 'Lớp học' },
                        { key: 'Ngày', label: 'Ngày' },
                        { key: 'Thời gian', label: 'Thời gian' },
                        { key: 'Trạng thái', label: 'Trạng thái' },
                        { key: 'Đăng ký lúc', label: 'Đăng ký lúc' },
                        { key: 'Thanh toán', label: 'Thanh toán' },
                        { key: 'Số tiền', label: 'Số tiền' },
                        { key: 'Danh sách chờ', label: 'Danh sách chờ' },
                      ]}
                      filename={`bookings-${selectedDate}`}
                      title='Báo cáo đăng ký lớp học'
                      variant='outline'
                      size='sm'
                    />
                  )}

                  {/* Print Button */}
                  {filteredBookings.length > 0 && (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => {
                        window.print();
                      }}
                      className='w-full border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] hover:bg-[var(--color-gray-50)] dark:hover:bg-[var(--color-gray-700)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)] transition-all duration-200'
                    >
                      <Printer className='w-3.5 h-3.5 mr-2' />
                      In báo cáo
                    </Button>
                  )}

                  {/* Stats Summary */}
                  {filteredBookings.length > 0 && (
                    <div className='pt-2 mt-2 border-t border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
                      <div className='text-[10px] text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans space-y-1'>
                        <div className='flex justify-between'>
                          <span>Tổng:</span>
                          <span className='font-semibold'>{stats.total}</span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Xác nhận:</span>
                          <span className='font-semibold text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'>
                            {stats.confirmed}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Chờ:</span>
                          <span className='font-semibold text-[var(--color-orange-500)] dark:text-[var(--color-orange-400)]'>
                            {stats.waitlist}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Hủy:</span>
                          <span className='font-semibold text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)]'>
                            {stats.cancelled}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className='mb-3'
        >
          <AdminCard className='p-3'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'>
              {/* Date Control */}
              <div className='w-full'>
                <DatePicker
                  value={selectedDate}
                  onChange={date => {
                    if (typeof date === 'string') {
                      setSelectedDate(date);
                    }
                  }}
                  placeholder='Chọn ngày'
                  mode='single'
                />
              </div>

              {/* Search */}
              <div className='w-full group relative'>
                <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
                <input
                  type='text'
                  placeholder='Tìm theo tên, email, lớp...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='w-full h-[30px] pl-9 pr-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                />
              </div>

              {/* Status Filter */}
              <div className='w-full'>
                <CustomSelect
                  options={[
                    { value: 'all', label: 'Tất cả trạng thái' },
                    { value: 'CONFIRMED', label: 'Đã xác nhận' },
                    { value: 'CANCELLED', label: 'Đã hủy' },
                    { value: 'WAITLIST', label: 'Chờ danh sách' },
                    { value: 'NO_SHOW', label: 'Không đến' },
                    { value: 'COMPLETED', label: 'Hoàn thành' },
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder='Tất cả trạng thái'
                  className='font-inter w-full'
                />
              </div>

              {/* Sort By */}
              <div className='w-full'>
                <CustomSelect
                  options={[
                    { value: 'name', label: 'Tên học viên' },
                    { value: 'time', label: 'Thời gian' },
                    { value: 'status', label: 'Trạng thái' },
                  ]}
                  value={sortBy}
                  onChange={value => setSortBy(value as 'name' | 'time' | 'status')}
                  placeholder='Sắp xếp theo'
                  className='font-inter w-full'
                />
              </div>
            </div>

            {/* Filter Summary */}
            <div className='mt-3 pt-3 border-t border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] flex items-center justify-between'>
              <div className='text-[11px] text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                Hiển thị {filteredBookings.length} / {bookings.length} đăng ký
              </div>
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSearchTerm('');
                  setSortBy('name');
                }}
                className='text-[11px] text-[var(--color-orange-600)] hover:text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)] dark:hover:text-[var(--color-orange-300)] font-sans'
              >
                Xóa bộ lọc
              </button>
            </div>
          </AdminCard>
        </motion.div>

        {/* Bookings List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className='space-y-3 flex-1'
        >
          {filteredBookings.length > 0 ? (
            filteredBookings.map(booking => (
              <AdminCard
                key={booking.id}
                hover
                className='transition-all duration-200 hover:shadow-md'
              >
                <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
                  {/* Booking Info */}
                  <div className='flex-1'>
                    <div className='flex items-start justify-between mb-2'>
                      <div>
                        <h3 className='text-lg font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-heading'>
                          {booking.member_name}
                        </h3>
                        <p className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                          {booking.member_email}
                        </p>
                      </div>
                      <div className='flex gap-2'>
                        <span
                          className={`px-3 py-1 text-xs rounded-full font-medium font-sans ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {getStatusLabel(booking.status)}
                        </span>
                        <span
                          className={`px-3 py-1 text-xs rounded-full font-medium font-sans ${getPaymentStatusColor(
                            booking.payment_status
                          )}`}
                        >
                          {getPaymentStatusLabel(booking.payment_status)}
                        </span>
                      </div>
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] mb-4 font-sans'>
                      <div>
                        <strong className='text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                          Lớp học:
                        </strong>{' '}
                        {booking.class_name}
                      </div>
                      <div>
                        <strong className='text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                          Ngày:
                        </strong>{' '}
                        {formatDate(booking.schedule_date)}
                      </div>
                      <div>
                        <strong className='text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                          Thời gian:
                        </strong>{' '}
                        {booking.schedule_time}
                      </div>
                      <div>
                        <strong className='text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                          Đăng ký lúc:
                        </strong>{' '}
                        {formatDateTime(booking.booked_at)}
                      </div>
                      {booking.amount_paid && (
                        <div>
                          <strong className='text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                            Số tiền:
                          </strong>{' '}
                          {booking.amount_paid.toLocaleString('vi-VN')} VNĐ
                        </div>
                      )}
                      {booking.is_waitlist && booking.waitlist_position && (
                        <div>
                          <strong className='text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                            Vị trí chờ:
                          </strong>{' '}
                          #{booking.waitlist_position}
                        </div>
                      )}
                    </div>

                    {booking.special_needs && (
                      <div className='mt-3 p-3 bg-[var(--color-orange-50)] dark:bg-[var(--color-orange-900)]/20 rounded-lg border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)]'>
                        <p className='text-sm text-[var(--color-orange-800)] dark:text-[var(--color-orange-200)] font-sans'>
                          <strong>Nhu cầu đặc biệt:</strong> {booking.special_needs}
                        </p>
                      </div>
                    )}

                    {booking.notes && (
                      <div className='mt-3 p-3 bg-[var(--color-orange-50)] dark:bg-[var(--color-orange-900)]/20 rounded-lg border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)]'>
                        <p className='text-sm text-[var(--color-orange-800)] dark:text-[var(--color-orange-200)] font-sans'>
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
                          onClick={() => handleAttendance(booking.id, '')}
                          className='border-[var(--color-orange-300)] dark:border-[var(--color-orange-600)] text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] hover:bg-[var(--color-orange-50)] dark:hover:bg-[var(--color-orange-900)]/10'
                        >
                          Điểm danh
                        </Button>
                      </div>
                    )}

                    {booking.status === 'WAITLIST' && (
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          onClick={() => handleConfirmWaitlistBooking(booking.id)}
                          disabled={processingBookingId === booking.id}
                          className='bg-gradient-to-r from-[var(--color-orange-600)] to-[var(--color-orange-700)] hover:from-[var(--color-orange-700)] hover:to-[var(--color-orange-800)] text-[var(--color-white)] border-0'
                        >
                          {processingBookingId === booking.id ? 'Đang xử lý...' : 'Xác nhận'}
                        </Button>
                      </div>
                    )}

                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleViewDetails(booking)}
                      className='border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'
                    >
                      Chi tiết
                    </Button>
                  </div>
                </div>
              </AdminCard>
            ))
          ) : (
            <AdminCard>
              <div className='text-center py-12'>
                <Users className='w-16 h-16 text-[var(--color-gray-300)] dark:text-[var(--color-gray-600)] mx-auto mb-4' />
                <div className='text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                  {bookings.length === 0
                    ? 'Không có đăng ký nào trong ngày được chọn'
                    : 'Không tìm thấy đăng ký nào phù hợp với bộ lọc'}
                </div>
                {bookings.length > 0 && (
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setSearchTerm('');
                      setSortBy('name');
                    }}
                    className='mt-4 text-[var(--color-orange-600)] hover:text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)] dark:hover:text-[var(--color-orange-300)] font-sans'
                  >
                    Xóa bộ lọc để xem tất cả
                  </button>
                )}
              </div>
            </AdminCard>
          )}
        </motion.div>
      </div>

      {/* Booking Details Modal */}
      <AdminModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        title={`Chi tiết đăng ký - ${selectedBooking?.member_name || 'N/A'}`}
        size='lg'
      >
        {loadingDetails ? (
          <div className='flex items-center justify-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-orange-600)]'></div>
          </div>
        ) : (
          <div className='space-y-6'>
            {/* Member Profile Section */}
            {memberDetails && (
              <AdminCard>
                <h3 className='text-lg font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-3 font-heading'>
                  Thông tin thành viên
                </h3>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                      Họ và tên
                    </label>
                    <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      {memberDetails.full_name}
                    </p>
                  </div>
                  <div>
                    <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                      Email
                    </label>
                    <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      {memberDetails.email}
                    </p>
                  </div>
                  <div>
                    <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                      Số điện thoại
                    </label>
                    <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      {memberDetails.phone || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                      Trạng thái thành viên
                    </label>
                    <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      {memberDetails.membership_status || 'N/A'}
                    </p>
                  </div>
                  {memberDetails.joined_at && (
                    <div>
                      <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                        Ngày tham gia
                      </label>
                      <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                        {new Date(memberDetails.joined_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  )}
                </div>
              </AdminCard>
            )}

            {/* Booking Information */}
            <AdminCard>
              <h3 className='text-lg font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-3 font-heading'>
                Thông tin đăng ký
              </h3>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                    Lớp học
                  </label>
                  <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                    {selectedBooking?.class_name ||
                      bookingDetails?.schedule?.gym_class?.name ||
                      'N/A'}
                  </p>
                </div>
                <div>
                  <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                    Ngày
                  </label>
                  <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                    {selectedBooking?.schedule_date
                      ? formatDate(selectedBooking.schedule_date)
                      : bookingDetails?.schedule?.date
                      ? formatDate(bookingDetails.schedule.date)
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                    Thời gian
                  </label>
                  <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                    {selectedBooking?.schedule_time ||
                      (bookingDetails?.schedule
                        ? `${bookingDetails.schedule.start_time} - ${bookingDetails.schedule.end_time}`
                        : 'N/A')}
                  </p>
                </div>
                <div>
                  <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                    Trạng thái
                  </label>
                  <span
                    className={`px-3 py-1 text-xs rounded-full font-medium font-sans ${getStatusColor(
                      selectedBooking?.status || bookingDetails?.status || ''
                    )}`}
                  >
                    {getStatusLabel(selectedBooking?.status || bookingDetails?.status || '')}
                  </span>
                </div>
                <div>
                  <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                    Trạng thái thanh toán
                  </label>
                  <span
                    className={`px-3 py-1 text-xs rounded-full font-medium font-sans ${getPaymentStatusColor(
                      selectedBooking?.payment_status || bookingDetails?.payment_status || ''
                    )}`}
                  >
                    {getPaymentStatusLabel(
                      selectedBooking?.payment_status || bookingDetails?.payment_status || ''
                    )}
                  </span>
                </div>
                {selectedBooking?.amount_paid !== undefined && (
                  <div>
                    <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                      Số tiền đã thanh toán
                    </label>
                    <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      {selectedBooking.amount_paid.toLocaleString('vi-VN')} VNĐ
                    </p>
                  </div>
                )}
                {selectedBooking?.is_waitlist && selectedBooking?.waitlist_position && (
                  <div>
                    <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                      Vị trí trong danh sách chờ
                    </label>
                    <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      #{selectedBooking.waitlist_position}
                    </p>
                  </div>
                )}
                <div>
                  <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                    Đăng ký lúc
                  </label>
                  <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                    {selectedBooking?.booked_at
                      ? formatDateTime(selectedBooking.booked_at)
                      : bookingDetails?.booked_at
                      ? formatDateTime(bookingDetails.booked_at)
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </AdminCard>

            {/* Special Needs & Notes */}
            {(selectedBooking?.special_needs ||
              selectedBooking?.notes ||
              bookingDetails?.special_needs ||
              bookingDetails?.notes) && (
              <AdminCard className='bg-[var(--color-orange-50)] dark:bg-[var(--color-orange-900)]/20 border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)]'>
                <h3 className='text-lg font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-3 font-heading'>
                  Ghi chú và nhu cầu đặc biệt
                </h3>
                {selectedBooking?.special_needs || bookingDetails?.special_needs ? (
                  <div className='mb-3'>
                    <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                      Nhu cầu đặc biệt:
                    </label>
                    <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      {selectedBooking?.special_needs || bookingDetails?.special_needs}
                    </p>
                  </div>
                ) : null}
                {selectedBooking?.notes || bookingDetails?.notes ? (
                  <div>
                    <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                      Ghi chú:
                    </label>
                    <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      {selectedBooking?.notes || bookingDetails?.notes}
                    </p>
                  </div>
                ) : null}
              </AdminCard>
            )}

            {/* Booking History (if available) */}
            {bookingDetails?.schedule && (
              <AdminCard>
                <h3 className='text-lg font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-3 font-heading'>
                  Thông tin lớp học
                </h3>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                      Phòng
                    </label>
                    <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      {bookingDetails.schedule.room?.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                      Sức chứa
                    </label>
                    <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      {bookingDetails.schedule.current_bookings || 0} /{' '}
                      {bookingDetails.schedule.max_capacity || 0}
                    </p>
                  </div>
                </div>
              </AdminCard>
            )}
          </div>
        )}
        <div className='flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
          <Button
            variant='outline'
            onClick={closeDetailModal}
            className='border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'
          >
            Đóng
          </Button>
        </div>
      </AdminModal>
    </div>
  );
}
