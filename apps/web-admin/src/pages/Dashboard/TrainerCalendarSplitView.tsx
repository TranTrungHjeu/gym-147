import { DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminButton from '../../components/common/AdminButton';
import CustomSelect from '../../components/common/CustomSelect';
import { PageLoading, SimpleLoading } from '../../components/ui/AppLoading';
import Button from '../../components/ui/Button/Button';
// Removed SVG icon imports - using colored dots instead
import ExportButton, { ExportUtils } from '../../components/common/ExportButton';
import EventDetailsModal from '../../components/modals/EventDetailsModal';
import CreateScheduleModal from '../../components/trainer/CreateScheduleModal';
import { CalendarEvent, scheduleService } from '../../services/schedule.service';
import { getCurrentUser } from '../../utils/auth';

// Import Vietnamese locale
import viLocale from '@fullcalendar/core/locales/vi';

const DISPLAY_TIME_ZONE = 'Asia/Ho_Chi_Minh';

// Calendar Sync Buttons Component
const CalendarSyncButtons = ({ events }: { events: CalendarEvent[] }) => {
  const handleGoogleCalendarSync = () => {
    if (!events || events.length === 0) {
      if (window.showToast) {
        window.showToast({
          type: 'info',
          message: 'Không có sự kiện để đồng bộ',
          duration: 3000,
        });
      }
      return;
    }

    // Open Google Calendar with prefilled events (first valid event)
    const validEvent = events.find(event => event.start && event.end);
    if (!validEvent) {
      if (window.showToast) {
        window.showToast({
          type: 'info',
          message: 'Không có sự kiện hợp lệ để đồng bộ',
          duration: 3000,
        });
      }
      return;
    }

    const startDate = new Date(validEvent.start);
    const endDate = new Date(validEvent.end);
    const formatGoogleDate = (date: Date) =>
      date
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');

    const title = encodeURIComponent(validEvent.class_name || validEvent.title || 'Lớp học');
    const details = encodeURIComponent(
      `Phòng: ${validEvent.room || 'N/A'}\nSố người tham gia: ${validEvent.attendees || 0}/${
        validEvent.max_capacity || 0
      }`
    );
    const location = encodeURIComponent(validEvent.room || '');
    const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;

    window.open(googleUrl, '_blank', 'noopener,noreferrer');

    if (window.showToast) {
      window.showToast({
        type: 'success',
        message: 'Đã mở Google Calendar để đồng bộ sự kiện.',
        duration: 3000,
      });
    }
  };

  const handleOutlookSync = () => {
    if (!events || events.length === 0) {
      if (window.showToast) {
        window.showToast({
          type: 'info',
          message: 'Không có sự kiện để đồng bộ',
          duration: 3000,
        });
      }
      return;
    }

    // Generate iCal file for Outlook
    const iCalEvents = events
      .filter(e => e.start && e.end)
      .map(event => ({
        title: event.class_name || event.title || 'Lớp học',
        description: `Phòng: ${event.room || 'N/A'}\nSố người tham gia: ${event.attendees || 0}/${
          event.max_capacity || 0
        }`,
        start: event.start,
        end: event.end,
        location: event.room || '',
      }));

    if (iCalEvents.length === 0) {
      if (window.showToast) {
        window.showToast({
          type: 'info',
          message: 'Không có sự kiện hợp lệ để đồng bộ',
          duration: 3000,
        });
      }
      return;
    }

    const filename = `trainer-calendar-${new Date().toISOString().split('T')[0]}`;
    ExportUtils.exportToiCal(iCalEvents, filename);

    if (window.showToast) {
      window.showToast({
        type: 'success',
        message: 'Đã tải file iCal. Bạn có thể import vào Outlook.',
        duration: 5000,
      });
    }
  };

  return (
    <div className='flex gap-2'>
      <AdminButton
        variant='outline'
        size='sm'
        icon={ExternalLink}
        onClick={handleGoogleCalendarSync}
        className='text-[11px] font-heading whitespace-nowrap rounded-none'
      >
        Sync Google
      </AdminButton>
      <AdminButton
        variant='outline'
        size='sm'
        icon={ExternalLink}
        onClick={handleOutlookSync}
        className='text-[11px] font-heading whitespace-nowrap rounded-none'
      >
        Sync Outlook
      </AdminButton>
    </div>
  );
};

export default function TrainerCalendarSplitView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const fetchRequestRef = useRef(0);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [filters, setFilters] = useState({
    status: '',
    classType: '',
    room: '',
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userId, setUserId] = useState<string>('');

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

  // Events to display - always filtered view
  const displayEvents = filteredEvents;

  // Memoized statistics - based on display events
  const statistics = useMemo(() => {
    const total = displayEvents.length;
    const scheduled = displayEvents.filter(e => e.status === 'SCHEDULED').length;
    const inProgress = displayEvents.filter(e => e.status === 'IN_PROGRESS').length;
    const completed = displayEvents.filter(e => e.status === 'COMPLETED').length;
    const cancelled = displayEvents.filter(e => e.status === 'CANCELLED').length;

    return { total, scheduled, inProgress, completed, cancelled };
  }, [displayEvents]);

  useEffect(() => {
    fetchEvents();
    // Get current user ID
    const user = getCurrentUser();
    if (user?.id) {
      setUserId(user.id);
    }
  }, [currentDate, viewMode, filters]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch filter options from database
  const fetchFilterOptions = async () => {
    try {
      // Fetch class types
      const classTypesResponse = await scheduleService.getTrainerClasses();

      // Handle different response structures
      // Response structure: { success: true, data: { classes: [...] } }
      let classTypesData = [];
      if (classTypesResponse?.success && classTypesResponse?.data) {
        // Check if data.classes exists (standard structure)
        if (classTypesResponse.data.classes && Array.isArray(classTypesResponse.data.classes)) {
          classTypesData = classTypesResponse.data.classes;
        }
        // Check if data is directly an array
        else if (Array.isArray(classTypesResponse.data)) {
          classTypesData = classTypesResponse.data;
        }
      } else if (classTypesResponse && Array.isArray(classTypesResponse)) {
        classTypesData = classTypesResponse;
      }

      if (Array.isArray(classTypesData) && classTypesData.length > 0) {
        const uniqueClassTypes = [
          ...new Set(
            classTypesData
              .map((cls: any) => cls.name || cls.class_name || cls.class_type || cls.title)
              .filter(Boolean)
          ),
        ];
        if (uniqueClassTypes.length > 0) {
          setClassTypes(uniqueClassTypes);
        } else {
          setClassTypes([]);
        }
      } else {
        setClassTypes([]);
      }

      // Fetch rooms directly from /rooms API
      const roomsResponse = await scheduleService.getAllRooms();

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
        if (roomNames.length > 0) {
          setRooms(roomNames);
        } else {
          setRooms([]);
        }
      } else {
        setRooms([]);
      }
    } catch (error) {
      console.error('[ERROR] Error fetching filter options:', error);
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
    const requestId = ++fetchRequestRef.current;

    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setContentLoading(true);
      }

      const response = await scheduleService.getTrainerCalendar(currentDate, viewMode, filters);

      if (requestId !== fetchRequestRef.current) {
        return;
      }

      if (response.success) {
        const receivedEvents = response.data || [];
        if (receivedEvents.length === 0) {
          console.error('[TrainerCalendarSplitView:fetchEvents] API returned empty events', {
            viewMode,
            currentDate: currentDate.toISOString(),
            filters,
            message: response.message,
          });
        }

        const missingTimeEvent = receivedEvents.find(event => !event.start || !event.end);
        if (missingTimeEvent) {
          console.error('[TrainerCalendarSplitView:fetchEvents] Event missing start/end', {
            event: missingTimeEvent,
          });
        }

        setEvents(receivedEvents);
        // filteredEvents will be computed automatically via useMemo
      } else {
        console.error('TrainerCalendarSplitView - Calendar fetch failed:', response.message);
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
      if (requestId !== fetchRequestRef.current) {
        return;
      }

      if (isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
      }

      setContentLoading(false);
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

  const handleDatesSet = useCallback((dateInfo: DatesSetArg) => {
    const nextViewMode: 'month' | 'week' | 'day' =
      dateInfo.view.type === 'timeGridWeek'
        ? 'week'
        : dateInfo.view.type === 'timeGridDay'
        ? 'day'
        : 'month';

    const nextCurrentDate = new Date(dateInfo.view.currentStart);

    setViewMode(prev => (prev === nextViewMode ? prev : nextViewMode));
    setCurrentDate(prev =>
      prev.getTime() === nextCurrentDate.getTime() ? prev : nextCurrentDate
    );
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

  const [attendanceLoading, setAttendanceLoading] = useState<string | null>(null);

  const handleAttendanceClick = useCallback(async () => {
    if (!selectedEvent) {
      return;
    }

    // Get current user ID from localStorage
    const getUserFromStorage = () => {
      try {
        const user = localStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          return userData.id || userData.userId;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
      return null;
    };

    const trainerId = getUserFromStorage();
    if (!trainerId) {
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Không tìm thấy thông tin trainer',
          duration: 3000,
        });
      }
      return;
    }

    // Check if schedule is locked or already completed
    if (selectedEvent.status === 'CANCELLED') {
      if (window.showToast) {
        window.showToast({
          type: 'warning',
          message: 'Không thể điểm danh cho buổi đã hủy',
          duration: 3000,
        });
      }
      return;
    }

    if (selectedEvent.status === 'COMPLETED') {
      if (window.showToast) {
        window.showToast({
          type: 'warning',
          message: 'Buổi học đã hoàn thành',
          duration: 3000,
        });
      }
      return;
    }

    // Navigate to TrainerSchedule page with the schedule ID
    // This page has full attendance functionality
    window.location.href = `/dashboard/trainer-schedule?scheduleId=${selectedEvent.id}`;
  }, [selectedEvent]);

  // Memoized FullCalendar events
  const fullCalendarEvents: EventInput[] = useMemo(() => {
    return displayEvents.map(event => {
      return {
        id: event.id,
        title: event.class_name || event.title || 'Lớp học',
        start: event.start,
        end: event.end,
        backgroundColor: getStatusColor(event.status),
        borderColor: getStatusColor(event.status),
        textColor: '#ffffff',
        classNames: [
          `event-${event.status.toLowerCase()}`,
        ],
        extendedProps: {
          status: event.status,
          class_name: event.class_name,
          room: event.room,
          attendees: event.attendees,
          max_capacity: event.max_capacity,
        },
      };
    });
  }, [displayEvents]);

  if (loading) {
    return <PageLoading />;
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
            {displayEvents && displayEvents.length > 0 ? (
              <>
                <ExportButton
                  data={displayEvents.map(event => ({
                    'Lớp học': event.class_name || 'N/A',
                    'Ngày bắt đầu': event.start
                      ? new Date(event.start).toLocaleDateString('vi-VN', {
                          timeZone: DISPLAY_TIME_ZONE,
                        })
                      : 'N/A',
                    'Thời gian bắt đầu': event.start
                      ? new Date(event.start).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: DISPLAY_TIME_ZONE,
                        })
                      : 'N/A',
                    'Thời gian kết thúc': event.end
                      ? new Date(event.end).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: DISPLAY_TIME_ZONE,
                        })
                      : 'N/A',
                    Phòng: event.room || 'N/A',
                    'Trạng thái': event.status || 'N/A',
                    'Số người tham gia': event.attendees || 0,
                    'Sức chứa tối đa': event.max_capacity || 0,
                  }))}
                  columns={[
                    { key: 'Lớp học', label: 'Lớp học' },
                    { key: 'Ngày bắt đầu', label: 'Ngày bắt đầu' },
                    { key: 'Thời gian bắt đầu', label: 'Thời gian bắt đầu' },
                    { key: 'Thời gian kết thúc', label: 'Thời gian kết thúc' },
                    { key: 'Phòng', label: 'Phòng' },
                    { key: 'Trạng thái', label: 'Trạng thái' },
                    { key: 'Số người tham gia', label: 'Số người tham gia' },
                    { key: 'Sức chứa tối đa', label: 'Sức chứa tối đa' },
                  ]}
                  filename={`trainer-calendar-${currentDate.toISOString().split('T')[0]}`}
                  title='Lịch dạy'
                  variant='outline'
                  size='sm'
                  showiCal={true}
                  iCalEvents={displayEvents
                    .filter(e => e.start && e.end)
                    .map(event => ({
                      title: event.class_name || event.title || 'Lớp học',
                      description: `Phòng: ${event.room || 'N/A'}\nSố người tham gia: ${
                        event.attendees || 0
                      }/${event.max_capacity || 0}`,
                      start: event.start,
                      end: event.end,
                      location: event.room || '',
                    }))}
                />
                <CalendarSyncButtons events={displayEvents} />
              </>
            ) : (
              <Button
                size='sm'
                variant='outline'
                disabled
                className='text-theme-xs font-semibold font-heading rounded-none'
              >
                Xuất lịch
              </Button>
            )}
            <Button
              size='sm'
              variant='primary'
              onClick={() => setIsCreateModalOpen(true)}
              className='text-theme-xs font-semibold font-heading rounded-none'
            >
              Tạo lịch mới
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <div className='bg-white dark:bg-gray-900 rounded-none border border-gray-200 dark:border-gray-800 shadow-sm p-3'>
          <div className='flex items-center justify-end mb-3'>
            {Object.values(filters).some(f => f) && (
              <button
                onClick={clearFilters}
                className='text-xs text-orange-600 dark:text-orange-400 hover:underline'
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
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

          </div>
        </div>
      </motion.div>

      {/* Split View */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6'>
        {/* Calendar View */}
        <div className='lg:col-span-2 bg-white dark:bg-gray-900 rounded-none shadow-sm border border-gray-200 dark:border-gray-800 p-4 relative overflow-x-hidden'>
          {/* Calendar Loading Overlay */}
          {contentLoading && (
            <div className='absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-none'>
              <SimpleLoading size='small' />
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
            `}</style>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              locale={viLocale}
              timeZone={DISPLAY_TIME_ZONE}
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
              datesSet={handleDatesSet}
              eventClick={handleEventClick}
              height='auto'
              eventContent={eventInfo => renderEventContent(eventInfo)}
            />
          </div>
        </div>

        {/* Events List View */}
        <div className='lg:col-span-1 bg-white dark:bg-gray-900 rounded-none shadow-sm border border-gray-200 dark:border-gray-800 p-4 relative overflow-hidden'>
          {/* Events List Loading Overlay */}
          {contentLoading && (
            <div className='absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-none'>
              <SimpleLoading size='small' />
            </div>
          )}
          <div className='flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700'>
            <h2 className='text-lg font-bold text-gray-900 dark:text-white font-heading'>
              Danh sách sự kiện
            </h2>
            <div className='px-2.5 py-1 bg-orange-50 dark:bg-orange-900/20 rounded-none border border-orange-200 dark:border-orange-800'>
              <span className='text-xs font-bold text-orange-600 dark:text-orange-400 font-heading'>
                {displayEvents.length}
              </span>
            </div>
          </div>

          <div className='events-list-container space-y-3 overflow-hidden'>
            {displayEvents.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12'>
                <div className='w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-none flex items-center justify-center mb-4'>
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
                <p className='text-xs text-gray-500 dark:text-gray-400 text-center font-inter mb-2'>
                  {Object.values(filters).some(f => f)
                    ? 'Không tìm thấy sự kiện phù hợp với bộ lọc'
                    : 'Chưa có lịch dạy nào trong khoảng thời gian này'}
                </p>
                {!Object.values(filters).some(f => f) && (
                  <p className='text-xs text-gray-400 dark:text-gray-500 text-center font-inter'>
                    Thử chọn tháng/tuần khác hoặc tạo lịch dạy mới
                  </p>
                )}
              </div>
            ) : (
              displayEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  className={`event-item group border-l-4 rounded-none border transition-all duration-200 cursor-pointer overflow-hidden ${
                    selectedEvent?.id === event.id
                      ? 'bg-white dark:bg-gray-900 border-orange-300 dark:border-orange-700 shadow-sm ring-1 ring-orange-200 dark:ring-orange-800'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/30 dark:hover:bg-orange-950/10 shadow-sm'
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
                    <div className='flex items-start justify-between mb-2'>
                      <h3 className='text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 pr-2 font-heading leading-snug'>
                        {event.class_name || event.title || 'Lớp học'}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded-none font-semibold whitespace-nowrap font-heading tracking-wide ${getStatusClass(
                          event.status
                        )}`}
                      >
                        {getStatusLabel(event.status)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className='space-y-1.5'>
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
                            timeZone: DISPLAY_TIME_ZONE,
                          })}{' '}
                          -{' '}
                          {new Date(event.end).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: DISPLAY_TIME_ZONE,
                          })}
                        </span>
                      </div>

                      {/* Room */}
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
                            d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                          />
                        </svg>
                        <span className='font-medium truncate'>{event.room}</span>
                      </div>

                      {/* Attendees */}
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
                            d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
                          />
                        </svg>
                        <span className='font-medium'>
                          {event.attendees}/{event.max_capacity} học viên
                        </span>
                      </div>
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
          className='text-theme-xs font-semibold font-heading rounded-none'
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
          className='text-theme-xs font-semibold font-heading rounded-none'
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

      {/* Create Schedule Modal */}
      {userId && (
        <CreateScheduleModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchEvents(); // Refresh events after creating schedule
          }}
          userId={userId}
        />
      )}
    </motion.div>
  );
}

const renderEventContent = (eventInfo: any) => {
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

  const event = eventInfo.event;
  const extendedProps = event.extendedProps || {};
  const iconData = getClassIcon(classType);
  const { color, text } = iconData;

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
        className={`w-4 h-4 ${color} rounded-none shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center text-white text-sm font-bold`}
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
    </motion.div>
  );
};
