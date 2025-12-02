import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useToast } from '../../hooks/useToast';
import { scheduleService, ScheduleItem } from '../../services/schedule.service';
import { Calendar, Plus, Search, RefreshCw, Filter, Edit, Trash2, Clock, CheckCircle2, XCircle, AlertCircle, Users, Eye, X } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import AdminInput from '../../components/common/AdminInput';
import { AdminTable, AdminTableHeader, AdminTableBody, AdminTableRow, AdminTableCell } from '../../components/common/AdminTable';
import ScheduleFormModal from '../../components/modals/ScheduleFormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import BulkOperations from '../../components/common/BulkOperations';
import CustomSelect from '../../components/common/CustomSelect';
import { TableLoading } from '../../components/ui/AppLoading';
import ExportButton from '../../components/common/ExportButton';
import { formatVietnamDateTime } from '../../utils/dateTime';
import DatePicker from '../../components/common/DatePicker';

// Helper function to format date in Vietnam timezone
const formatDateVN = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// Helper function to format time in Vietnam timezone
const formatTimeVN = (dateTimeString: string): string => {
  const date = new Date(dateTimeString);
  return date.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const ScheduleManagement: React.FC = () => {
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classTypeFilter, setClassTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedSchedules, setSelectedSchedules] = useState<Set<string>>(new Set());
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [selectedScheduleForAction, setSelectedScheduleForAction] = useState<ScheduleItem | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSchedules();
  }, [statusFilter, dateFilter]);


  const loadSchedules = async () => {
    try {
      setIsLoading(true);
      
      // Build filters - backend expects from_date/to_date for date filtering
      const filters: any = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      
      // If date filter is set, use it as from_date (start of day)
      if (dateFilter) {
        filters.from_date = dateFilter;
        filters.to_date = dateFilter; // Same day
      }
      
      const response = await scheduleService.getAllSchedules(filters);
      
      console.log('[DATE] ScheduleManagement - getAllSchedules response:', response);
      console.log('[DATE] Response data type:', typeof response.data);
      console.log('[DATE] Response data:', response.data);
      
      if (response.success && response.data) {
        // Handle different response structures
        let schedulesList: ScheduleItem[] = [];
        
        if (Array.isArray(response.data)) {
          // Direct array response
          schedulesList = response.data;
          console.log('[DATE] Using direct array format');
        } else if (response.data && typeof response.data === 'object') {
          // Backend returns: { data: { schedules: [...], pagination: {...} } }
          const data = response.data as any;
          
          // Try different possible structures
          if (data.schedules && Array.isArray(data.schedules)) {
            schedulesList = data.schedules;
            console.log('[DATE] Using data.schedules format');
          } else if (data.data?.schedules && Array.isArray(data.data.schedules)) {
            schedulesList = data.data.schedules;
            console.log('[DATE] Using data.data.schedules format');
          } else {
            console.warn('[WARNING] Unknown response structure:', data);
            schedulesList = [];
          }
        }
        
        // Transform schedules to include class_name and room_name from nested objects
        // Also format start_time and end_time in Vietnam timezone
        const transformedSchedules = schedulesList.map((schedule: any) => {
          // Format time in Vietnam timezone if it's a datetime string
          let startTime = schedule.start_time;
          let endTime = schedule.end_time;
          
          if (startTime && startTime.includes('T')) {
            // Convert to Vietnam timezone
            startTime = formatTimeVN(startTime);
          }
          
          if (endTime && endTime.includes('T')) {
            // Convert to Vietnam timezone
            endTime = formatTimeVN(endTime);
          }
          
          return {
            ...schedule,
            class_name: schedule.gym_class?.name || schedule.class_name || 'Unknown Class',
            room_name: schedule.room?.name || schedule.room_name || 'Unknown Room',
            start_time: startTime,
            end_time: endTime,
          };
        });
        
        console.log('[DATE] Extracted schedules:', transformedSchedules.length, 'schedules');
        if (transformedSchedules.length > 0) {
          console.log('[DATE] First schedule sample:', transformedSchedules[0]);
        }
        setSchedules(transformedSchedules);
      } else {
        console.warn('[WARNING] getAllSchedules response not successful:', response);
        setSchedules([]);
      }
    } catch (error: any) {
      showToast('Không thể tải danh sách lịch tập', 'error');
      console.error('[ERROR] Error loading schedules:', error);
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'IN_PROGRESS':
        return 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800';
      case 'COMPLETED':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      case 'CANCELLED':
        return 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300 border-error-200 dark:border-error-800';
      case 'POSTPONED':
        return 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300 border-warning-200 dark:border-warning-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      SCHEDULED: 'Đã lên lịch',
      IN_PROGRESS: 'Đang diễn ra',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
      POSTPONED: 'Hoãn lại',
    };
    return statusMap[status] || status;
  };

  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      // Search filter
    const matchesSearch =
        !searchTerm ||
      schedule.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.room_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus =
        statusFilter === 'all' || schedule.status === statusFilter;
      
      // Class type filter
      const matchesClassType =
        classTypeFilter === 'all' ||
        schedule.gym_class?.category === classTypeFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateFilter) {
        const scheduleDate = new Date(schedule.date);
        const filterDate = new Date(dateFilter);
        matchesDate =
          scheduleDate.getFullYear() === filterDate.getFullYear() &&
          scheduleDate.getMonth() === filterDate.getMonth() &&
          scheduleDate.getDate() === filterDate.getDate();
      }
      
      return matchesSearch && matchesStatus && matchesClassType && matchesDate;
    });
  }, [schedules, searchTerm, statusFilter, classTypeFilter, dateFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalSchedules = filteredSchedules.length;
    const scheduled = filteredSchedules.filter(s => s.status === 'SCHEDULED').length;
    const inProgress = filteredSchedules.filter(s => s.status === 'IN_PROGRESS').length;
    const completed = filteredSchedules.filter(s => s.status === 'COMPLETED').length;
    const cancelled = filteredSchedules.filter(s => s.status === 'CANCELLED').length;
    
    return {
      totalSchedules,
      scheduled,
      inProgress,
      completed,
      cancelled,
    };
  }, [filteredSchedules]);

  // Prepare export data
  const getExportData = useCallback(() => {
    const exportSchedules = filteredSchedules.length > 0 ? filteredSchedules : schedules;
    
    return exportSchedules.map(schedule => ({
      'Lớp học': schedule.class_name || schedule.gym_class?.name || 'N/A',
      'Phòng': schedule.room_name || schedule.room?.name || 'N/A',
      'Ngày': schedule.date ? formatVietnamDateTime(schedule.date, 'date') : 'N/A',
      'Giờ bắt đầu': schedule.start_time ? formatVietnamDateTime(schedule.start_time, 'time') : 'N/A',
      'Giờ kết thúc': schedule.end_time ? formatVietnamDateTime(schedule.end_time, 'time') : 'N/A',
      'Trạng thái': getStatusText(schedule.status || ''),
      'Sức chứa': schedule.max_capacity || 0,
      'Đã đặt': schedule.current_bookings || 0,
      'Huấn luyện viên': schedule.trainer?.full_name || 'N/A',
      'Giá': schedule.price_override || schedule.price || 0,
      'Ghi chú': schedule.special_notes || 'N/A',
      'Ngày tạo': schedule.created_at ? formatVietnamDateTime(schedule.created_at, 'datetime') : 'N/A',
    }));
  }, [filteredSchedules, schedules]);

  // Export columns definition
  const exportColumns = [
    { key: 'Lớp học', label: 'Lớp học' },
    { key: 'Phòng', label: 'Phòng' },
    { key: 'Ngày', label: 'Ngày' },
    { key: 'Giờ bắt đầu', label: 'Giờ bắt đầu' },
    { key: 'Giờ kết thúc', label: 'Giờ kết thúc' },
    { key: 'Trạng thái', label: 'Trạng thái' },
    { key: 'Sức chứa', label: 'Sức chứa' },
    { key: 'Đã đặt', label: 'Đã đặt' },
    { key: 'Huấn luyện viên', label: 'Huấn luyện viên' },
    { key: 'Giá', label: 'Giá' },
    { key: 'Ghi chú', label: 'Ghi chú' },
    { key: 'Ngày tạo', label: 'Ngày tạo' },
  ];

  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);
  const paginatedSchedules = filteredSchedules.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCreate = () => {
    setSelectedSchedule(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (schedule: ScheduleItem) => {
    setSelectedSchedule(schedule);
    setIsFormModalOpen(true);
  };

  const handleDelete = async () => {
    if (!scheduleToDelete) return;

    setIsDeleting(true);
    try {
      await scheduleService.deleteSchedule(scheduleToDelete.id);
      showToast('Xóa lịch tập thành công', 'success');
      await loadSchedules();
      setIsDeleteDialogOpen(false);
      setScheduleToDelete(null);
    } catch (error: any) {
      showToast(error.message || 'Không thể xóa lịch tập', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedSchedules.size === 0) return;
    setScheduleToDelete({ id: Array.from(selectedSchedules)[0] } as ScheduleItem);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async (data: Partial<ScheduleItem>) => {
    try {
      if (selectedSchedule) {
        await scheduleService.updateSchedule(selectedSchedule.id, data);
        showToast('Cập nhật lịch tập thành công', 'success');
      } else {
        await scheduleService.createSchedule(data as any);
        showToast('Tạo lịch tập thành công', 'success');
      }
      await loadSchedules();
      setIsFormModalOpen(false);
      setSelectedSchedule(null);
    } catch (error: any) {
      showToast(error.message || 'Không thể lưu lịch tập', 'error');
      throw error;
    }
  };

  const handleSelectAll = () => {
    const allIds = new Set(filteredSchedules.map(s => s.id));
    const allSelected = selectedSchedules.size === filteredSchedules.length && filteredSchedules.length > 0;
    
    if (allSelected) {
      // Bỏ chọn tất cả
      setSelectedSchedules(new Set());
      setAnimatingItems(new Set());
    } else {
      // Chọn tất cả
    setSelectedSchedules(allIds);
      // Trigger animation for all items
      setAnimatingItems(new Set(allIds));
      setTimeout(() => setAnimatingItems(new Set()), 300);
    }
  };

  const handleDeselectAll = () => {
    setSelectedSchedules(new Set());
    setAnimatingItems(new Set());
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedSchedules);
    if (newSelected.has(id)) {
      newSelected.delete(id);
      setAnimatingItems(new Set());
    } else {
      newSelected.add(id);
      // Trigger animation for this item
      setAnimatingItems(new Set([id]));
      setTimeout(() => setAnimatingItems(new Set()), 300);
    }
    setSelectedSchedules(newSelected);
  };

  const STATUS_OPTIONS = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'SCHEDULED', label: 'Đã lên lịch' },
    { value: 'IN_PROGRESS', label: 'Đang diễn ra' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy' },
    { value: 'POSTPONED', label: 'Hoãn lại' },
  ];

  const CLASS_TYPE_OPTIONS = [
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
  ];

  return (
    <>
      {/* Custom styles for compact datepicker with orange theme */}
      <style>{`
        /* Compact datepicker for filter */
        .flatpickr-calendar {
          font-size: 12px !important;
          width: auto !important;
          padding: 8px !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
          border: 1px solid #e5e7eb !important;
        }
        .flatpickr-months {
          margin-bottom: 4px !important;
        }
        .flatpickr-current-month {
          font-size: 13px !important;
          padding: 4px 0 !important;
        }
        .flatpickr-current-month .flatpickr-monthDropdown-months {
          font-size: 13px !important;
          padding: 2px 4px !important;
          color: #374151 !important;
        }
        .flatpickr-current-month input.cur-year {
          font-size: 13px !important;
          padding: 2px 4px !important;
          color: #374151 !important;
        }
        .flatpickr-weekdays {
          margin-top: 4px !important;
          margin-bottom: 2px !important;
        }
        .flatpickr-weekday {
          font-size: 11px !important;
          font-weight: 600 !important;
          padding: 4px 0 !important;
          color: #6b7280 !important;
        }
        .flatpickr-days {
          margin-top: 4px !important;
        }
        .flatpickr-day {
          font-size: 12px !important;
          height: 28px !important;
          line-height: 28px !important;
          width: 28px !important;
          margin: 2px !important;
          border-radius: 6px !important;
          color: #374151 !important;
          transition: all 0.2s !important;
        }
        .flatpickr-day:hover {
          background: #fef3c7 !important;
          border-color: #f97316 !important;
          color: #f97316 !important;
        }
        .flatpickr-day.selected,
        .flatpickr-day.startRange,
        .flatpickr-day.endRange {
          background: #f97316 !important;
          border-color: #f97316 !important;
          color: #ffffff !important;
          font-weight: 600 !important;
        }
        .flatpickr-day.selected:hover,
        .flatpickr-day.startRange:hover,
        .flatpickr-day.endRange:hover {
          background: #ea580c !important;
          border-color: #ea580c !important;
        }
        .flatpickr-day.today {
          border-color: #f97316 !important;
          color: #f97316 !important;
          font-weight: 600 !important;
        }
        .flatpickr-day.today:hover {
          background: #fef3c7 !important;
        }
        .flatpickr-day.flatpickr-disabled,
        .flatpickr-day.prevMonthDay,
        .flatpickr-day.nextMonthDay {
          color: #d1d5db !important;
        }
        .flatpickr-day.flatpickr-disabled:hover {
          background: transparent !important;
          border-color: transparent !important;
        }
        /* Hide navigation arrows */
        .flatpickr-prev-month,
        .flatpickr-next-month {
          display: none !important;
        }
        /* Dark mode support */
        .dark .flatpickr-calendar {
          background: #1f2937 !important;
          border-color: #374151 !important;
        }
        .dark .flatpickr-current-month .flatpickr-monthDropdown-months,
        .dark .flatpickr-current-month input.cur-year {
          color: #f3f4f6 !important;
        }
        .dark .flatpickr-weekday {
          color: #9ca3af !important;
        }
        .dark .flatpickr-day {
          color: #f3f4f6 !important;
        }
        .dark .flatpickr-day:hover {
          background: #7c2d12 !important;
          border-color: #f97316 !important;
          color: #f97316 !important;
        }
        .dark .flatpickr-day.selected,
        .dark .flatpickr-day.startRange,
        .dark .flatpickr-day.endRange {
          background: #f97316 !important;
          border-color: #f97316 !important;
          color: #ffffff !important;
        }
        .dark .flatpickr-day.today {
          border-color: #f97316 !important;
          color: #f97316 !important;
        }
        .dark .flatpickr-day.flatpickr-disabled,
        .dark .flatpickr-day.prevMonthDay,
        .dark .flatpickr-day.nextMonthDay {
          color: #4b5563 !important;
        }
      `}</style>
      <div className='p-3 space-y-3'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold font-heading text-gray-900 dark:text-white'>
            Quản lý Lịch tập
          </h1>
          <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
            Quản lý lịch tập và booking của thành viên
          </p>
        </div>
        <div className='flex gap-2 flex-wrap'>
          <button
            onClick={loadSchedules}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
          >
            <RefreshCw className='w-4 h-4' />
            Làm mới
          </button>
          {filteredSchedules.length > 0 && (
            <ExportButton
              data={getExportData()}
              columns={exportColumns}
              filename='danh-sach-lich-tap'
              title='Danh sách Lịch tập'
              variant='outline'
              size='sm'
            />
          )}
          <button
            onClick={handleCreate}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
          >
            <Plus className='w-4 h-4' />
            Tạo lịch mới
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3'>
        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                <Calendar className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.totalSchedules}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Tổng lịch tập
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                <Clock className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.scheduled}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Đã lên lịch
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                <CheckCircle2 className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.inProgress}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Đang diễn ra
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                <CheckCircle2 className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.completed}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Hoàn thành
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-error-100 dark:bg-error-900/30 opacity-5 rounded-bl-3xl'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-error-100 dark:bg-error-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-error-100 dark:bg-error-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                <XCircle className='relative w-[18px] h-[18px] text-error-600 dark:text-error-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.cancelled}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Đã hủy
                </div>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Search and Filters */}
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md p-4'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3'>
          {/* Search Input */}
          <div className='md:col-span-2 group relative'>
            <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
            <input
              type='text'
            placeholder='Tìm kiếm lớp học, phòng...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
              className='w-full py-2 pl-9 pr-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            />
          </div>

          {/* Status Filter */}
          <div>
            <CustomSelect
              options={STATUS_OPTIONS}
            value={statusFilter}
              onChange={setStatusFilter}
              placeholder='Tất cả trạng thái'
              className='font-inter'
            />
          </div>

          {/* Class Type Filter */}
          <div>
            <CustomSelect
              options={CLASS_TYPE_OPTIONS}
              value={classTypeFilter}
              onChange={setClassTypeFilter}
              placeholder='Tất cả loại lớp'
              className='font-inter'
            />
          </div>

          {/* Date Filter */}
          <div className='relative'>
            <DatePicker
              value={dateFilter || undefined}
              onChange={(date) => {
                if (typeof date === 'string') {
                  setDateFilter(date);
                } else {
                  setDateFilter('');
                }
              }}
              placeholder='dd/mm/yyyy'
              mode='single'
            />
            {dateFilter && (
              <button
                type='button'
                onClick={() => {
                  setDateFilter('');
                }}
                className='absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-orange-500 dark:hover:text-orange-400 transition-colors duration-200 z-10'
                title='Xóa bộ lọc ngày'
              >
                <X className='w-3.5 h-3.5' />
              </button>
            )}
          </div>
        </div>
        </div>

      {/* Schedules List */}
      {isLoading ? (
        <TableLoading text='Đang tải danh sách lịch tập...' />
      ) : filteredSchedules.length === 0 ? (
        <AdminCard>
          <div className='text-center py-12 text-gray-500 dark:text-gray-400 font-inter'>
            <Calendar className='w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500' />
            <p className='text-theme-sm font-heading text-gray-700 dark:text-gray-300'>
            Không có lịch tập nào
            </p>
            <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-1'>
              Tạo lịch tập mới để bắt đầu
            </p>
          </div>
        </AdminCard>
      ) : (
        <>
          <AdminCard padding='none'>
            <BulkOperations
              selectedItems={Array.from(selectedSchedules)}
              totalItems={filteredSchedules.length}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onBulkDelete={selectedSchedules.size > 0 ? handleBulkDelete : undefined}
            />
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell header className='w-12'>
                    <input
                      type='checkbox'
                      checked={selectedSchedules.size === filteredSchedules.length && filteredSchedules.length > 0}
                      onChange={handleSelectAll}
                      className='w-4 h-4 rounded accent-orange-600 focus:ring-orange-500 dark:bg-gray-900 transition-all duration-200'
                    />
                  </AdminTableCell>
                  <AdminTableCell header>Lớp học</AdminTableCell>
                  <AdminTableCell header>Phòng</AdminTableCell>
                  <AdminTableCell header>Ngày giờ</AdminTableCell>
                  <AdminTableCell header>Số lượng</AdminTableCell>
                  <AdminTableCell header>Trạng thái</AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {paginatedSchedules.map((item, index) => {
                  const isSelected = selectedSchedules.has(item.id);
                  return (
                    <AdminTableRow
                      key={item.id}
                      className={`group relative border-l-4 border-l-transparent hover:border-l-orange-500 transition-all duration-200 cursor-pointer ${
                        index % 2 === 0
                          ? 'bg-white dark:bg-gray-900'
                          : 'bg-gray-50/50 dark:bg-gray-800/50'
                      } hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 dark:hover:from-orange-900/20 dark:hover:to-orange-800/10 ${
                        isSelected ? 'bg-orange-50/50 dark:bg-orange-900/10 border-l-orange-500' : ''
                      }`}
                      style={{
                        animation: animatingItems.has(item.id) ? 'selectHighlight 0.3s ease-out' : undefined,
                      }}
                      onClick={(e?: React.MouseEvent) => {
                        if (e) {
                          e.stopPropagation();
                          setSelectedScheduleForAction(item);
                          setMenuPosition({ x: e.clientX, y: e.clientY });
                          setActionMenuOpen(true);
                        }
                      }}
                    >
                    <AdminTableCell>
                      <input
                        type='checkbox'
                          checked={isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                          className='w-4 h-4 rounded accent-orange-600 focus:ring-orange-500 dark:bg-gray-900 transition-all duration-200'
                          onClick={e => e.stopPropagation()}
                      />
                    </AdminTableCell>
                      <AdminTableCell className='overflow-hidden'>
                        <div className='min-w-0 flex-1'>
                          <div className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200'>
                            {item.class_name}
                          </div>
                          {item.gym_class?.category && (
                            <div className='text-[10px] text-gray-500 dark:text-gray-400 font-inter mt-0.5 line-clamp-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200'>
                              {item.gym_class.category}
                            </div>
                          )}
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className='text-theme-xs font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                          {item.room_name}
                        </span>
                      </AdminTableCell>
                    <AdminTableCell>
                        <div className='flex items-center gap-1.5'>
                          <Calendar className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200' />
                          <span className='text-theme-xs font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                            {formatDateVN(item.date)}
                          </span>
                      </div>
                        <div className='flex items-center gap-1.5 mt-0.5'>
                          <Clock className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200' />
                          <span className='text-theme-xs font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                        {item.start_time} - {item.end_time}
                          </span>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                        <div className='flex items-center gap-1.5'>
                          <Users className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200' />
                          <span className='text-theme-xs font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                        {item.current_bookings || 0} / {item.max_capacity}
                          </span>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                        <span className={`px-2.5 py-1 inline-flex text-theme-xs font-semibold font-heading rounded-full border transition-all duration-200 group-hover:scale-105 ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </AdminTableCell>
                  </AdminTableRow>
                  );
                })}
              </AdminTableBody>
            </AdminTable>
          </AdminCard>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredSchedules.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setItemsPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
            />
          )}
        </>
      )}

      {/* Form Modal */}
      <ScheduleFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedSchedule(null);
        }}
        onSave={handleSave}
        schedule={selectedSchedule}
      />

      {/* Action Menu Popup */}
      {actionMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 z-40'
            onClick={() => {
              setActionMenuOpen(false);
              setSelectedScheduleForAction(null);
            }}
          />
          {/* Popup */}
          <div
            className='fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl py-2 w-[180px]'
            style={{
              left: `${Math.min(menuPosition.x, window.innerWidth - 200)}px`,
              top: `${Math.min(menuPosition.y + 10, window.innerHeight - 150)}px`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className='px-3 py-2 border-b border-gray-200 dark:border-gray-800'>
              <p className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white truncate max-w-[200px]' style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {selectedScheduleForAction?.class_name}
              </p>
            </div>
            <div className='py-1'>
              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  handleEdit(selectedScheduleForAction!);
                }}
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150 min-h-[36px]'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                <Edit className='w-3.5 h-3.5 flex-shrink-0' />
                <span>Sửa</span>
              </button>
              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  setScheduleToDelete(selectedScheduleForAction);
                  setIsDeleteDialogOpen(true);
                }}
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-theme-xs font-semibold font-heading text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors duration-150 min-h-[36px]'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                <Trash2 className='w-3.5 h-3.5 flex-shrink-0' />
                <span>Xóa</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setScheduleToDelete(null);
        }}
        onConfirm={handleDelete}
        title='Xác nhận xóa lịch tập'
        message={`Bạn có chắc chắn muốn xóa lịch tập "${scheduleToDelete?.class_name}"? Hành động này không thể hoàn tác.`}
        confirmText='Xóa'
        cancelText='Hủy'
        variant='danger'
        isLoading={isDeleting}
      />
    </div>
    </>
  );
};

export default ScheduleManagement;
