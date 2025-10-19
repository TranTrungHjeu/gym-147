import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { ChevronLeft, ChevronRight, ChevronUp, Search } from 'lucide-react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import CreateScheduleModal from '../../components/trainer/CreateScheduleModal';
import Button from '../../components/ui/Button/Button';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { scheduleService } from '../../services/schedule.service';

interface AttendanceRecord {
  id: string;
  schedule_id: string;
  member_id: string;
  checked_in_at: string;
  checked_out_at: string;
  attendance_method: string;
  class_rating: number;
  trainer_rating: number;
  feedback_notes: string;
  member: {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    phone: string;
    profile_photo: string | null;
    membership_status: string;
  };
}

interface ScheduleItem {
  id: string;
  class_id: string;
  trainer_id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  current_bookings: number;
  max_capacity: number;
  price_override?: number | string | null;
  special_notes?: string;
  check_in_enabled?: boolean;
  gym_class: {
    id: string;
    name: string;
    description: string;
    category: string;
    duration: number;
    max_capacity: number;
    difficulty: string;
    equipment_needed: string[];
    price: string;
    thumbnail: string;
    required_certification_level: string;
    is_active: boolean;
  };
  room: {
    id: string;
    name: string;
    capacity: number;
    area_sqm: number;
    equipment: string[];
    amenities: string[];
    status: string;
  };
  attendance?: AttendanceRecord[];
  bookings?: {
    id: string;
    schedule_id: string;
    member_id: string;
    status: string;
    booked_at: string;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    payment_status: string;
    amount_paid: string;
    special_needs: string | null;
    is_waitlist: boolean;
    waitlist_position: number | null;
    notes: string;
    created_at: string;
    updated_at: string;
    member: {
      id: string;
      user_id: string;
      full_name: string;
      email: string;
      phone: string;
      profile_photo: string | null;
      membership_status: string;
    } | null;
  }[];
}

// Separate Date Picker Component to minimize re-renders
const DatePickerComponent = React.memo(
  ({
    selectedDate,
    onDateChange,
    viewMode,
    onViewModeChange,
    onShowCreateModal,
  }: {
    selectedDate: string;
    onDateChange: (date: string) => void;
    viewMode: 'day' | 'week' | 'month';
    onViewModeChange: (mode: 'day' | 'week' | 'month') => void;
    onShowCreateModal: () => void;
  }) => {
    const datePickerRef = useRef<HTMLInputElement>(null);
    const flatpickrInstanceRef = useRef<any>(null);

    // Stable event handlers with useCallback
    const handleDateChange = useCallback(
      (dates: Date[]) => {
        if (dates.length > 0) {
          const date = dates[0];
          // Fix timezone issue by using local date components
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const newDate = `${year}-${month}-${day}`;
          onDateChange(newDate);
        }
      },
      [onDateChange]
    );

    const handleOpen = useCallback(() => {
      // Flatpickr opened
    }, []);

    const handleClose = useCallback(() => {
      // Flatpickr closed
    }, []);

    // Stable element with useMemo - element never changes
    const datePickerElement = useMemo(() => {
      return (
        <input
          ref={datePickerRef}
          type='text'
          placeholder='Chọn ngày'
          className='px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white w-full cursor-pointer'
          readOnly
        />
      );
    }, []); // Empty dependency - element never changes

    // Update input value when selectedDate changes
    useEffect(() => {
      if (datePickerRef.current) {
        datePickerRef.current.value = selectedDate;
      }
    }, [selectedDate]);

    // Initialize flatpickr when element is ready
    useLayoutEffect(() => {
      const initializeFlatpickr = () => {
        if (!datePickerRef.current) {
          setTimeout(initializeFlatpickr, 100);
          return;
        }

        if (flatpickrInstanceRef.current) {
          return;
        }

        const fp = flatpickr(datePickerRef.current, {
          defaultDate: selectedDate || new Date().toISOString().split('T')[0],
          dateFormat: 'Y-m-d',
          allowInput: true,
          clickOpens: true,
          onChange: handleDateChange,
          onOpen: handleOpen,
          onClose: handleClose,
        });

        flatpickrInstanceRef.current = fp;
      };

      initializeFlatpickr();

      return () => {
        if (flatpickrInstanceRef.current) {
          flatpickrInstanceRef.current.destroy();
          flatpickrInstanceRef.current = null;
        }
      };
    }, [handleDateChange, handleOpen, handleClose]); // Dependencies for callbacks

    // Update date separately
    useEffect(() => {
      if (flatpickrInstanceRef.current) {
        try {
          flatpickrInstanceRef.current.setDate(selectedDate, false);
        } catch (error) {
          console.error('Error updating Flatpickr date:', error);
          // Re-initialize if there's an error
          if (datePickerRef.current) {
            flatpickrInstanceRef.current.destroy();
            flatpickrInstanceRef.current = null;

            const fp = flatpickr(datePickerRef.current, {
              defaultDate: selectedDate,
              dateFormat: 'Y-m-d',
              allowInput: true,
              clickOpens: true,
              onChange: handleDateChange,
              onOpen: handleOpen,
              onClose: handleClose,
            });

            flatpickrInstanceRef.current = fp;
          }
        }
      }
    }, [selectedDate, handleDateChange, handleOpen, handleClose]);

    return (
      <div className='flex flex-col md:flex-row gap-3 items-center justify-between mb-4'>
        <div className='flex items-center gap-3'>
          <div>
            <label className='block text-xs font-inter font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Chọn ngày
            </label>
            <div className='relative'>
              {datePickerElement}
              <div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none'>
                <svg
                  className='w-3 h-3 text-gray-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                  />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className='block text-xs font-inter font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Chế độ xem
            </label>
            <select
              value={viewMode}
              onChange={e => onViewModeChange(e.target.value as 'day' | 'week' | 'month')}
              className='px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
            >
              <option value='day'>Ngày</option>
              <option value='week'>Tuần</option>
              <option value='month'>Tháng</option>
            </select>
          </div>
        </div>

        <div className='flex gap-2'>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              if (window.showToast) {
                window.showToast({
                  type: 'info',
                  message: 'Chức năng xuất lịch đang được phát triển',
                  duration: 3000,
                });
              }
            }}
            className='text-xs'
          >
            Xuất lịch
          </Button>
          <Button
            size='sm'
            onClick={onShowCreateModal}
            className='bg-orange-500 hover:bg-orange-600 text-white text-xs'
          >
            Mở lớp học
          </Button>
        </div>
      </div>
    );
  }
);

