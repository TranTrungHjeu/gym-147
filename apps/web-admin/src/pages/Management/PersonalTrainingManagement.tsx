import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useToast } from '../../hooks/useToast';
import { personalTrainingService, PersonalTrainingSession, PTSessionStats, CreatePTSessionData } from '../../services/personalTraining.service';
import { Search, Plus, RefreshCw, Edit, Trash2, Calendar, User, Users, TrendingUp, Award, Clock, DollarSign, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import { AdminTable, AdminTableHeader, AdminTableBody, AdminTableRow, AdminTableCell } from '../../components/common/AdminTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import CustomSelect from '../../components/common/CustomSelect';
import AdvancedFilters from '../../components/common/AdvancedFilters';
import ExportButton from '../../components/common/ExportButton';
import { TableLoading } from '../../components/ui/AppLoading';
import { formatVietnamDateTime } from '../../utils/dateTime';
import StatusBadge from '../../components/common/StatusBadge';
import AdminButton from '../../components/common/AdminButton';
import AdminModal from '../../components/common/AdminModal';

const PersonalTrainingManagement: React.FC = () => {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<PersonalTrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<PTSessionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [trainerFilter, setTrainerFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSession, setSelectedSession] = useState<PersonalTrainingSession | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<PersonalTrainingSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreatePTSessionData>({
    member_id: '',
    trainer_id: '',
    scheduled_date: '',
    start_time: '',
    duration: 60,
    price: 0,
    goals: [],
    notes: '',
  });
  const prevPageRef = React.useRef(currentPage);
  const isInitialLoadRef = React.useRef(true);

  const loadSessions = useCallback(async (isPageChange = false) => {
    try {
      // Only show full loading on initial load, not on page changes
      if (!isPageChange) {
        setIsLoading(true);
      }
      const response = await personalTrainingService.getAllSessions({
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        trainer_id: trainerFilter !== 'all' ? trainerFilter : undefined,
        search: searchTerm || undefined,
      });
      if (response.success) {
        setSessions(response.data.sessions || []);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error: any) {
      showToast('Không thể tải danh sách buổi tập PT', 'error');
      console.error('Error loading PT sessions:', error);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, statusFilter, trainerFilter, searchTerm, showToast]);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await personalTrainingService.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error: any) {
      console.error('Error loading PT stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadTrainers = useCallback(async () => {
    try {
      const { trainerService } = await import('../../services/trainer.service');
      const response = await trainerService.getAllTrainers();
      if (response.success) {
        setTrainers(response.data.trainers || []);
      }
    } catch (error) {
      console.error('Error loading trainers:', error);
    }
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const { MemberService } = await import('../../services/member.service');
      const response = await MemberService.getMembers({ limit: 1000, status: 'ACTIVE' });
      if (response.members) {
        setMembers(response.members || []);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  }, []);

  const handleCreateSession = async () => {
    // Validation
    if (!createFormData.member_id || !createFormData.trainer_id || !createFormData.scheduled_date || !createFormData.start_time) {
      showToast('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(createFormData.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      showToast('Ngày tập không được là ngày trong quá khứ', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const response = await personalTrainingService.createSession(createFormData);
      if (response.success) {
        showToast('Tạo buổi tập PT thành công', 'success');
        setIsCreateModalOpen(false);
        setCreateFormData({
          member_id: '',
          trainer_id: '',
          scheduled_date: '',
          start_time: '',
          duration: 60,
          price: 0,
          status: 'SCHEDULED',
          goals: [],
          notes: '',
        });
        await loadSessions();
        await loadStats();
      } else {
        showToast(response.message || 'Không thể tạo buổi tập PT', 'error');
      }
    } catch (error: any) {
      console.error('Error creating PT session:', error);
      showToast(error.response?.data?.message || 'Không thể tạo buổi tập PT', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    const isPageChange = prevPageRef.current !== currentPage && !isInitialLoadRef.current;
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
    }
    prevPageRef.current = currentPage;
    loadSessions(isPageChange);
    // Only load stats on initial load
    if (!isPageChange) {
      loadStats();
      loadTrainers();
      loadMembers();
    }
  }, [loadSessions, loadStats, loadTrainers, currentPage]);

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'CONFIRMED':
        return 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800';
      case 'IN_PROGRESS':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'COMPLETED':
        return 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800';
      case 'CANCELLED':
        return 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300 border-error-200 dark:border-error-800';
      case 'NO_SHOW':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'SCHEDULED': 'Đã lên lịch',
      'CONFIRMED': 'Đã xác nhận',
      'IN_PROGRESS': 'Đang diễn ra',
      'COMPLETED': 'Hoàn thành',
      'CANCELLED': 'Đã hủy',
      'NO_SHOW': 'Vắng mặt',
    };
    return statusMap[status] || status;
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const matchesSearch = 
        session.member?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.trainer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.guest_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
      const matchesTrainer = trainerFilter === 'all' || session.trainer_id === trainerFilter;
      return matchesSearch && matchesStatus && matchesTrainer;
    });
  }, [sessions, searchTerm, statusFilter, trainerFilter]);

  const handleDelete = async () => {
    if (!sessionToDelete) return;
    try {
      setIsDeleting(true);
      await personalTrainingService.deleteSession(sessionToDelete.id);
      showToast('Xóa buổi tập PT thành công', 'success');
      await loadSessions();
      setIsDeleteDialogOpen(false);
      setSessionToDelete(null);
    } catch (error: any) {
      showToast(error.message || 'Không thể xóa buổi tập PT', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewDetail = (session: PersonalTrainingSession) => {
    setSelectedSession(session);
    setIsDetailModalOpen(true);
  };

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-start'>
        <div>
          <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
            Quản lý Personal Training
          </h1>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
            Quản lý tất cả các buổi tập huấn luyện cá nhân
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <AdminButton
            variant='outline'
            size='sm'
            icon={RefreshCw}
            onClick={() => {
              loadSessions();
              loadStats();
            }}
          >
            Làm mới
          </AdminButton>
          <AdminButton
            variant='primary'
            size='sm'
            icon={Plus}
            onClick={() => {
              setIsCreateModalOpen(true);
            }}
          >
            Tạo buổi tập PT
          </AdminButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <Calendar className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                  {statsLoading ? '...' : stats?.total || 0}
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium mt-0.5'>
                  Tổng số buổi tập
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <CheckCircle2 className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                  {statsLoading ? '...' : stats?.completed || 0}
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium mt-0.5'>
                  Đã hoàn thành
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <Clock className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                  {statsLoading ? '...' : stats?.scheduled || 0}
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium mt-0.5'>
                  Đã lên lịch
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <DollarSign className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                  {statsLoading ? '...' : `${(stats?.revenue || 0).toLocaleString('vi-VN')} VND`}
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium mt-0.5'>
                  Doanh thu
                </div>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters
        filters={{
          search: searchTerm,
          status: statusFilter !== 'all' ? statusFilter : '',
          customFilters: {
            trainer_id: trainerFilter !== 'all' ? trainerFilter : '',
          },
        }}
        onFiltersChange={(newFilters) => {
          setSearchTerm(newFilters.search || '');
          setStatusFilter(newFilters.status || 'all');
          setTrainerFilter(newFilters.customFilters?.trainer_id || 'all');
          setCurrentPage(1);
        }}
        availableStatuses={[
          { value: 'SCHEDULED', label: 'Đã lên lịch' },
          { value: 'CONFIRMED', label: 'Đã xác nhận' },
          { value: 'IN_PROGRESS', label: 'Đang diễn ra' },
          { value: 'COMPLETED', label: 'Hoàn thành' },
          { value: 'CANCELLED', label: 'Đã hủy' },
          { value: 'NO_SHOW', label: 'Vắng mặt' },
        ]}
        showStatus={true}
        showCategory={false}
        customFilterFields={[
          {
            key: 'trainer_id',
            label: 'Huấn luyện viên',
            type: 'select',
            options: [
              { value: 'all', label: 'Tất cả' },
              ...trainers.map(t => ({ value: t.id, label: t.full_name })),
            ],
          },
        ]}
      />

      {/* Export and Actions */}
      <div className='flex justify-between items-center'>
        <div className='text-sm text-gray-600 dark:text-gray-400'>
          Tổng cộng: {filteredSessions.length} buổi tập
        </div>
        {filteredSessions.length > 0 && (
          <ExportButton
            data={filteredSessions.map(session => ({
              'Thành viên': session.member?.full_name || 'N/A',
              'Huấn luyện viên': session.trainer?.full_name || 'N/A',
              'Ngày tập': session.scheduled_date ? formatVietnamDateTime(session.scheduled_date) : '',
              'Thời gian': `${session.start_time} - ${session.end_time}`,
              'Trạng thái': getStatusLabel(session.status),
              'Giá': session.price ? `${session.price.toLocaleString('vi-VN')} VND` : 'Miễn phí',
              'Loại': session.session_type === 'IN_PERSON' ? 'Trực tiếp' : session.session_type === 'ONLINE' ? 'Online' : 'Nhóm',
              'Đánh giá': session.rating ? `${session.rating}/5` : 'Chưa đánh giá',
              'Ghi chú': session.notes || '',
            }))}
            columns={[
              { key: 'Thành viên', label: 'Thành viên' },
              { key: 'Huấn luyện viên', label: 'Huấn luyện viên' },
              { key: 'Ngày tập', label: 'Ngày tập' },
              { key: 'Thời gian', label: 'Thời gian' },
              { key: 'Trạng thái', label: 'Trạng thái' },
              { key: 'Giá', label: 'Giá' },
            ]}
            filename='danh-sach-pt-sessions'
            title='Danh sách Buổi tập Personal Training'
            variant='outline'
            size='sm'
          />
        )}
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <TableLoading text='Đang tải danh sách buổi tập PT...' />
      ) : filteredSessions.length === 0 ? (
        <AdminCard padding='md' className='text-center'>
          <div className='flex flex-col items-center justify-center py-12'>
            <Calendar className='w-20 h-20 text-gray-300 dark:text-gray-700 mb-4' />
            <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-heading mb-2'>
              {searchTerm ? 'Không tìm thấy buổi tập nào' : 'Không có buổi tập nào'}
            </div>
          </div>
        </AdminCard>
      ) : (
        <>
          <AdminCard padding='none'>
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell header>Thành viên</AdminTableCell>
                  <AdminTableCell header>Huấn luyện viên</AdminTableCell>
                  <AdminTableCell header>Ngày & Giờ</AdminTableCell>
                  <AdminTableCell header>Trạng thái</AdminTableCell>
                  <AdminTableCell header>Giá</AdminTableCell>
                  <AdminTableCell header>Đánh giá</AdminTableCell>
                  <AdminTableCell header className='text-right'>Thao tác</AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {filteredSessions.map((session, index) => (
                  <AdminTableRow
                    key={session.id}
                    className={`group relative border-l-4 border-l-transparent hover:border-l-orange-500 transition-all duration-200 ${
                      index % 2 === 0
                        ? 'bg-white dark:bg-gray-900'
                        : 'bg-gray-50/50 dark:bg-gray-800/50'
                    } hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 dark:hover:from-orange-900/20 dark:hover:to-orange-800/10`}
                  >
                    <AdminTableCell>
                      <div className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                        {session.member?.full_name || 'N/A'}
                      </div>
                      {session.member?.email && (
                        <div className='text-[10px] text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                          {session.member.email}
                        </div>
                      )}
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                        {session.trainer?.full_name || 'N/A'}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                        {session.scheduled_date ? formatVietnamDateTime(session.scheduled_date, 'date') : 'N/A'}
                      </div>
                      <div className='text-[10px] text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                        {session.start_time} - {session.end_time}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <span className={`px-2.5 py-1 inline-flex text-theme-xs font-semibold font-heading rounded-full border ${getStatusColor(session.status)}`}>
                        {getStatusLabel(session.status)}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                        {session.price ? `${session.price.toLocaleString('vi-VN')} VND` : 'Miễn phí'}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      {session.rating ? (
                        <div className='flex items-center gap-1'>
                          <Award className='w-4 h-4 text-yellow-500' />
                          <span className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                            {session.rating}/5
                          </span>
                        </div>
                      ) : (
                        <span className='text-theme-xs text-gray-400 dark:text-gray-500'>Chưa đánh giá</span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className='text-right'>
                      <div className='flex items-center justify-end gap-2'>
                        <button
                          onClick={() => handleViewDetail(session)}
                          className='p-1.5 text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors'
                          title='Xem chi tiết'
                        >
                          <Search className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => {
                            setSessionToDelete(session);
                            setIsDeleteDialogOpen(true);
                          }}
                          className='p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors'
                          title='Xóa'
                        >
                          <Trash2 className='w-4 h-4' />
                        </button>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          </AdminCard>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSessionToDelete(null);
        }}
        onConfirm={handleDelete}
        title='Xóa buổi tập PT'
        message={`Bạn có chắc chắn muốn xóa buổi tập PT của ${sessionToDelete?.member?.full_name || 'thành viên này'}?`}
        confirmText='Xóa'
        cancelText='Hủy'
        isLoading={isDeleting}
        variant='danger'
      />

      {/* Detail Modal */}
      <AdminModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedSession(null);
        }}
        title={`Chi tiết buổi tập PT - ${selectedSession?.member?.full_name || 'N/A'}`}
        size='lg'
      >
        {selectedSession && (
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>Thành viên</label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>{selectedSession.member?.full_name || 'N/A'}</div>
              </div>
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>Huấn luyện viên</label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>{selectedSession.trainer?.full_name || 'N/A'}</div>
              </div>
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>Ngày tập</label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>
                  {selectedSession.scheduled_date ? formatVietnamDateTime(selectedSession.scheduled_date, 'date') : 'N/A'}
                </div>
              </div>
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>Thời gian</label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>
                  {selectedSession.start_time} - {selectedSession.end_time}
                </div>
              </div>
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>Trạng thái</label>
                <div className='mt-1'>
                  <span className={`px-2.5 py-1 inline-flex text-theme-xs font-semibold rounded-full border ${getStatusColor(selectedSession.status)}`}>
                    {getStatusLabel(selectedSession.status)}
                  </span>
                </div>
              </div>
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>Giá</label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>
                  {selectedSession.price ? `${selectedSession.price.toLocaleString('vi-VN')} VND` : 'Miễn phí'}
                </div>
              </div>
            </div>
            {selectedSession.notes && (
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>Ghi chú</label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>{selectedSession.notes}</div>
              </div>
            )}
            {selectedSession.trainer_notes && (
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>Ghi chú của trainer</label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>{selectedSession.trainer_notes}</div>
              </div>
            )}
          </div>
        )}
      </AdminModal>

      {/* Create Modal */}
      <AdminModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateFormData({
            member_id: '',
            trainer_id: '',
            scheduled_date: '',
            start_time: '',
            duration: 60,
            price: 0,
            goals: [],
            notes: '',
          });
        }}
        title='Tạo buổi tập PT mới'
        size='lg'
        footer={
          <div className='flex justify-end gap-2'>
            <AdminButton
              variant='secondary'
              size='sm'
              onClick={() => {
                setIsCreateModalOpen(false);
                setCreateFormData({
                  member_id: '',
                  trainer_id: '',
                  scheduled_date: '',
                  start_time: '',
                  duration: 60,
                  price: 0,
                  status: 'SCHEDULED',
                  goals: [],
                  notes: '',
                });
              }}
            >
              Hủy
            </AdminButton>
            <AdminButton
              variant='primary'
              size='sm'
              onClick={handleCreateSession}
              disabled={isCreating}
            >
              {isCreating ? 'Đang tạo...' : 'Tạo buổi tập'}
            </AdminButton>
          </div>
        }
      >
        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'>
                Thành viên <span className='text-red-500'>*</span>
              </label>
              <CustomSelect
                value={createFormData.member_id}
                onChange={(value) => setCreateFormData({ ...createFormData, member_id: value })}
                options={members.map(m => ({ value: m.id, label: m.full_name }))}
                placeholder='Chọn thành viên'
                searchable
              />
            </div>
            <div>
              <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'>
                Huấn luyện viên <span className='text-red-500'>*</span>
              </label>
              <CustomSelect
                value={createFormData.trainer_id}
                onChange={(value) => setCreateFormData({ ...createFormData, trainer_id: value })}
                options={trainers.map(t => ({ value: t.id, label: t.full_name }))}
                placeholder='Chọn huấn luyện viên'
                searchable
              />
            </div>
            <div>
              <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'>
                Ngày tập <span className='text-red-500'>*</span>
              </label>
              <input
                type='date'
                value={createFormData.scheduled_date}
                onChange={(e) => setCreateFormData({ ...createFormData, scheduled_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-theme-xs focus:outline-none focus:ring-2 focus:ring-orange-500'
              />
            </div>
            <div>
              <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'>
                Giờ bắt đầu <span className='text-red-500'>*</span>
              </label>
              <input
                type='time'
                value={createFormData.start_time}
                onChange={(e) => setCreateFormData({ ...createFormData, start_time: e.target.value })}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-theme-xs focus:outline-none focus:ring-2 focus:ring-orange-500'
              />
            </div>
            <div>
              <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'>
                Thời lượng (phút) <span className='text-red-500'>*</span>
              </label>
              <input
                type='number'
                value={createFormData.duration}
                onChange={(e) => setCreateFormData({ ...createFormData, duration: parseInt(e.target.value) || 60 })}
                min={15}
                max={480}
                step={15}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-theme-xs focus:outline-none focus:ring-2 focus:ring-orange-500'
              />
            </div>
            <div>
              <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'>
                Giá (VND)
              </label>
              <input
                type='number'
                value={createFormData.price}
                onChange={(e) => setCreateFormData({ ...createFormData, price: parseFloat(e.target.value) || 0 })}
                min={0}
                step={1000}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-theme-xs focus:outline-none focus:ring-2 focus:ring-orange-500'
              />
            </div>
          </div>
          <div>
            <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'>
              Ghi chú
            </label>
            <textarea
              value={createFormData.notes}
              onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
              rows={3}
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-theme-xs focus:outline-none focus:ring-2 focus:ring-orange-500'
              placeholder='Nhập ghi chú (nếu có)'
            />
          </div>
        </div>
      </AdminModal>
    </div>
  );
};

export default PersonalTrainingManagement;

