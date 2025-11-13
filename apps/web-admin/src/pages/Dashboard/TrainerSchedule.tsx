import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { ChevronLeft, ChevronRight, ChevronUp, Search } from 'lucide-react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminModal from '../../components/common/AdminModal';
import CustomSelect from '../../components/common/CustomSelect';
import CreateScheduleModal from '../../components/trainer/CreateScheduleModal';
import Button from '../../components/ui/Button/Button';
import { useOptimisticScheduleUpdates } from '@/hooks/useOptimisticScheduleUpdates';
// import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications'; // Disabled to prevent unnecessary re-renders
import { scheduleService } from '../../services/schedule.service';
import { socketService } from '../../services/socket.service';
import { memberApi } from '@/services/api';

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

// Separate Header Component - Memoized to prevent re-renders
const ScheduleHeader = React.memo(() => {
  return (
    <div className='p-6 pb-0'>
      <div className='flex justify-between items-start'>
        <div>
          <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
            Lịch dạy chi tiết
          </h1>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
            Xem và quản lý lịch dạy của bạn
          </p>
        </div>
      </div>
    </div>
  );
});
ScheduleHeader.displayName = 'ScheduleHeader';

// Separate Controls Component - Memoized to prevent re-renders when only table data changes
const ScheduleControls = React.memo(
  ({
    selectedDate,
    viewMode,
    onDateChange,
    onViewModeChange,
    onShowCreateModal,
  }: {
    selectedDate: string;
    viewMode: 'day' | 'week' | 'month';
    onDateChange: (date: string) => void;
    onViewModeChange: (mode: 'day' | 'week' | 'month') => void;
    onShowCreateModal: () => void;
  }) => {
    return (
      <div className='px-6'>
        <div className='bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-3'>
          <DatePickerComponent
            selectedDate={selectedDate}
            onDateChange={onDateChange}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            onShowCreateModal={onShowCreateModal}
          />
        </div>
      </div>
    );
  }
  // No custom comparison - React.memo will do shallow comparison
  // Callbacks are memoized with useCallback, so they won't change reference
);
ScheduleControls.displayName = 'ScheduleControls';

