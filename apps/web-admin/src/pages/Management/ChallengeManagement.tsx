import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import { Award, Calendar, Plus, RefreshCw, Target, Trophy, Users } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminButton from '../../components/common/AdminButton';
import AdminCard from '../../components/common/AdminCard';
import AdminInput from '../../components/common/AdminInput';
import AdminModal from '../../components/common/AdminModal';
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHeader,
  AdminTableRow,
} from '../../components/common/AdminTable';
import AdvancedFilters from '../../components/common/AdvancedFilters';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CustomSelect from '../../components/common/CustomSelect';
import ExportButton from '../../components/common/ExportButton';
import Pagination from '../../components/common/Pagination';
import { TableLoading } from '../../components/ui/AppLoading';
import { useToast } from '../../context/ToastContext';
import challengeService, {
  Challenge,
  CreateChallengeRequest,
  UpdateChallengeRequest,
} from '../../services/challenge.service';
import { formatVietnamDateTime } from '../../utils/dateTime';

const ChallengeManagement: React.FC = () => {
  const { showToast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    category: 'all',
    is_active: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [challengeToDelete, setChallengeToDelete] = useState<Challenge | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [formData, setFormData] = useState<CreateChallengeRequest>({
    title: '',
    description: '',
    type: 'MONTHLY',
    category: 'ATTENDANCE',
    target_value: 10,
    target_unit: 'sessions',
    reward_points: 100,
    start_date: new Date().toISOString().split('T')[0] + 'T00:00:00',
    end_date:
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T23:59:59',
    is_public: true,
    max_participants: undefined,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const startDatePickerRef = useRef<HTMLInputElement>(null);
  const endDatePickerRef = useRef<HTMLInputElement>(null);
  const startDateFlatpickrRef = useRef<any>(null);
  const endDateFlatpickrRef = useRef<any>(null);

  // Load challenges only once on mount
  const loadChallenges = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await challengeService.getChallenges({});

      if (response.success) {
        const challengesList = Array.isArray(response.data) ? response.data : [];
        setChallenges(challengesList);
      }
    } catch (error: any) {
      showToast({ message: 'Không thể tải danh sách thử thách', type: 'error' });
      console.error('Error loading challenges:', error);
      setChallenges([]);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  // Initialize flatpickr for date pickers
  useEffect(() => {
    if (!isFormModalOpen) {
      // Clean up when modal is closed
      if (startDateFlatpickrRef.current) {
        startDateFlatpickrRef.current.destroy();
        startDateFlatpickrRef.current = null;
      }
      if (endDateFlatpickrRef.current) {
        endDateFlatpickrRef.current.destroy();
        endDateFlatpickrRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      // Initialize start_date picker
      if (startDatePickerRef.current && !startDateFlatpickrRef.current) {
        const fp = flatpickr(startDatePickerRef.current, {
          dateFormat: 'd/m/Y H:i',
          altFormat: 'd/m/Y H:i',
          altInput: false,
          allowInput: true,
          clickOpens: true,
          static: false,
          inline: false,
          appendTo: document.body,
          enableTime: true,
          time_24hr: true,
          defaultDate: formData.start_date || undefined,
          locale: {
            firstDayOfWeek: 1,
            weekdays: {
              shorthand: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
              longhand: [
                'Chủ nhật',
                'Thứ hai',
                'Thứ ba',
                'Thứ tư',
                'Thứ năm',
                'Thứ sáu',
                'Thứ bảy',
              ],
            },
            months: {
              shorthand: [
                'T1',
                'T2',
                'T3',
                'T4',
                'T5',
                'T6',
                'T7',
                'T8',
                'T9',
                'T10',
                'T11',
                'T12',
              ],
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
          onChange: selectedDates => {
            if (selectedDates.length > 0) {
              const date = selectedDates[0];
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              const selectedDateISO = `${year}-${month}-${day}T${hours}:${minutes}:00`;
              setFormData(prev => ({ ...prev, start_date: selectedDateISO }));
            }
          },
        });
        startDateFlatpickrRef.current = Array.isArray(fp) ? fp[0] : fp;
      } else if (startDateFlatpickrRef.current && formData.start_date) {
        // Update existing flatpickr instance
        startDateFlatpickrRef.current.setDate(formData.start_date, false);
      }

      // Initialize end_date picker
      if (endDatePickerRef.current && !endDateFlatpickrRef.current) {
        const fp = flatpickr(endDatePickerRef.current, {
          dateFormat: 'd/m/Y H:i',
          altFormat: 'd/m/Y H:i',
          altInput: false,
          allowInput: true,
          clickOpens: true,
          static: false,
          inline: false,
          appendTo: document.body,
          enableTime: true,
          time_24hr: true,
          defaultDate: formData.end_date || undefined,
          locale: {
            firstDayOfWeek: 1,
            weekdays: {
              shorthand: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
              longhand: [
                'Chủ nhật',
                'Thứ hai',
                'Thứ ba',
                'Thứ tư',
                'Thứ năm',
                'Thứ sáu',
                'Thứ bảy',
              ],
            },
            months: {
              shorthand: [
                'T1',
                'T2',
                'T3',
                'T4',
                'T5',
                'T6',
                'T7',
                'T8',
                'T9',
                'T10',
                'T11',
                'T12',
              ],
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
          onChange: selectedDates => {
            if (selectedDates.length > 0) {
              const date = selectedDates[0];
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              const selectedDateISO = `${year}-${month}-${day}T${hours}:${minutes}:00`;
              setFormData(prev => ({ ...prev, end_date: selectedDateISO }));
            }
          },
        });
        endDateFlatpickrRef.current = Array.isArray(fp) ? fp[0] : fp;
      } else if (endDateFlatpickrRef.current && formData.end_date) {
        // Update existing flatpickr instance
        endDateFlatpickrRef.current.setDate(formData.end_date, false);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (startDateFlatpickrRef.current) {
        startDateFlatpickrRef.current.destroy();
        startDateFlatpickrRef.current = null;
      }
      if (endDateFlatpickrRef.current) {
        endDateFlatpickrRef.current.destroy();
        endDateFlatpickrRef.current = null;
      }
    };
  }, [isFormModalOpen, formData.start_date, formData.end_date]);

  // Client-side filtering - no API call needed
  const filteredChallenges = useMemo(() => {
    let filtered = [...challenges];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        challenge =>
          challenge.title.toLowerCase().includes(searchLower) ||
          challenge.description.toLowerCase().includes(searchLower)
      );
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(challenge => challenge.type === filters.type);
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(challenge => challenge.category === filters.category);
    }

    // Active status filter
    if (filters.is_active !== 'all') {
      const isActive = filters.is_active === 'true';
      filtered = filtered.filter(challenge => {
        const now = new Date();
        const startDate = challenge.start_date ? new Date(challenge.start_date) : null;
        const endDate = challenge.end_date ? new Date(challenge.end_date) : null;
        const isCurrentlyActive = (!startDate || startDate <= now) && (!endDate || endDate >= now);
        return isCurrentlyActive === isActive;
      });
    }

    return filtered;
  }, [challenges, filters]);

  const paginatedChallenges = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredChallenges.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredChallenges, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredChallenges.length / itemsPerPage);

  const handleCreate = () => {
    setEditingChallenge(null);
    setFormData({
      title: '',
      description: '',
      type: 'MONTHLY',
      category: 'ATTENDANCE',
      target_value: 10,
      target_unit: 'sessions',
      reward_points: 100,
      start_date: new Date().toISOString().split('T')[0] + 'T00:00:00',
      end_date:
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T23:59:59',
      is_public: true,
      max_participants: undefined,
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const handleEdit = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      title: challenge.title,
      description: challenge.description,
      type: challenge.type,
      category: challenge.category,
      target_value: challenge.target_value,
      target_unit: challenge.target_unit || '',
      reward_points: challenge.reward_points,
      start_date: new Date(challenge.start_date).toISOString().split('T')[0] + 'T00:00:00',
      end_date: new Date(challenge.end_date).toISOString().split('T')[0] + 'T23:59:59',
      is_public: challenge.is_public,
      max_participants: challenge.max_participants || undefined,
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const handleDelete = (challenge: Challenge) => {
    setChallengeToDelete(challenge);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!challengeToDelete) return;

    try {
      setIsDeleting(true);
      const response = await challengeService.deleteChallenge(challengeToDelete.id);
      if (response.success) {
        showToast({ message: `Xóa thử thách "${challengeToDelete.title}" thành công!`, type: 'success' });
        loadChallenges();
      } else {
        showToast({ message: response.message || 'Không thể xóa thử thách', type: 'error' });
      }
    } catch (error: any) {
      showToast({ message: error.message || 'Không thể xóa thử thách', type: 'error' });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setChallengeToDelete(null);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Tiêu đề là bắt buộc';
    }

    if (!formData.description.trim()) {
      errors.description = 'Mô tả là bắt buộc';
    }

    if (formData.target_value <= 0) {
      errors.target_value = 'Giá trị mục tiêu phải lớn hơn 0';
    }

    if (formData.reward_points < 0) {
      errors.reward_points = 'Điểm thưởng không được âm';
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      errors.end_date = 'Ngày kết thúc phải sau ngày bắt đầu';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      let response;
      if (editingChallenge) {
        if (!editingChallenge.id) {
          showToast({
            message: 'Lỗi: Không tìm thấy ID thử thách. Vui lòng làm mới trang và thử lại.',
            type: 'error',
          });
          return;
        }
        const updateData: UpdateChallengeRequest = {
          title: formData.title,
          description: formData.description,
          type: formData.type,
          category: formData.category,
          target_value: formData.target_value,
          target_unit: formData.target_unit || undefined,
          reward_points: formData.reward_points,
          start_date: formData.start_date,
          end_date: formData.end_date,
          is_public: formData.is_public,
          max_participants: formData.max_participants || undefined,
        };
        console.log('Updating challenge:', { id: editingChallenge.id, updateData });
        response = await challengeService.updateChallenge(editingChallenge.id, updateData);
        if (response.success) {
          showToast({ message: `Cập nhật thử thách "${formData.title}" thành công!`, type: 'success' });
          setIsFormModalOpen(false);
          setEditingChallenge(null);
          loadChallenges();
        } else {
          showToast({ message: response.message || 'Không thể cập nhật thử thách', type: 'error' });
        }
      } else {
        response = await challengeService.createChallenge(formData);
        if (response.success) {
          showToast({ message: `Tạo thử thách "${formData.title}" thành công!`, type: 'success' });
          setIsFormModalOpen(false);
          setEditingChallenge(null);
          loadChallenges();
        } else {
          showToast({ message: response.message || 'Không thể tạo thử thách', type: 'error' });
        }
      }
    } catch (error: any) {
      console.error('Save challenge error:', error);
      const errorMessage =
        error.response?.data?.message || error.message || 'Không thể lưu thử thách';
      showToast({ message: errorMessage, type: 'error' });
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'ATTENDANCE':
        return 'Tham gia';
      case 'FITNESS':
        return 'Thể lực';
      case 'EQUIPMENT':
        return 'Thiết bị';
      case 'SOCIAL':
        return 'Xã hội';
      default:
        return category;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'DAILY':
        return 'Hàng ngày';
      case 'WEEKLY':
        return 'Hàng tuần';
      case 'MONTHLY':
        return 'Hàng tháng';
      case 'CUSTOM':
        return 'Tùy chỉnh';
      default:
        return type;
    }
  };

  const stats = useMemo(() => {
    return {
      total: challenges.length,
      active: challenges.filter(c => c.is_active).length,
      completed: challenges.filter(c => c._count && c._count.progress > 0).length,
      totalRewards: challenges.reduce((sum, c) => sum + c.reward_points, 0),
    };
  }, [challenges]);

  const getExportData = () => {
    return filteredChallenges.map(challenge => ({
      'Tiêu đề': challenge.title,
      'Mô tả': challenge.description,
      Loại: getTypeLabel(challenge.type),
      'Danh mục': getCategoryLabel(challenge.category),
      'Mục tiêu': `${challenge.target_value} ${challenge.target_unit || ''}`,
      'Điểm thưởng': challenge.reward_points,
      'Ngày bắt đầu': formatVietnamDateTime(challenge.start_date),
      'Ngày kết thúc': formatVietnamDateTime(challenge.end_date),
      'Trạng thái': challenge.is_active ? 'Đang hoạt động' : 'Không hoạt động',
      'Công khai': challenge.is_public ? 'Có' : 'Không',
      'Số người tham gia': challenge._count?.progress || 0,
      'Ngày tạo': formatVietnamDateTime(challenge.created_at),
    }));
  };

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-start'>
        <div>
          <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
            Quản lý Thử thách
          </h1>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
            Tạo động lực cho thành viên với các thử thách hấp dẫn
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <AdminButton onClick={loadChallenges} icon={RefreshCw} variant='outline' size='sm'>
            Làm mới
          </AdminButton>
          <AdminButton onClick={handleCreate} icon={Plus} size='sm'>
            Tạo thử thách mới
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
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <Target className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.total}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Tổng số thử thách
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
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <Trophy className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.active}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Đang hoạt động
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
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <Users className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.completed}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Người tham gia
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
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <Award className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.totalRewards.toLocaleString()}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Tổng điểm thưởng
                </div>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters
        filters={{
          search: filters.search,
          customFilters: {
            is_active: filters.is_active !== 'all' ? filters.is_active : '',
            type: filters.type !== 'all' ? filters.type : '',
          },
        }}
        onFiltersChange={newFilters => {
          setFilters({
            search: newFilters.search || '',
            type: newFilters.customFilters?.type || 'all',
            category: newFilters.category || 'all',
            is_active: newFilters.customFilters?.is_active || 'all',
          });
          setCurrentPage(1);
        }}
        availableCategories={[
          { value: 'ATTENDANCE', label: 'Tham gia' },
          { value: 'FITNESS', label: 'Thể lực' },
          { value: 'EQUIPMENT', label: 'Thiết bị' },
          { value: 'SOCIAL', label: 'Xã hội' },
        ]}
        showDateRange={false}
        showCategory={true}
        customFilterFields={[
          {
            key: 'type',
            label: 'Loại',
            type: 'select',
            options: [
              { value: 'DAILY', label: 'Hàng ngày' },
              { value: 'WEEKLY', label: 'Hàng tuần' },
              { value: 'MONTHLY', label: 'Hàng tháng' },
              { value: 'CUSTOM', label: 'Tùy chỉnh' },
            ],
          },
          {
            key: 'is_active',
            label: 'Trạng thái',
            type: 'select',
            options: [
              { value: 'true', label: 'Đang hoạt động' },
              { value: 'false', label: 'Không hoạt động' },
            ],
          },
        ]}
      />

      {/* Export and Actions */}
      <div className='flex justify-between items-center'>
        <div className='text-sm text-gray-600 dark:text-gray-400'>
          Tổng cộng: {filteredChallenges.length} thử thách
        </div>
        {filteredChallenges.length > 0 && (
          <ExportButton
            data={getExportData()}
            columns={[
              { key: 'Tiêu đề', label: 'Tiêu đề' },
              { key: 'Loại', label: 'Loại' },
              { key: 'Danh mục', label: 'Danh mục' },
              { key: 'Mục tiêu', label: 'Mục tiêu' },
              { key: 'Điểm thưởng', label: 'Điểm thưởng' },
              { key: 'Trạng thái', label: 'Trạng thái' },
            ]}
            filename='danh-sach-thu-thach'
            title='Danh sách Thử thách'
            variant='outline'
            size='sm'
          />
        )}
      </div>

      {/* Challenges List */}
      {isLoading ? (
        <TableLoading text='Đang tải danh sách thử thách...' />
      ) : filteredChallenges.length === 0 ? (
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12'>
          <div className='flex flex-col items-center justify-center gap-3'>
            <Target className='w-12 h-12 text-gray-300 dark:text-gray-600' />
            <div className='text-theme-xs font-heading text-gray-500 dark:text-gray-400'>
              {filters.search || filters.category !== 'all' || filters.type !== 'all'
                ? 'Không tìm thấy thử thách nào'
                : 'Không có thử thách nào'}
            </div>
          </div>
        </div>
      ) : (
        <>
          <AdminCard padding='none'>
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell header className='!px-3 !py-2 !text-[10px]'>
                    THÔNG TIN THỬ THÁCH
                  </AdminTableCell>
                  <AdminTableCell header className='!px-3 !py-2 !text-[10px]'>
                    SỐ NGƯỜI THAM GIA
                  </AdminTableCell>
                  <AdminTableCell header className='!px-3 !py-2 !text-[10px]'>
                    LOẠI & DANH MỤC
                  </AdminTableCell>
                  <AdminTableCell header className='!px-3 !py-2 !text-[10px]'>
                    MỤC TIÊU
                  </AdminTableCell>
                  <AdminTableCell header className='!px-3 !py-2 !text-[10px]'>
                    PHẦN THƯỞNG
                  </AdminTableCell>
                  <AdminTableCell header className='!px-3 !py-2 !text-[10px]'>
                    THỜI GIAN
                  </AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {paginatedChallenges.map((challenge, index) => (
                  <AdminTableRow
                    key={challenge.id}
                    onClick={() => handleEdit(challenge)}
                    className={`group relative border-l-4 border-l-transparent hover:border-l-orange-500 transition-all duration-200 cursor-pointer ${
                      index % 2 === 0
                        ? 'bg-white dark:bg-gray-900'
                        : 'bg-gray-50/50 dark:bg-gray-800/50'
                    } hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 dark:hover:from-orange-900/20 dark:hover:to-orange-800/10`}
                  >
                    <AdminTableCell className='overflow-hidden relative !px-3 !py-2'>
                      <div className='absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-orange-500 dark:bg-orange-500 transition-all duration-200 pointer-events-none z-0' />
                      <div className='min-w-0 flex-1 relative z-10'>
                        <div className='flex items-start gap-2'>
                          <div
                            className={`mt-0.5 p-1.5 rounded-md flex-shrink-0 ${
                              challenge.category === 'ATTENDANCE'
                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                : challenge.category === 'FITNESS'
                                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                : challenge.category === 'EQUIPMENT'
                                ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}
                          >
                            <Target className='w-3.5 h-3.5' />
                          </div>
                          <div className='flex-1 min-w-0'>
                            <div className='text-xs font-semibold font-heading text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200 leading-tight'>
                              {challenge.title}
                            </div>
                            {challenge.description && (
                              <div className='text-[11px] text-gray-500 dark:text-gray-400 font-heading mt-0.5 line-clamp-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200 leading-tight'>
                                {challenge.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell className='!px-3 !py-2'>
                      <div className='flex items-center gap-1.5'>
                        <Users className='w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0' />
                        <span className='text-xs font-semibold text-gray-900 dark:text-white font-heading leading-tight'>
                          {challenge._count?.progress || 0}
                        </span>
                        <span className='text-[11px] text-gray-500 dark:text-gray-400 font-heading leading-tight'>
                          người
                        </span>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell className='!px-3 !py-2'>
                      <div className='flex gap-1 items-center'>
                        <div className='flex items-center justify-center'>
                          <span className='inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-semibold font-heading bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 leading-tight'>
                            {getTypeLabel(challenge.type)}
                          </span>
                        </div>
                        <div className='flex items-center justify-center'>
                          <span className='text-[11px] text-gray-600 dark:text-gray-400 font-heading leading-tight'>
                            {getCategoryLabel(challenge.category)}
                          </span>
                        </div>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell className='!px-3 !py-2'>
                      <div className='flex items-center gap-1'>
                        <span className='text-base font-bold font-heading text-gray-900 dark:text-white leading-tight'>
                          {challenge.target_value}
                        </span>
                        <span className='text-[11px] text-gray-500 dark:text-gray-400 font-heading leading-tight'>
                          {challenge.target_unit || 'lần'}
                        </span>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell className='!px-3 !py-2 !w-[100px]'>
                      <div className='flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-semibold font-heading'>
                        <Award className='w-3.5 h-3.5 flex-shrink-0' />
                        <span className='text-xs leading-tight whitespace-nowrap'>
                          {challenge.reward_points}
                        </span>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell className='!px-3 !py-2'>
                      <div className='flex flex-col gap-1 items-center'>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs font-semibold text-gray-900 dark:text-white font-heading leading-tight whitespace-nowrap'>
                            {formatVietnamDateTime(challenge.start_date, 'date')}
                          </span>
                          <span className='text-xs text-gray-400 dark:text-gray-500 font-heading'>
                            →
                          </span>
                          <span className='text-xs font-semibold text-gray-900 dark:text-white font-heading leading-tight whitespace-nowrap'>
                            {formatVietnamDateTime(challenge.end_date, 'date')}
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <span className='text-[11px] text-gray-500 dark:text-gray-400 font-heading leading-tight whitespace-nowrap'>
                            {formatVietnamDateTime(challenge.start_date, 'time')}
                          </span>
                          <span className='text-[11px] text-gray-400 dark:text-gray-500 font-heading'>
                            →
                          </span>
                          <span className='text-[11px] text-gray-500 dark:text-gray-400 font-heading leading-tight whitespace-nowrap'>
                            {formatVietnamDateTime(challenge.end_date, 'time')}
                          </span>
                        </div>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          </AdminCard>
        </>
      )}

      {totalPages > 1 && (
        <div className='flex justify-center'>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredChallenges.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Custom styles for compact professional flatpickr with orange theme */}
      <style>{`
        /* Compact Professional Flatpickr Calendar - Orange Theme */
        .flatpickr-calendar {
          font-family: 'Inter', sans-serif !important;
          font-size: 11px !important;
          border-radius: 8px !important;
          border: 1px solid rgba(249, 115, 22, 0.2) !important;
          box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
          background: #ffffff !important;
          overflow: hidden !important;
          width: 340px !important;
          padding: 10px !important;
        }
        
        .dark .flatpickr-calendar {
          background: #1f2937 !important;
          border-color: rgba(249, 115, 22, 0.3) !important;
        }
        
        /* Month Header - Compact with Gradient */
        .flatpickr-months {
          padding: 6px 8px !important;
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%) !important;
          border-bottom: 1px solid rgba(249, 115, 22, 0.15) !important;
          margin-bottom: 4px !important;
        }
        
        .dark .flatpickr-months {
          background: linear-gradient(135deg, #7c2d12 0%, #9a3412 100%) !important;
          border-bottom-color: rgba(249, 115, 22, 0.25) !important;
        }
        
        .flatpickr-current-month {
          font-size: 11px !important;
          font-weight: 700 !important;
          font-family: 'Inter', sans-serif !important;
          padding: 2px 0 !important;
        }
        
        .flatpickr-current-month .cur-month,
        .flatpickr-current-month input.cur-year {
          font-size: 11px !important;
          font-weight: 700 !important;
          font-family: 'Inter', sans-serif !important;
          color: #9a3412 !important;
          padding: 2px 4px !important;
        }
        
        .dark .flatpickr-current-month .cur-month,
        .dark .flatpickr-current-month input.cur-year {
          color: #fed7aa !important;
        }
        
        /* Navigation Arrows - Compact */
        .flatpickr-prev-month,
        .flatpickr-next-month {
          padding: 3px !important;
          border-radius: 4px !important;
          transition: all 0.2s ease !important;
          width: 20px !important;
          height: 20px !important;
          top: 6px !important;
        }
        
        .flatpickr-prev-month:hover,
        .flatpickr-next-month:hover {
          background: rgba(249, 115, 22, 0.15) !important;
        }
        
        .flatpickr-prev-month svg,
        .flatpickr-next-month svg {
          width: 10px !important;
          height: 10px !important;
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
          margin-top: 2px !important;
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
          letter-spacing: 0.3px !important;
          padding: 3px 0 !important;
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
          height: 24px !important;
          line-height: 24px !important;
          border-radius: 5px !important;
          margin: 1.5px !important;
          transition: all 0.15s ease !important;
          font-weight: 500 !important;
          width: calc((100% - 9px) / 7) !important;
          color: #374151 !important;
        }
        
        .dark .flatpickr-day {
          color: #f3f4f6 !important;
        }
        
        .flatpickr-day:hover {
          background: #fff7ed !important;
          border-color: #f97316 !important;
          color: #ea580c !important;
          transform: scale(1.05) !important;
        }
        
        .dark .flatpickr-day:hover {
          background: #9a3412 !important;
          border-color: #f97316 !important;
          color: #fed7aa !important;
        }
        
        /* Selected Day - Gradient */
        .flatpickr-day.selected,
        .flatpickr-day.startRange,
        .flatpickr-day.endRange {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%) !important;
          border-color: #f97316 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          box-shadow: 0 2px 6px -1px rgba(249, 115, 22, 0.4) !important;
        }
        
        .flatpickr-day.selected:hover,
        .flatpickr-day.startRange:hover,
        .flatpickr-day.endRange:hover {
          background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%) !important;
          transform: scale(1.05) !important;
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
          color: #ea580c !important;
        }
        
        .dark .flatpickr-day.today:hover {
          background: #9a3412 !important;
          border-color: #f97316 !important;
          color: #ffffff !important;
        }
        
        /* Disabled/Other Month Days */
        .flatpickr-day.flatpickr-disabled,
        .flatpickr-day.prevMonthDay,
        .flatpickr-day.nextMonthDay {
          color: #d1d5db !important;
          opacity: 0.4 !important;
          font-size: 9px !important;
        }
        
        .dark .flatpickr-day.flatpickr-disabled,
        .dark .flatpickr-day.prevMonthDay,
        .dark .flatpickr-day.nextMonthDay {
          color: #6b7280 !important;
        }
        
        /* Time Picker - Compact */
        .flatpickr-time {
          font-size: 10px !important;
          font-family: 'Inter', sans-serif !important;
          border-top: 1px solid rgba(249, 115, 22, 0.15) !important;
        
        }
        
        .dark .flatpickr-time {
          border-top-color: rgba(249, 115, 22, 0.25) !important;
        }
        
        .flatpickr-time input {
          font-size: 10px !important;
          font-family: 'Inter', sans-serif !important;
          font-weight: 600 !important;
          width: 28px !important;
          height: 28px !important;
          line-height: 28px !important;
          padding: 0 !important;
          text-align: center !important;
          border-radius: 5px !important;
          border: 1px solid #e5e7eb !important;
          background: #f9fafb !important;
          transition: all 0.2s !important;
          color: #374151 !important;
        }
        
        .dark .flatpickr-time input {
          background: #374151 !important;
          border-color: #4b5563 !important;
          color: #f3f4f6 !important;
        }
        
        .flatpickr-time input:hover,
        .flatpickr-time input:focus {
          background: #ffffff !important;
          border-color: #f97316 !important;
          box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.15) !important;
          color: #ea580c !important;
        }
        
        .dark .flatpickr-time input:hover,
        .dark .flatpickr-time input:focus {
          background: #4b5563 !important;
          border-color: #f97316 !important;
          color: #fed7aa !important;
        }
        
        .flatpickr-time .flatpickr-time-separator {
          font-size: 12px !important;
          font-weight: 700 !important;
          color: #9a3412 !important;
          margin: 0 3px !important;
        }
        
        .dark .flatpickr-time .flatpickr-time-separator {
          color: #fed7aa !important;
        }
        
        .flatpickr-time .arrowUp,
        .flatpickr-time .arrowDown {
          display: none !important;
        }
        
        /* Calendar inner container */
        .flatpickr-innerContainer {
          padding: 0 !important;
        }
        
        /* Reduce spacing */
        .flatpickr-month {
          height: 26px !important;
        }
        
        /* Arrow styling */
        .flatpickr-calendar.arrowTop:before,
        .flatpickr-calendar.arrowTop:after {
          border-bottom-color: #ffffff !important;
        }
        
        .dark .flatpickr-calendar.arrowTop:before,
        .dark .flatpickr-calendar.arrowTop:after {
          border-bottom-color: #1f2937 !important;
        }
      `}</style>

      {/* Create/Edit Modal with Improved Layout */}
      <AdminModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingChallenge(null);
        }}
        title={editingChallenge ? 'Chỉnh sửa Thử thách' : 'Tạo Thử thách Mới'}
        size='lg'
        footer={
          <div className='flex justify-end gap-3'>
            <AdminButton
              onClick={() => {
                setIsFormModalOpen(false);
                setEditingChallenge(null);
              }}
              variant='outline'
              className='border-gray-300'
            >
              Hủy bỏ
            </AdminButton>
            <AdminButton
              onClick={handleSave}
              className='bg-gradient-to-r from-orange-500 to-red-500 text-white border-none'
            >
              {editingChallenge ? 'Cập nhật' : 'Tạo mới'}
            </AdminButton>
          </div>
        }
      >
        <div className='space-y-3'>
          <AdminInput
            label={
              <>
                Tiêu đề thử thách <span className='text-red-500'>*</span>
              </>
            }
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder='VD: Thử thách Chạy bộ 30 ngày'
            error={formErrors.title}
            className='font-inter'
          />

          <div>
            <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
              Mô tả chi tiết <span className='text-red-500'>*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder='Mô tả nội dung và quy tắc của thử thách...'
              className={`w-full px-3 py-1.5 text-[11px] border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                formErrors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {formErrors.description && (
              <p className='mt-1 text-[10px] text-red-600 dark:text-red-400 font-inter'>
                {formErrors.description}
              </p>
            )}
          </div>

          <div className='bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg space-y-2.5'>
            <h4 className='text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 font-heading'>
              <Target className='w-3.5 h-3.5 text-orange-500' />
              Cấu hình Mục tiêu
            </h4>

            <div className='grid grid-cols-2 gap-2.5'>
              <div>
                <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 font-inter'>
                  Loại
                </label>
                <CustomSelect
                  options={[
                    { value: 'DAILY', label: 'Hàng ngày' },
                    { value: 'WEEKLY', label: 'Hàng tuần' },
                    { value: 'MONTHLY', label: 'Hàng tháng' },
                    { value: 'CUSTOM', label: 'Tùy chỉnh' },
                  ]}
                  value={formData.type}
                  onChange={value => setFormData({ ...formData, type: value as any })}
                  placeholder='Chọn loại'
                  className='font-inter'
                />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 font-inter'>
                  Danh mục
                </label>
                <CustomSelect
                  options={[
                    { value: 'ATTENDANCE', label: 'Tham gia' },
                    { value: 'FITNESS', label: 'Thể lực' },
                    { value: 'EQUIPMENT', label: 'Thiết bị' },
                    { value: 'SOCIAL', label: 'Xã hội' },
                  ]}
                  value={formData.category}
                  onChange={value => setFormData({ ...formData, category: value as any })}
                  placeholder='Chọn danh mục'
                  className='font-inter'
                />
              </div>
              <AdminInput
                label={
                  <>
                    Giá trị mục tiêu <span className='text-red-500'>*</span>
                  </>
                }
                type='number'
                value={formData.target_value.toString()}
                onChange={e =>
                  setFormData({ ...formData, target_value: parseInt(e.target.value) || 0 })
                }
                className='font-inter'
              />
              <AdminInput
                label='Đơn vị'
                value={formData.target_unit || ''}
                onChange={e => setFormData({ ...formData, target_unit: e.target.value })}
                placeholder='lần, phút, calo...'
                className='font-inter'
              />
            </div>
          </div>

          <div className='bg-yellow-50 dark:bg-yellow-900/10 p-2.5 rounded-lg space-y-2.5'>
            <h4 className='text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 font-heading'>
              <Award className='w-3.5 h-3.5 text-yellow-600' />
              Phần thưởng & Giới hạn
            </h4>

            <div className='grid grid-cols-2 gap-2.5'>
              <div className='col-span-2'>
                <AdminInput
                  label={
                    <>
                      Điểm thưởng hoàn thành <span className='text-red-500'>*</span>
                    </>
                  }
                  type='number'
                  icon={Award}
                  value={formData.reward_points.toString()}
                  onChange={e =>
                    setFormData({ ...formData, reward_points: parseInt(e.target.value) || 0 })
                  }
                  className='font-inter [&_input]:text-yellow-600 dark:[&_input]:text-yellow-400 [&_input]:font-medium'
                />
              </div>

              <AdminInput
                label='Số người tối đa'
                type='number'
                value={formData.max_participants?.toString() || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    max_participants: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder='Không giới hạn'
                className='font-inter'
              />

              <div className='flex items-end pb-1'>
                <label className='flex items-center gap-1.5 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={formData.is_public}
                    onChange={e => setFormData({ ...formData, is_public: e.target.checked })}
                    className='w-3.5 h-3.5 text-orange-600 rounded border-gray-300 focus:ring-orange-500'
                  />
                  <span className='text-xs text-gray-700 dark:text-gray-300 font-inter'>
                    Công khai thử thách
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-2.5'>
            <div className='flex flex-col'>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
                Ngày bắt đầu <span className='text-red-500'>*</span>
              </label>
              <div className='relative flex-1'>
                <input
                  ref={startDatePickerRef}
                  type='text'
                  placeholder='dd/mm/yyyy HH:mm'
                  readOnly
                  className='w-full h-[30px] px-3 py-1.5 pr-9 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer'
                />
                <Calendar className='absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none' />
              </div>
              {formErrors.start_date && (
                <p className='mt-1 text-[10px] text-red-600 dark:text-red-400 font-inter'>
                  {formErrors.start_date}
                </p>
              )}
            </div>

            <div className='flex flex-col'>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
                Ngày kết thúc <span className='text-red-500'>*</span>
              </label>
              <div className='relative flex-1'>
                <input
                  ref={endDatePickerRef}
                  type='text'
                  placeholder='dd/mm/yyyy HH:mm'
                  readOnly
                  className={`w-full h-[30px] px-3 py-1.5 pr-9 text-[11px] border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${
                    formErrors.end_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
                <Calendar className='absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none' />
              </div>
              {formErrors.end_date && (
                <p className='mt-1 text-[10px] text-red-600 dark:text-red-400 font-inter'>
                  {formErrors.end_date}
                </p>
              )}
            </div>
          </div>
        </div>
      </AdminModal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title='Xóa Thử thách'
        message={`Bạn có chắc chắn muốn xóa thử thách "${challengeToDelete?.title}"? Hành động này không thể hoàn tác.`}
        confirmText='Xóa vĩnh viễn'
        cancelText='Hủy'
        isLoading={isDeleting}
        variant='danger'
      />
    </div>
  );
};

export default ChallengeManagement;
