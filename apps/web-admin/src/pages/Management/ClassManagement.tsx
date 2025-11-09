import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useToast } from '../../hooks/useToast';
import { scheduleService, GymClass } from '../../services/schedule.service';
import { Search, Plus, RefreshCw, Edit, Trash2, BookOpen, Users, TrendingUp, Award, Eye } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import { AdminTable, AdminTableHeader, AdminTableBody, AdminTableRow, AdminTableCell } from '../../components/common/AdminTable';
import ClassFormModal from '../../components/modals/ClassFormModal';
import ClassDetailModal from '../../components/modals/ClassDetailModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import CustomSelect from '../../components/common/CustomSelect';

const ClassManagement: React.FC = () => {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<GymClass | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<GymClass | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [selectedClassForAction, setSelectedClassForAction] = useState<GymClass | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedClassForDetail, setSelectedClassForDetail] = useState<GymClass | null>(null);

  const loadClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await scheduleService.getAllClasses();
      if (response.success) {
        const classesList = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.classes || []);
        setClasses(classesList);
      }
    } catch (error: any) {
      showToast('Không thể tải danh sách lớp học', 'error');
      console.error('Error loading classes:', error);
      setClasses([]);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Listen for schedule:new event to reload classes list
  useEffect(() => {
    const handleScheduleUpdated = (event: CustomEvent) => {
      console.log('📢 schedule:updated event received in ClassManagement:', event.detail);
      // Reload classes list when a new schedule is created
      loadClasses();
    };

    window.addEventListener('schedule:updated', handleScheduleUpdated as EventListener);

    return () => {
      window.removeEventListener('schedule:updated', handleScheduleUpdated as EventListener);
    };
  }, [loadClasses]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toUpperCase()) {
      case 'BEGINNER':
        return 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800';
      case 'INTERMEDIATE':
        return 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300 border-warning-200 dark:border-warning-800';
      case 'ADVANCED':
        return 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300 border-error-200 dark:border-error-800';
      case 'ALL_LEVELS':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty?.toUpperCase()) {
      case 'BEGINNER':
        return 'Cơ bản';
      case 'INTERMEDIATE':
        return 'Trung bình';
      case 'ADVANCED':
        return 'Nâng cao';
      case 'ALL_LEVELS':
        return 'Tất cả cấp độ';
      default:
        return difficulty || 'N/A';
    }
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'CARDIO': 'Cardio',
      'STRENGTH': 'Sức mạnh',
      'YOGA': 'Yoga',
      'PILATES': 'Pilates',
      'DANCE': 'Khiêu vũ',
      'MARTIAL_ARTS': 'Võ thuật',
      'AQUA': 'Thủy sinh',
      'FUNCTIONAL': 'Chức năng',
      'RECOVERY': 'Phục hồi',
      'SPECIALIZED': 'Chuyên biệt',
    };
    return categoryMap[category] || category;
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalClasses = classes.length;
    const activeClasses = classes.filter(cls => cls.is_active).length;
    const categories = classes.reduce((acc, cls) => {
      acc[cls.category] = (acc[cls.category] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    const difficulties = classes.reduce((acc, cls) => {
      acc[cls.difficulty] = (acc[cls.difficulty] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    const totalCapacity = classes.reduce((sum, cls) => sum + (cls.max_capacity || 0), 0);
    
    return {
      totalClasses,
      activeClasses,
      categories,
      difficulties,
      totalCapacity,
    };
  }, [classes]);

  const filteredClasses = useMemo(() => {
    if (!Array.isArray(classes)) return [];
    
    return classes.filter(cls => {
      const matchesSearch = 
        cls?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls?.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls?.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || cls?.category === categoryFilter;
      const matchesDifficulty = difficultyFilter === 'all' || cls?.difficulty === difficultyFilter;
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [classes, searchTerm, categoryFilter, difficultyFilter]);

  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  const paginatedClasses = filteredClasses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCreate = () => {
    setSelectedClass(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (cls: GymClass) => {
    setSelectedClass(cls);
    setIsFormModalOpen(true);
  };

  const handleDelete = async () => {
    if (!classToDelete) return;

    setIsDeleting(true);
    try {
      await scheduleService.deleteClass(classToDelete.id);
      showToast('Xóa lớp học thành công', 'success');
      await loadClasses();
      setIsDeleteDialogOpen(false);
      setClassToDelete(null);
    } catch (error: any) {
      showToast(error.message || 'Không thể xóa lớp học', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (data: Partial<GymClass>) => {
    try {
      if (selectedClass) {
        await scheduleService.updateClass(selectedClass.id, data);
        showToast('Cập nhật lớp học thành công', 'success');
      } else {
        await scheduleService.createClass(data);
        showToast('Tạo lớp học thành công', 'success');
      }
      await loadClasses();
      setIsFormModalOpen(false);
      setSelectedClass(null);
    } catch (error: any) {
      showToast(error.message || 'Không thể lưu lớp học', 'error');
      throw error;
    }
  };

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-start'>
        <div>
          <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
            Quản lý Lớp học
          </h1>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
            Quản lý tất cả các lớp học trong phòng gym
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={loadClasses}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
          >
            <RefreshCw className='w-4 h-4' />
            Làm mới
          </button>
          <button
            onClick={handleCreate}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
          >
            <Plus className='w-4 h-4' />
            Thêm lớp học
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <AdminCard padding='sm' className='relative overflow-hidden group'>
          {/* Subtle corner accent */}
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          {/* Subtle left border accent */}
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              {/* Icon Container */}
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <BookOpen className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              {/* Value and Label Container */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.totalClasses}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Tổng số lớp học
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          {/* Subtle corner accent */}
          <div className='absolute -top-px -right-px w-12 h-12 bg-success-100 dark:bg-success-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          {/* Subtle left border accent */}
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-success-100 dark:bg-success-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              {/* Icon Container */}
              <div className='relative w-9 h-9 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-success-500/20'>
                <div className='absolute inset-0 bg-success-100 dark:bg-success-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <TrendingUp className='relative w-[18px] h-[18px] text-success-600 dark:text-success-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              {/* Value and Label Container */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.activeClasses}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Lớp đang hoạt động
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          {/* Subtle corner accent */}
          <div className='absolute -top-px -right-px w-12 h-12 bg-blue-100 dark:bg-blue-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          {/* Subtle left border accent */}
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-blue-100 dark:bg-blue-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              {/* Icon Container */}
              <div className='relative w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-blue-500/20'>
                <div className='absolute inset-0 bg-blue-100 dark:bg-blue-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <Users className='relative w-[18px] h-[18px] text-blue-600 dark:text-blue-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              {/* Value and Label Container */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.totalCapacity.toLocaleString()}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Tổng sức chứa
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          {/* Subtle corner accent */}
          <div className='absolute -top-px -right-px w-12 h-12 bg-purple-100 dark:bg-purple-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          {/* Subtle left border accent */}
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-purple-100 dark:bg-purple-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              {/* Icon Container */}
              <div className='relative w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-purple-500/20'>
                <div className='absolute inset-0 bg-purple-100 dark:bg-purple-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <Award className='relative w-[18px] h-[18px] text-purple-600 dark:text-purple-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              {/* Value and Label Container */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {Object.keys(stats.categories).length}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Danh mục khác nhau
                </div>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Search and Filters */}
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200 p-4'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
          {/* Search Input */}
          <div className='md:col-span-2 group relative'>
            <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
            <input
              type='text'
              placeholder='Tìm kiếm lớp học...'
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className='w-full py-2 pl-9 pr-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            />
          </div>

          {/* Category Filter */}
          <div>
            <CustomSelect
              options={[
                { value: 'all', label: 'Tất cả danh mục' },
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
              ]}
              value={categoryFilter}
              onChange={value => {
                setCategoryFilter(value);
                setCurrentPage(1);
              }}
              placeholder='Tất cả danh mục'
              className='font-inter'
            />
          </div>

          {/* Difficulty Filter */}
          <div>
            <CustomSelect
              options={[
                { value: 'all', label: 'Tất cả độ khó' },
                { value: 'BEGINNER', label: 'Cơ bản' },
                { value: 'INTERMEDIATE', label: 'Trung bình' },
                { value: 'ADVANCED', label: 'Nâng cao' },
              ]}
              value={difficultyFilter}
              onChange={value => {
                setDifficultyFilter(value);
                setCurrentPage(1);
              }}
              placeholder='Tất cả độ khó'
              className='font-inter'
            />
          </div>
        </div>
      </div>

      {/* Classes List */}
      {isLoading ? (
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12'>
          <div className='flex flex-col items-center justify-center gap-3'>
            <div className='w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin' />
            <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
              Đang tải...
            </div>
          </div>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12'>
          <div className='flex flex-col items-center justify-center gap-3'>
            <BookOpen className='w-12 h-12 text-gray-300 dark:text-gray-600' />
            <div className='text-theme-xs font-heading text-gray-500 dark:text-gray-400'>
              {searchTerm || categoryFilter !== 'all' || difficultyFilter !== 'all'
                ? 'Không tìm thấy lớp học nào'
                : 'Không có lớp học nào'}
            </div>
          </div>
        </div>
      ) : (
        <>
          <AdminCard padding='none'>
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell header>Tên lớp</AdminTableCell>
                  <AdminTableCell header>Danh mục</AdminTableCell>
                  <AdminTableCell header>Độ khó</AdminTableCell>
                  <AdminTableCell header>Sức chứa</AdminTableCell>
                  <AdminTableCell header>Thời lượng</AdminTableCell>
                  <AdminTableCell header>Giá</AdminTableCell>
                  <AdminTableCell header>Trạng thái</AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {paginatedClasses.map((cls, index) => (
                  <AdminTableRow
                    key={cls.id}
                    className={`group relative border-l-4 border-l-transparent hover:border-l-orange-500 transition-all duration-200 cursor-pointer ${
                      index % 2 === 0
                        ? 'bg-white dark:bg-gray-900'
                        : 'bg-gray-50/50 dark:bg-gray-800/50'
                    } hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 dark:hover:from-orange-900/20 dark:hover:to-orange-800/10`}
                    onClick={(e?: React.MouseEvent) => {
                      if (e) {
                        e.stopPropagation();
                        setSelectedClassForAction(cls);
                        setMenuPosition({ x: e.clientX, y: e.clientY });
                        setActionMenuOpen(true);
                      }
                    }}
                  >
                    <AdminTableCell className='overflow-hidden relative'>
                      {/* Hover border indicator */}
                      <div className='absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-orange-500 dark:bg-orange-500 transition-all duration-200 pointer-events-none z-0' />
                      <div className='min-w-0 flex-1 relative z-10'>
                        <div className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200'>
                          {cls.name}
                        </div>
                        {cls.description && (
                          <div className='text-[10px] text-gray-500 dark:text-gray-400 font-inter mt-0.5 line-clamp-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200'>
                            {cls.description}
                          </div>
                        )}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <span className='text-theme-xs font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                        {getCategoryLabel(cls.category)}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell>
                      <span className={`px-2.5 py-1 inline-flex text-theme-xs font-semibold font-heading rounded-full border transition-all duration-200 group-hover:scale-105 ${getDifficultyColor(cls.difficulty)}`}>
                        {getDifficultyLabel(cls.difficulty)}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className='flex items-center gap-1.5'>
                        <Users className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200' />
                        <span className='text-theme-xs font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                          {cls.max_capacity || 0} người
                        </span>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <span className='text-theme-xs font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                        {cls.duration} phút
                      </span>
                    </AdminTableCell>
                    <AdminTableCell>
                      <span className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                        {cls.price ? `${cls.price.toLocaleString('vi-VN')} VNĐ` : 'Miễn phí'}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell>
                      <span className={`px-2.5 py-1 inline-flex text-theme-xs font-semibold font-heading rounded-full border transition-all duration-200 group-hover:scale-105 ${
                        cls.is_active
                          ? 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                      }`}>
                        {cls.is_active ? 'Hoạt động' : 'Tạm dừng'}
                      </span>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          </AdminCard>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredClasses.length}
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
      <ClassFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedClass(null);
        }}
        onSave={handleSave}
        gymClass={selectedClass}
      />

      {/* Action Menu Popup */}
      {actionMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 z-40'
            onClick={() => {
              setActionMenuOpen(false);
              setSelectedClassForAction(null);
            }}
          />
          {/* Popup */}
          <div
            className='fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl py-2 min-w-[180px]'
            style={{
              left: `${Math.min(menuPosition.x, window.innerWidth - 200)}px`,
              top: `${Math.min(menuPosition.y + 10, window.innerHeight - 150)}px`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className='px-3 py-2 border-b border-gray-200 dark:border-gray-800'>
              <p className='text-xs font-semibold font-heading text-gray-900 dark:text-white truncate max-w-[200px]'>
                {selectedClassForAction?.name}
              </p>
            </div>
            <div className='py-1'>
              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  setSelectedClassForDetail(selectedClassForAction);
                  setIsDetailModalOpen(true);
                }}
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150'
              >
                <Eye className='w-3.5 h-3.5' />
                Xem lớp
              </button>
              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  handleEdit(selectedClassForAction!);
                }}
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150'
              >
                <Edit className='w-3.5 h-3.5' />
                Sửa
              </button>
              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  setClassToDelete(selectedClassForAction);
                  setIsDeleteDialogOpen(true);
                }}
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors duration-150'
              >
                <Trash2 className='w-3.5 h-3.5' />
                Xóa
              </button>
            </div>
          </div>
        </>
      )}

      {/* Class Detail Modal */}
      <ClassDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedClassForDetail(null);
        }}
        gymClass={selectedClassForDetail}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setClassToDelete(null);
        }}
        onConfirm={handleDelete}
        title='Xác nhận xóa lớp học'
        message={`Bạn có chắc chắn muốn xóa lớp học "${classToDelete?.name}"? Hành động này không thể hoàn tác.`}
        confirmText='Xóa'
        cancelText='Hủy'
        variant='danger'
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ClassManagement;
