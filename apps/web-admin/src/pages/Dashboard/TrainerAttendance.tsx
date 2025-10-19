import { useEffect, useState } from 'react';
import Input from '../../components/form/input/InputField';
import Button from '../../components/ui/Button/Button';
import { scheduleService } from '../../services/schedule.service';

interface AttendanceRecord {
  id: string;
  member_name: string;
  member_email: string;
  class_name: string;
  schedule_date: string;
  schedule_time: string;
  checked_in_at?: string;
  checked_out_at?: string;
  attendance_method: string;
  class_rating?: number;
  trainer_rating?: number;
  feedback_notes?: string;
  status: 'PENDING' | 'PRESENT' | 'ABSENT' | 'LATE';
}

export default function TrainerAttendance() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Advanced filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'time' | 'status'>('name');

  useEffect(() => {
    fetchAttendanceRecords();
  }, [selectedDate]);

  // Filter and sort attendance records
  useEffect(() => {
    let filtered = [...attendanceRecords];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    // Class filter
    if (classFilter !== 'all') {
      filtered = filtered.filter(record =>
        record.class_name.toLowerCase().includes(classFilter.toLowerCase())
      );
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        record =>
          record.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.member_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.class_name.toLowerCase().includes(searchTerm.toLowerCase())
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

    setFilteredRecords(filtered);
  }, [attendanceRecords, statusFilter, classFilter, searchTerm, sortBy]);

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const response = await scheduleService.getTrainerAttendanceRecords(selectedDate);

      if (response.success) {
        // Ensure data is an array
        const data = Array.isArray(response.data) ? response.data : [];
        setAttendanceRecords(data);
      } else {
        throw new Error(response.message || 'Lỗi tải danh sách điểm danh');
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi tải danh sách điểm danh',
          duration: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };


  const getStatusLabel = (status: string) => {
    const statusLabels: { [key: string]: string } = {
      PENDING: 'Chờ điểm danh',
      PRESENT: 'Có mặt',
      ABSENT: 'Vắng mặt',
      LATE: 'Đi muộn',
    };
    return statusLabels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PRESENT: 'bg-green-100 text-green-800',
      ABSENT: 'bg-red-100 text-red-800',
      LATE: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getAttendanceMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      MANUAL: 'Thủ công',
      QR_CODE: 'QR Code',
      MOBILE_APP: 'Ứng dụng',
    };
    return methods[method] || method;
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

  const handleCheckIn = async (recordId: string) => {
    try {
      const response = await scheduleService.checkInAttendance(recordId);
      if (response.success) {
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: 'Điểm danh vào thành công',
            duration: 3000,
          });
        }
        // Refresh attendance records
        fetchAttendanceRecords();
      } else {
        throw new Error(response.message || 'Lỗi điểm danh vào');
      }
    } catch (error) {
      console.error('Error checking in:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi điểm danh vào',
          duration: 3000,
        });
      }
    }
  };

  const handleCheckOut = async (recordId: string) => {
    try {
      const response = await scheduleService.checkOutAttendance(recordId);
      if (response.success) {
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: 'Điểm danh ra thành công',
            duration: 3000,
          });
        }
        // Refresh attendance records
        fetchAttendanceRecords();
      } else {
        throw new Error(response.message || 'Lỗi điểm danh ra');
      }
    } catch (error) {
      console.error('Error checking out:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi điểm danh ra',
          duration: 3000,
        });
      }
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600 dark:text-gray-400'>Đang tải danh sách điểm danh...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6'>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-800 dark:text-white/90 mb-2'>
          Điểm danh học viên
        </h1>
        <p className='text-gray-600 dark:text-gray-400'>
          Quản lý điểm danh và theo dõi sự có mặt của học viên
        </p>
      </div>

      {/* Controls */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6'>
        {/* Date Control */}
        <div className='mb-6'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            Chọn ngày
          </label>
          <input
            type='date'
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className='w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
          />
        </div>

        {/* Advanced Filters */}
        <div className='border-t border-gray-200 dark:border-gray-700 pt-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            {/* Search */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Tìm kiếm
              </label>
              <input
                type='text'
                placeholder='Tìm theo tên, email, lớp...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Trạng thái
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
              >
                <option value='all'>Tất cả</option>
                <option value='PENDING'>Chờ điểm danh</option>
                <option value='PRESENT'>Có mặt</option>
                <option value='ABSENT'>Vắng mặt</option>
                <option value='LATE'>Đi muộn</option>
              </select>
            </div>

            {/* Class Filter */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Lớp học
              </label>
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
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
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Sắp xếp theo
              </label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'name' | 'time' | 'status')}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
              >
                <option value='name'>Tên học viên</option>
                <option value='time'>Thời gian</option>
                <option value='status'>Trạng thái</option>
              </select>
            </div>
          </div>

          {/* Filter Summary */}
          <div className='mt-4 flex items-center justify-between'>
            <div className='text-sm text-gray-600 dark:text-gray-400'>
              Hiển thị {filteredRecords.length} / {attendanceRecords.length} học viên
            </div>
            <div className='flex gap-2'>
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setClassFilter('all');
                  setSearchTerm('');
                  setSortBy('name');
                }}
                className='text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      <div className='space-y-4'>
        {filteredRecords.length > 0 ? (
          filteredRecords.map(record => (
            <div
              key={record.id}
              className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'
            >
              <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
                {/* Member Info */}
                <div className='flex-1'>
                  <div className='flex items-start justify-between mb-2'>
                    <div>
                      <h3 className='text-lg font-semibold text-gray-800 dark:text-white/90'>
                        {record.member_name}
                      </h3>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        {record.member_email}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(record.status)}`}
                    >
                      {getStatusLabel(record.status)}
                    </span>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4'>
                    <div>
                      <strong>Lớp học:</strong> {record.class_name}
                    </div>
                    <div>
                      <strong>Thời gian:</strong> {record.schedule_time}
                    </div>
                    {record.checked_in_at && (
                      <div>
                        <strong>Vào lúc:</strong> {formatDateTime(record.checked_in_at)}
                      </div>
                    )}
                    {record.checked_out_at && (
                      <div>
                        <strong>Ra lúc:</strong> {formatDateTime(record.checked_out_at)}
                      </div>
                    )}
                    {record.attendance_method && (
                      <div>
                        <strong>Phương thức:</strong>{' '}
                        {getAttendanceMethodLabel(record.attendance_method)}
                      </div>
                    )}
                  </div>

                  {/* Ratings */}
                  {(record.class_rating || record.trainer_rating) && (
                    <div className='flex items-center gap-4 text-sm'>
                      {record.class_rating && (
                        <div className='flex items-center'>
                          <span className='text-gray-600 dark:text-gray-400 mr-2'>
                            Đánh giá lớp:
                          </span>
                          <div className='flex'>
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${
                                  i < record.class_rating! ? 'text-yellow-400' : 'text-gray-300'
                                }`}
                                fill='currentColor'
                                viewBox='0 0 20 20'
                              >
                                <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                              </svg>
                            ))}
                          </div>
                        </div>
                      )}
                      {record.trainer_rating && (
                        <div className='flex items-center'>
                          <span className='text-gray-600 dark:text-gray-400 mr-2'>
                            Đánh giá trainer:
                          </span>
                          <div className='flex'>
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${
                                  i < record.trainer_rating! ? 'text-yellow-400' : 'text-gray-300'
                                }`}
                                fill='currentColor'
                                viewBox='0 0 20 20'
                              >
                                <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                              </svg>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {record.feedback_notes && (
                    <div className='mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md'>
                      <p className='text-sm text-blue-800 dark:text-blue-200'>
                        <strong>Feedback:</strong> {record.feedback_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className='flex flex-col gap-2'>
                  {record.status === 'PENDING' && (
                    <div className='flex gap-2'>
                      <Button size='sm' onClick={() => handleCheckIn(record.id)}>
                        Điểm danh vào
                      </Button>
                    </div>
                  )}

                  {record.status === 'PRESENT' && !record.checked_out_at && (
                    <div className='flex gap-2'>
                      <Button size='sm' variant='outline' onClick={() => handleCheckOut(record.id)}>
                        Điểm danh ra
                      </Button>
                    </div>
                  )}

                  {record.status === 'LATE' && (
                    <div className='flex gap-2'>
                      <Button size='sm' variant='outline' onClick={() => handleCheckOut(record.id)}>
                        Điểm danh ra
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
              {attendanceRecords.length === 0 
                ? 'Không có lịch dạy nào trong ngày được chọn'
                : 'Không tìm thấy bản ghi điểm danh nào phù hợp với bộ lọc'
              }
            </div>
            {attendanceRecords.length > 0 && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setClassFilter('all');
                  setSearchTerm('');
                  setSortBy('name');
                }}
                className='mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
              >
                Xóa bộ lọc để xem tất cả
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
