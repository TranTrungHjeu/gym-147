import { EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CustomSelect from '../../components/common/CustomSelect';
import Button from '../../components/ui/Button/Button';
// Removed SVG icon imports - using colored dots instead
import EventDetailsModal from '../../components/modals/EventDetailsModal';
import { CalendarEvent, scheduleService } from '../../services/schedule.service';

// Import Vietnamese locale
import viLocale from '@fullcalendar/core/locales/vi';

export default function TrainerCalendarSplitView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [filters, setFilters] = useState({
    status: '',
    classType: '',
    room: '',
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Database data for filter options - will be updated from API
  const [classTypes, setClassTypes] = useState<string[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const [statuses] = useState([
    { value: 'SCHEDULED', label: 'Đã lên lịch' },
    { value: 'IN_PROGRESS', label: 'Đang diễn ra' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy' },
  ]);

  // Memoized filtered events - chỉ tính lại khi events hoặc filters thay đổi
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesStatus = !filters.status || event.status === filters.status;
      const matchesClassType =
        !filters.classType ||
        event.class_name?.toLowerCase().includes(filters.classType.toLowerCase());

      // Room matching with multiple strategies
      let matchesRoom = true;
      if (filters.room) {
        const filterRoom = filters.room.toLowerCase().trim();
        const eventRoom = (event.room || '').toLowerCase().trim();

        // Try exact match first
        matchesRoom = eventRoom === filterRoom;

        // If no exact match, try contains
        if (!matchesRoom) {
          matchesRoom = eventRoom.includes(filterRoom) || filterRoom.includes(eventRoom);
        }

        // If still no match, try partial matching (remove spaces, special chars)
        if (!matchesRoom) {
          const cleanFilterRoom = filterRoom.replace(/[^a-z0-9]/g, '');
          const cleanEventRoom = eventRoom.replace(/[^a-z0-9]/g, '');
          matchesRoom =
            cleanEventRoom.includes(cleanFilterRoom) || cleanFilterRoom.includes(cleanEventRoom);
        }
      }

      return matchesStatus && matchesClassType && matchesRoom;
    });
  }, [events, filters]);

  // Memoized statistics
  const statistics = useMemo(() => {
    const total = filteredEvents.length;
    const scheduled = filteredEvents.filter(e => e.status === 'SCHEDULED').length;
    const inProgress = filteredEvents.filter(e => e.status === 'IN_PROGRESS').length;
    const completed = filteredEvents.filter(e => e.status === 'COMPLETED').length;
    const cancelled = filteredEvents.filter(e => e.status === 'CANCELLED').length;

    return { total, scheduled, inProgress, completed, cancelled };
  }, [filteredEvents]);

  useEffect(() => {
    fetchEvents();
  }, [currentDate, viewMode, filters]);

  // Reset initial load flag when date or view mode changes
  useEffect(() => {
    setIsInitialLoad(true);
  }, [currentDate, viewMode]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Handle filter loading when filters change
  useEffect(() => {
    if (filters.status || filters.classType || filters.room) {
      setFilterLoading(true);
      const timer = setTimeout(() => {
        setFilterLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [filters]);

  // Fetch filter options from database
  const fetchFilterOptions = async () => {
    try {
      // Fetch class types
      const classTypesResponse = await scheduleService.getTrainerClasses();
      console.log('📚 Class types response:', classTypesResponse);

      // Handle different response structures
      let classTypesData = [];
      if (classTypesResponse && classTypesResponse.data && Array.isArray(classTypesResponse.data)) {
        classTypesData = classTypesResponse.data;
      } else if (classTypesResponse && Array.isArray(classTypesResponse)) {
        classTypesData = classTypesResponse;
      }

      if (Array.isArray(classTypesData) && classTypesData.length > 0) {
        const uniqueClassTypes = [
          ...new Set(
            classTypesData
              .map((cls: any) => cls.class_type || cls.class_name || cls.name || cls.title)
              .filter(Boolean)
          ),
        ];
        console.log('✅ Unique class types found:', uniqueClassTypes);
        if (uniqueClassTypes.length > 0) {
          setClassTypes(uniqueClassTypes);
        } else {
          setClassTypes([]);
          console.warn('⚠️ No class types found');
        }
      } else {
        console.warn('⚠️ No class types data from API');
        setClassTypes([]);
      }

      // Fetch rooms directly from /rooms API
      const roomsResponse = await scheduleService.getAllRooms();
      console.log('🏠 Rooms API response:', roomsResponse);

      // Handle response structure: { success, data: { rooms: [...] } }
      let roomsData = [];
      if (roomsResponse?.success && roomsResponse?.data?.rooms) {
        roomsData = roomsResponse.data.rooms;
      } else if (roomsResponse?.data && Array.isArray(roomsResponse.data)) {
        roomsData = roomsResponse.data;
      } else if (Array.isArray(roomsResponse)) {
        roomsData = roomsResponse;
      }

      if (Array.isArray(roomsData) && roomsData.length > 0) {
        // Extract room names from Room objects
        const roomNames = roomsData.map((room: any) => room.name).filter(Boolean);
        console.log('✅ Rooms found from API:', roomNames);
        if (roomNames.length > 0) {
          setRooms(roomNames);
        } else {
          setRooms([]);
          console.warn('⚠️ No room names found');
        }
      } else {
        console.warn('⚠️ No rooms data from API');
        setRooms([]);
      }
    } catch (error) {
      console.error('❌ Error fetching filter options:', error);
      setClassTypes([]);
      setRooms([]);
    }
  };

  // Helper functions for icons
  const getClassTypeIcon = (classType: string) => {
    const iconMap: Record<string, string> = {
      Yoga: 'Y',
      Pilates: 'P',
      Dance: 'D',
      'Martial Arts': 'M',
      Strength: 'S',
      Functional: 'F',
      Recovery: 'R',
      Specialized: 'SP',
    };
    return iconMap[classType] || 'G';
  };

  const getRoomIcon = (room: string) => {
    if (room.includes('VIP')) return 'VIP';
    if (room.includes('Studio')) return 'ST';
    if (room.includes('ngoài trời') || room.includes('Ngoài trời')) return 'OUT';
    return 'RM';
  };

  const fetchEvents = async () => {
    try {
      // Only set main loading for initial load, not for filter changes
      if (isInitialLoad) {
        setLoading(true);
      }

      // Debug logging
      console.log('Fetching events with:', {
        currentDate: currentDate.toISOString(),
        viewMode,
        filters,
        dateRange: getDateRangeInfo(),
        isInitialLoad,
      });

      const response = await scheduleService.getTrainerCalendar(currentDate, viewMode, filters);

      if (response.success) {
        console.log('Received events:', response.data.length);
        console.log('Sample event:', response.data[0]);
        setEvents(response.data);
        // filteredEvents will be computed automatically via useMemo
      } else {
        throw new Error(response.message || 'Lỗi tải lịch dạy');
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi tải lịch dạy',
          duration: 3000,
        });
      }
    } finally {
      // Only set main loading false if it was set to true
      if (isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false); // Mark as no longer initial load
      }
    }
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: { [key: string]: string } = {
      SCHEDULED: 'Đã lên lịch',
      IN_PROGRESS: 'Đang diễn ra',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
    };
    return statusLabels[status] || status;
  };

  const getStatusClass = (status: string) => {
    const statusClasses: { [key: string]: string } = {
      SCHEDULED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      SCHEDULED: '#2563EB', // blue-600 - darker for better contrast
      IN_PROGRESS: '#059669', // green-600 - darker for better contrast
      COMPLETED: '#374151', // gray-700 - darker for better contrast
      CANCELLED: '#DC2626', // red-600 - darker for better contrast
    };
    return statusColors[status] || '#2563EB';
  };

  const handlePrevNext = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'month') {
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      } else if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      } else {
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
      }
      return newDate;
    });
  };

  const formatHeaderDate = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' });
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      })} - ${endOfWeek.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })}`;
    } else {
      return currentDate.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  const getDateRangeInfo = () => {
    if (viewMode === 'month') {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      return `${startOfMonth.toLocaleDateString('vi-VN')} - ${endOfMonth.toLocaleDateString(
        'vi-VN'
      )}`;
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('vi-VN')} - ${endOfWeek.toLocaleDateString(
        'vi-VN'
      )}`;
    } else {
      return currentDate.toLocaleDateString('vi-VN');
    }
  };

  const clearFilters = useCallback(() => {
    setFilters({ status: '', classType: '', room: '' });
    // filteredEvents will auto-reset via useMemo when filters cleared
  }, []);

  const handleEventClick = useCallback(
    (clickInfo: EventClickArg) => {
      const eventId = clickInfo.event.id;
      const event = events.find(e => e.id === eventId);
      if (event) {
        setSelectedEvent(event);
        setIsDetailModalOpen(true);
      }
    },
    [events]
  );

  const handleDetailClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  }, []);

  const handleAttendanceClick = useCallback(() => {
    if (selectedEvent) {
      // TODO: Implement attendance functionality
      if (window.showToast) {
        window.showToast({
          type: 'info',
          message: 'Chức năng điểm danh đang được phát triển',
          duration: 3000,
        });
      }
    }
  }, [selectedEvent]);

  // Memoized FullCalendar events - chỉ tính lại khi events hoặc filteredEvents thay đổi
  const fullCalendarEvents: EventInput[] = useMemo(() => {
    return events.map(event => {
      const isFiltered = filteredEvents.some(filteredEvent => filteredEvent.id === event.id);
      return {
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        backgroundColor: getStatusColor(event.status),
        borderColor: getStatusColor(event.status),
        textColor: '#ffffff',
        classNames: [
          `event-${event.status.toLowerCase()}`,
          isFiltered ? 'filtered-event' : 'unfiltered-event',
        ],
        extendedProps: {
          status: event.status,
          class_name: event.class_name,
          room: event.room,
          attendees: event.attendees,
          max_capacity: event.max_capacity,
          isFiltered: isFiltered,
        },
      };
    });
  }, [events, filteredEvents]);

  if (loading) {
    return (
      <div className='p-4 space-y-6 animate-pulse'>
        {/* Header Skeleton */}
        <div className='flex items-center justify-between'>
          <div className='space-y-2'>
            <div className='h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg'></div>
            <div className='h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded'></div>
          </div>
          <div className='flex gap-2'>
            <div className='h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg'></div>
            <div className='h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg'></div>
          </div>
        </div>

        {/* Filters Skeleton */}
        <div className='bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-3'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
            <div className='h-10 bg-gray-200 dark:bg-gray-700 rounded-lg'></div>
            <div className='h-10 bg-gray-200 dark:bg-gray-700 rounded-lg'></div>
            <div className='h-10 bg-gray-200 dark:bg-gray-700 rounded-lg'></div>
            <div className='h-10 bg-gray-200 dark:bg-gray-700 rounded-lg'></div>
          </div>
        </div>

        {/* Calendar & Events Skeleton */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6'>
          {/* Calendar Skeleton */}
          <div className='lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4'>
            <div className='h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg'></div>
          </div>

          {/* Events List Skeleton */}
          <div className='lg:col-span-1 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4'>
            <div className='h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4'></div>
            <div className='space-y-3'>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className='h-24 bg-gray-100 dark:bg-gray-800 rounded-lg'></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className='p-4'
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Header */}
      <motion.div
        className='mb-6'
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className='flex items-start justify-between mb-4'>
          <div>
            <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
              Lịch dạy của tôi
            </h1>
            <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
              Xem và quản lý lịch dạy của bạn
            </p>
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
              className='text-theme-xs font-semibold font-heading'
            >
              Xuất lịch
            </Button>
            <Button
              size='sm'
              variant='primary'
              onClick={() => {
                if (window.showToast) {
                  window.showToast({
                    type: 'info',
                    message: 'Chức năng tạo lịch mới đang được phát triển',
                    duration: 3000,
                  });
                }
              }}
              className='text-theme-xs font-semibold font-heading'
            >
              Tạo lịch mới
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <div className='bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-3'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
            {/* Status Filter */}
            <div>
              <CustomSelect
                options={[
                  { value: '', label: 'Tất cả trạng thái' },
                  ...statuses.map(status => ({
                    value: status.value,
                    label: status.label,
                  })),
                ]}
                value={filters.status}
                onChange={value => setFilters(prev => ({ ...prev, status: value }))}
                placeholder='Tất cả trạng thái'
                className='font-inter'
              />
            </div>

            {/* Class Type Filter */}
            <div>
              <CustomSelect
                options={
                  classTypes.length === 0
                    ? [{ value: '', label: 'Không có loại lớp' }]
                    : [
                        { value: '', label: 'Tất cả loại lớp' },
                        ...classTypes.map(classType => ({
                          value: classType,
                          label: classType,
                        })),
                      ]
                }
                value={filters.classType}
                onChange={value => setFilters(prev => ({ ...prev, classType: value }))}
                placeholder={classTypes.length === 0 ? 'Không có loại lớp' : 'Tất cả loại lớp'}
                className='font-inter'
                disabled={classTypes.length === 0}
              />
            </div>

            {/* Room Filter */}
            <div>
              <CustomSelect
                options={
                  rooms.length === 0
                    ? [{ value: '', label: 'Không có phòng tập' }]
                    : [
                        { value: '', label: 'Tất cả phòng' },
                        ...rooms.map(room => ({
                          value: room,
                          label: room,
                        })),
                      ]
                }
                value={filters.room}
                onChange={value => setFilters(prev => ({ ...prev, room: value }))}
                placeholder={rooms.length === 0 ? 'Không có phòng tập' : 'Tất cả phòng'}
                className='font-inter'
                disabled={rooms.length === 0}
              />
            </div>

            {/* Clear Button */}
            <div>
              <Button
                size='sm'
                variant='outline'
                onClick={clearFilters}
                className='w-full text-theme-xs font-semibold font-heading h-full'
              >
                Xóa bộ lọc
              </Button>
            </div>
          </div>

          {/* Status Legend */}
          <div className='mt-3 pt-3 border-t border-gray-200 dark:border-gray-700'>
            <div className='flex flex-wrap items-center gap-3'>
              <span className='text-xs font-medium text-gray-600 dark:text-gray-400 font-inter'>
                Chú giải:
              </span>
              <div className='flex items-center gap-1'>
                <span className='w-3 h-3 rounded-full bg-blue-500'></span>
                <span className='text-xs text-gray-700 dark:text-gray-300 font-inter'>
                  Đã lên lịch ({statistics.scheduled})
                </span>
              </div>
              <div className='flex items-center gap-1'>
                <span className='w-3 h-3 rounded-full bg-yellow-500'></span>
                <span className='text-xs text-gray-700 dark:text-gray-300 font-inter'>
                  Đang diễn ra ({statistics.inProgress})
                </span>
              </div>
              <div className='flex items-center gap-1'>
                <span className='w-3 h-3 rounded-full bg-green-500'></span>
                <span className='text-xs text-gray-700 dark:text-gray-300 font-inter'>
                  Hoàn thành ({statistics.completed})
                </span>
              </div>
              <div className='flex items-center gap-1'>
                <span className='w-3 h-3 rounded-full bg-red-500'></span>
                <span className='text-xs text-gray-700 dark:text-gray-300 font-inter'>
                  Đã hủy ({statistics.cancelled})
                </span>
              </div>
              <div className='ml-auto text-xs font-semibold text-gray-900 dark:text-white font-inter'>
                Tổng: {statistics.total} lịch
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Split View */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6'>
        {/* Calendar View */}
        <div className='lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 relative overflow-x-hidden'>
          {/* Calendar Loading Overlay */}
          {filterLoading && (
            <div className='absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg'>
              <div className='w-10 h-10 border-4 border-orange-200 dark:border-orange-800 border-t-orange-600 dark:border-t-orange-400 rounded-full animate-spin'></div>
              <p className='mt-3 text-sm text-gray-700 dark:text-gray-300 font-inter font-medium'>
                Đang lọc...
              </p>
            </div>
          )}
          <div className='custom-calendar'>
            <style>{`
              .fc-event {
                border: none !important;
                background: transparent !important;
                box-shadow: none !important;
                position: relative !important;
                overflow: visible !important;
                height: 20px !important;
                width: 20px !important;
                margin: 0 !important;
                padding: 0 !important;
                font-size: 10px !important;
              }
              .fc-event:hover {
                transform: none !important;
                box-shadow: none !important;
                z-index: 10 !important;
              }
              .fc-event-scheduled {
                background-color: transparent !important;
                border-color: transparent !important;
              }
              .fc-event-in_progress {
                background-color: transparent !important;
                border-color: transparent !important;
              }
              .fc-event-completed {
                background-color: transparent !important;
                border-color: transparent !important;
              }
              .fc-event-cancelled {
                background-color: transparent !important;
                border-color: transparent !important;
              }
              .fc-daygrid-event {
                margin: 0 !important;
                height: 20px !important;
                width: 20px !important;
              }
              .fc-daygrid-dot-event {
                height: 20px !important;
                width: 20px !important;
                margin: 0 !important;
                padding: 0 !important;
                min-height: 20px !important;
                min-width: 20px !important;
              }
              .fc-event-main {
                padding: 0 !important;
                margin: 0 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                height: 20px !important;
                width: 20px !important;
                min-height: 20px !important;
                min-width: 20px !important;
                overflow: visible !important;
              }
              .fc-event .group {
                width: 20px !important;
                height: 20px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 10px !important;
                font-weight: 600 !important;
              }
              .fc-event .group:hover .tooltip {
                opacity: 1 !important;
                visibility: visible !important;
              }
              .tooltip {
                position: absolute !important;
                z-index: 1000 !important;
                pointer-events: none !important;
              }
              /* Tooltip positioning */
              .fc-event .group:hover {
                z-index: 10 !important;
                position: relative !important;
              }
              /* Ensure FullCalendar allows overflow */
              .fc {
                overflow: visible !important;
              }
              .fc-view-harness {
                overflow: visible !important;
              }
              .fc-scroller {
                overflow: visible !important;
              }
              .fc {
                font-size: 10px !important;
              }
              .fc-daygrid-day-number {
                font-size: 12px !important;
                font-weight: 600 !important;
              }
              .fc-toolbar-title {
                font-size: 16px !important;
                font-weight: 700 !important;
              }
              .fc-button {
                font-size: 11px !important;
                padding: 4px 8px !important;
                font-weight: 500 !important;
              }
              /* Override CSS variables */
              .fc-col-header-cell,
              .fc-col-header-cell-cushion {
                --text-sm: 9px !important;
                font-size: 10px !important;
                font-weight: 500 !important;
              }
              .fc .fc-timegrid-axis-cushion {
                font-size: 8px !important;
                font-family: 'Space Grotesk', sans-serif !important;
                line-height: 1.1 !important;
              }
              
              /* Apply Space Grotesk font to all calendar text */
              .fc,
              .fc *,
              .fc-toolbar,
              .fc-toolbar-title,
              .fc-button,
              .fc-col-header-cell,
              .fc-daygrid-day-number,
              .fc-event,
              .fc-event-title,
              .fc-event-time {
                font-family: 'Space Grotesk', sans-serif !important;
              }
              
              /* ========== WEEK/DAY VIEW - COMPACT HEIGHT ========== */
              
              /* Giảm slot height (mỗi 30 phút) */
              .fc-timegrid-slot {
                height: 30px !important;
                min-height: 30px !important;
              }
              
              /* Giảm time axis width */
              .fc-timegrid-axis {
                width: 36px !important;
                min-width: 36px !important;
              }
              
              /* Compact time labels */
              .fc-timegrid-slot-label {
                font-size: 8px !important;
                padding: 0 1px !important;
                font-family: 'Space Grotesk', sans-serif !important;
                line-height: 1.1 !important;
              }
              
              .fc-timegrid-slot-label-cushion {
                font-family: 'Space Grotesk', sans-serif !important;
                font-size: 8px !important;
              }
              
              /* Compact event styling */
              .fc-timegrid-event {
                font-size: 10px !important;
                padding: 1px 3px !important;
                font-family: 'Space Grotesk', sans-serif !important;
              }
              
              .fc-timegrid .fc-event-title {
                font-size: 10px !important;
                line-height: 1.2 !important;
                font-family: 'Space Grotesk', sans-serif !important;
              }
              
              .fc-timegrid .fc-event-time {
                font-size: 9px !important;
                font-family: 'Space Grotesk', sans-serif !important;
              }
              
              /* Compact column headers */
              .fc-timegrid .fc-col-header-cell {
                padding: 4px 2px !important;
              }
              
              .fc-timegrid .fc-col-header-cell-cushion {
                font-size: 10px !important;
                padding: 2px !important;
                font-family: 'Space Grotesk', sans-serif !important;
              }
              
              .fc-timegrid .fc-daygrid-day-number {
                font-family: 'Space Grotesk', sans-serif !important;
              }
              
              /* Giảm divider */
              .fc-timegrid-divider {
                padding: 1px 0 !important;
              }
              
              /* Enable scroll dọc - BỎ scroll ngang */
              .fc-timegrid-body {
                max-height: 400px !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
              }
              
              .fc-scroller {
                overflow-x: hidden !important;
              }
              
              .fc-scroller-liquid-absolute {
                overflow-x: hidden !important;
              }
              
              /* Custom scrollbar dọc - NHỎ HƠN */
              .fc-timegrid-body::-webkit-scrollbar {
                width: 4px !important;
              }
              .fc-timegrid-body::-webkit-scrollbar-track {
                background: transparent !important;
              }
              .fc-timegrid-body::-webkit-scrollbar-thumb {
                background: rgba(251, 146, 60, 0.3) !important;
                border-radius: 2px !important;
              }
              .fc-timegrid-body::-webkit-scrollbar-thumb:hover {
                background: rgba(251, 146, 60, 0.5) !important;
              }
              
              /* Firefox scrollbar */
              .fc-timegrid-body {
                scrollbar-width: thin !important;
                scrollbar-color: rgba(251, 146, 60, 0.3) transparent !important;
              }
              
              /* Force calendar width - KHÔNG CHO scroll ngang */
              .custom-calendar {
                overflow-x: hidden !important;
                max-width: 100% !important;
              }
              
              .fc-view-harness {
                overflow-x: hidden !important;
              }
              
              .fc-timegrid {
                max-width: 100% !important;
              }
              
              /* Ensure columns fit */
              .fc-timegrid-cols {
                width: 100% !important;
              }
              
              .fc-timegrid-col {
                min-width: 0 !important;
              }

              /* Filtered event animations */
              .fc-event.filtered-event {
                animation: pulse-filtered 2s infinite;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
              }

              .fc-event.unfiltered-event {
                opacity: 0.3;
                transition: opacity 0.3s ease;
              }

              @keyframes pulse-filtered {
                0% {
                  box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
                }
                70% {
                  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0);
                }
                100% {
                  box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
                }
              }
              /* Prevent horizontal scroll in events list - Tắt scroll dọc */
              .events-list-container {
                overflow-x: hidden !important;
                overflow-y: hidden !important;
              }
              .event-item {
                overflow-x: hidden !important;
                word-wrap: break-word !important;
              }
              /* Tooltip font size */
              .tooltip {
                font-size: 10px !important;
                padding: 3px 5px !important;
                min-width: 150px !important;
                max-width: 150px !important;
              }
              .tooltip * {
                font-size: 10px !important;
                line-height: 1.2 !important;
              }
              .tooltip .text-xs {
                font-size: 10px !important;
              }
              .tooltip span {
                font-size: 10px !important;
              }
              .tooltip div {
                font-size: 10px !important;
              }
            `}</style>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              locale={viLocale}
              initialView={
                viewMode === 'month'
                  ? 'dayGridMonth'
                  : viewMode === 'week'
                  ? 'timeGridWeek'
                  : 'timeGridDay'
              }
              headerToolbar={{
                left: 'prev,next',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              buttonText={{
                today: 'Hôm nay',
                month: 'Tháng',
                week: 'Tuần',
                day: 'Ngày',
                list: 'Danh sách',
              }}
              dayHeaderFormat={{
                weekday: 'long',
              }}
              events={fullCalendarEvents}
              eventClick={handleEventClick}
              height='auto'
              eventContent={eventInfo => renderEventContent(eventInfo, viewMode)}
            />
          </div>
        </div>

        {/* Events List View */}
        <div className='lg:col-span-1 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 relative overflow-hidden'>
          {/* Events List Loading Overlay */}
          {filterLoading && (
            <div className='absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg'>
              <div className='w-8 h-8 border-4 border-orange-200 dark:border-orange-800 border-t-orange-600 dark:border-t-orange-400 rounded-full animate-spin'></div>
              <p className='mt-2 text-xs text-gray-700 dark:text-gray-300 font-inter font-medium'>
                Đang lọc...
              </p>
            </div>
          )}
          <div className='flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700'>
            <h2 className='text-lg font-bold text-gray-900 dark:text-white font-heading'>
              Danh sách sự kiện
            </h2>
            <div className='px-2.5 py-1 bg-orange-50 dark:bg-orange-900/20 rounded-lg'>
              <span className='text-xs font-bold text-orange-600 dark:text-orange-400 font-heading'>
                {filteredEvents.length}
              </span>
            </div>
          </div>

          <div className='events-list-container space-y-3 overflow-hidden'>
            {filteredEvents.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12'>
                <div className='w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4'>
                  <svg
                    className='w-8 h-8 text-gray-400 dark:text-gray-600'
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
                <h3 className='text-sm font-semibold text-gray-900 dark:text-white mb-1 font-heading'>
                  Không có sự kiện
                </h3>
                <p className='text-xs text-gray-500 dark:text-gray-400 text-center font-inter'>
                  {Object.values(filters).some(f => f)
                    ? 'Không tìm thấy sự kiện phù hợp với bộ lọc'
                    : 'Chưa có lịch dạy nào trong khoảng thời gian này'}
                </p>
              </div>
            ) : (
              filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  className={`event-item group border-l-4 rounded-xl transition-all duration-200 cursor-pointer overflow-hidden ${
                    selectedEvent?.id === event.id
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 dark:border-orange-400 shadow-md ring-2 ring-orange-500/20'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 shadow-sm hover:shadow-md'
                  }`}
                  style={{ borderLeftColor: getStatusColor(event.status) }}
                  onClick={() => handleDetailClick(event)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: 'easeOut',
                  }}
                >
                  <div className='p-3'>
                    {/* Header */}
                    <div className='flex items-start justify-between mb-3'>
                      <h3 className='text-sm font-bold text-gray-900 dark:text-white line-clamp-2 pr-2 font-heading leading-tight'>
                        {event.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-md font-semibold whitespace-nowrap font-heading ${getStatusClass(
                          event.status
                        )}`}
                      >
                        {getStatusLabel(event.status)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className='space-y-2 mb-3'>
                      {/* Time */}
                      <div className='flex items-center text-xs text-gray-700 dark:text-gray-300 font-inter'>
                        <svg
                          className='w-3.5 h-3.5 text-orange-500 dark:text-orange-400 mr-2 flex-shrink-0'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                          />
                        </svg>
                        <span className='font-medium'>
                          {new Date(event.start).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          -{' '}
                          {new Date(event.end).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Room */}
                      <div className='flex items-center text-xs text-gray-700 dark:text-gray-300 font-inter'>
                        <svg
                          className='w-3.5 h-3.5 text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                          />
                        </svg>
                        <span className='font-medium truncate'>{event.room}</span>
                      </div>

                      {/* Attendees */}
                      <div className='flex items-center text-xs text-gray-700 dark:text-gray-300 font-inter'>
                        <svg
                          className='w-3.5 h-3.5 text-green-500 dark:text-green-400 mr-2 flex-shrink-0'
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
                        <span className='font-medium'>
                          {event.attendees}/{event.max_capacity} học viên
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className='flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700'>
                      <Button
                        size='xs'
                        variant='outline'
                        className='flex-1 text-xs font-semibold font-heading'
                        onClick={() => handleDetailClick(event)}
                      >
                        Chi tiết
                      </Button>
                      <Button
                        size='xs'
                        variant='primary'
                        className='flex-1 text-xs font-semibold font-heading'
                        onClick={() => {
                          setSelectedEvent(event);
                          handleAttendanceClick();
                        }}
                        disabled={event.status === 'CANCELLED'}
                      >
                        Điểm danh
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div
        className='mt-6 flex flex-col sm:flex-row gap-3'
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.8 }}
      >
        <Button
          variant='primary'
          onClick={() => {
            if (window.showToast) {
              window.showToast({
                type: 'info',
                message: 'Chức năng xem tất cả lịch đang được phát triển',
                duration: 3000,
              });
            }
          }}
          className='text-theme-xs font-semibold font-heading'
        >
          Xem tất cả lịch
        </Button>
        <Button
          variant='outline'
          onClick={() => {
            if (window.showToast) {
              window.showToast({
                type: 'info',
                message: 'Chức năng đồng bộ lịch đang được phát triển',
                duration: 3000,
              });
            }
          }}
          className='text-theme-xs font-semibold font-heading'
        >
          Đồng bộ lịch
        </Button>
      </motion.div>

      {/* Event Details Modal */}
      <EventDetailsModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onAttendance={handleAttendanceClick}
      />
    </motion.div>
  );
}

const renderEventContent = (eventInfo: any, currentViewMode: string) => {
  const status = eventInfo.event.extendedProps?.status || 'SCHEDULED';
  const classType = eventInfo.event.extendedProps?.class_name || '';

  // Map class types to colored dots
  const getClassIcon = (className: string) => {
    const lowerClassName = className.toLowerCase();
    if (lowerClassName.includes('yoga'))
      return {
        color: 'bg-blue-500',
        text: 'Y',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
      };
    if (lowerClassName.includes('pilates'))
      return {
        color: 'bg-green-500',
        text: 'P',
        bg: 'bg-green-50',
        border: 'border-green-200',
      };
    if (lowerClassName.includes('dance') || lowerClassName.includes('nhảy'))
      return {
        color: 'bg-pink-500',
        text: 'D',
        bg: 'bg-pink-50',
        border: 'border-pink-200',
      };
    if (
      lowerClassName.includes('martial') ||
      lowerClassName.includes('võ') ||
      lowerClassName.includes('karate') ||
      lowerClassName.includes('taekwondo')
    )
      return {
        color: 'bg-red-500',
        text: 'M',
        bg: 'bg-red-50',
        border: 'border-red-200',
      };
    if (
      lowerClassName.includes('strength') ||
      lowerClassName.includes('sức mạnh') ||
      lowerClassName.includes('tạ')
    )
      return {
        color: 'bg-orange-500',
        text: 'S',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
      };
    if (lowerClassName.includes('functional') || lowerClassName.includes('chức năng'))
      return {
        color: 'bg-purple-500',
        text: 'F',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
      };
    if (lowerClassName.includes('recovery') || lowerClassName.includes('phục hồi'))
      return {
        color: 'bg-teal-500',
        text: 'R',
        bg: 'bg-teal-50',
        border: 'border-teal-200',
      };
    if (lowerClassName.includes('specialized') || lowerClassName.includes('chuyên biệt'))
      return {
        color: 'bg-yellow-500',
        text: 'SP',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
      };
    if (lowerClassName.includes('group') || lowerClassName.includes('nhóm'))
      return {
        color: 'bg-gray-500',
        text: 'G',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
      };
    if (lowerClassName.includes('cardio') || lowerClassName.includes('tim mạch'))
      return {
        color: 'bg-indigo-500',
        text: 'C',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
      };
    return { color: 'bg-gray-500', text: 'G', bg: 'bg-gray-50', border: 'border-gray-200' }; // Default
  };

  const statusColors: { [key: string]: string } = {
    // For the badge in tooltip
    SCHEDULED: 'bg-blue-600 text-white',
    IN_PROGRESS: 'bg-green-600 text-white',
    COMPLETED: 'bg-gray-700 text-white',
    CANCELLED: 'bg-red-600 text-white',
  };

  const event = eventInfo.event;
  const extendedProps = event.extendedProps || {};
  const iconData = getClassIcon(classType);
  const { color, text, bg, border } = iconData;

  // Determine tooltip position based on day of week
  const getTooltipPosition = (currentViewMode: string) => {
    console.log('=== getTooltipPosition called ===');
    console.log('eventInfo:', eventInfo);
    console.log('eventInfo.el:', eventInfo.el);

    // Get the day of week and time from the event date
    const eventDate = event.start;
    const eventDateTime = new Date(eventDate);
    const dayOfWeek = eventDateTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hour = eventDateTime.getHours(); // 0-23

    console.log('Event date string:', eventDate);
    console.log('Parsed date:', eventDateTime);
    console.log('Day of week:', dayOfWeek);
    console.log('Hour:', hour);
    console.log(
      'Day name:',
      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]
    );

    // Check if it's week view or day view using FullCalendar view type
    const fullCalendarViewType = eventInfo.view?.type;
    const isWeekView = fullCalendarViewType === 'timeGridWeek';
    const isDayView = fullCalendarViewType === 'timeGridDay';

    console.log('Current view mode (state):', currentViewMode);
    console.log('FullCalendar view type:', fullCalendarViewType);
    console.log('Is week view:', isWeekView);
    console.log('Is day view:', isDayView);
    console.log('FullCalendar view title:', eventInfo.view?.title);

    if (isWeekView) {
      // For week view: 12am-12pm (0-12) → bottom, others → top
      if (hour >= 0 && hour <= 12) {
        console.log('Week view - Morning (12am-12pm), returning bottom');
        return 'bottom';
      } else {
        console.log('Week view - Afternoon/Evening, returning top');
        return 'top';
      }
    } else if (isDayView) {
      // For day view: default to right
      console.log('Day view - Default to right');
      return 'right';
    } else {
      // For month view: use day-based logic for Vietnamese calendar
      // Monday (1) → tooltip right
      if (dayOfWeek === 1) {
        console.log('Month view - Monday detected, returning right');
        return 'right';
      }
      // Sunday (0) → tooltip left
      else if (dayOfWeek === 0) {
        console.log('Month view - Sunday detected, returning left');
        return 'left';
      }
      // Other days → tooltip top
      else {
        console.log('Month view - Other day detected, returning top');
        return 'top';
      }
    }
  };

  const tooltipPosition = getTooltipPosition(currentViewMode);

  // Debug: log tooltip position
  console.log('Tooltip position:', tooltipPosition);
  console.log('Event object:', event);
  console.log('Event start:', event.start);

  // Status-based animations
  const getStatusAnimation = (status: string) => {
    const animations: Record<string, any> = {
      SCHEDULED: {
        animate: {
          scale: [1, 1.05, 1],
          boxShadow: [
            '0 2px 4px rgba(59, 130, 246, 0.2)',
            '0 4px 8px rgba(59, 130, 246, 0.4)',
            '0 2px 4px rgba(59, 130, 246, 0.2)',
          ],
        },
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
      IN_PROGRESS: {
        animate: {
          y: [0, -2, 0],
          rotate: [0, 1, -1, 0],
        },
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
      COMPLETED: {
        animate: {
          scale: 1,
          opacity: 0.8,
        },
      },
      CANCELLED: {
        animate: {
          scale: 0.9,
          opacity: 0.5,
          rotate: [0, -5, 5, 0],
        },
        transition: {
          duration: 0.5,
          repeat: 3,
        },
      },
    };

    return animations[status] || animations.SCHEDULED;
  };

  const statusAnimation = getStatusAnimation(status);

  return (
    <motion.div
      className='group relative w-5 h-5 cursor-pointer flex items-center justify-center'
      style={{ width: '20px', height: '20px' }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
        duration: 0.3,
      }}
      whileHover={{
        scale: 1.3,
        rotate: 5,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.9 }}
    >
      {/* Class Dot */}
      <motion.div
        className={`w-4 h-4 ${color} rounded-full shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center text-white text-sm font-bold`}
        style={{ width: '16px', height: '16px' }}
        whileHover={{
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
          y: -2,
        }}
        {...statusAnimation}
      >
        <motion.span
          className='text-sm font-bold'
          style={{ fontSize: '10px' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
        >
          {text}
        </motion.span>
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        <motion.div
          className={`tooltip absolute hidden group-hover:block w-max bg-white border border-gray-200 text-gray-800 text-xs rounded-sm py-1 px-1.5 shadow-sm min-w-[80px] max-w-[150px] ${
            tooltipPosition === 'left'
              ? 'right-full mr-3 top-1/2 -translate-y-1/2'
              : tooltipPosition === 'right'
              ? 'left-full ml-3 top-1/2 -translate-y-1/2'
              : tooltipPosition === 'bottom'
              ? 'left-1/2 -translate-x-1/2 top-full mt-3'
              : 'left-1/2 -translate-x-1/2 bottom-full mb-3'
          }`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <div className='flex items-center gap-2 mb-2'>
            <div className={`w-3 h-3 rounded-full ${bg} border ${border}`}></div>
            <div className='font-medium text-gray-900 text-xs'>
              {extendedProps.class_name || event.title}
            </div>
          </div>
          <div className='space-y-1 text-xs'>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Lớp:</span>
              <span className='font-medium'>{extendedProps.class_name}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Phòng:</span>
              <span className='font-medium'>{extendedProps.room}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Thời gian:</span>
              <span className='font-medium'>{eventInfo.timeText}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Học viên:</span>
              <span className='font-medium'>
                {extendedProps.attendees}/{extendedProps.max_capacity}
              </span>
            </div>
          </div>
          <div className='mt-2 pt-2 border-t border-gray-100'>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                statusColors[status] || 'bg-blue-600 text-white'
              }`}
            >
              {status === 'SCHEDULED'
                ? 'Đã lên lịch'
                : status === 'IN_PROGRESS'
                ? 'Đang diễn ra'
                : status === 'COMPLETED'
                ? 'Hoàn thành'
                : 'Đã hủy'}
            </span>
          </div>
          {/* Arrow based on position */}
          {tooltipPosition === 'left' && (
            <>
              <div className='absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-white'></div>
              <div
                className='absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-l-[7px] border-l-gray-200'
                style={{ transform: 'translateY(-50%) translateX(1px)' }}
              ></div>
            </>
          )}
          {tooltipPosition === 'right' && (
            <>
              <div className='absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-white'></div>
              <div
                className='absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-r-[7px] border-r-gray-200'
                style={{ transform: 'translateY(-50%) translateX(-1px)' }}
              ></div>
            </>
          )}
          {tooltipPosition === 'top' && (
            <>
              <div className='absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white'></div>
              <div className='absolute bottom-[-7px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[7px] border-t-gray-200'></div>
            </>
          )}
          {tooltipPosition === 'bottom' && (
            <>
              <div className='absolute top-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-white'></div>
              <div className='absolute top-[-7px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[7px] border-b-gray-200'></div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};