// Separate Table Component to minimize re-renders
const ScheduleTable = React.memo(
  ({
    schedules,
    loading,
    statusFilter,
    classTypeFilter,
    searchTerm,
    sortBy,
    currentPage,
    itemsPerPage,
    onPageChange,
    onSort,
    onAttendanceClick,
    onEditClick,
    getCheckInButton,
  }: {
    schedules: ScheduleItem[];
    loading: boolean;
    statusFilter: string;
    classTypeFilter: string;
    searchTerm: string;
    sortBy: string;
    currentPage: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onSort: (column: string) => void;
    onAttendanceClick: (schedule: ScheduleItem) => void;
    onEditClick: (schedule: ScheduleItem) => void;
    getCheckInButton: (schedule: ScheduleItem) => React.ReactNode;
  }) => {
    // Move filtering, sorting, pagination logic here
    const filteredSchedules = useMemo(() => {
      let filtered = [...schedules];

      // Status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(schedule => schedule.status === statusFilter);
      }

      // Class type filter (based on class name)
      if (classTypeFilter !== 'all') {
        filtered = filtered.filter(schedule =>
          schedule.gym_class.name.toLowerCase().includes(classTypeFilter.toLowerCase())
        );
      }

      // Search filter
      if (searchTerm) {
        filtered = filtered.filter(
          schedule =>
            schedule.gym_class.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            schedule.room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (schedule.special_notes &&
              schedule.special_notes.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      // Sort
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'time':
            return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
          case 'class':
            return a.gym_class.name.localeCompare(b.gym_class.name);
          case 'status':
            return a.status.localeCompare(b.status);
          default:
            return 0;
        }
      });

      return filtered;
    }, [schedules, statusFilter, classTypeFilter, searchTerm, sortBy]);

    const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSchedules = filteredSchedules.slice(startIndex, endIndex);

    const getStatusLabel = (status: string) => {
      const statusLabels: { [key: string]: string } = {
        SCHEDULED: 'Đã lên lịch',
        IN_PROGRESS: 'Đang diễn ra',
        COMPLETED: 'Hoàn thành',
        CANCELLED: 'Đã hủy',
        DELAYED: 'Hoãn lại',
      };
      return statusLabels[status] || status;
    };

    const getStatusColor = (status: string) => {
      const colors: { [key: string]: string } = {
        SCHEDULED: 'status-scheduled',
        IN_PROGRESS: 'status-in-progress',
        COMPLETED: 'status-completed',
        CANCELLED: 'status-cancelled',
        DELAYED: 'status-delayed',
      };
      return colors[status] || 'status-completed';
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

    const formatTime = (timeString: string) => {
      try {
        // Parse as UTC to avoid timezone conversion
        const date = new Date(timeString);
        return date.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'UTC',
        });
      } catch (error) {
        console.error('Error formatting time:', error);
        return timeString;
      }
    };

    return (
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden'>
        {loading ? (
          <div className='text-center py-8'>Đang tải lịch dạy...</div>
        ) : filteredSchedules.length > 0 ? (
          <>
            {/* Table */}
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-100 dark:bg-gray-800'>
                  <tr>
                    <th className='px-4 py-3 text-xs font-heading font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-left'>
                      STT
                    </th>
                    <th
                      className='px-4 py-3 text-xs font-heading font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700'
                      onClick={() => onSort('class')}
                    >
                      <div className='flex items-center gap-1'>
                        Lớp học
                        <ChevronUp className='w-3 h-3' />
                      </div>
                    </th>
                    <th
                      className='px-4 py-3 text-xs font-heading font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700'
                      onClick={() => onSort('time')}
                    >
                      <div className='flex items-center gap-1'>
                        Thời gian
                        <ChevronUp className='w-3 h-3' />
                      </div>
                    </th>
                    <th className='px-4 py-3 text-xs font-heading font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-left'>
                      Phòng
                    </th>
                    <th className='px-4 py-3 text-xs font-heading font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-left'>
                      Học viên
                    </th>
                    <th
                      className='px-4 py-3 text-xs font-heading font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700'
                      onClick={() => onSort('status')}
                    >
                      <div className='flex items-center gap-1'>
                        Trạng thái
                        <ChevronUp className='w-3 h-3' />
                      </div>
                    </th>
                    <th className='px-4 py-3 text-xs font-heading font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-left'>
                      Điểm danh
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                  {paginatedSchedules.map((schedule, index) => (
                    <tr
                      key={schedule.id}
                      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors ${
                        index % 2 === 0
                          ? 'bg-white dark:bg-gray-800'
                          : 'bg-gray-50 dark:bg-gray-800/50'
                      }`}
                    >
                      <td className='px-4 py-3 text-xs font-inter text-gray-600 dark:text-gray-400'>
                        {startIndex + index + 1}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='text-sm font-heading font-medium text-gray-900 dark:text-white'>
                          {schedule.gym_class?.name || 'Tên lớp không xác định'}
                        </div>
                        <div className='text-xs font-inter text-gray-500 dark:text-gray-400'>
                          {schedule.gym_class?.category || 'Không xác định'}
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='text-xs font-inter text-gray-900 dark:text-white'>
                          {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                        </div>
                        <div className='text-xs font-inter text-gray-500 dark:text-gray-400'>
                          {formatDate(schedule.date)}
                        </div>
                      </td>
                      <td className='px-4 py-3 text-xs font-inter text-gray-600 dark:text-gray-400'>
                        {schedule.room?.name || 'Phòng không xác định'}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='text-xs font-inter text-gray-900 dark:text-white'>
                          {schedule.current_bookings || 0}/{schedule.max_capacity || 0}
                        </div>
                        <div className='text-xs font-inter text-gray-500 dark:text-gray-400'>
                          học viên
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusColor(schedule.status)}`}
                        >
                          {getStatusLabel(schedule.status)}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex gap-1'>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => onAttendanceClick(schedule)}
                            className='text-xs px-2 py-1'
                          >
                            Xem thành viên
                          </Button>
                          {getCheckInButton(schedule)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700'>
                <div className='text-xs font-inter text-gray-600 dark:text-gray-400'>
                  Hiển thị {startIndex + 1} - {Math.min(endIndex, filteredSchedules.length)} trong
                  tổng số {filteredSchedules.length}
                </div>
                <div className='flex gap-1'>
                  <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className='p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <ChevronLeft className='w-4 h-4' />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`px-2 py-1 text-xs rounded ${
                          currentPage === page
                            ? 'bg-orange-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className='p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <ChevronRight className='w-4 h-4' />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className='text-center py-8'>Không có lịch dạy nào</div>
        )}
      </div>
    );
  }
);

export default function TrainerSchedule() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Default to current date
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userId, setUserId] = useState<string>('');

  // Advanced filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classTypeFilter, setClassTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'time' | 'class' | 'status'>('time');

  // Table functionality
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>('time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Attendance detail modal state
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [memberData, setMemberData] = useState<{ [key: string]: any }>({});
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Modal filters
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalStatusFilter, setModalStatusFilter] = useState('all');

  // Real-time notifications
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtimeNotifications({
    trainerId: userData.id,
    enabled: !!userData.id,
    interval: 10000, // 10 seconds
  });

  // Get user ID on component mount
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUserId(userData.id);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching schedules for:', { selectedDate, viewMode });
      const response = await scheduleService.getTrainerScheduleList(selectedDate, viewMode);
      console.log('📡 Schedule API response:', response);

      if (response.success) {
        // Handle nested data structure: response.data.schedules
        let data = [];
        if (response.data && typeof response.data === 'object' && 'schedules' in response.data) {
          data = Array.isArray(response.data.schedules) ? response.data.schedules : [];
        } else if (Array.isArray(response.data)) {
          data = response.data;
        }

        console.log('📋 Schedules data:', {
          total_schedules: data.length,
          schedules_with_attendance: data.filter(s => s.attendance && s.attendance.length > 0)
            .length,
          schedules_with_bookings: data.filter(s => s.bookings && s.bookings.length > 0).length,
          sample_schedule: data[0]
            ? {
                id: data[0].id,
                class_name: data[0].gym_class?.name,
                date: data[0].date,
                status: data[0].status,
                attendance_count: data[0].attendance?.length || 0,
                bookings_count: data[0].bookings?.length || 0,
                attendance_sample: data[0].attendance?.slice(0, 2),
                bookings_sample: data[0].bookings?.slice(0, 2),
              }
            : null,
        });

        setSchedules(data);
      } else {
        throw new Error(response.message || 'Lỗi tải lịch dạy');
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi tải lịch dạy',
          duration: 3000,
        });
      }
      // Fallback to empty array on error
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, viewMode]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const getStatusLabelModal = (status: string) => {
    const statusLabels: { [key: string]: string } = {
      SCHEDULED: 'Đã lên lịch',
      IN_PROGRESS: 'Đang diễn ra',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
      POSTPONED: 'Hoãn lại',
    };
    return statusLabels[status] || status;
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

  // Function to get check-in button based on schedule status and time
  const getCheckInButton = (schedule: ScheduleItem) => {
    // Use Vietnam time for comparison (same as database)
    // Convert UTC to Vietnam time by adding 7 hours
    const nowUTC = new Date();
    const nowVN = new Date(nowUTC.getTime() + 7 * 60 * 60 * 1000);
    const startTime = new Date(schedule.start_time);
    const endTime = new Date(schedule.end_time);
    const tenMinBefore = new Date(startTime.getTime() - 10 * 60 * 1000);
    const tenMinAfter = new Date(endTime.getTime() + 10 * 60 * 1000);

    // Check if schedule is in the past
    if (nowVN > tenMinAfter) {
      return (
        <Button size='sm' variant='outline' disabled className='text-xs px-2 py-1 text-gray-400'>
          Đã kết thúc
        </Button>
      );
    }

    // Check if schedule is too far in the future
    if (nowVN < tenMinBefore) {
      console.log('🔍 Button logic - Too early:', {
        schedule_id: schedule.id,
        nowVN: nowVN.toISOString(),
        tenMinBefore: tenMinBefore.toISOString(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: schedule.status,
      });
      return (
        <Button size='sm' variant='outline' disabled className='text-xs px-2 py-1 text-gray-400'>
          Chưa đến giờ
        </Button>
      );
    }

    // Check if check-in is enabled
    if (schedule.check_in_enabled) {
      // Check if we can check out (after class ends)
      if (nowVN >= endTime && nowVN <= tenMinAfter) {
        return (
          <Button
            size='sm'
            onClick={() => handleCheckOutAll(schedule)}
            className='bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1'
          >
            Kết thúc lớp
          </Button>
        );
      }

      // Check-in is enabled and we're in the time window
      return (
        <Button
          size='sm'
          onClick={() => handleDisableCheckIn(schedule)}
          className='bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1'
        >
          Tắt điểm danh
        </Button>
      );
    }

    // Check if we can enable check-in
    if (nowVN >= tenMinBefore && nowVN <= endTime) {
      console.log('🔍 Button logic - Can enable check-in:', {
        schedule_id: schedule.id,
        nowVN: nowVN.toISOString(),
        tenMinBefore: tenMinBefore.toISOString(),
        endTime: endTime.toISOString(),
        status: schedule.status,
        check_in_enabled: schedule.check_in_enabled,
      });
      return (
        <Button
          size='sm'
          onClick={() => handleEnableCheckIn(schedule)}
          className='bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1'
        >
          Bắt đầu điểm danh
        </Button>
      );
    }

    // Default case
    return (
      <Button size='sm' variant='outline' disabled className='text-xs px-2 py-1 text-gray-400'>
        Không khả dụng
      </Button>
    );
  };

  // Function to get attendance status based on check-in/check-out times
  const getAttendanceStatus = (booking: any) => {
    console.log('=== getAttendanceStatus Debug ===');
    console.log('selectedSchedule:', selectedSchedule);
    console.log('booking:', booking);
    console.log('selectedSchedule.attendance:', selectedSchedule?.attendance);

    if (!selectedSchedule) {
      console.log('No selectedSchedule, returning null');
      return null;
    }

    // Find attendance record for this member
    const attendance = selectedSchedule.attendance?.find(
      att => att.member_id === booking.member_id
    );

    console.log('Found attendance for member', booking.member_id, ':', attendance);

    if (!attendance?.checked_in_at) {
      console.log('No check-in data, booking.status:', booking.status);
      // No check-in data
      if (booking.status === 'CANCELLED')
        return { status: 'absent', text: 'Vắng mặt', color: 'bg-red-500/90' };
      if (booking.status === 'NO_SHOW')
        return { status: 'absent', text: 'Vắng mặt', color: 'bg-red-500/90' };
      return { status: 'not_checked', text: 'Chưa điểm danh', color: 'bg-gray-400/90' };
    }

    try {
      const classStartTime = new Date(selectedSchedule.start_time);
      const classEndTime = new Date(selectedSchedule.end_time);
      const checkInTime = new Date(attendance.checked_in_at);
      const checkOutTime = attendance.checked_out_at ? new Date(attendance.checked_out_at) : null;

      console.log('Time calculations:');
      console.log('classStartTime:', classStartTime);
      console.log('classEndTime:', classEndTime);
      console.log('checkInTime:', checkInTime);
      console.log('checkOutTime:', checkOutTime);

      // Calculate late minutes (positive = late, negative = early)
      const lateMinutes = Math.floor(
        (checkInTime.getTime() - classStartTime.getTime()) / (1000 * 60)
      );

      console.log('lateMinutes:', lateMinutes);

      // Check if check-in is more than 15 minutes late
      if (lateMinutes > 15) {
        console.log('Late > 15 minutes, returning late status');
        return {
          status: 'late',
          text: `Muộn ${lateMinutes}p`,
          color: 'bg-yellow-500/90',
        };
      }

      // Check if check-out is early (if available)
      if (checkOutTime) {
        const earlyMinutes = Math.floor(
          (classEndTime.getTime() - checkOutTime.getTime()) / (1000 * 60)
        );
        console.log('earlyMinutes:', earlyMinutes);
        if (earlyMinutes > 5) {
          console.log('Early leave > 5 minutes, returning early_leave status');
          return {
            status: 'early_leave',
            text: `Về sớm ${earlyMinutes}p`,
            color: 'bg-orange-500/90',
          };
        }
      }

      // Check if check-in is not more than 10 minutes late and check-out is after class ends
      if (lateMinutes <= 10) {
        console.log('Late <= 10 minutes, checking check-out status');
        if (checkOutTime && checkOutTime >= classEndTime) {
          console.log('Check-out after class end, returning completed status');
          return {
            status: 'completed',
            text: 'Hoàn thành',
            color: 'bg-green-500/90',
          };
        } else if (checkOutTime) {
          console.log('Check-out before class end, returning partial status');
          return {
            status: 'partial',
            text: 'Tham gia',
            color: 'bg-blue-500/90',
          };
        } else {
          console.log('No check-out, returning present status');
          return {
            status: 'present',
            text: 'Có mặt',
            color: 'bg-green-500/90',
          };
        }
      }

      // Default case
      console.log('Default case, returning present status');
      return {
        status: 'present',
        text: 'Có mặt',
        color: 'bg-green-500/90',
      };
    } catch (error) {
      console.error('Error calculating attendance status:', error);
      return {
        status: 'error',
        text: 'Lỗi',
        color: 'bg-gray-500/90',
      };
    }
  };

  const fetchMemberData = async (memberIds: string[]) => {
    try {
      setLoadingMembers(true);
      console.log('👥 Fetching member data for IDs:', memberIds);

      const response = await fetch('http://localhost:3002/members/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberIds }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('👥 Member API Response:', data);
        const memberMap: { [key: string]: any } = {};

        // Debug: Check response structure
        if (data.success && data.data) {
          console.log('👥 Data type:', typeof data.data);
          console.log('👥 Data is array:', Array.isArray(data.data));
          console.log('👥 Data content:', data.data);

          // Handle different response structures
          const members = Array.isArray(data.data)
            ? data.data
            : data.data.members && Array.isArray(data.data.members)
              ? data.data.members
              : [];

          console.log('👥 Processed members:', members);

          members.forEach((member: any) => {
            memberMap[member.user_id] = member;
          });

          console.log('👥 Member map created:', {
            requested_ids: memberIds,
            found_members: Object.keys(memberMap),
            member_map: memberMap,
          });
        }
        setMemberData(memberMap);
      } else {
        console.error('👥 Member API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('👥 Error fetching member data:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const openAttendanceModal = useCallback(async (schedule: ScheduleItem) => {
    console.log('🔍 Opening attendance modal for schedule:', {
      schedule_id: schedule.id,
      class_name: schedule.gym_class?.name,
      date: schedule.date,
      status: schedule.status,
      attendance_count: schedule.attendance?.length || 0,
      bookings_count: schedule.bookings?.length || 0,
      attendance_data: schedule.attendance,
      bookings_data: schedule.bookings,
    });

    // Debug: Log raw schedule data from API
    console.log('📊 Raw schedule data from API:', {
      schedule_keys: Object.keys(schedule),
      has_attendance: 'attendance' in schedule,
      attendance_type: typeof schedule.attendance,
      attendance_value: schedule.attendance,
      has_bookings: 'bookings' in schedule,
      bookings_type: typeof schedule.bookings,
      bookings_value: schedule.bookings,
    });

    setSelectedSchedule(schedule);
    setShowAttendanceModal(true);

    // Fetch member data if attendance records exist
    if (schedule.attendance && schedule.attendance.length > 0) {
      console.log('📋 Using attendance records:', schedule.attendance);
      const memberIds = schedule.attendance.map(attendance => attendance.member_id);
      await fetchMemberData(memberIds);
    } else if (schedule.bookings && schedule.bookings.length > 0) {
      console.log('📝 Using bookings as fallback:', schedule.bookings);
      // Fallback to bookings if no attendance records
      const memberIds = schedule.bookings.map(booking => booking.member_id);
      await fetchMemberData(memberIds);
    } else {
      console.log('❌ No attendance or bookings data found');
    }
  }, []);

  const closeAttendanceModal = () => {
    setSelectedSchedule(null);
    setShowAttendanceModal(false);
    setMemberData({});
    setModalSearchTerm('');
    setModalStatusFilter('all');
  };

  // Table sorting logic
  const handleSort = useCallback(
    (column: string) => {
      if (sortColumn === column) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    },
    [sortColumn, sortDirection]
  );

  // Placeholder handlers for table actions
  const handleEditClick = useCallback((_schedule: ScheduleItem) => {
    if (window.showToast) {
      window.showToast({
        type: 'info',
        message: 'Chức năng điểm danh đang được phát triển',
        duration: 3000,
      });
    }
  }, []);

  // Check-in/Check-out handlers
  const handleEnableCheckIn = useCallback(
    async (schedule: ScheduleItem) => {
      try {
        // Try multiple possible keys for user data
        let userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (!userData.id) {
          userData = JSON.parse(localStorage.getItem('user') || '{}');
        }
        if (!userData.id) {
          console.error('No user data found in localStorage');
          console.log('Available localStorage keys:', Object.keys(localStorage));
          if (window.showToast) {
            window.showToast({
              type: 'error',
              message: 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.',
              duration: 3000,
            });
          }
          return;
        }

        console.log('Enabling check-in for schedule:', schedule.id);
        const response = await scheduleService.enableCheckIn(schedule.id, userData.id);

        if (response.success) {
          console.log('✅ Check-in enabled successfully');
          if (window.showToast) {
            window.showToast({
              type: 'success',
              message: 'Đã bắt đầu điểm danh',
              duration: 3000,
            });
          }
          // Refresh schedules to get updated status
          await fetchSchedules();
        } else {
          console.error('❌ Failed to enable check-in:', response.message);
          if (window.showToast) {
            window.showToast({
              type: 'error',
              message: 'Không thể bắt đầu điểm danh',
              duration: 3000,
            });
          }
        }
      } catch (error) {
        console.error('❌ Error enabling check-in:', error);
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: 'Lỗi khi bắt đầu điểm danh',
            duration: 3000,
          });
        }
      }
    },
    [fetchSchedules]
  );

  const handleDisableCheckIn = useCallback(
    async (schedule: ScheduleItem) => {
      try {
        // Try multiple possible keys for user data
        let userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (!userData.id) {
          userData = JSON.parse(localStorage.getItem('user') || '{}');
        }
        if (!userData.id) {
          console.error('No user data found in localStorage');
          if (window.showToast) {
            window.showToast({
              type: 'error',
              message: 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.',
              duration: 3000,
            });
          }
          return;
        }

        console.log('Disabling check-in for schedule:', schedule.id);
        const response = await scheduleService.disableCheckIn(schedule.id, userData.id);

        if (response.success) {
          console.log('✅ Check-in disabled successfully');
          if (window.showToast) {
            window.showToast({
              type: 'success',
              message: 'Đã tắt điểm danh',
              duration: 3000,
            });
          }
          // Refresh schedules to get updated status
          await fetchSchedules();
        } else {
          console.error('❌ Failed to disable check-in:', response.message);
          if (window.showToast) {
            window.showToast({
              type: 'error',
              message: 'Không thể tắt điểm danh',
              duration: 3000,
            });
          }
        }
      } catch (error) {
        console.error('❌ Error disabling check-in:', error);
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: 'Lỗi khi tắt điểm danh',
            duration: 3000,
          });
        }
      }
    },
    [fetchSchedules]
  );

  const handleCheckOutAll = useCallback(
    async (schedule: ScheduleItem) => {
      try {
        // Try multiple possible keys for user data
        let userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (!userData.id) {
          userData = JSON.parse(localStorage.getItem('user') || '{}');
        }
        if (!userData.id) {
          console.error('No user data found in localStorage');
          if (window.showToast) {
            window.showToast({
              type: 'error',
              message: 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.',
              duration: 3000,
            });
          }
          return;
        }

        console.log('Checking out all members for schedule:', schedule.id);
        const response = await scheduleService.trainerCheckOutAll(schedule.id, userData.id);

        if (response.success) {
          console.log('✅ All members checked out successfully');
          if (window.showToast) {
            window.showToast({
              type: 'success',
              message: 'Đã kết thúc lớp và điểm danh tất cả thành viên',
              duration: 3000,
            });
          }
          // Refresh schedules to get updated status
          await fetchSchedules();
          // Refresh attendance modal if it's open
          if (selectedSchedule?.id === schedule.id) {
            const memberIds = selectedSchedule.attendance?.map(att => att.member_id) || [];
            await fetchMemberData(memberIds);
          }
        } else {
          console.error('❌ Failed to check out all members:', response.message);
          if (window.showToast) {
            window.showToast({
              type: 'error',
              message: 'Không thể kết thúc lớp',
              duration: 3000,
            });
          }
        }
      } catch (error) {
        console.error('❌ Error checking out all members:', error);
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: 'Lỗi khi kết thúc lớp',
            duration: 3000,
          });
        }
      }
    },
    [fetchSchedules, selectedSchedule]
  );

  // Member check-in/check-out handlers
  const handleMemberCheckIn = useCallback(async (memberId: string, schedule: ScheduleItem) => {
    try {
      // Try multiple possible keys for user data
      let userData = JSON.parse(localStorage.getItem('userData') || '{}');
      if (!userData.id) {
        userData = JSON.parse(localStorage.getItem('user') || '{}');
      }
      if (!userData.id) {
        console.error('No user data found in localStorage');
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.',
            duration: 3000,
          });
        }
        return;
      }

      console.log('Checking in member:', memberId, 'for schedule:', schedule.id);
      const response = await scheduleService.trainerCheckInMember(
        schedule.id,
        memberId,
        userData.id
      );

      if (response.success) {
        console.log('✅ Member checked in successfully');
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: 'Đã điểm danh thành viên',
            duration: 3000,
          });
        }
        // Refresh attendance modal
        if (selectedSchedule?.id === schedule.id) {
          const memberIds = selectedSchedule.attendance?.map(att => att.member_id) || [];
          await fetchMemberData(memberIds);
        }
      } else {
        console.error('❌ Failed to check in member:', response.message);
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: 'Không thể điểm danh thành viên',
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error('❌ Error checking in member:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi khi điểm danh thành viên',
          duration: 3000,
        });
      }
    }
  }, []);

  const handleMemberCheckOut = useCallback(async (memberId: string, schedule: ScheduleItem) => {
    try {
      // Try multiple possible keys for user data
      let userData = JSON.parse(localStorage.getItem('userData') || '{}');
      if (!userData.id) {
        userData = JSON.parse(localStorage.getItem('user') || '{}');
      }
      if (!userData.id) {
        console.error('No user data found in localStorage');
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.',
            duration: 3000,
          });
        }
        return;
      }

      console.log('Checking out member:', memberId, 'for schedule:', schedule.id);
      const response = await scheduleService.trainerCheckOutMember(
        schedule.id,
        memberId,
        userData.id
      );

      if (response.success) {
        console.log('✅ Member checked out successfully');
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: 'Đã check-out thành viên',
            duration: 3000,
          });
        }
        // Refresh attendance modal
        if (selectedSchedule?.id === schedule.id) {
          const memberIds = selectedSchedule.attendance?.map(att => att.member_id) || [];
          await fetchMemberData(memberIds);
        }
      } else {
        console.error('❌ Failed to check out member:', response.message);
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: 'Không thể check-out thành viên',
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error('❌ Error checking out member:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi khi check-out thành viên',
          duration: 3000,
        });
      }
    }
  }, []);

  // Function to get member check-in button
  const getMemberCheckInButton = (record: any, attendance: any, schedule: ScheduleItem | null) => {
    if (!schedule) return null;

    const now = new Date();
    const startTime = new Date(schedule.start_time);
    const endTime = new Date(schedule.end_time);
    const tenMinBefore = new Date(startTime.getTime() - 10 * 60 * 1000);
    const tenMinAfter = new Date(endTime.getTime() + 10 * 60 * 1000);

    // Check if check-in is enabled and we're in the time window
    if (!schedule.check_in_enabled || now < tenMinBefore || now > tenMinAfter) {
      return null;
    }

    // If member is already checked in
    if (attendance?.checked_in_at) {
      // If member is already checked out
      if (attendance.checked_out_at) {
        return (
          <span className='text-xs text-gray-400 px-2 py-1 bg-gray-600/50 rounded'>
            Đã check-out
          </span>
        );
      }

      // If we can check out (after class ends)
      if (now >= endTime && now <= tenMinAfter) {
        return (
          <button
            onClick={() => handleMemberCheckOut(record.member_id, schedule)}
            className='text-xs px-2 py-1 bg-red-500/80 hover:bg-red-500 text-white rounded transition-colors'
          >
            Check-out
          </button>
        );
      }

      // Member is checked in but can't check out yet
      return (
        <span className='text-xs text-green-400 px-2 py-1 bg-green-600/50 rounded'>
          Đã điểm danh
        </span>
      );
    }

    // Member is not checked in yet
    if (now >= tenMinBefore && now <= endTime) {
      return (
        <button
          onClick={() => handleMemberCheckIn(record.member_id, schedule)}
          className='text-xs px-2 py-1 bg-green-500/80 hover:bg-green-500 text-white rounded transition-colors'
        >
          Điểm danh
        </button>
      );
    }

    return null;
  };

  // Date picker handlers
  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleViewModeChange = useCallback((mode: 'day' | 'week' | 'month') => {
    setViewMode(mode);
  }, []);

  const handleShowCreateModal = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  // Modal filtering logic - prioritize attendance records over bookings
  const filteredMembers = (() => {
    // Use attendance records if available, otherwise fallback to bookings
    const dataSource =
      selectedSchedule?.attendance && selectedSchedule.attendance.length > 0
        ? selectedSchedule.attendance
        : selectedSchedule?.bookings || [];

    console.log('🔍 Filtering members:', {
      dataSource_type:
        selectedSchedule?.attendance && selectedSchedule.attendance.length > 0
          ? 'attendance'
          : 'bookings',
      dataSource_count: dataSource.length,
      modalSearchTerm,
      modalStatusFilter,
      memberData_keys: Object.keys(memberData),
      dataSource_sample: dataSource.slice(0, 2),
    });

    const filtered = dataSource.filter((record: any) => {
      const member = memberData[record.member_id];
      if (!member) {
        console.log('❌ Member not found for ID:', record.member_id);
        return false;
      }

      const matchesSearch =
        modalSearchTerm === '' ||
        member.full_name?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(modalSearchTerm.toLowerCase());

      // For attendance records, check actual attendance status
      if (selectedSchedule?.attendance && selectedSchedule.attendance.length > 0) {
        const attendance = record as AttendanceRecord;
        const matchesStatus =
          modalStatusFilter === 'all' ||
          (modalStatusFilter === 'present' && attendance.checked_in_at) ||
          (modalStatusFilter === 'absent' && !attendance.checked_in_at) ||
          (modalStatusFilter === 'late' &&
            attendance.checked_in_at &&
            new Date(attendance.checked_in_at) > new Date(selectedSchedule.start_time));

        console.log('📋 Attendance filtering:', {
          member_id: record.member_id,
          member_name: member.full_name,
          checked_in_at: attendance.checked_in_at,
          modalStatusFilter,
          matchesStatus,
          matchesSearch,
        });

        return matchesSearch && matchesStatus;
      } else {
        // For bookings, use booking status
        const booking = record as any;
        const matchesStatus =
          modalStatusFilter === 'all' ||
          (modalStatusFilter === 'present' && booking.status === 'CONFIRMED') ||
          (modalStatusFilter === 'absent' && booking.status === 'CANCELLED') ||
          (modalStatusFilter === 'late' && booking.status === 'LATE');

        console.log('📝 Booking filtering:', {
          member_id: record.member_id,
          member_name: member.full_name,
          booking_status: booking.status,
          modalStatusFilter,
          matchesStatus,
          matchesSearch,
        });

        return matchesSearch && matchesStatus;
      }
    });

    console.log('✅ Filtered members result:', {
      total_filtered: filtered.length,
      filtered_members: filtered.map(f => ({
        member_id: f.member_id,
        member_name: memberData[f.member_id]?.full_name,
        checked_in_at: (f as any).checked_in_at,
        status: (f as any).status,
      })),
    });

    return filtered;
  })();

  // Function to get membership color
  const getMembershipColor = (membershipType: string) => {
    const colorMap: { [key: string]: string } = {
      BASIC: 'bg-blue-500',
      PREMIUM: 'bg-purple-500',
      GOLD: 'bg-yellow-500',
      VIP: 'bg-red-500',
    };
    return colorMap[membershipType] || colorMap.BASIC;
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto mb-3'></div>
          <p className='text-xs text-gray-600 dark:text-gray-400'>Đang tải lịch dạy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-4'>
      {/* Header */}
      <div className='mb-4 flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-heading font-bold text-gray-800 dark:text-white/90 mb-1'>
            Lịch dạy chi tiết
          </h1>
          <p className='text-sm font-inter text-gray-600 dark:text-gray-400'>
            Xem và quản lý lịch dạy của bạn
          </p>
        </div>

        {/* Notification Bell */}
        <div className='relative'>
          <button
            onClick={() => {
              if (unreadCount > 0) {
                markAllAsRead();
              }
            }}
            className='relative p-2 text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors'
          >
            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L12.828 7H4.828zM4.828 17h8l-2.586-2.586a2 2 0 00-2.828 0L4.828 17z'
              />
            </svg>
            {unreadCount > 0 && (
              <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center'>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifications.length > 0 && (
            <div className='absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto'>
              <div className='p-3 border-b border-gray-200 dark:border-gray-700'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-sm font-semibold text-gray-800 dark:text-white'>
                    Thông báo ({unreadCount} mới)
                  </h3>
                  <button
                    onClick={markAllAsRead}
                    className='text-xs text-orange-500 hover:text-orange-600'
                  >
                    Đánh dấu tất cả đã đọc
                  </button>
                </div>
              </div>
              <div className='max-h-64 overflow-y-auto'>
                {notifications.slice(0, 10).map(notification => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      !notification.is_read ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className='flex items-start gap-2'>
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          !notification.is_read ? 'bg-orange-500' : 'bg-gray-300'
                        }`}
                      />
                      <div className='flex-1'>
                        <h4 className='text-sm font-medium text-gray-800 dark:text-white'>
                          {notification.title}
                        </h4>
                        <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
                          {notification.message}
                        </p>
                        <p className='text-xs text-gray-500 dark:text-gray-500 mt-1'>
                          {new Date(notification.created_at).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4'>
        {/* Date and View Controls */}
        <DatePickerComponent
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onShowCreateModal={handleShowCreateModal}
        />

        {/* Advanced Filters */}
        <div className='border-t border-gray-200 dark:border-gray-700 pt-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'>
            {/* Search */}
            <div>
              <label className='block text-xs font-inter font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Tìm kiếm
              </label>
              <input
                type='text'
                placeholder='Tìm theo tên lớp, phòng...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className='block text-xs font-inter font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Trạng thái
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className='w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
              >
                <option value='all'>Tất cả</option>
                <option value='SCHEDULED'>Đã lên lịch</option>
                <option value='IN_PROGRESS'>Đang diễn ra</option>
                <option value='COMPLETED'>Hoàn thành</option>
                <option value='CANCELLED'>Đã hủy</option>
              </select>
            </div>

            {/* Class Type Filter */}
            <div>
              <label className='block text-xs font-inter font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Loại lớp
              </label>
              <select
                value={classTypeFilter}
                onChange={e => setClassTypeFilter(e.target.value)}
                className='w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
              >
                <option value='all'>Tất cả</option>
                <option value='yoga'>Yoga</option>
                <option value='pilates'>Pilates</option>
                <option value='recovery'>Recovery</option>
                <option value='strength'>Strength</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className='block text-xs font-inter font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Sắp xếp theo
              </label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'time' | 'class' | 'status')}
                className='w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
              >
                <option value='time'>Thời gian</option>
                <option value='class'>Tên lớp</option>
                <option value='status'>Trạng thái</option>
              </select>
            </div>
          </div>

          {/* Filter Summary */}
          <div className='mt-3 flex items-center justify-between'>
            <div className='text-xs font-inter text-gray-600 dark:text-gray-400'>
              Hiển thị {schedules.length} lớp học
            </div>
            <div className='flex gap-2'>
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setClassTypeFilter('all');
                  setSearchTerm('');
                  setSortBy('time');
                }}
                className='text-xs font-inter text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300'
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      <ScheduleTable
        schedules={schedules}
        loading={loading}
        statusFilter={statusFilter}
        classTypeFilter={classTypeFilter}
        searchTerm={searchTerm}
        sortBy={sortBy}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onSort={handleSort}
        onAttendanceClick={openAttendanceModal}
        onEditClick={handleEditClick}
        getCheckInButton={getCheckInButton}
      />

      {/* Attendance Detail Modal */}
      {showAttendanceModal && selectedSchedule && (
        <div
          className='fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300'
          onClick={e => {
            if (e.target === e.currentTarget) {
              closeAttendanceModal();
            }
          }}
        >
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[70vh] overflow-hidden animate-in zoom-in-95 duration-300'>
            {/* Modal Header */}
            <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
              <div>
                <h2 className='text-lg font-heading font-semibold text-gray-800 dark:text-white'>
                  {selectedSchedule?.attendance && selectedSchedule.attendance.length > 0
                    ? 'Danh sách thành viên đã điểm danh'
                    : 'Danh sách thành viên đã đăng ký'}
                </h2>
                <p className='text-xs font-inter text-gray-600 dark:text-gray-400 mt-1'>
                  {selectedSchedule.gym_class?.name} - {formatDate(selectedSchedule.date)}
                </p>
              </div>
              <button
                onClick={closeAttendanceModal}
                className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              >
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            </div>

            {/* Modal Filters */}
            <div className='p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'>
              <div className='flex gap-3'>
                <div className='flex-1'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                    <input
                      type='text'
                      placeholder='Tìm kiếm thành viên...'
                      value={modalSearchTerm}
                      onChange={e => setModalSearchTerm(e.target.value)}
                      className='w-full pl-10 pr-3 py-2 text-xs font-inter border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
                    />
                  </div>
                </div>
                <div className='w-40'>
                  <select
                    value={modalStatusFilter}
                    onChange={e => setModalStatusFilter(e.target.value)}
                    className='w-full px-3 py-2 text-xs font-inter border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
                  >
                    <option value='all'>Tất cả</option>
                    <option value='present'>Có mặt</option>
                    <option value='absent'>Vắng mặt</option>
                    <option value='late'>Đi muộn</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className='p-3 overflow-y-auto max-h-[calc(70vh-140px)]'>
              {loadingMembers ? (
                <div className='flex items-center justify-center py-6'>
                  <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600'></div>
                  <span className='ml-2 text-xs font-inter text-gray-600 dark:text-gray-400'>
                    Đang tải thông tin thành viên...
                  </span>
                </div>
              ) : (selectedSchedule.attendance && selectedSchedule.attendance.length > 0) ||
                (selectedSchedule.bookings && selectedSchedule.bookings.length > 0) ? (
                <div className='space-y-3'>
                  {/* Summary */}
                  <div className='bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 mb-3'>
                    <div className='flex items-center justify-between text-xs'>
                      <div className='flex items-center gap-4'>
                        <span className='font-inter font-medium text-orange-800 dark:text-orange-200'>
                          Tổng:{' '}
                          <span className='text-orange-600 dark:text-orange-300'>
                            {filteredMembers.length}
                          </span>
                        </span>
                        <span className='font-inter font-medium text-orange-800 dark:text-orange-200'>
                          Lớp:{' '}
                          <span className='text-orange-600 dark:text-orange-300'>
                            {selectedSchedule.gym_class?.name}
                          </span>
                        </span>
                      </div>
                      <span className='font-inter font-medium text-orange-800 dark:text-orange-200'>
                        {getStatusLabelModal(selectedSchedule.status)}
                      </span>
                    </div>
                  </div>

                  {/* Member List */}
                  <div className='space-y-2'>
                    {filteredMembers.map((record, index) => {
                      const member = memberData[record.member_id];
                      const isAttendanceRecord =
                        selectedSchedule?.attendance && selectedSchedule.attendance.length > 0;
                      const attendance = isAttendanceRecord ? (record as AttendanceRecord) : null;
                      const booking = !isAttendanceRecord ? (record as any) : null;

                      return (
                        <div
                          key={record.id}
                          className='relative overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] animate-in slide-in-from-bottom-4'
                          style={{
                            animationDelay: `${index * 50}ms`,
                          }}
                        >
                          {/* Membership color background */}
                          <div
                            className={`absolute inset-0 ${getMembershipColor(member?.membership_type || 'BASIC')} opacity-20`}
                          />

                          {/* Dark overlay for better text readability */}
                          <div className='absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-black/40' />

                          {/* Content */}
                          <div className='relative p-3'>
                            <div className='flex items-center gap-3'>
                              {/* Avatar - Left Side */}
                              <div className='flex-shrink-0'>
                                {member?.profile_photo ? (
                                  <img
                                    src={member.profile_photo}
                                    alt={member.full_name}
                                    className='w-12 h-12 rounded-full object-cover border-2 border-white/30 shadow-md transition-transform duration-200 hover:scale-105'
                                    onError={e => {
                                      e.currentTarget.style.display = 'none';
                                      const fallback = e.currentTarget
                                        .nextElementSibling as HTMLElement;
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div
                                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-heading font-bold border-2 border-white/30 shadow-md transition-transform duration-200 hover:scale-105 ${
                                    member?.profile_photo ? 'hidden' : 'flex'
                                  }`}
                                  style={{
                                    backgroundColor: member?.profile_photo
                                      ? 'transparent'
                                      : '#fb6514',
                                  }}
                                >
                                  {member?.full_name?.charAt(0) ||
                                    record.member_id?.charAt(0) ||
                                    '?'}
                                </div>
                              </div>

                              {/* Member Info - Center */}
                              <div className='flex-1 min-w-0'>
                                <div className='flex items-center justify-between mb-1'>
                                  <h4 className='text-sm font-heading font-semibold text-white drop-shadow-sm truncate flex-1 mr-2'>
                                    {member?.full_name || `Member ID: ${record.member_id}`}
                                  </h4>
                                  {(() => {
                                    let attendanceStatus;

                                    // Debug log attendance data
                                    console.log('🔍 Debug Attendance Data:', {
                                      member_id: record.member_id,
                                      member_name: member?.full_name,
                                      isAttendanceRecord,
                                      attendance: attendance
                                        ? {
                                            id: attendance.id,
                                            checked_in_at: attendance.checked_in_at,
                                            checked_out_at: attendance.checked_out_at,
                                            attendance_method: attendance.attendance_method,
                                            class_rating: attendance.class_rating,
                                            trainer_rating: attendance.trainer_rating,
                                          }
                                        : null,
                                      booking: booking
                                        ? {
                                            id: booking.id,
                                            status: booking.status,
                                            created_at: booking.created_at,
                                          }
                                        : null,
                                      selectedSchedule: {
                                        id: selectedSchedule?.id,
                                        start_time: selectedSchedule?.start_time,
                                        end_time: selectedSchedule?.end_time,
                                      },
                                    });

                                    if (isAttendanceRecord && attendance) {
                                      // Use actual attendance data
                                      if (attendance.checked_in_at) {
                                        const checkInTime = new Date(attendance.checked_in_at);
                                        const classStartTime = new Date(
                                          selectedSchedule.start_time
                                        );
                                        const isLate = checkInTime > classStartTime;

                                        console.log('⏰ Check-in Time Analysis:', {
                                          checkInTime: checkInTime.toISOString(),
                                          classStartTime: classStartTime.toISOString(),
                                          isLate,
                                          timeDifference:
                                            checkInTime.getTime() - classStartTime.getTime(),
                                        });

                                        attendanceStatus = {
                                          text: isLate ? 'Đi muộn' : 'Có mặt',
                                          color: isLate ? 'bg-yellow-500/90' : 'bg-green-500/90',
                                        };
                                      } else {
                                        console.log(
                                          '❌ No check-in time found for attendance record'
                                        );
                                        attendanceStatus = {
                                          text: 'Vắng mặt',
                                          color: 'bg-red-500/90',
                                        };
                                      }
                                    } else if (booking) {
                                      // Fallback to booking status
                                      console.log('📝 Using booking status as fallback');
                                      attendanceStatus = getAttendanceStatus(booking);
                                    } else {
                                      console.log('❓ No attendance or booking data found');
                                      attendanceStatus = {
                                        text: 'Chưa điểm danh',
                                        color: 'bg-gray-400/90',
                                      };
                                    }

                                    console.log('✅ Final attendance status:', attendanceStatus);

                                    return (
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded-full font-inter font-medium shadow-sm transition-all duration-200 hover:scale-105 flex-shrink-0 text-white ${attendanceStatus?.color || 'bg-gray-400/90'}`}
                                      >
                                        {attendanceStatus?.text || 'Chưa điểm danh'}
                                      </span>
                                    );
                                  })()}
                                </div>

                                {/* Tier Badge */}
                                <div className='flex items-center gap-1 mb-1'>
                                  <span className='text-xs font-heading font-medium text-white/90'>
                                    {member?.membership_type || 'BASIC'}
                                  </span>
                                </div>

                                {/* Attendance Details */}
                                {isAttendanceRecord && attendance && (
                                  <div className='flex items-center gap-2 text-xs text-white/80'>
                                    {attendance.checked_in_at && (
                                      <span>
                                        Check-in:{' '}
                                        {new Date(attendance.checked_in_at).toLocaleTimeString(
                                          'vi-VN',
                                          {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          }
                                        )}
                                      </span>
                                    )}
                                    {attendance.trainer_rating && (
                                      <span className='flex items-center gap-1'>
                                        ⭐ {attendance.trainer_rating}/5
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Contact Info - Compact */}
                                <div className='flex items-center justify-between text-xs font-inter text-gray-200'>
                                  <div className='flex items-center gap-3'>
                                    <div className='flex items-center gap-1'>
                                      <svg
                                        className='w-3 h-3 text-white/70'
                                        fill='none'
                                        stroke='currentColor'
                                        viewBox='0 0 24 24'
                                      >
                                        <path
                                          strokeLinecap='round'
                                          strokeLinejoin='round'
                                          strokeWidth={2}
                                          d='M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                                        />
                                      </svg>
                                      <span className='truncate max-w-[120px]'>
                                        {member?.email || 'Email không có'}
                                      </span>
                                    </div>
                                    <div className='flex items-center gap-1'>
                                      <svg
                                        className='w-3 h-3 text-white/70'
                                        fill='none'
                                        stroke='currentColor'
                                        viewBox='0 0 24 24'
                                      >
                                        <path
                                          strokeLinecap='round'
                                          strokeLinejoin='round'
                                          strokeWidth={2}
                                          d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
                                        />
                                      </svg>
                                      <span className='truncate max-w-[100px]'>
                                        {member?.phone || 'SĐT không có'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Check-in/Check-out Button */}
                                  {getMemberCheckInButton(record, attendance, selectedSchedule)}
                                </div>
                              </div>

                              {/* Tier Image - Right Side (Larger) */}
                              <div className='flex-shrink-0'>
                                <img
                                  src={`/images/membership/${(member?.membership_type || 'BASIC').toLowerCase()}.png`}
                                  alt={member?.membership_type || 'BASIC'}
                                  className='w-40 h-16 object-contain opacity-80 transition-transform duration-200 hover:scale-110 hover:opacity-100'
                                  onError={e => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className='text-center py-6'>
                  <svg
                    className='w-12 h-12 text-gray-400 mx-auto mb-3'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
                    />
                  </svg>
                  <h3 className='text-sm font-heading font-medium text-gray-800 dark:text-white mb-1'>
                    {selectedSchedule?.attendance && selectedSchedule.attendance.length > 0
                      ? 'Chưa có thành viên nào điểm danh'
                      : 'Chưa có thành viên nào đăng ký'}
                  </h3>
                  <p className='text-xs font-inter text-gray-600 dark:text-gray-400'>
                    {selectedSchedule?.attendance && selectedSchedule.attendance.length > 0
                      ? 'Lớp học này chưa có thành viên nào điểm danh tham gia.'
                      : 'Lớp học này chưa có thành viên nào đăng ký tham gia.'}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className='flex justify-end p-4 border-t border-gray-200 dark:border-gray-700'>
              <Button
                variant='outline'
                onClick={closeAttendanceModal}
                className='text-xs font-inter'
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Schedule Modal */}
      <CreateScheduleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchSchedules(); // Refresh the schedule list
          if (window.showToast) {
            window.showToast({
              type: 'success',
              message: 'Tạo lịch dạy thành công!',
              duration: 3000,
            });
          }
        }}
        userId={userId}
      />
    </div>
  );
}
