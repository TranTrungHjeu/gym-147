import { EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SimpleLoading } from '../../components/ui/AppLoading/Loading';
import Button from '../../components/ui/Button/Button';
// Removed SVG icon imports - using colored dots instead
import { CalendarEvent, scheduleService } from '../../services/schedule.service';

// Import Vietnamese locale
import viLocale from '@fullcalendar/core/locales/vi';

export default function TrainerCalendarSplitView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
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

  // Database data for filter options
  const [classTypes, setClassTypes] = useState<string[]>([
    'Yoga Cơ Bản',
    'Pilates Nâng Cao',
    'Dance Fitness',
    'Martial Arts',
    'Strength',
    'Functional',
    'Recovery',
    'Specialized',
  ]);
  const [rooms, setRooms] = useState<string[]>([
    'Phòng A',
    'Phòng B',
    'Studio 1',
    'Studio 2',
    'Phòng VIP',
    'Sân ngoài trời',
  ]);
  const [statuses] = useState([
    { value: 'SCHEDULED', label: '📅 Đã lên lịch' },
    { value: 'IN_PROGRESS', label: '🔄 Đang diễn ra' },
    { value: 'COMPLETED', label: '✅ Hoàn thành' },
    { value: 'CANCELLED', label: '❌ Đã hủy' },
  ]);

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
      console.log('Class types response:', classTypesResponse);

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
              .map((cls: any) => cls.class_type || cls.name || cls.title)
              .filter(Boolean)
          ),
        ];
        setClassTypes(uniqueClassTypes);
      }

      // Fetch rooms
      const roomsResponse = await scheduleService.getTrainerSchedule();
      console.log('Rooms response:', roomsResponse);

      // Handle different response structures
      let roomsData = [];
      if (roomsResponse && roomsResponse.data && Array.isArray(roomsResponse.data)) {
        roomsData = roomsResponse.data;
      } else if (roomsResponse && Array.isArray(roomsResponse)) {
        roomsData = roomsResponse;
      }

      if (Array.isArray(roomsData) && roomsData.length > 0) {
        const uniqueRooms = [
          ...new Set(
            roomsData.map((schedule: any) => schedule.room?.name || schedule.room).filter(Boolean)
          ),
        ];
        console.log('Unique rooms:', uniqueRooms);
        setRooms(uniqueRooms);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
      // Fallback to default values
      setClassTypes([
        'Yoga',
        'Pilates',
        'Dance',
        'Martial Arts',
        'Strength',
        'Functional',
        'Recovery',
        'Specialized',
      ]);
      setRooms(['Phòng A', 'Phòng B', 'Studio 1', 'Studio 2', 'Phòng VIP', 'Sân ngoài trời']);
    }
  };

  // Helper functions for icons
  const getClassTypeIcon = (classType: string) => {
    const iconMap: Record<string, string> = {
      Yoga: '🧘',
      Pilates: '🤸',
      Dance: '💃',
      'Martial Arts': '🥋',
      Strength: '💪',
      Functional: '🏃',
      Recovery: '🧘‍♀️',
      Specialized: '⭐',
    };
    return iconMap[classType] || '🏋️';
  };

  const getRoomIcon = (room: string) => {
    if (room.includes('VIP')) return '👑';
    if (room.includes('Studio')) return '🎭';
    if (room.includes('ngoài trời') || room.includes('Ngoài trời')) return '🌳';
    return '🏠';
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

        // Auto-filter events based on current filters
        const filtered = response.data.filter(event => {
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
                cleanEventRoom.includes(cleanFilterRoom) ||
                cleanFilterRoom.includes(cleanEventRoom);
            }
          }

          return matchesStatus && matchesClassType && matchesRoom;
        });

        setFilteredEvents(filtered);
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
      return `${startOfMonth.toLocaleDateString('vi-VN')} - ${endOfMonth.toLocaleDateString('vi-VN')}`;
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('vi-VN')} - ${endOfWeek.toLocaleDateString('vi-VN')}`;
    } else {
      return currentDate.toLocaleDateString('vi-VN');
    }
  };

  const clearFilters = () => {
    setFilters({ status: '', classType: '', room: '' });
    setFilteredEvents(events); // Reset to show all events
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventId = clickInfo.event.id;
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
    }
  };

  // Convert CalendarEvent to FullCalendar EventInput
  const fullCalendarEvents: EventInput[] = events.map(event => {
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

  if (loading) {
    return (
      <motion.div
        className='flex items-center justify-center min-h-screen'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className='text-center'>
          <motion.div
            className='w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4'
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          <motion.p
            className='text-gray-600 dark:text-gray-400'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Đang tải lịch dạy...
          </motion.p>
        </div>
      </motion.div>
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
        className='mb-4'
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-6'>
            <div>
              <h1 className='text-xl font-bold text-gray-800 dark:text-white/90 mb-2'>
                Lịch dạy của tôi
              </h1>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                Xem và quản lý lịch dạy của bạn
              </p>
            </div>

            {/* Compact Filters */}
            <div className='bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-sm border border-blue-100 dark:border-gray-600 p-3'>
              <div className='flex items-center gap-3'>
                <div className='flex items-center gap-2'>
                  <svg
                    className='w-4 h-4 text-blue-500'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z'
                    />
                  </svg>
                  <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Bộ lọc:
                  </span>
                </div>

                <select
                  value={filters.status}
                  onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className='px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs font-medium w-32'
                  style={{
                    fontFamily:
                      "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  <option value=''>Loại trạng thái</option>
                  {statuses.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.value}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.classType}
                  onChange={e => setFilters(prev => ({ ...prev, classType: e.target.value }))}
                  className='px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs font-medium w-28'
                  style={{
                    fontFamily:
                      "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  <option value=''>Loại lớp</option>
                  {classTypes.map(classType => (
                    <option key={classType} value={classType}>
                      {classType}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.room}
                  onChange={e => setFilters(prev => ({ ...prev, room: e.target.value }))}
                  className='px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs font-medium w-28'
                  style={{
                    fontFamily:
                      "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  <option value=''>Loại phòng</option>
                  {rooms.map(room => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </select>

                <div className='flex gap-1'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={clearFilters}
                    className='px-3 py-1.5 text-xs font-m'
                  >
                    Xóa bộ lọc
                  </Button>
                </div>
              </div>
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
            >
              Tạo lịch mới
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Split View */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6'>
        {/* Calendar View */}
        <div
          className='lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 lg:p-4 relative'
          style={{ overflow: 'visible', overflowX: 'hidden' }}
        >
          {/* Calendar Loading Overlay */}
          {filterLoading && (
            <div className='absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg'>
              <SimpleLoading
                size='medium'
                text='Đang tìm kiếm...'
                color='#3b82f6'
                textColor='#374151'
              />
            </div>
          )}
          <motion.div
            className='custom-calendar'
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
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
                font-size: 10px !important;
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
              /* Prevent horizontal scroll in events list */
              .events-list-container {
                overflow-x: hidden !important;
                overflow-y: auto !important;
                scrollbar-width: thin !important;
                scrollbar-color: rgba(156, 163, 175, 0.5) transparent !important;
              }
              .events-list-container::-webkit-scrollbar {
                width: 6px !important;
              }
              .events-list-container::-webkit-scrollbar-track {
                background: transparent !important;
              }
              .events-list-container::-webkit-scrollbar-thumb {
                background-color: rgba(156, 163, 175, 0.5) !important;
                border-radius: 3px !important;
              }
              .events-list-container::-webkit-scrollbar-thumb:hover {
                background-color: rgba(156, 163, 175, 0.7) !important;
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
          </motion.div>
        </div>

        {/* Events List View */}
        <motion.div
          className='lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 relative'
          style={{ overflowX: 'hidden' }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          {/* Events List Loading Overlay */}
          {filterLoading && (
            <div className='absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg'>
              <SimpleLoading
                size='small'
                text='Đang tìm kiếm...'
                color='#3b82f6'
                textColor='#374151'
              />
            </div>
          )}
          <div className='flex items-center justify-between mb-2'>
            <h2 className='text-base font-semibold text-gray-800 dark:text-white/90'>
              Danh sách sự kiện
            </h2>
            <div className='text-xs text-gray-600 dark:text-gray-400'>
              {filteredEvents.length} sự kiện
            </div>
          </div>

          <div
            className='events-list-container space-y-2 h-full overflow-y-auto overflow-x-hidden'
            style={{ maxHeight: 'calc(100vh - 20px)' }}
          >
            {filteredEvents.length === 0 ? (
              <div className='text-center py-8'>
                <div className='text-gray-500 dark:text-gray-400 text-sm mb-2'>
                  Không có sự kiện nào
                </div>
                <p className='text-gray-400 dark:text-gray-500 text-xs'>
                  {Object.values(filters).some(f => f)
                    ? 'Không tìm thấy sự kiện phù hợp với bộ lọc'
                    : 'Chưa có lịch dạy nào trong khoảng thời gian này'}
                </p>
              </div>
            ) : (
              filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  className={`event-item border-l-3 pl-2.5 py-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-600 ${
                    selectedEvent?.id === event.id
                      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : ''
                  }`}
                  style={{ borderLeftColor: getStatusColor(event.status) }}
                  onClick={() => setSelectedEvent(event)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.1,
                    ease: 'easeOut',
                  }}
                  whileHover={{
                    x: 2,
                    transition: { duration: 0.2 },
                  }}
                >
                  {/* Header */}
                  <div className='flex items-center justify-between mb-1.5'>
                    <h3 className='text-sm font-semibold text-gray-900 dark:text-white truncate pr-2'>
                      {event.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${getStatusClass(
                        event.status
                      )}`}
                    >
                      {getStatusLabel(event.status)}
                    </span>
                  </div>

                  {/* Content Grid */}
                  <div className='grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400 mb-2'>
                    <div className='flex items-center'>
                      <span className='w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5 flex-shrink-0'></span>
                      <span className='truncate'>{event.room}</span>
                    </div>
                    <div className='flex items-center'>
                      <span className='w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 flex-shrink-0'></span>
                      <span className='truncate'>
                        {event.attendees}/{event.max_capacity}
                      </span>
                    </div>
                    <div className='col-span-2 flex items-center'>
                      <span className='w-1.5 h-1.5 bg-orange-400 rounded-full mr-1.5 flex-shrink-0'></span>
                      <span className='truncate'>
                        {new Date(event.start).toLocaleDateString('vi-VN')} •{' '}
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
                  </div>

                  {/* Actions */}
                  <div className='flex gap-1.5'>
                    <Button size='xs' variant='outline' className='flex-1 text-xs py-1 px-2'>
                      Chi tiết
                    </Button>
                    <Button size='xs' variant='primary' className='flex-1 text-xs py-1 px-2'>
                      Điểm danh
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className='mt-4 flex flex-col sm:flex-row gap-4'>
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
        >
          Đồng bộ lịch
        </Button>
      </div>
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
