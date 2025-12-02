import { useEffect, useMemo, useState } from 'react';
import ExportButton from '../../components/common/ExportButton';
import CreateScheduleModal from '../../components/trainer/CreateScheduleModal';
import Button from '../../components/ui/Button/Button';
import { CalendarEvent, scheduleService } from '../../services/schedule.service';
import { getCurrentUser } from '../../utils/auth';

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
        message: 'Đã tải file iCal. Bạn có thể import vào Google Calendar hoặc Outlook.',
        duration: 5000,
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
      >
        Sync Google
      </AdminButton>
      <AdminButton variant='outline' size='sm' icon={ExternalLink} onClick={handleOutlookSync}>
        Sync Outlook
      </AdminButton>
    </div>
  );
};

export default function TrainerCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [filters, setFilters] = useState({
    status: '',
    classType: '',
    room: '',
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    fetchEvents();
    // Get current user ID
    const user = getCurrentUser();
    if (user?.id) {
      setUserId(user.id);
    }
  }, [currentDate, viewMode, filters]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await scheduleService.getTrainerCalendar(currentDate, viewMode, filters);

      if (response.success) {
        setEvents(response.data);
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
      setLoading(false);
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

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      SCHEDULED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
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

  // Filter events based on filters
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesStatus = !filters.status || event.status === filters.status;
      const matchesClassType =
        !filters.classType ||
        event.class_name?.toLowerCase().includes(filters.classType.toLowerCase());
      const matchesRoom =
        !filters.room || event.room?.toLowerCase().includes(filters.room.toLowerCase());
      return matchesStatus && matchesClassType && matchesRoom;
    });
  }, [events, filters]);

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600 dark:text-gray-400'>Đang tải lịch dạy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6'>
      {/* Header */}
      <div className='mb-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-800 dark:text-white/90 mb-2'>Lịch dạy</h1>
            <p className='text-gray-600 dark:text-gray-400'>Xem và quản lý lịch dạy của bạn</p>
          </div>
          <div className='flex gap-2'>
            {filteredEvents && filteredEvents.length > 0 ? (
              <>
                <ExportButton
                  data={filteredEvents.map(event => ({
                    'Lớp học': event.class_name || 'N/A',
                    'Ngày bắt đầu': event.start
                      ? new Date(event.start).toLocaleDateString('vi-VN')
                      : 'N/A',
                    'Thời gian bắt đầu': event.start
                      ? new Date(event.start).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A',
                    'Thời gian kết thúc': event.end
                      ? new Date(event.end).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
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
                  iCalEvents={filteredEvents
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
                <CalendarSyncButtons events={filteredEvents} />
              </>
            ) : (
              <Button size='sm' variant='outline' disabled>
                Xuất lịch
              </Button>
            )}
            <Button size='sm' onClick={() => setIsCreateModalOpen(true)}>
              Tạo lịch mới
            </Button>
          </div>
        </div>
      </div>

      {/* View Controls */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6'>
        <div className='flex flex-col md:flex-row gap-4 items-center justify-between'>
          <div className='flex items-center gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Chế độ xem
              </label>
              <select
                value={viewMode}
                onChange={e => setViewMode(e.target.value as 'month' | 'week' | 'day')}
                className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
              >
                <option value='month'>Tháng</option>
                <option value='week'>Tuần</option>
                <option value='day'>Ngày</option>
              </select>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Chọn ngày
              </label>
              <input
                type='date'
                value={currentDate.toISOString().split('T')[0]}
                onChange={e => setCurrentDate(new Date(e.target.value))}
                className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
              />
            </div>
          </div>

          <div className='flex gap-2'>
            <Button size='sm' variant='outline' onClick={() => setCurrentDate(new Date())}>
              Hôm nay
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={() => setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000))}
            >
              Trước
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={() => setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000))}
            >
              Sau
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Events */}
      <div className='space-y-4'>
        {events.length > 0 ? (
          events.map(event => (
            <div
              key={event.id}
              className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow'
            >
              <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
                {/* Event Info */}
                <div className='flex-1'>
                  <div className='flex items-start justify-between mb-2'>
                    <h3 className='text-lg font-semibold text-gray-800 dark:text-white/90'>
                      {event.title}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(event.status)}`}
                    >
                      {getStatusLabel(event.status)}
                    </span>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400'>
                    <div className='flex items-center'>
                      <svg
                        className='w-4 h-4 mr-2'
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
                      {formatDate(event.start)}
                    </div>

                    <div className='flex items-center'>
                      <svg
                        className='w-4 h-4 mr-2'
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
                      {formatTime(event.start)} - {formatTime(event.end)}
                    </div>

                    <div className='flex items-center'>
                      <svg
                        className='w-4 h-4 mr-2'
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
                      {event.room}
                    </div>

                    <div className='flex items-center'>
                      <svg
                        className='w-4 h-4 mr-2'
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
                      {event.attendees}/{event.max_capacity} học viên
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className='flex flex-col sm:flex-row gap-2'>
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
                  <Button
                    size='sm'
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
              </div>
            </div>
          ))
        ) : (
          <div className='text-center py-12'>
            <div className='text-gray-500 dark:text-gray-400'>
              Không có lịch dạy nào trong khoảng thời gian được chọn
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
