import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button/Button';
import { CalendarEvent, scheduleService } from '../../services/schedule.service';

export default function TrainerCalendarWithFilters() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [filters, setFilters] = useState({
    status: '',
    classType: '',
    room: '',
  });

  useEffect(() => {
    fetchEvents();
  }, [currentDate, viewMode, filters]);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      // Debug logging
      console.log('Fetching events with:', {
        currentDate: currentDate.toISOString(),
        viewMode,
        filters,
        dateRange: getDateRangeInfo(),
      });

      const response = await scheduleService.getTrainerCalendar(currentDate, viewMode, filters);

      if (response.success) {
        console.log('Received events:', response.data.length);
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

  const getStatusClass = (status: string) => {
    const statusClasses: { [key: string]: string } = {
      SCHEDULED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
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
  };

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
            <h1 className='text-2xl font-bold text-gray-800 dark:text-white/90 mb-2'>
              Lịch dạy của tôi
            </h1>
            <p className='text-gray-600 dark:text-gray-400'>Xem và quản lý lịch dạy của bạn</p>
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
      </div>

      {/* Filters */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6'>
        <h3 className='text-lg font-semibold text-gray-800 dark:text-white/90 mb-4'>Bộ lọc</h3>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Trạng thái
            </label>
            <select
              value={filters.status}
              onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
            >
              <option value=''>Tất cả trạng thái</option>
              <option value='SCHEDULED'>Đã lên lịch</option>
              <option value='IN_PROGRESS'>Đang diễn ra</option>
              <option value='COMPLETED'>Hoàn thành</option>
              <option value='CANCELLED'>Đã hủy</option>
            </select>
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Loại lớp
            </label>
            <input
              type='text'
              value={filters.classType}
              onChange={e => setFilters(prev => ({ ...prev, classType: e.target.value }))}
              placeholder='Nhập loại lớp...'
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Phòng
            </label>
            <input
              type='text'
              value={filters.room}
              onChange={e => setFilters(prev => ({ ...prev, room: e.target.value }))}
              placeholder='Nhập tên phòng...'
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
            />
          </div>
        </div>
        <div className='mt-4 flex gap-2'>
          <Button size='sm' variant='outline' onClick={clearFilters}>
            Xóa bộ lọc
          </Button>
          <Button size='sm' variant='primary' onClick={fetchEvents}>
            Áp dụng bộ lọc
          </Button>
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
          </div>
          <div className='flex items-center gap-2'>
            <Button size='sm' variant='outline' onClick={() => handlePrevNext('prev')}>
              Trước
            </Button>
            <Button size='sm' variant='outline' onClick={() => handlePrevNext('next')}>
              Sau
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Events */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h2 className='text-xl font-semibold text-gray-800 dark:text-white/90'>
              {formatHeaderDate()}
            </h2>
            <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
              Khoảng thời gian: {getDateRangeInfo()}
            </p>
          </div>
          <div className='text-sm text-gray-600 dark:text-gray-400'>{events.length} sự kiện</div>
        </div>

        <div className='space-y-4'>
          {events.length === 0 ? (
            <div className='text-center py-8'>
              <div className='text-gray-500 dark:text-gray-400 text-lg mb-2'>
                Không có sự kiện nào
              </div>
              <p className='text-gray-400 dark:text-gray-500'>
                {Object.values(filters).some(f => f)
                  ? 'Không tìm thấy sự kiện phù hợp với bộ lọc'
                  : 'Chưa có lịch dạy nào trong khoảng thời gian này'}
              </p>
            </div>
          ) : (
            events.map(event => (
              <div
                key={event.id}
                className='border-l-4 border-orange-500 pl-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-md shadow-sm hover:shadow-md transition-shadow'
              >
                <div className='flex items-center justify-between mb-2'>
                  <h3 className='text-lg font-medium text-gray-800 dark:text-white/90'>
                    {event.title}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-semibold ${getStatusClass(
                      event.status
                    )}`}
                  >
                    {getStatusLabel(event.status)}
                  </span>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400'>
                  <div>
                    <span className='font-medium'>Lớp:</span> {event.class_name}
                  </div>
                  <div>
                    <span className='font-medium'>Phòng:</span> {event.room}
                  </div>
                  <div>
                    <span className='font-medium'>Thời gian:</span>{' '}
                    {new Date(event.start).toLocaleTimeString('vi-VN')} -{' '}
                    {new Date(event.end).toLocaleTimeString('vi-VN')}
                  </div>
                  <div>
                    <span className='font-medium'>Ngày:</span>{' '}
                    {new Date(event.start).toLocaleDateString('vi-VN')}
                  </div>
                  <div>
                    <span className='font-medium'>Học viên:</span> {event.attendees}/
                    {event.max_capacity}
                  </div>
                </div>
                <div className='mt-3 flex gap-2'>
                  <Button size='xs' variant='outline'>
                    Chi tiết
                  </Button>
                  <Button size='xs' variant='primary'>
                    Điểm danh
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className='flex flex-col sm:flex-row gap-4'>
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
    </div>
  );
}
