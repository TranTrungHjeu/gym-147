import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Printer, RefreshCw, Search, Users, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AdminCard from '../../components/common/AdminCard';
import AdminModal from '../../components/common/AdminModal';
import CustomSelect from '../../components/common/CustomSelect';
import DatePicker from '../../components/common/DatePicker';
import ExportButton from '../../components/common/ExportButton';
import MetricCard from '../../components/dashboard/MetricCard';
import { PageLoading, SimpleLoading } from '../../components/ui/AppLoading';
import Button from '../../components/ui/Button/Button';
import { MemberService } from '../../services/member.service';
import { scheduleService } from '../../services/schedule.service';
import { getCurrentUser } from '../../utils/auth';

interface AttendanceRecord {
  id: string;
  schedule_id: string;
  member_id?: string;
  member_name: string;
  member_email: string;
  class_name: string;
  schedule_date: string;
  schedule_time: string;
  checked_in_at?: string;
  checked_out_at?: string;
  attendance_method: string;
  member_phone?: string;
  member_membership_status?: string;
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
  const [sortBy, setSortBy] = useState<'name' | 'time' | 'status'>('name');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [memberDetails, setMemberDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Memoize fetchAttendanceRecords to prevent unnecessary re-renders
  const fetchAttendanceRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await scheduleService.getTrainerAttendanceRecords(selectedDate);

      if (response.success) {
        // Handle different response structures
        let data: any[] = [];
        if (Array.isArray(response.data)) {
          data = response.data;
        } else if (response.data && typeof response.data === 'object') {
          if (Array.isArray((response.data as any).attendanceRecords)) {
            data = (response.data as any).attendanceRecords;
          } else if (
            (response.data as any).data &&
            Array.isArray((response.data as any).data.attendanceRecords)
          ) {
            data = (response.data as any).data.attendanceRecords;
          }
        }

        // Map the data to include schedule_date and schedule_time from class_date and class_time
        const mappedData: AttendanceRecord[] = data.map((record: any) => ({
          id: record.id || '',
          schedule_id: record.schedule_id || '',
          member_id: record.member_id || '',
          member_name: record.member_name || 'Unknown Member',
          member_email: record.member_email || 'unknown@example.com',
          member_phone:
            record.member_phone || record.phone || record.phone_number || record.member?.phone || '',
          member_membership_status:
            record.member_membership_status ||
            record.membership_status ||
            record.member_status ||
            record.current_membership?.status ||
            '',
          class_name: record.class_name || 'Unknown Class',
          schedule_date: record.schedule_date || record.class_date || '',
          schedule_time: record.schedule_time || record.class_time || '',
          checked_in_at: record.checked_in_at || undefined,
          checked_out_at: record.checked_out_at || undefined,
          attendance_method: record.attendance_method || 'MANUAL',
          class_rating: record.class_rating || undefined,
          trainer_rating: record.trainer_rating || undefined,
          feedback_notes: record.feedback_notes || undefined,
          status: record.checked_in_at
            ? record.checked_out_at
              ? 'PRESENT'
              : 'PRESENT'
            : ('PENDING' as 'PENDING' | 'PRESENT' | 'ABSENT' | 'LATE'),
        }));

        setAttendanceRecords(mappedData);
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
  }, [selectedDate]);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [fetchAttendanceRecords]);

  // Filter and sort attendance records
  useEffect(() => {
    let filtered = [...attendanceRecords];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    // Search filter (includes class_name)
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
  }, [attendanceRecords, statusFilter, searchTerm, sortBy]);

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
      PENDING:
        'bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/20 text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)]',
      PRESENT:
        'bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/20 text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)]',
      ABSENT:
        'bg-[var(--color-gray-200)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)]',
      LATE: 'bg-[var(--color-orange-200)] dark:bg-[var(--color-orange-800)]/30 text-[var(--color-orange-800)] dark:text-[var(--color-orange-300)]',
    };
    return (
      colors[status] ||
      'bg-[var(--color-gray-100)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-800)] dark:text-[var(--color-gray-200)]'
    );
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

  const handleViewDetails = async (record: AttendanceRecord) => {
    try {
      setSelectedRecord(record);
      setIsDetailModalOpen(true);
      setLoadingDetails(true);

      // Try to fetch member details if member_id is available
      if (record.member_id) {
        try {
          const member = await MemberService.getMemberById(record.member_id);
          setMemberDetails(member);
        } catch (memberError) {
          console.error('Error fetching member details:', memberError);
          // Continue without member details
        }
      }
    } catch (error: any) {
      console.error('Error opening detail modal:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRecord(null);
    setMemberDetails(null);
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchAttendanceRecords();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCheckIn = async (record: AttendanceRecord) => {
    if (!record.schedule_id || !record.member_id) {
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Thiếu thông tin schedule_id hoặc member_id',
          duration: 3000,
        });
      }
      return;
    }

    try {
      // Get current user ID
      const user = getCurrentUser();
      if (!user?.id) {
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
        record.schedule_id,
        record.member_id,
        user.id
      );

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
    } catch (error: any) {
      console.error('Error checking in:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: error.message || 'Lỗi điểm danh vào',
          duration: 3000,
        });
      }
    }
  };

  const handleCheckOut = async (record: AttendanceRecord) => {
    if (!record.schedule_id || !record.member_id) {
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Thiếu thông tin schedule_id hoặc member_id',
          duration: 3000,
        });
      }
      return;
    }

    try {
      // Get current user ID
      const user = getCurrentUser();
      if (!user?.id) {
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
        record.schedule_id,
        record.member_id,
        user.id
      );

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
    } catch (error: any) {
      console.error('Error checking out:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: error.message || 'Lỗi điểm danh ra',
          duration: 3000,
        });
      }
    }
  };

  // Calculate stats
  const stats = {
    total: attendanceRecords.length,
    present: attendanceRecords.filter(r => r.status === 'PRESENT').length,
    pending: attendanceRecords.filter(r => r.status === 'PENDING').length,
    absent: attendanceRecords.filter(r => r.status === 'ABSENT').length,
  };

  if (loading) {
    return <PageLoading />;
  }

  const memberPhoneDisplay =
    memberDetails?.phone ||
    memberDetails?.phone_number ||
    memberDetails?.user?.phone ||
    selectedRecord?.member_phone ||
    'N/A';

  const memberStatusDisplay =
    memberDetails?.membership_status ||
    memberDetails?.member_status ||
    memberDetails?.current_membership?.status ||
    memberDetails?.currentMembership?.status ||
    selectedRecord?.member_membership_status ||
    'N/A';

  return (
    <div className='min-h-screen-full bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-900)]'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-full'>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='mb-4'
        >
          <AdminCard className='rounded-none border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] p-5'>
            <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
              <div>
                <h1 className='text-2xl lg:text-3xl font-bold tracking-tight text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-heading'>
                  Điểm danh lớp học
                </h1>
                <p className='mt-1 text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                  Theo dõi trạng thái điểm danh theo ngày, kiểm soát nhanh check-in/check-out.
                </p>
              </div>

              <div className='flex items-center gap-2'>
                <div className='px-3 py-2 rounded-none border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] text-xs text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                  Ngày chọn: <span className='font-semibold'>{selectedDate}</span>
                </div>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className='h-9 w-9 !px-0 !rounded-full border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'
                  title='Làm mới'
                  aria-label='Làm mới'
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </AdminCard>
        </motion.div>

        <div className='grid grid-cols-1 lg:grid-cols-12 gap-4'>
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className='lg:col-span-4 space-y-4'
          >
            <AdminCard className='rounded-none p-4'>
              <h3 className='text-xs uppercase tracking-wide font-semibold text-[var(--color-gray-700)] dark:text-[var(--color-gray-200)] mb-3 font-sans'>
                Bộ lọc dữ liệu
              </h3>

              <div className='space-y-3'>
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

                <div className='group relative'>
                  <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
                  <input
                    type='text'
                    placeholder='Tìm theo tên, email, lớp...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className='w-full h-9 pl-9 pr-3 text-xs border border-gray-300 dark:border-gray-700 rounded-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter'
                  />
                </div>

                <CustomSelect
                  options={[
                    { value: 'all', label: 'Tất cả trạng thái' },
                    { value: 'PENDING', label: 'Chờ điểm danh' },
                    { value: 'PRESENT', label: 'Có mặt' },
                    { value: 'ABSENT', label: 'Vắng mặt' },
                    { value: 'LATE', label: 'Đi muộn' },
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder='Tất cả trạng thái'
                  className='font-inter w-full'
                />

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

              <div className='mt-4 pt-3 border-t border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] flex items-center justify-between'>
                <div className='text-xs text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                  {filteredRecords.length}/{attendanceRecords.length} học viên
                </div>
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchTerm('');
                    setSortBy('name');
                  }}
                  className='text-xs font-medium text-[var(--color-orange-600)] hover:text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)] dark:hover:text-[var(--color-orange-300)] font-sans'
                >
                  Xóa lọc
                </button>
              </div>
            </AdminCard>

            <AdminCard className='rounded-none p-4'>
              <h3 className='text-xs uppercase tracking-wide font-semibold text-[var(--color-gray-700)] dark:text-[var(--color-gray-200)] mb-3 font-sans'>
                Thao tác nhanh
              </h3>

              <div className='space-y-2'>
                {filteredRecords.length > 0 && (
                  <ExportButton
                    data={filteredRecords.map(record => ({
                      'Tên học viên': record.member_name,
                      Email: record.member_email,
                      'Lớp học': record.class_name,
                      Ngày: record.schedule_date,
                      'Thời gian': record.schedule_time,
                      'Trạng thái': getStatusLabel(record.status),
                      'Vào lúc': record.checked_in_at ? formatDateTime(record.checked_in_at) : '',
                      'Ra lúc': record.checked_out_at ? formatDateTime(record.checked_out_at) : '',
                      'Phương thức': getAttendanceMethodLabel(record.attendance_method),
                    }))}
                    columns={[
                      { key: 'Tên học viên', label: 'Tên học viên' },
                      { key: 'Email', label: 'Email' },
                      { key: 'Lớp học', label: 'Lớp học' },
                      { key: 'Ngày', label: 'Ngày' },
                      { key: 'Thời gian', label: 'Thời gian' },
                      { key: 'Trạng thái', label: 'Trạng thái' },
                      { key: 'Vào lúc', label: 'Vào lúc' },
                      { key: 'Ra lúc', label: 'Ra lúc' },
                      { key: 'Phương thức', label: 'Phương thức' },
                    ]}
                    filename={`attendance-${selectedDate}`}
                    title='Báo cáo điểm danh'
                    variant='outline'
                    size='sm'
                  />
                )}

                {filteredRecords.length > 0 && (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      window.print();
                    }}
                    className='w-full rounded-none border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] hover:bg-[var(--color-gray-50)] dark:hover:bg-[var(--color-gray-700)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'
                  >
                    <Printer className='w-3.5 h-3.5 mr-2' />
                    In báo cáo
                  </Button>
                )}
              </div>

              <div className='mt-4 pt-3 border-t border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] space-y-1 text-xs text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                <div className='flex justify-between'>
                  <span>Tổng</span>
                  <span className='font-semibold'>{stats.total}</span>
                </div>
                <div className='flex justify-between'>
                  <span>Có mặt</span>
                  <span className='font-semibold text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'>
                    {stats.present}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span>Chờ</span>
                  <span className='font-semibold text-[var(--color-orange-500)] dark:text-[var(--color-orange-400)]'>
                    {stats.pending}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span>Vắng</span>
                  <span className='font-semibold text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)]'>
                    {stats.absent}
                  </span>
                </div>
              </div>
            </AdminCard>
          </motion.aside>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className='lg:col-span-8 space-y-4'
          >
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              <MetricCard
                icon={Users}
                label='Tổng học viên'
                value={stats.total}
                iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
              />
              <MetricCard
                icon={CheckCircle2}
                label='Có mặt'
                value={stats.present}
                iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
              />
              <MetricCard
                icon={Clock}
                label='Chờ điểm danh'
                value={stats.pending}
                iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
              />
              <MetricCard
                icon={XCircle}
                label='Vắng mặt'
                value={stats.absent}
                iconBgColor='bg-[var(--color-gray-200)] dark:bg-[var(--color-gray-700)]'
                iconColor='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)]'
              />
            </div>

            {filteredRecords.length > 0 ? (
              <div className='space-y-3'>
                {filteredRecords.map(record => (
                  <AdminCard
                    key={record.id}
                    hover
                    className='rounded-none border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] p-0 overflow-hidden'
                  >
                    <div className='grid grid-cols-1 xl:grid-cols-12'>
                      <div className='xl:col-span-9 p-4'>
                        <div className='flex flex-wrap items-start justify-between gap-2 mb-3'>
                          <div>
                            <h3 className='text-base lg:text-lg font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-heading'>
                              {record.member_name}
                            </h3>
                            <p className='text-xs lg:text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                              {record.member_email}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 text-xs rounded-none font-medium font-sans ${getStatusColor(
                              record.status
                            )}`}
                          >
                            {getStatusLabel(record.status)}
                          </span>
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                          <div>
                            <strong className='text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                              Lớp học:
                            </strong>{' '}
                            {record.class_name}
                          </div>
                          <div>
                            <strong className='text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                              Thời gian:
                            </strong>{' '}
                            {record.schedule_time}
                          </div>
                          {record.checked_in_at && (
                            <div>
                              <strong className='text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                                Vào lúc:
                              </strong>{' '}
                              {formatDateTime(record.checked_in_at)}
                            </div>
                          )}
                          {record.checked_out_at && (
                            <div>
                              <strong className='text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                                Ra lúc:
                              </strong>{' '}
                              {formatDateTime(record.checked_out_at)}
                            </div>
                          )}
                          {record.attendance_method && (
                            <div>
                              <strong className='text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                                Phương thức:
                              </strong>{' '}
                              {getAttendanceMethodLabel(record.attendance_method)}
                            </div>
                          )}
                        </div>

                        {(record.class_rating || record.trainer_rating) && (
                          <div className='mt-3 flex flex-wrap items-center gap-3 text-sm font-sans'>
                            {record.class_rating && (
                              <div className='flex items-center'>
                                <span className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] mr-2'>
                                  Đánh giá lớp:
                                </span>
                                <div className='flex'>
                                  {[...Array(5)].map((_, i) => (
                                    <svg
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < record.class_rating!
                                          ? 'text-[var(--color-orange-500)] dark:text-[var(--color-orange-400)]'
                                          : 'text-[var(--color-gray-300)] dark:text-[var(--color-gray-600)]'
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
                                <span className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] mr-2'>
                                  Đánh giá trainer:
                                </span>
                                <div className='flex'>
                                  {[...Array(5)].map((_, i) => (
                                    <svg
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < record.trainer_rating!
                                          ? 'text-[var(--color-orange-500)] dark:text-[var(--color-orange-400)]'
                                          : 'text-[var(--color-gray-300)] dark:text-[var(--color-gray-600)]'
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
                          <div className='mt-3 p-3 bg-[var(--color-orange-50)] dark:bg-[var(--color-orange-900)]/20 rounded-none border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)]'>
                            <p className='text-sm text-[var(--color-orange-800)] dark:text-[var(--color-orange-200)] font-sans'>
                              <strong>Feedback:</strong> {record.feedback_notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className='xl:col-span-3 border-t xl:border-t-0 xl:border-l border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] p-4 bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-800)]/60'>
                        <div className='flex flex-col gap-2'>
                          {(!record.checked_in_at || record.status === 'PENDING') && (
                            <Button
                              size='sm'
                              onClick={() => handleCheckIn(record)}
                              className='w-full rounded-none bg-gradient-to-r from-[var(--color-orange-600)] to-[var(--color-orange-700)] hover:from-[var(--color-orange-700)] hover:to-[var(--color-orange-800)] text-[var(--color-white)] border-0'
                            >
                              Điểm danh vào
                            </Button>
                          )}

                          {record.checked_in_at && !record.checked_out_at && (
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() => handleCheckOut(record)}
                              className='w-full rounded-none border-[var(--color-orange-300)] dark:border-[var(--color-orange-600)] text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] hover:bg-[var(--color-orange-50)] dark:hover:bg-[var(--color-orange-900)]/10'
                            >
                              Điểm danh ra
                            </Button>
                          )}

                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => handleViewDetails(record)}
                            className='w-full rounded-none border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'
                          >
                            Chi tiết
                          </Button>
                        </div>
                      </div>
                    </div>
                  </AdminCard>
                ))}
              </div>
            ) : (
              <AdminCard className='rounded-none'>
                <div className='text-center py-14'>
                  <Users className='w-16 h-16 text-[var(--color-gray-300)] dark:text-[var(--color-gray-600)] mx-auto mb-4' />
                  <div className='text-sm text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                    {attendanceRecords.length === 0
                      ? 'Không có lịch dạy nào trong ngày được chọn'
                      : 'Không tìm thấy bản ghi điểm danh nào phù hợp với bộ lọc'}
                  </div>
                  {attendanceRecords.length > 0 && (
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
          </motion.section>
        </div>
      </div>

      {/* Attendance Detail Modal */}
      <AdminModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        title={`Chi tiết điểm danh - ${selectedRecord?.member_name || 'N/A'}`}
        size='lg'
        square
      >
        {loadingDetails ? (
          <div className='min-h-[260px] flex items-center justify-center'>
            <SimpleLoading size='medium' />
          </div>
        ) : (
          <div className='space-y-4'>
            <AdminCard className='rounded-none border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)] bg-gradient-to-r from-[var(--color-orange-50)] to-[var(--color-white)] dark:from-[var(--color-orange-900)]/20 dark:to-[var(--color-gray-800)]'>
              <div className='grid grid-cols-1 md:grid-cols-12 gap-4 items-center'>
                <div className='md:col-span-8'>
                  <p className='text-xs uppercase tracking-wide font-semibold text-[var(--color-orange-700)] dark:text-[var(--color-orange-300)] font-sans'>
                    Tổng quan phiên điểm danh
                  </p>
                  <h3 className='mt-1 text-lg font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-heading'>
                    {selectedRecord?.member_name || 'N/A'}
                  </h3>
                  <p className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                    {selectedRecord?.class_name || 'N/A'} · {selectedRecord?.schedule_time || 'N/A'}
                  </p>
                </div>

                <div className='md:col-span-4 flex md:justify-end'>
                  <span
                    className={`px-3 py-1.5 text-xs rounded-none font-semibold font-sans ${getStatusColor(
                      selectedRecord?.status || ''
                    )}`}
                  >
                    {getStatusLabel(selectedRecord?.status || '')}
                  </span>
                </div>
              </div>
            </AdminCard>

            <div className='grid grid-cols-1 lg:grid-cols-12 gap-4'>
              <AdminCard className='rounded-none lg:col-span-7'>
                <h3 className='text-base font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-3 font-heading'>
                  Thông tin điểm danh
                </h3>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  <div className='p-3 border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-none'>
                    <p className='text-[11px] uppercase tracking-wide font-medium text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                      Ngày học
                    </p>
                    <p className='mt-1 text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      {selectedRecord?.schedule_date
                        ? new Date(selectedRecord.schedule_date).toLocaleDateString('vi-VN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </p>
                  </div>

                  <div className='p-3 border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-none'>
                    <p className='text-[11px] uppercase tracking-wide font-medium text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                      Phương thức
                    </p>
                    <p className='mt-1 text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      {getAttendanceMethodLabel(selectedRecord?.attendance_method || '')}
                    </p>
                  </div>

                  <div className='p-3 border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-none'>
                    <p className='text-[11px] uppercase tracking-wide font-medium text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                      Check-in
                    </p>
                    <p className='mt-1 text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      {selectedRecord?.checked_in_at
                        ? formatDateTime(selectedRecord.checked_in_at)
                        : 'Chưa check-in'}
                    </p>
                  </div>

                  <div className='p-3 border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-none'>
                    <p className='text-[11px] uppercase tracking-wide font-medium text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                      Check-out
                    </p>
                    <p className='mt-1 text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      {selectedRecord?.checked_out_at
                        ? formatDateTime(selectedRecord.checked_out_at)
                        : 'Chưa check-out'}
                    </p>
                  </div>
                </div>
              </AdminCard>

              <AdminCard className='rounded-none lg:col-span-5'>
                <h3 className='text-base font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-3 font-heading'>
                  Hồ sơ hội viên
                </h3>

                <div className='space-y-2'>
                  <div className='p-3 border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-none'>
                    <p className='text-[11px] uppercase tracking-wide font-medium text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                      Họ và tên
                    </p>
                    <p className='mt-1 text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      {memberDetails?.full_name || selectedRecord?.member_name || 'N/A'}
                    </p>
                  </div>

                  <div className='p-3 border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-none'>
                    <p className='text-[11px] uppercase tracking-wide font-medium text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                      Email
                    </p>
                    <p className='mt-1 text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans break-all'>
                      {memberDetails?.email || selectedRecord?.member_email || 'N/A'}
                    </p>
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                    <div className='p-3 border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-none'>
                      <p className='text-[11px] uppercase tracking-wide font-medium text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                        Điện thoại
                      </p>
                      <p className='mt-1 text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                        {memberPhoneDisplay}
                      </p>
                    </div>
                    <div className='p-3 border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-none'>
                      <p className='text-[11px] uppercase tracking-wide font-medium text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                        Trạng thái
                      </p>
                      <p className='mt-1 text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                        {memberStatusDisplay}
                      </p>
                    </div>
                  </div>
                </div>
              </AdminCard>
            </div>

            {(selectedRecord?.class_rating ||
              selectedRecord?.trainer_rating ||
              selectedRecord?.feedback_notes) && (
              <AdminCard className='rounded-none bg-[var(--color-orange-50)] dark:bg-[var(--color-orange-900)]/20 border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)]'>
                <h3 className='text-base font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-3 font-heading'>
                  Đánh giá và phản hồi
                </h3>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {selectedRecord?.class_rating && (
                    <div className='p-3 rounded-none border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)] bg-[var(--color-white)] dark:bg-[var(--color-gray-900)]'>
                      <label className='text-xs uppercase tracking-wide font-medium text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                        Đánh giá lớp học
                      </label>
                      <div className='flex items-center gap-1 mt-1'>
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${
                              i < selectedRecord.class_rating!
                                ? 'text-[var(--color-orange-500)] dark:text-[var(--color-orange-400)]'
                                : 'text-[var(--color-gray-300)] dark:text-[var(--color-gray-600)]'
                            }`}
                            fill='currentColor'
                            viewBox='0 0 20 20'
                          >
                            <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                          </svg>
                        ))}
                        <span className='text-sm text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans ml-2'>
                          ({selectedRecord.class_rating}/5)
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedRecord?.trainer_rating && (
                    <div className='p-3 rounded-none border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)] bg-[var(--color-white)] dark:bg-[var(--color-gray-900)]'>
                      <label className='text-xs uppercase tracking-wide font-medium text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                        Đánh giá trainer
                      </label>
                      <div className='flex items-center gap-1 mt-1'>
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${
                              i < selectedRecord.trainer_rating!
                                ? 'text-[var(--color-orange-500)] dark:text-[var(--color-orange-400)]'
                                : 'text-[var(--color-gray-300)] dark:text-[var(--color-gray-600)]'
                            }`}
                            fill='currentColor'
                            viewBox='0 0 20 20'
                          >
                            <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                          </svg>
                        ))}
                        <span className='text-sm text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans ml-2'>
                          ({selectedRecord.trainer_rating}/5)
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedRecord?.feedback_notes && (
                    <div className='md:col-span-2 p-3 rounded-none border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)] bg-[var(--color-white)] dark:bg-[var(--color-gray-900)]'>
                      <label className='text-xs uppercase tracking-wide font-medium text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                        Ghi chú phản hồi
                      </label>
                      <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans mt-1 leading-relaxed'>
                        {selectedRecord.feedback_notes}
                      </p>
                    </div>
                  )}
                </div>
              </AdminCard>
            )}
          </div>
        )}
        <div className='flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
          <Button
            variant='outline'
            onClick={closeDetailModal}
            className='rounded-none border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'
          >
            Đóng
          </Button>
        </div>
      </AdminModal>
    </div>
  );
}