// Separate Filters Component - Memoized to prevent re-renders when only table data changes
const ScheduleFilters = React.memo(
  ({
    searchTerm,
    statusFilter,
    classTypeFilter,
    onSearchChange,
    onStatusChange,
    onClassTypeChange,
  }: {
    searchTerm: string;
    statusFilter: string;
    classTypeFilter: string;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onClassTypeChange: (value: string) => void;
  }) => {
    return (
      <div className='px-6'>
        <div className='bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-3'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
            {/* Search Input */}
            <div className='md:col-span-2 group relative'>
              <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
              <input
                type='text'
                placeholder='Tìm kiếm lịch dạy...'
                value={searchTerm}
                onChange={e => onSearchChange(e.target.value)}
                className='w-full py-2 pl-9 pr-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              />
            </div>

            {/* Status Filter */}
            <div>
              <CustomSelect
                options={[
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'SCHEDULED', label: 'Đã lên lịch' },
                  { value: 'IN_PROGRESS', label: 'Đang diễn ra' },
                  { value: 'COMPLETED', label: 'Hoàn thành' },
                  { value: 'CANCELLED', label: 'Đã hủy' },
                ]}
                value={statusFilter}
                onChange={onStatusChange}
                placeholder='Tất cả trạng thái'
                className='font-inter'
              />
            </div>

            {/* Class Type Filter */}
            <div>
              <CustomSelect
                options={[
                  { value: 'all', label: 'Tất cả loại lớp' },
                  { value: 'CARDIO', label: 'Cardio' },
                  { value: 'STRENGTH', label: 'Sức mạnh' },
                  { value: 'YOGA', label: 'Yoga' },
                  { value: 'PILATES', label: 'Pilates' },
                  { value: 'DANCE', label: 'Khiêu vũ' },
                  { value: 'MARTIAL_ARTS', label: 'Võ thuật' },
                  { value: 'AQUA', label: 'Bơi lội' },
                  { value: 'FUNCTIONAL', label: 'Chức năng' },
                  { value: 'RECOVERY', label: 'Phục hồi' },
                  { value: 'SPECIALIZED', label: 'Chuyên biệt' },
                ]}
                value={classTypeFilter}
                onChange={onClassTypeChange}
                placeholder='Tất cả loại lớp'
                className='font-inter'
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
  // No custom comparison - React.memo will do shallow comparison
  // Callbacks are memoized with useCallback, so they won't change reference
);
ScheduleFilters.displayName = 'ScheduleFilters';

const DatePickerComponent = ({
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

  // Use ref to store the latest onDateChange callback
  const onDateChangeRef = useRef(onDateChange);
  
  // Update ref when prop changes (but don't cause re-renders)
  useEffect(() => {
    onDateChangeRef.current = onDateChange;
  }, [onDateChange]);

  // Stable handler that uses ref - doesn't need to be in dependencies
  const handleDateChange = useCallback((dates: Date[]) => {
    if (dates.length > 0) {
      const date = dates[0];
      // Fix timezone issue by using local date components
      // Convert from flatpickr's d/m/Y format to YYYY-MM-DD for API
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const newDate = `${year}-${month}-${day}`;
      onDateChangeRef.current(newDate);
    }
  }, []); // Empty deps - uses ref which is always current

  const handleOpen = useCallback(() => {
    // Flatpickr opened
  }, []);

  const handleClose = useCallback(() => {
    // Flatpickr closed
  }, []);

  // Stable element with useMemo - element never changes
  const datePickerElement = useMemo(() => {
    // Convert YYYY-MM-DD to DD/MM/YYYY for display
    let displayValue = '';
    if (selectedDate) {
      const [year, month, day] = selectedDate.split('-');
      if (year && month && day) {
        displayValue = `${day}/${month}/${year}`;
      }
    }

    const isDisabled = viewMode !== 'day';

    return (
      <input
        ref={datePickerRef}
        type='text'
        placeholder='dd/mm/yyyy'
        defaultValue={displayValue}
        className={`w-full py-2 pl-3 pr-8 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm ${
          isDisabled
            ? 'cursor-not-allowed opacity-60 bg-gray-100 dark:bg-gray-800/50'
            : 'cursor-pointer hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
        readOnly
      />
    );
  }, [selectedDate, viewMode]); // Update when selectedDate or viewMode changes

  // Store initial selectedDate in a ref to use in initialization
  const initialSelectedDateRef = useRef(selectedDate);
  
  // Store callbacks in refs to avoid dependencies
  const handleDateChangeRef = useRef(handleDateChange);
  const handleOpenRef = useRef(handleOpen);
  const handleCloseRef = useRef(handleClose);
  
  // Update refs when callbacks change
  useEffect(() => {
    handleDateChangeRef.current = handleDateChange;
    handleOpenRef.current = handleOpen;
    handleCloseRef.current = handleClose;
  }, [handleDateChange, handleOpen, handleClose]);
  
  // Initialize flatpickr when element is ready - only once on mount
  useLayoutEffect(() => {
    // Wait for ref to be set
    if (!datePickerRef.current) {
      return;
    }

    // If flatpickr already initialized, don't initialize again
    if (flatpickrInstanceRef.current) {
      return;
    }

    // Get Vietnam date for default (use initial value from ref)
    const getVietnamDateForDefault = (): string => {
      if (initialSelectedDateRef.current) return initialSelectedDateRef.current;
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const fp = flatpickr(datePickerRef.current, {
      defaultDate: getVietnamDateForDefault(),
      dateFormat: 'd/m/Y', // Vietnamese format: DD/MM/YYYY
      altFormat: 'd/m/Y', // Display format
      allowInput: true,
      clickOpens: true,
      locale: {
        firstDayOfWeek: 1, // Monday
        weekdays: {
          shorthand: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
          longhand: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
        },
        months: {
          shorthand: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
          longhand: [
            'Tháng 1',
            'Tháng 2',
            'Tháng 3',
            'Tháng 4',
            'Tháng 5',
            'Tháng 6',
            'Tháng 7',
            'Tháng 8',
            'Tháng 9',
            'Tháng 10',
            'Tháng 11',
            'Tháng 12',
          ],
        },
      },
      onChange: (...args) => handleDateChangeRef.current(...args),
      onOpen: () => handleOpenRef.current(),
      onClose: () => handleCloseRef.current(),
    });

    flatpickrInstanceRef.current = fp;

    return () => {
      if (flatpickrInstanceRef.current) {
        flatpickrInstanceRef.current.destroy();
        flatpickrInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - callbacks accessed via refs

  // Update date when selectedDate changes from outside (e.g., API response)
  useEffect(() => {
    if (flatpickrInstanceRef.current && datePickerRef.current && selectedDate) {
      try {
        // Convert YYYY-MM-DD to Date object and update flatpickr
        const [year, month, day] = selectedDate.split('-');
        if (year && month && day) {
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          flatpickrInstanceRef.current.setDate(date, false);
          // Also update the input value to show DD/MM/YYYY format
          datePickerRef.current.value = `${day}/${month}/${year}`;
        }
      } catch (error) {
        console.error('Error updating Flatpickr date:', error);
      }
    }
  }, [selectedDate]);

  // Enable/disable flatpickr based on viewMode
  useEffect(() => {
    if (flatpickrInstanceRef.current && datePickerRef.current) {
      // Disable when viewMode is 'week' or 'month'
      const isDisabled = viewMode !== 'day';
      
      if (isDisabled) {
        // Disable flatpickr
        flatpickrInstanceRef.current.set('clickOpens', false);
        // Disable input
        datePickerRef.current.disabled = true;
        datePickerRef.current.style.cursor = 'not-allowed';
      } else {
        // Enable flatpickr
        flatpickrInstanceRef.current.set('clickOpens', true);
        // Enable input
        datePickerRef.current.disabled = false;
        datePickerRef.current.style.cursor = 'pointer';
      }
    }
  }, [viewMode]);

  return (
    <div className='flex flex-col sm:flex-row gap-3 items-stretch sm:items-center'>
      {/* Left side: Date picker and view mode */}
      <div className='flex items-center gap-3 flex-1 min-w-0'>
        {/* Date Picker */}
        <div className='flex-shrink-0 w-[150px]'>
          <div className='relative'>
            {datePickerElement}
            <div className='absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none'>
              <svg
                className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500'
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

        {/* View Mode Select */}
        <div className='flex-shrink-0 w-[110px]'>
          <CustomSelect
            options={[
              { value: 'day', label: 'Ngày' },
              { value: 'week', label: 'Tuần' },
              { value: 'month', label: 'Tháng' },
            ]}
            value={viewMode}
            onChange={value => onViewModeChange(value as 'day' | 'week' | 'month')}
            placeholder='Chế độ xem'
            className='font-inter'
          />
        </div>
      </div>

      {/* Right side: Action buttons */}
      <div className='flex gap-2 flex-shrink-0'>
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
          className='text-[11px] font-heading whitespace-nowrap'
        >
          Xuất lịch
        </Button>
        <Button
          size='sm'
          variant='primary'
          onClick={onShowCreateModal}
          className='text-[11px] font-heading whitespace-nowrap'
        >
          Mở lớp học
        </Button>
      </div>
    </div>
  );
};

// Separate Table Component to minimize re-renders
// This component will ONLY re-render when schedules, loading, or filter values change
// It will NOT re-render when selectedDate or viewMode changes (those only trigger data fetch)
const ScheduleTable = ({
  schedules,
  loading,
  statusFilter,
  classTypeFilter,
  classIdFilter,
  searchTerm,
  sortBy,
  currentPage,
  itemsPerPage,
  onPageChange,
  onSort,
  onAttendanceClick,
  onEditClick,
  getCheckInButton,
  updatedScheduleIds,
}: {
  schedules: ScheduleItem[];
  loading: boolean;
  statusFilter: string;
  classTypeFilter: string;
  classIdFilter: string;
  searchTerm: string;
  sortBy: string;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onSort: (column: string) => void;
  onAttendanceClick: (schedule: ScheduleItem) => void;
  onEditClick: (schedule: ScheduleItem) => void;
  getCheckInButton: (schedule: ScheduleItem) => React.ReactNode;
  updatedScheduleIds?: Set<string>;
}) => {

  // Move filtering, sorting, pagination logic here
  // Calculate filtered schedules directly without useMemo
  let filtered = [...schedules];

  // Status filter
  if (statusFilter !== 'all') {
    filtered = filtered.filter(schedule => schedule.status === statusFilter);
  }

  // Class ID filter (if classId is provided in URL or filter)
  // Check both class_id and gym_class.id to ensure compatibility
  if (classIdFilter && schedules.length > 0) {
    filtered = filtered.filter(schedule => {
      const matchesClassId = schedule.class_id === classIdFilter;
      const matchesGymClassId = schedule.gym_class?.id === classIdFilter;
      return matchesClassId || matchesGymClassId;
    });
  } else if (classTypeFilter !== 'all') {
    // Class type filter (based on category enum) - only if no classId filter
    filtered = filtered.filter(schedule => schedule.gym_class?.category === classTypeFilter);
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

  const filteredSchedules = filtered;

  // Calculate pagination directly without useMemo
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

  // Use the global getStatusColor function defined outside the component

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
    <div className='bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden'>
      {loading ? (
        <div className='p-12'>
          <div className='text-center text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
            Đang tải...
          </div>
        </div>
      ) : filteredSchedules.length > 0 ? (
        <>
          {/* Table */}
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700'>
                <tr>
                  <th className='px-4 py-2.5 text-[11px] font-heading font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-left'>
                    STT
                  </th>
                  <th
                    className='px-4 py-2.5 text-[11px] font-heading font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors'
                    onClick={() => onSort('class')}
                  >
                    <div className='flex items-center gap-1'>
                      Lớp học
                      <ChevronUp className='w-3 h-3' />
                    </div>
                  </th>
                  <th
                    className='px-4 py-2.5 text-[11px] font-heading font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors'
                    onClick={() => onSort('time')}
                  >
                    <div className='flex items-center gap-1'>
                      Thời gian
                      <ChevronUp className='w-3 h-3' />
                    </div>
                  </th>
                  <th className='px-4 py-2.5 text-[11px] font-heading font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-left'>
                    Phòng
                  </th>
                  <th className='px-4 py-2.5 text-[11px] font-heading font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-left'>
                    Học viên
                  </th>
                  <th
                    className='px-4 py-2.5 text-[11px] font-heading font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors'
                    onClick={() => onSort('status')}
                  >
                    <div className='flex items-center gap-1'>
                      Trạng thái
                      <ChevronUp className='w-3 h-3' />
                    </div>
                  </th>
                  <th className='px-4 py-2.5 text-[11px] font-heading font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-left'>
                    Điểm danh
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {paginatedSchedules.map((schedule, index) => {
                  const isUpdated = updatedScheduleIds?.has(schedule.id) || (schedule as any)._updated;
                  const isCheckedIn = (schedule as any)._checked_in;
                  
                  return (
                  <tr
                    key={schedule.id}
                    className={`border-b border-l-4 border-l-transparent hover:border-l-orange-500 border-gray-200 dark:border-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 dark:hover:from-orange-900/20 dark:hover:to-orange-800/10 transition-all duration-200 group ${
                      index % 2 === 0
                        ? 'bg-white dark:bg-gray-900'
                        : 'bg-gray-50/50 dark:bg-gray-800/50'
                    } ${
                      isUpdated ? 'schedule-row-updated' : ''
                    } ${
                      isCheckedIn ? 'animate-highlight-update' : ''
                    }`}
                  >
                    <td className='px-4 py-2.5 text-[11px] font-inter text-gray-600 dark:text-gray-400'>
                      {startIndex + index + 1}
                    </td>
                    <td className='px-4 py-2.5'>
                      <div className='text-[11px] font-semibold font-heading text-gray-900 dark:text-white leading-tight'>
                        {schedule.gym_class?.name || 'Tên lớp không xác định'}
                      </div>
                      <div className='text-[10px] font-inter text-gray-500 dark:text-gray-400 mt-0.5 leading-tight'>
                        {schedule.gym_class?.category || 'Không xác định'}
                      </div>
                    </td>
                    <td className='px-4 py-2.5'>
                      <div className='text-[11px] font-inter text-gray-900 dark:text-white leading-tight'>
                        {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                      </div>
                      <div className='text-[10px] font-inter text-gray-500 dark:text-gray-400 mt-0.5 leading-tight'>
                        {formatDate(schedule.date)}
                      </div>
                    </td>
                    <td className='px-4 py-2.5 text-[11px] font-inter text-gray-600 dark:text-gray-400'>
                      {schedule.room?.name || 'Phòng không xác định'}
                    </td>
                    <td className='px-4 py-2.5'>
                      <div className={`text-[11px] font-inter text-gray-900 dark:text-white leading-tight transition-all duration-200 ${
                        isUpdated ? 'animate-count-update font-semibold' : ''
                      }`}>
                        {schedule.current_bookings || 0}/{schedule.max_capacity || 0}
                      </div>
                      <div className='text-[10px] font-inter text-gray-500 dark:text-gray-400 mt-0.5 leading-tight'>
                        học viên
                      </div>
                    </td>
                    <td className='px-4 py-2.5'>
                      <span
                        className={`px-1.5 sm:px-2 py-0.5 inline-flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[9px] font-semibold font-heading rounded-full border ${getStatusColor(
                          schedule.status
                        )}`}
                      >
                        {getStatusLabel(schedule.status)}
                      </span>
                    </td>
                    <td className='px-4 py-2.5'>
                      <div className='flex gap-1'>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => onAttendanceClick(schedule)}
                          className='text-[11px] px-2 py-1 font-inter'
                        >
                          Xem
                        </Button>
                        {getCheckInButton(schedule)}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className='flex items-center justify-between px-4 py-2.5 border-t border-gray-200 dark:border-gray-700'>
              <div className='text-[11px] font-inter text-gray-600 dark:text-gray-400'>
                Hiển thị {startIndex + 1} - {Math.min(endIndex, filteredSchedules.length)} trong
                tổng số {filteredSchedules.length}
              </div>
              <div className='flex gap-1'>
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className='p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  <ChevronLeft className='w-3.5 h-3.5' />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => onPageChange(page)}
                      className={`px-2 py-1 text-[11px] rounded-lg font-inter transition-colors ${
                        currentPage === page
                          ? 'bg-orange-500 text-white shadow-sm'
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
                  className='p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  <ChevronRight className='w-3.5 h-3.5' />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12'>
          <div className='text-center'>
            <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter mb-2'>
              {searchTerm ? 'Không tìm thấy lịch dạy nào' : 'Không có lịch dạy nào'}
            </div>
            {!searchTerm && schedules.length === 0 && (
              <div className='text-[11px] text-gray-400 dark:text-gray-500 font-inter mt-2'>
                Tạo lịch dạy mới để bắt đầu quản lý
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// REMOVED StaticLayout - Tách riêng các phần để tránh re-render không cần thiết
// Khi StaticLayout re-render, tất cả children bên trong cũng re-render

// Separate Dynamic Table Component - Only re-renders when table data changes
// Separate Dynamic Table Component
const ScheduleTableSection = ({
  schedules,
  loading,
  statusFilter,
  classTypeFilter,
  classIdFilter,
  searchTerm,
  sortBy,
  currentPage,
  itemsPerPage,
  onPageChange,
  onSort,
  onAttendanceClick,
  onEditClick,
  getCheckInButton,
  updatedScheduleIds,
}: {
  schedules: ScheduleItem[];
  loading: boolean;
  statusFilter: string;
  classTypeFilter: string;
  classIdFilter: string;
  searchTerm: string;
  sortBy: string;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onSort: (column: string) => void;
  onAttendanceClick: (schedule: ScheduleItem) => void;
  onEditClick: (schedule: ScheduleItem) => void;
  getCheckInButton: (schedule: ScheduleItem) => React.ReactNode;
  updatedScheduleIds?: Set<string>;
}) => {
  return (
    <div className='px-6 pb-6'>
      <ScheduleTable
        schedules={schedules}
        loading={loading}
        statusFilter={statusFilter}
        classTypeFilter={classTypeFilter}
        classIdFilter={classIdFilter}
        searchTerm={searchTerm}
        sortBy={sortBy}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onSort={onSort}
        onAttendanceClick={onAttendanceClick}
        onEditClick={onEditClick}
        getCheckInButton={getCheckInButton}
        updatedScheduleIds={updatedScheduleIds}
      />
    </div>
  );
};

// Helper function to get current date in Vietnam timezone (UTC+7)
const getVietnamDate = (): string => {
  const now = new Date();
  // Get local date components (browser timezone, should be Vietnam timezone)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get status color classes (used in both table and modal)
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'SCHEDULED':
      return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
    case 'IN_PROGRESS':
      return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800';
    case 'COMPLETED':
      return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800';
    case 'CANCELLED':
      return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800';
    case 'DELAYED':
    case 'POSTPONED':
      return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800';
    default:
      return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
  }
};

export default function TrainerSchedule() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Get classId from URL on mount
  const classIdFromUrl = searchParams.get('classId') || '';

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true); // Only for first load
  const [tableLoading, setTableLoading] = useState(false); // Only for table reload
  const [selectedDate, setSelectedDate] = useState(getVietnamDate()); // Default to current date in Vietnam timezone
  // If classId is in URL, use 'month' view to see more schedules
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>(
    classIdFromUrl ? 'month' : 'day'
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userId, setUserId] = useState<string>('');

  // Advanced filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classTypeFilter, setClassTypeFilter] = useState<string>('all');
  // Initialize classIdFilter from URL
  const [classIdFilter, setClassIdFilter] = useState<string>(classIdFromUrl);
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

  // Real-time notifications - Disabled to prevent unnecessary re-renders
  // If needed, uncomment and use the values
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  // const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtimeNotifications({
  //   trainerId: userData.id,
  //   enabled: !!userData.id,
  //   interval: 10000, // 10 seconds
  // });

  // Get user ID on component mount
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUserId(userData.id);
    }
  }, []);

  // Listen for schedule updates from socket
  useEffect(() => {
    if (!userId) return;

    const socket = socketService.getSocket() || socketService.connect(userId);

    const handleScheduleUpdate = (data: any) => {
      console.log('📡 Received schedule:updated event:', data);
      
      // Update the schedule in the list without reloading
      setSchedules(prevSchedules => {
        const updatedSchedules = prevSchedules.map(schedule => {
          if (schedule.id === data.schedule_id) {
            // Update schedule with new data
            const updated = {
              ...schedule,
              room_name: data.room_name || schedule.room_name,
              date: data.date || schedule.date,
              start_time: data.start_time 
                ? new Date(data.start_time).toISOString().split('T')[1].slice(0, 5)
                : schedule.start_time,
              end_time: data.end_time
                ? new Date(data.end_time).toISOString().split('T')[1].slice(0, 5)
                : schedule.end_time,
              max_capacity: data.max_capacity ?? schedule.max_capacity,
              status: data.status || schedule.status,
            };
            
            // Notification will be shown in NotificationDropdown automatically
            // No need for toast notification
            
            return updated;
          }
          return schedule;
        });
        
        return updatedSchedules;
      });
    };

    socket.on('schedule:updated', handleScheduleUpdate);

    return () => {
      socket.off('schedule:updated', handleScheduleUpdate);
    };
  }, [userId]);

  const fetchSchedules = useCallback(
    async (isInitialLoad: boolean = false) => {
      try {
        // Use initialLoading only on first load, tableLoading for subsequent loads
        if (isInitialLoad) {
          setInitialLoading(true);
        } else {
          setTableLoading(true);
        }

        const response = await scheduleService.getTrainerScheduleList(selectedDate, viewMode);

        if (response.success) {
          // Handle nested data structure: response.data.schedules
          let data = [];
          if (response.data && typeof response.data === 'object' && 'schedules' in response.data) {
            data = Array.isArray(response.data.schedules) ? response.data.schedules : [];
          } else if (Array.isArray(response.data)) {
            data = response.data;
          }

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
        if (isInitialLoad) {
          setInitialLoading(false);
        } else {
          setTableLoading(false);
        }
      }
    },
    [selectedDate, viewMode]
  );

  // Track if this is the first render to avoid double fetch
  const isFirstRender = useRef(true);

  // Update classIdFilter when URL changes
  useEffect(() => {
    const classIdFromUrl = searchParams.get('classId') || '';
    if (classIdFromUrl !== classIdFilter) {
      setClassIdFilter(classIdFromUrl);
      // Clear category filter when filtering by classId
      if (classIdFromUrl && classTypeFilter !== 'all') {
        setClassTypeFilter('all');
      }
      // When filtering by classId, switch to 'month' view to see more schedules
      if (classIdFromUrl && viewMode !== 'month') {
        setViewMode('month');
      }
      // Refetch schedules when classId changes to get more data
      if (classIdFromUrl && !isFirstRender.current) {
        fetchSchedules(false);
      }
    }
  }, [searchParams, classIdFilter, classTypeFilter, viewMode, fetchSchedules]);

  // Initial load only once on mount
  useEffect(() => {
    if (isFirstRender.current) {
      fetchSchedules(true);
      isFirstRender.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Reload ONLY table data when selectedDate or viewMode changes
  // Header, Controls, and Filters won't re-render thanks to React.memo
  useEffect(() => {
    // Skip initial render (handled by first effect)
    if (isFirstRender.current) {
      return;
    }
    
    // Only fetch if initial load is complete
    // This will only update schedules state, not trigger re-render of Header/Controls/Filters
    if (!initialLoading) {
      fetchSchedules(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, viewMode]);

  // Use optimistic updates hook for smooth real-time updates
  const { updatedScheduleIds } = useOptimisticScheduleUpdates(schedules, setSchedules);

  // Optional: Sync with server in background after optimistic update (debounced)
  useEffect(() => {
    if (updatedScheduleIds.size === 0) return;

    // Debounce server sync - only sync after 5 seconds of no updates
    const syncTimer = setTimeout(() => {
      console.log('🔄 Syncing schedules with server after optimistic updates...');
      fetchSchedules(false).catch(error => {
        console.error('❌ Error syncing schedules:', error);
      });
    }, 5000);

    return () => clearTimeout(syncTimer);
  }, [updatedScheduleIds, fetchSchedules]);

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

  // Function to get attendance status based on check-in/check-out times
  const getAttendanceStatus = (booking: any) => {
    if (!selectedSchedule) {
      return null;
    }

    // Find attendance record for this member
    const attendance = selectedSchedule.attendance?.find(
      att => att.member_id === booking.member_id
    );

    if (!attendance?.checked_in_at) {
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

      // Calculate late minutes (positive = late, negative = early)
      const lateMinutes = Math.floor(
        (checkInTime.getTime() - classStartTime.getTime()) / (1000 * 60)
      );

      // Check if check-in is more than 15 minutes late
      if (lateMinutes > 15) {
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
        if (earlyMinutes > 5) {
          return {
            status: 'early_leave',
            text: `Về sớm ${earlyMinutes}p`,
            color: 'bg-orange-500/90',
          };
        }
      }

      // Check if check-in is not more than 10 minutes late and check-out is after class ends
      if (lateMinutes <= 10) {
        if (checkOutTime && checkOutTime >= classEndTime) {
          return {
            status: 'completed',
            text: 'Hoàn thành',
            color: 'bg-green-500/90',
          };
        } else if (checkOutTime) {
          return {
            status: 'partial',
            text: 'Tham gia',
            color: 'bg-blue-500/90',
          };
        } else {
          return {
            status: 'present',
            text: 'Có mặt',
            color: 'bg-green-500/90',
          };
        }
      }

      // Default case
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

  const fetchMemberData = useCallback(async (memberIds: string[]) => {
    try {
      setLoadingMembers(true);

      const response = await memberApi.post('/members/batch', { memberIds });

      if (response.data?.success || response.data?.data) {
        const data = response.data;
        const memberMap: { [key: string]: any } = {};

        // Handle different response structures
        if (data.success && data.data) {
          const members = Array.isArray(data.data)
            ? data.data
            : data.data.members && Array.isArray(data.data.members)
            ? data.data.members
            : [];

          members.forEach((member: any) => {
            memberMap[member.id] = member;
          });
        }
        setMemberData(memberMap);
      } else {
        console.error('Member API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching member data:', error);
    } finally {
      setLoadingMembers(false);
    }
  }, []); // Memoize fetchMemberData to prevent unnecessary re-renders

  const openAttendanceModal = useCallback(
    async (schedule: ScheduleItem) => {
      setSelectedSchedule(schedule);
      setShowAttendanceModal(true);

      // Fetch member data if attendance records exist
      if (schedule.attendance && schedule.attendance.length > 0) {
        const memberIds = schedule.attendance.map(attendance => attendance.member_id);
        await fetchMemberData(memberIds);
      } else if (schedule.bookings && schedule.bookings.length > 0) {
        // Fallback to bookings if no attendance records
        const memberIds = schedule.bookings.map(booking => booking.member_id);
        await fetchMemberData(memberIds);
      }
    },
    [fetchMemberData]
  ); // Add fetchMemberData dependency

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
          if (window.showToast) {
            window.showToast({
              type: 'error',
              message: 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.',
              duration: 3000,
            });
          }
          return;
        }

        const response = await scheduleService.enableCheckIn(schedule.id, userData.id);

        if (response.success) {
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

        const response = await scheduleService.disableCheckIn(schedule.id, userData.id);

        if (response.success) {
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

        const response = await scheduleService.trainerCheckOutAll(schedule.id, userData.id);

        if (response.success) {
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
    [fetchSchedules, selectedSchedule, fetchMemberData]
  );

  // Memoized function to get check-in button based on schedule status and time
  // This function is stable and won't cause ScheduleTable to re-render unnecessarily
  // Must be defined after handlers to use them in dependencies
  const getCheckInButton = useCallback(
    (schedule: ScheduleItem) => {
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
          <Button
            size='sm'
            variant='outline'
            disabled
            className='text-[11px] px-2 py-1 font-inter text-gray-400'
          >
            Đã kết thúc
          </Button>
        );
      }

      // Check if schedule is too far in the future
      if (nowVN < tenMinBefore) {
        return (
          <Button
            size='sm'
            variant='outline'
            disabled
            className='text-[11px] px-2 py-1 font-inter text-gray-400'
          >
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
              className='bg-red-500 hover:bg-red-600 text-white text-[11px] px-2 py-1 font-inter'
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
            className='bg-yellow-500 hover:bg-yellow-600 text-white text-[11px] px-2 py-1 font-inter'
          >
            Tắt điểm danh
          </Button>
        );
      }

      // Check if we can enable check-in
      if (nowVN >= tenMinBefore && nowVN <= endTime) {
        return (
          <Button
            size='sm'
            onClick={() => handleEnableCheckIn(schedule)}
            className='bg-green-500 hover:bg-green-600 text-white text-[11px] px-2 py-1 font-inter'
          >
            Bắt đầu điểm danh
          </Button>
        );
      }

      // Default case
      return (
        <Button
          size='sm'
          variant='outline'
          disabled
          className='text-[11px] px-2 py-1 font-inter text-gray-400'
        >
          Không khả dụng
        </Button>
      );
    },
    [handleCheckOutAll, handleDisableCheckIn, handleEnableCheckIn]
  ); // Dependencies for handlers

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

      const response = await scheduleService.trainerCheckInMember(
        schedule.id,
        memberId,
        userData.id
      );

      if (response.success) {
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

      const response = await scheduleService.trainerCheckOutMember(
        schedule.id,
        memberId,
        userData.id
      );

      if (response.success) {
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
          <span className='text-[10px] font-inter text-gray-600 dark:text-gray-400 px-2 py-0.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md'>
            Đã check-out
          </span>
        );
      }

      // If we can check out (after class ends)
      if (now >= endTime && now <= tenMinAfter) {
        return (
          <Button
            size='sm'
            onClick={() => handleMemberCheckOut(record.member_id, schedule)}
            className='bg-red-500 hover:bg-red-600 text-white text-[10px] px-2 py-1 font-inter'
          >
            Check-out
          </Button>
        );
      }

      // Member is checked in but can't check out yet
      return (
        <span className='text-[10px] font-inter text-green-700 dark:text-green-300 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md'>
          Đã điểm danh
        </span>
      );
    }

    // Member is not checked in yet
    if (now >= tenMinBefore && now <= endTime) {
      return (
        <Button
          size='sm'
          onClick={() => handleMemberCheckIn(record.member_id, schedule)}
          className='bg-green-500 hover:bg-green-600 text-white text-[10px] px-2 py-1 font-inter'
        >
          Điểm danh
        </Button>
      );
    }

    return null;
  };

  // Date picker handlers
  // Memoize callbacks to prevent unnecessary re-renders
  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
    // Reset to first page when date changes
    setCurrentPage(1);
  }, []);

  const handleViewModeChange = useCallback((mode: 'day' | 'week' | 'month') => {
    setViewMode(mode);
    // Reset to first page when view mode changes
    setCurrentPage(1);
  }, []);

  const handleShowCreateModal = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  // Memoize filter change handlers to prevent unnecessary re-renders
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handleClassTypeChange = useCallback((value: string) => {
    setClassTypeFilter(value);
    // Clear classId filter when changing category filter
    if (classIdFilter) {
      setClassIdFilter('');
      // Remove classId from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('classId');
      setSearchParams(newSearchParams, { replace: true });
    }
    setCurrentPage(1);
  }, [classIdFilter, searchParams, setSearchParams]);

  // Modal filtering logic - prioritize attendance records over bookings
  const filteredMembers = (() => {
    // Use attendance records if available, otherwise fallback to bookings
    const dataSource =
      selectedSchedule?.attendance && selectedSchedule.attendance.length > 0
        ? selectedSchedule.attendance
        : selectedSchedule?.bookings || [];

    const filtered = dataSource.filter((record: any) => {
      const member = memberData[record.member_id];
      if (!member) {
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

        return matchesSearch && matchesStatus;
      } else {
        // For bookings, use booking status
        const booking = record as any;
        const matchesStatus =
          modalStatusFilter === 'all' ||
          (modalStatusFilter === 'present' && booking.status === 'CONFIRMED') ||
          (modalStatusFilter === 'absent' && booking.status === 'CANCELLED') ||
          (modalStatusFilter === 'late' && booking.status === 'LATE');

        return matchesSearch && matchesStatus;
      }
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

  // Show full page skeleton only on initial load
  if (initialLoading) {
    return (
      <div className='p-4 space-y-6 animate-pulse'>
        {/* Header Skeleton */}
        <div className='bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 rounded-xl p-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl'></div>
              <div className='space-y-2'>
                <div className='h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg'></div>
                <div className='h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded'></div>
              </div>
            </div>
            <div className='w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg'></div>
          </div>
        </div>

        {/* Filters Skeleton */}
        <div className='bg-white dark:bg-gray-900 rounded-xl p-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className='h-10 bg-gray-200 dark:bg-gray-700 rounded-lg'></div>
            ))}
          </div>
        </div>

        {/* Table Skeleton */}
        <div className='bg-white dark:bg-gray-900 rounded-xl p-4'>
          <div className='space-y-3'>
            <div className='h-12 bg-gray-200 dark:bg-gray-700 rounded-lg'></div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className='h-16 bg-gray-100 dark:bg-gray-800 rounded-lg'></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Flatpickr Vietnamese Compact Styles */}
      <style>{`
        /* Compact Professional Vietnamese Flatpickr Calendar */
        .flatpickr-calendar {
          font-family: 'Inter', sans-serif !important;
          font-size: 10px !important;
          border-radius: 6px !important;
          border: 1px solid rgba(249, 115, 22, 0.15) !important;
          box-shadow: 0 8px 12px -3px rgba(0, 0, 0, 0.1), 0 3px 4px -2px rgba(0, 0, 0, 0.05) !important;
          background: #ffffff !important;
          overflow: hidden !important;
          width: 350px !important;
        }
        
        .dark .flatpickr-calendar {
          background: #1f2937 !important;
          border-color: rgba(249, 115, 22, 0.3) !important;
        }
        
        /* Month Header - Compact */
        .flatpickr-months {
          padding: 6px 6px !important;
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%) !important;
          border-bottom: 1px solid rgba(249, 115, 22, 0.1) !important;
        }
        
        .dark .flatpickr-months {
          background: linear-gradient(135deg, #7c2d12 0%, #9a3412 100%) !important;
          border-bottom-color: rgba(249, 115, 22, 0.2) !important;
        }
        
        .flatpickr-current-month {
          font-size: 10px !important;
          font-weight: 700 !important;
          font-family: 'Inter', sans-serif !important;
          color: #9a3412 !important;
        }
        
        .dark .flatpickr-current-month {
          color: #fed7aa !important;
        }
        
        .flatpickr-current-month .cur-month,
        .flatpickr-current-month input.cur-year {
          font-size: 10px !important;
          font-weight: 700 !important;
          font-family: 'Inter', sans-serif !important;
          color: #9a3412 !important;
        }
        
        .dark .flatpickr-current-month .cur-month,
        .dark .flatpickr-current-month input.cur-year {
          color: #fed7aa !important;
        }
        
        /* Navigation Arrows - Compact */
        .flatpickr-prev-month,
        .flatpickr-next-month {
          padding: 3px !important;
          border-radius: 3px !important;
          transition: all 0.2s ease !important;
          width: 20px !important;
          height: 20px !important;
        }
        
        .flatpickr-prev-month:hover,
        .flatpickr-next-month:hover {
          background: rgba(249, 115, 22, 0.1) !important;
        }
        
        .flatpickr-prev-month svg,
        .flatpickr-next-month svg {
          width: 9px !important;
          height: 9px !important;
          fill: #9a3412 !important;
        }
        
        .dark .flatpickr-prev-month svg,
        .dark .flatpickr-next-month svg {
          fill: #fed7aa !important;
        }
        
        /* Weekdays - Compact */
        .flatpickr-weekdays {
          padding: 4px 4px 3px !important;
          background: #fff7ed !important;
        }
        
        .dark .flatpickr-weekdays {
          background: #7c2d12 !important;
        }
        
        .flatpickr-weekday {
          font-size: 9px !important;
          font-weight: 700 !important;
          font-family: 'Inter', sans-serif !important;
          color: #9a3412 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.2px !important;
          padding: 2px 0 !important;
        }
        
        .dark .flatpickr-weekday {
          color: #fed7aa !important;
        }
        
        /* Days Container - Compact */
        .flatpickr-days {
          padding: 3px !important;
        }
        
        /* Individual Days - Compact */
        .flatpickr-day {
          font-size: 10px !important;
          font-family: 'Inter', sans-serif !important;
          height: 22px !important;
          line-height: 22px !important;
          border-radius: 4px !important;
          margin: 1px !important;
          transition: all 0.15s ease !important;
          font-weight: 500 !important;
          width: calc((100% - 8px) / 7) !important;
        }
        
        .flatpickr-day:hover {
          background: #fff7ed !important;
          border-color: #f97316 !important;
          color: #ea580c !important;
        }
        
        .dark .flatpickr-day:hover {
          background: #9a3412 !important;
          border-color: #f97316 !important;
          color: #fed7aa !important;
        }
        
        /* Selected Day - Compact */
        .flatpickr-day.selected,
        .flatpickr-day.startRange,
        .flatpickr-day.endRange {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%) !important;
          border-color: #f97316 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          box-shadow: 0 2px 4px -1px rgba(249, 115, 22, 0.3) !important;
        }
        
        .flatpickr-day.selected:hover,
        .flatpickr-day.startRange:hover,
        .flatpickr-day.endRange:hover {
          background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%) !important;
        }
        
        /* Today - Compact */
        .flatpickr-day.today {
          border: 1.5px solid #f97316 !important;
          color: #f97316 !important;
          font-weight: 700 !important;
          background: #fff7ed !important;
        }
        
        .dark .flatpickr-day.today {
          background: #7c2d12 !important;
          border-color: #f97316 !important;
          color: #fed7aa !important;
        }
        
        .flatpickr-day.today:hover {
          background: #fff7ed !important;
          border-color: #ea580c !important;
          color: #000000 !important;
        }
        
        .dark .flatpickr-day.today:hover {
          background: #9a3412 !important;
          border-color: #f97316 !important;
          color: #ffffff !important;
        }
        
        /* Disabled/Other Month Days - Compact */
        .flatpickr-day.flatpickr-disabled,
        .flatpickr-day.prevMonthDay,
        .flatpickr-day.nextMonthDay {
          color: #d1d5db !important;
          opacity: 0.4 !important;
          font-size: 8px !important;
        }
        
        .dark .flatpickr-day.flatpickr-disabled,
        .dark .flatpickr-day.prevMonthDay,
        .dark .flatpickr-day.nextMonthDay {
          color: #6b7280 !important;
        }
        
        /* Time Picker - Compact */
        .flatpickr-time {
          font-size: 9px !important;
          font-family: 'Inter', sans-serif !important;
          border-top: 1px solid rgba(249, 115, 22, 0.1) !important;
          padding: 4px !important;
        }
        
        .dark .flatpickr-time {
          border-top-color: rgba(249, 115, 22, 0.2) !important;
        }
        
        .flatpickr-time input {
          font-size: 9px !important;
          font-family: 'Inter', sans-serif !important;
          font-weight: 500 !important;
        }
        
        /* Calendar inner container */
        .flatpickr-innerContainer {
          padding: 0 !important;
        }
        
        /* Reduce spacing in calendar */
        .flatpickr-month {
          height: 28px !important;
        }
        
        /* Reduce overall calendar size */
        .flatpickr-calendar.arrowTop:before,
        .flatpickr-calendar.arrowTop:after {
          border-bottom-color: #ffffff !important;
        }
        
        .dark .flatpickr-calendar.arrowTop:before,
        .dark .flatpickr-calendar.arrowTop:after {
          border-bottom-color: #1f2937 !important;
        }
      `}</style>

      {/* Header */}
      <ScheduleHeader />

      {/* Controls */}
      <ScheduleControls
        selectedDate={selectedDate}
        viewMode={viewMode}
        onDateChange={handleDateChange}
        onViewModeChange={handleViewModeChange}
        onShowCreateModal={handleShowCreateModal}
      />

      {/* Filters */}
      <ScheduleFilters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        classTypeFilter={classTypeFilter}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onClassTypeChange={handleClassTypeChange}
      />

      {/* Dynamic Table Section - Only re-renders when table data or loading state changes */}
      <ScheduleTableSection
        schedules={schedules}
        loading={initialLoading || tableLoading}
        statusFilter={statusFilter}
        classTypeFilter={classTypeFilter}
        classIdFilter={classIdFilter}
        searchTerm={searchTerm}
        sortBy={sortBy}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onSort={handleSort}
        onAttendanceClick={openAttendanceModal}
        onEditClick={handleEditClick}
        getCheckInButton={getCheckInButton}
        updatedScheduleIds={updatedScheduleIds}
      />

      {/* Attendance Detail Modal */}
      <AdminModal
        isOpen={showAttendanceModal && !!selectedSchedule}
        onClose={closeAttendanceModal}
        title={
          selectedSchedule
            ? selectedSchedule?.attendance && selectedSchedule.attendance.length > 0
              ? 'Danh sách thành viên đã điểm danh'
              : 'Danh sách thành viên đã đăng ký'
            : ''
        }
        size='xl'
        footer={
          <div className='flex justify-end'>
            <Button variant='outline' onClick={closeAttendanceModal} className='text-sm font-inter'>
              Đóng
            </Button>
          </div>
        }
      >
        {selectedSchedule && (
          <>
            {/* Subtitle */}
            <div className='mb-4'>
              <p className='text-sm font-inter text-gray-600 dark:text-gray-400'>
                {selectedSchedule.gym_class?.name} - {formatDate(selectedSchedule.date)}
              </p>
            </div>

            {/* Modal Filters */}
            <div className='mb-4 pb-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex gap-3'>
                <div className='flex-1 group relative'>
                  <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
                  <input
                    type='text'
                    placeholder='Tìm kiếm thành viên...'
                    value={modalSearchTerm}
                    onChange={e => setModalSearchTerm(e.target.value)}
                    className='w-full py-2 pl-9 pr-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  />
                </div>
                <div className='w-40'>
                  <CustomSelect
                    options={[
                      { value: 'all', label: 'Tất cả' },
                      { value: 'present', label: 'Có mặt' },
                      { value: 'absent', label: 'Vắng mặt' },
                      { value: 'late', label: 'Đi muộn' },
                    ]}
                    value={modalStatusFilter}
                    onChange={setModalStatusFilter}
                    placeholder='Lọc trạng thái'
                    className='font-inter'
                  />
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div>
              {(() => {
                if (loadingMembers) {
                  return (
                    <div className='flex items-center justify-center py-6'>
                      <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600'></div>
                      <span className='ml-2 text-[11px] font-inter text-gray-600 dark:text-gray-400'>
                        Đang tải thông tin thành viên...
                      </span>
                    </div>
                  );
                }

                const hasData =
                  (selectedSchedule.attendance && selectedSchedule.attendance.length > 0) ||
                  (selectedSchedule.bookings && selectedSchedule.bookings.length > 0);

                if (hasData) {
                  return (
                    <div className='space-y-2'>
                      {/* Summary */}
                      <div className='bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-3'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-4'>
                            <div className='flex items-center gap-2'>
                              <span className='text-[11px] font-inter font-medium text-gray-700 dark:text-gray-300'>
                                Tổng:
                              </span>
                              <span className='px-2 py-0.5 bg-orange-500 dark:bg-orange-600 text-white text-[11px] font-bold rounded-md font-heading'>
                                {filteredMembers.length}
                              </span>
                            </div>
                            <div className='flex items-center gap-2'>
                              <span className='text-[11px] font-inter font-medium text-gray-700 dark:text-gray-300'>
                                Lớp:
                              </span>
                              <span className='text-[11px] font-bold text-orange-600 dark:text-orange-400 font-heading'>
                                {selectedSchedule.gym_class?.name}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`px-1.5 sm:px-2 py-0.5 inline-flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[9px] font-semibold font-heading rounded-full border ${getStatusColor(
                              selectedSchedule.status
                            )}`}
                          >
                            {getStatusLabelModal(selectedSchedule.status)}
                          </span>
                        </div>
                      </div>

                      {/* Member List */}
                      <div className='space-y-2'>
                        {filteredMembers.map(record => {
                          const member = memberData[record.member_id];
                          const isAttendanceRecord =
                            selectedSchedule?.attendance && selectedSchedule.attendance.length > 0;
                          const attendance = isAttendanceRecord
                            ? (record as AttendanceRecord)
                            : null;
                          const booking = !isAttendanceRecord ? (record as any) : null;

                          return (
                            <div
                              key={record.id}
                              className='relative overflow-hidden rounded-lg border-l-4 border-l-transparent hover:border-l-orange-500 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-all duration-200 group'
                            >

                              {/* Content */}
                              <div className='relative p-3 z-10'>
                                <div className='flex items-center gap-3'>
                                  {/* Avatar - Left Side */}
                                  <div className='flex-shrink-0'>
                                    {member?.profile_photo ? (
                                      <img
                                        src={member.profile_photo}
                                        alt={member.full_name}
                                        className='w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700 shadow-sm'
                                        onError={e => {
                                          e.currentTarget.style.display = 'none';
                                          const fallback = e.currentTarget
                                            .nextElementSibling as HTMLElement;
                                          if (fallback) fallback.style.display = 'flex';
                                        }}
                                      />
                                    ) : null}
                                    <div
                                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-[11px] font-heading font-bold border border-gray-200 dark:border-gray-700 shadow-sm ${
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
                                      <h4 className='text-[11px] font-heading font-semibold text-gray-900 dark:text-white truncate flex-1 mr-2 leading-tight'>
                                        {member?.full_name || `Member ID: ${record.member_id}`}
                                      </h4>
                                      {(() => {
                                        let attendanceStatus;

                                        if (isAttendanceRecord && attendance) {
                                          // Use actual attendance data
                                          if (attendance.checked_in_at) {
                                            const checkInTime = new Date(attendance.checked_in_at);
                                            const classStartTime = new Date(
                                              selectedSchedule.start_time
                                            );
                                            const isLate = checkInTime > classStartTime;

                                            attendanceStatus = {
                                              text: isLate ? 'Đi muộn' : 'Có mặt',
                                              color: isLate
                                                ? 'bg-yellow-500/90'
                                                : 'bg-green-500/90',
                                            };
                                          } else {
                                            attendanceStatus = {
                                              text: 'Vắng mặt',
                                              color: 'bg-red-500/90',
                                            };
                                          }
                                        } else if (booking) {
                                          // Fallback to booking status
                                          attendanceStatus = getAttendanceStatus(booking);
                                        } else {
                                          attendanceStatus = {
                                            text: 'Chưa điểm danh',
                                            color: 'bg-gray-400/90',
                                          };
                                        }

                                        return (
                                          <span
                                            className={`px-1.5 sm:px-2 py-0.5 inline-flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[9px] font-semibold font-heading rounded-full border flex-shrink-0 ${
                                              attendanceStatus?.text === 'Có mặt'
                                                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                                                : attendanceStatus?.text === 'Đi muộn'
                                                ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                                                : attendanceStatus?.text === 'Vắng mặt'
                                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                                : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                            }`}
                                          >
                                            {attendanceStatus?.text || 'Chưa điểm danh'}
                                          </span>
                                        );
                                      })()}
                                    </div>

                                    {/* Tier Badge & Details */}
                                    <div className='flex items-center gap-2 mb-1'>
                                      <span className='text-[9px] font-heading font-medium text-gray-600 dark:text-gray-400 leading-tight px-1.5 py-0.5 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700'>
                                        {member?.membership_type || 'BASIC'}
                                      </span>
                                      {isAttendanceRecord &&
                                        attendance &&
                                        attendance.checked_in_at && (
                                          <span className='text-[9px] font-inter text-gray-500 dark:text-gray-400 leading-tight'>
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
                                    </div>

                                    {/* Contact Info - Compact */}
                                    <div className='flex items-center gap-2 text-[9px] font-inter text-gray-500 dark:text-gray-400 mb-2 leading-tight'>
                                      <div className='flex items-center gap-1'>
                                        <svg
                                          className='w-2.5 h-2.5 text-gray-400 dark:text-gray-500 flex-shrink-0'
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
                                          className='w-2.5 h-2.5 text-gray-400 dark:text-gray-500 flex-shrink-0'
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
                                        <span className='truncate max-w-[90px]'>
                                          {member?.phone || 'SĐT không có'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Check-in/Check-out Button */}
                                    <div className='mt-2'>
                                      {getMemberCheckInButton(record, attendance, selectedSchedule)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className='text-center py-6'>
                    <div className='text-sm text-gray-500 dark:text-gray-400 font-inter mb-2'>
                      {selectedSchedule?.attendance && selectedSchedule.attendance.length > 0
                        ? 'Chưa có thành viên nào điểm danh'
                        : 'Chưa có thành viên nào đăng ký'}
                    </div>
                    <p className='text-xs font-inter text-gray-400 dark:text-gray-500'>
                      {selectedSchedule?.attendance && selectedSchedule.attendance.length > 0
                        ? 'Lớp học này chưa có thành viên nào điểm danh tham gia.'
                        : 'Lớp học này chưa có thành viên nào đăng ký tham gia.'}
                    </p>
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </AdminModal>

      {/* Create Schedule Modal */}
      <CreateScheduleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          // Close modal
          setShowCreateModal(false);
          
          // Show success message
          if (window.showToast) {
            window.showToast({
              type: 'success',
              message: 'Tạo lịch dạy thành công!',
              duration: 3000,
            });
          }
          
          // Note: No need to fetch schedules as the schedule requires at least 2 days in advance
          // When the user selects a date 2+ days from now, the schedules will be fetched automatically
        }}
        userId={userId}
      />
    </>
  );
}
