import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  Download,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  RefreshCw,
  Eye,
  Trash2,
  Mail,
  Phone,
  Clock,
} from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import { AdminTable, AdminTableBody, AdminTableCell, AdminTableHeader, AdminTableRow } from '../../components/common/AdminTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CustomSelect from '../../components/common/CustomSelect';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import AdminModal from '../../components/common/AdminModal';
import UserInfoCard from '../../components/UserProfile/UserInfoCard';
import { userService, User } from '../../services/user.service';
import { memberApi } from '../../services/api';
import { TableLoading } from '../../components/ui/AppLoading';
import ExportButton, { ExportUtils } from '../../components/common/ExportButton';
import { formatVietnamDateTime } from '../../utils/dateTime';
import { useToast } from '../../hooks/useToast';

interface MemberManagementFilters {
  search: string;
  status: string;
  sortBy: 'name' | 'status' | 'date' | 'email';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

interface MemberStats {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
}

export default function MemberManagement() {
  const { showToast } = useToast();
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userAvatars, setUserAvatars] = useState<Record<string, string | null>>({});
  
  // Action menu state
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [selectedUserForAction, setSelectedUserForAction] = useState<User | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filters state - Default role filter is MEMBER for member management
  const [filters, setFilters] = useState<MemberManagementFilters>({
    search: '',
    status: '',
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    limit: 20,
  });
  
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Calculate member statistics from users list
  const calculateMemberStats = useCallback((usersList: User[], total: number) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const stats: MemberStats = {
      total: total || usersList.length,
      active: usersList.filter(u => u.isActive).length,
      inactive: usersList.filter(u => !u.isActive).length,
      newThisMonth: usersList.filter(u => 
        new Date(u.createdAt || 0) >= startOfMonth
      ).length,
    };
    
    return stats;
  }, []);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      // Stats will be calculated from users list
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch users - Default role filter is MEMBER for member management
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userService.getAllUsers({
        role: 'MEMBER', // Always filter by MEMBER role
        page: filters.page,
        limit: filters.limit,
      });

      if (response.success) {
        const mappedUsers = (response.data.users || []).map((user: any) => ({
          ...user,
          isActive: user.is_active !== undefined ? user.is_active : user.isActive ?? true,
          firstName: user.first_name || user.firstName,
          lastName: user.last_name || user.lastName,
          face_photo_url: user.face_photo_url || user.facePhoto || user.photo || null,
          createdAt: user.created_at || user.createdAt || null,
          updatedAt: user.updated_at || user.updatedAt || null,
        }));
        setUsers(mappedUsers);
        setTotalPages(response.data.pagination?.pages || 1);
        setTotalUsers(response.data.pagination?.total || 0);
        
        // Calculate stats from users
        const calculatedStats = calculateMemberStats(mappedUsers, response.data.pagination?.total || 0);
        setStats(calculatedStats);
        
        await fetchUserAvatars(mappedUsers);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      
      // Check for CORS error
      if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        console.error('CORS or Network Error detected. Please check:');
        console.error('1. API Gateway is running on http://localhost:8080');
        console.error('2. CORS is configured in services');
        console.error('3. VITE_API_BASE_URL is set to http://localhost:8080');
        
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: 'Network error: Cannot connect to API. Please check if services are running.',
            duration: 5000,
          });
        }
      } else if (error.response?.status === 401) {
        // Handled by interceptor
      } else {
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: error.response?.data?.message || 'Không thể tải danh sách thành viên',
            duration: 3000,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [filters.page, filters.limit, calculateMemberStats]);

  // Fetch member avatars - Silent failure, use fallback
  const fetchUserAvatars = async (usersList: User[]) => {
    const avatarMap: Record<string, string | null> = {};

    // Use Promise.allSettled to continue even if some requests fail
    const results = await Promise.allSettled(
      usersList.map(async user => {
        try {
          let avatarUrl = null;

          // All users here are MEMBERs
          try {
            const response = await memberApi.get(`/user/${user.id}`).catch(() => null);
            if (response?.data?.success && response?.data?.data) {
              const memberData = response.data.data?.member || response.data.data;
              avatarUrl = memberData?.profile_photo || null;
            }
          } catch (error: any) {
            // Silently fail - will use fallback
          }

          if (!avatarUrl) {
            const facePhotoUrl = (user as any)?.face_photo_url || (user as any)?.facePhoto || (user as any)?.photo;
            if (facePhotoUrl) {
              avatarUrl = facePhotoUrl;
            }
          }

          return { userId: user.id, avatarUrl };
        } catch (error) {
          return { userId: user.id, avatarUrl: null };
        }
      })
    );

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        avatarMap[result.value.userId] = result.value.avatarUrl;
      }
    });

    setUserAvatars(prev => ({ ...prev, ...avatarMap }));
  };

  // Initial data fetch - Fetch users first, stats will be calculated from users if endpoint fails
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Try to fetch stats from analytics endpoint
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Filter and sort members
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...users];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.trim().toLowerCase();
      filtered = filtered.filter(user => {
        const firstName = user.firstName || user.first_name || '';
        const lastName = user.lastName || user.last_name || '';
        const fullName = `${firstName} ${lastName}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        return (
          !searchLower ||
          fullName.includes(searchLower) ||
          email.includes(searchLower) ||
          searchLower.split(/\s+/).every(word => fullName.includes(word))
        );
      });
    }

    // Status filter
    if (filters.status) {
      if (filters.status === 'active') {
        filtered = filtered.filter(user => user.isActive);
      } else if (filters.status === 'inactive') {
        filtered = filtered.filter(user => !user.isActive);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (filters.sortBy) {
        case 'name':
          aValue = `${a.firstName || a.first_name || ''} ${a.lastName || a.last_name || ''}`.trim().toLowerCase();
          bValue = `${b.firstName || b.first_name || ''} ${b.lastName || b.last_name || ''}`.trim().toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'status':
          aValue = a.isActive ? 1 : 0;
          bValue = b.isActive ? 1 : 0;
          break;
        case 'date':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, filters]);

  // Handle user update
  const handleUserUpdate = (updatedUser: User | null) => {
    if (updatedUser === null) {
      const deletedUserId = selectedUser?.id;
      if (deletedUserId) {
        setUsers(users.filter(u => u.id !== deletedUserId));
        setSelectedUser(null);
        setUserAvatars(prev => {
          const newAvatars = { ...prev };
          delete newAvatars[deletedUserId];
          return newAvatars;
        });
      }
      // Refresh data after deletion
      fetchUsers();
      fetchStats();
      return;
    }

    setUsers(users.map(u => (u.id === updatedUser.id ? updatedUser : u)));
    if (selectedUser?.id === updatedUser.id) {
      setSelectedUser(updatedUser);
    }
    // Refresh data after update
    fetchUsers();
    fetchStats();
  };

  // Handle delete user
  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);
      await userService.deleteUser(userToDelete.id);
      
      // Remove user from list
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setUserAvatars(prev => {
        const newAvatars = { ...prev };
        delete newAvatars[userToDelete.id];
        return newAvatars;
      });

      // Close dialogs
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      setActionMenuOpen(false);
      setSelectedUserForAction(null);

      // Refresh stats
      fetchUsers();
      fetchStats();

      if (window.showToast) {
        window.showToast({
          type: 'success',
          message: 'Xóa khách hàng thành công',
          duration: 3000,
        });
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: error.response?.data?.message || 'Không thể xóa khách hàng',
          duration: 3000,
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Prepare export data
  const getExportData = useCallback(() => {
    const exportUsers = filteredAndSortedUsers.length > 0 ? filteredAndSortedUsers : users;
    
    return exportUsers.map(user => ({
      'Họ và tên': `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() || 'N/A',
      'Email': user.email || 'N/A',
      'Số điện thoại': user.phone || 'N/A',
      'Trạng thái': user.isActive ? 'Hoạt động' : 'Không hoạt động',
      'Ngày tạo': user.createdAt 
        ? formatVietnamDateTime(user.createdAt, 'datetime')
        : 'N/A',
    }));
  }, [filteredAndSortedUsers, users]);

  // Export columns definition
  const exportColumns = [
    { key: 'Họ và tên', label: 'Họ và tên' },
    { key: 'Email', label: 'Email' },
    { key: 'Số điện thoại', label: 'Số điện thoại' },
    { key: 'Trạng thái', label: 'Trạng thái' },
    { key: 'Ngày tạo', label: 'Ngày tạo' },
  ];

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-start'>
        <div>
          <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
            Quản lý Khách hàng
          </h1>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
            Quản lý tất cả khách hàng (thành viên) trong hệ thống
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => {
              fetchUsers();
              fetchStats();
            }}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
          >
            <RefreshCw className='w-4 h-4' />
            Làm mới
          </button>
          {filteredAndSortedUsers.length > 0 && (
            <ExportButton
              data={getExportData()}
              columns={exportColumns}
              filename='danh-sach-khach-hang'
              title='Danh sách Khách hàng'
              variant='primary'
              size='sm'
            />
          )}
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
                <Users className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {statsLoading ? '...' : stats?.total || totalUsers || 0}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Tổng số khách hàng
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-success-100 dark:bg-success-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-success-100 dark:bg-success-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-success-500/20'>
                <div className='absolute inset-0 bg-success-100 dark:bg-success-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <UserCheck className='relative w-[18px] h-[18px] text-success-600 dark:text-success-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {statsLoading ? '...' : stats?.active || users.filter(u => u.isActive).length}
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
          <div className='absolute -top-px -right-px w-12 h-12 bg-gray-100 dark:bg-gray-800 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-800 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-gray-500/20'>
                <div className='absolute inset-0 bg-gray-100 dark:bg-gray-800 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <UserX className='relative w-[18px] h-[18px] text-gray-600 dark:text-gray-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {statsLoading ? '...' : stats?.inactive || users.filter(u => !u.isActive).length}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Không hoạt động
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-blue-100 dark:bg-blue-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-blue-100 dark:bg-blue-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-blue-500/20'>
                <div className='absolute inset-0 bg-blue-100 dark:bg-blue-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <TrendingUp className='relative w-[18px] h-[18px] text-blue-600 dark:text-blue-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {statsLoading ? '...' : stats?.newThisMonth || 0}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Mới trong tháng
                </div>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Search and Filters */}
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200 p-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          {/* Search Input */}
          <div className='md:col-span-2 group relative'>
            <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
            <input
              type='text'
              placeholder='Tìm kiếm khách hàng...'
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              className='w-full py-2 pl-9 pr-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            />
          </div>

          {/* Status Filter */}
          <div>
            <CustomSelect
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                { value: 'active', label: 'Hoạt động' },
                { value: 'inactive', label: 'Không hoạt động' },
              ]}
              value={filters.status}
              onChange={value => setFilters(prev => ({ ...prev, status: value, page: 1 }))}
              placeholder='Tất cả trạng thái'
              className='font-inter'
            />
          </div>
        </div>
      </div>

      {/* Members List */}
      {loading ? (
        <TableLoading text='Đang tải danh sách thành viên...' />
      ) : filteredAndSortedUsers.length === 0 ? (
        <AdminCard padding='md' className='text-center'>
          <div className='flex flex-col items-center justify-center py-12'>
            <Users className='w-20 h-20 text-gray-300 dark:text-gray-700 mb-4' />
            <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-heading mb-2'>
              {filters.search ? 'Không tìm thấy khách hàng nào' : 'Không có khách hàng nào'}
            </div>
            {!filters.search && users.length === 0 && (
              <div className='text-theme-xs text-gray-400 dark:text-gray-500 font-inter mt-2'>
                Chưa có khách hàng trong hệ thống
              </div>
            )}
          </div>
        </AdminCard>
      ) : (
        <>
          <AdminCard padding='sm' className='p-0'>
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell header className='w-[15%]'>
                    <span className='whitespace-nowrap'>Khách hàng</span>
                  </AdminTableCell>
                  <AdminTableCell header className='w-[20%]'>
                    <span className='whitespace-nowrap'>Email</span>
                  </AdminTableCell>
                  <AdminTableCell header className='w-[15%] hidden md:table-cell'>
                    <span className='whitespace-nowrap'>Số điện thoại</span>
                  </AdminTableCell>
                  <AdminTableCell header className='w-[12%]'>
                    <span className='whitespace-nowrap'>Trạng thái</span>
                  </AdminTableCell>
                  <AdminTableCell header className='w-[15%] hidden lg:table-cell'>
                    <span className='whitespace-nowrap'>Ngày tạo</span>
                  </AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {filteredAndSortedUsers.map((user, index) => {
                  const firstName = user.firstName || user.first_name || '';
                  const lastName = user.lastName || user.last_name || '';
                  const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';
                  const isActive = user.isActive ?? true;
                  const avatar = userAvatars[user.id];

                  return (
                    <AdminTableRow
                      key={user.id}
                      className={`group relative border-l-4 transition-all duration-200 cursor-pointer border-l-transparent hover:border-l-orange-500 ${
                        index % 2 === 0
                          ? 'bg-white dark:bg-gray-900'
                          : 'bg-gray-50/50 dark:bg-gray-800/50'
                      } hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 dark:hover:from-orange-900/20 dark:hover:to-orange-800/10`}
                      onClick={(e?: React.MouseEvent) => {
                        if (e) {
                          e.stopPropagation();
                          setSelectedUserForAction(user);
                          setMenuPosition({ x: e.clientX, y: e.clientY });
                          setActionMenuOpen(true);
                        }
                      }}
                    >
                      <AdminTableCell className='overflow-hidden'>
                        <div className='flex items-center gap-1.5 sm:gap-2'>
                          <div className='relative flex-shrink-0'>
                            {avatar ? (
                              <>
                                <img
                                  src={avatar}
                                  alt={fullName}
                                  className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700 shadow-sm'
                                  onError={e => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (fallback) {
                                      fallback.classList.remove('hidden');
                                      fallback.classList.add('flex');
                                    }
                                  }}
                                />
                                <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 items-center justify-center shadow-sm hidden'>
                                  <Users className='w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-orange-600 dark:text-orange-400' />
                                </div>
                              </>
                            ) : (
                              <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 flex items-center justify-center shadow-sm'>
                                <Users className='w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-orange-600 dark:text-orange-400' />
                              </div>
                            )}
                          </div>
                          <div className='min-w-0 flex-1 overflow-hidden'>
                            <div className='flex items-center gap-1.5'>
                              <div className='text-[9px] sm:text-[10px] md:text-[11px] font-semibold font-heading text-gray-900 dark:text-white truncate leading-tight'>
                                {fullName}
                              </div>
                            </div>
                          </div>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell className='overflow-hidden'>
                        {user.email ? (
                          <div className='flex items-center gap-1 sm:gap-1.5 min-w-0'>
                            <Mail className='w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 dark:text-gray-500 flex-shrink-0' />
                            <span className='text-[9px] sm:text-[10px] md:text-[11px] font-medium font-heading text-gray-700 dark:text-gray-300 truncate leading-tight'>
                              {user.email}
                            </span>
                          </div>
                        ) : null}
                      </AdminTableCell>
                      <AdminTableCell className='overflow-hidden hidden md:table-cell'>
                        {user.phone ? (
                          <div className='flex items-center gap-1 sm:gap-1.5 min-w-0'>
                            <Phone className='w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 dark:text-gray-500 flex-shrink-0' />
                            <span className='text-[9px] sm:text-[10px] md:text-[11px] font-medium font-heading text-gray-700 dark:text-gray-300 truncate leading-tight'>
                              {user.phone}
                            </span>
                          </div>
                        ) : null}
                      </AdminTableCell>
                      <AdminTableCell>
                        <StatusBadge status={isActive} size='sm' />
                      </AdminTableCell>
                      <AdminTableCell className='hidden lg:table-cell'>
                        {(() => {
                          const dateValue = user.createdAt || (user as any).created_at;
                          if (!dateValue) return null;
                          
                          try {
                            // Database stores dates in UTC, convert to Vietnam timezone for display
                            const date = new Date(dateValue);
                            if (isNaN(date.getTime())) return null;
                            
                            return (
                              <div className='flex items-center gap-1 sm:gap-1.5'>
                                <Clock className='w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 dark:text-gray-500 flex-shrink-0' />
                                <span className='text-[9px] sm:text-[10px] md:text-[11px] font-semibold font-heading text-gray-900 dark:text-white'>
                                  {date.toLocaleDateString('vi-VN', {
                                    timeZone: 'Asia/Ho_Chi_Minh', // Convert from UTC to Vietnam timezone
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                  })}
                                </span>
                              </div>
                            );
                          } catch {
                            return null;
                          }
                        })()}
                      </AdminTableCell>
                    </AdminTableRow>
                  );
                })}
              </AdminTableBody>
            </AdminTable>
          </AdminCard>

          {totalPages > 1 && (
            <Pagination
              currentPage={filters.page}
              totalPages={totalPages}
              totalItems={totalUsers}
              itemsPerPage={filters.limit}
              onPageChange={page => setFilters(prev => ({ ...prev, page }))}
              onItemsPerPageChange={newLimit => setFilters(prev => ({ ...prev, limit: newLimit, page: 1 }))}
            />
          )}
        </>
      )}

      {/* Action Menu Popup */}
      {actionMenuOpen && selectedUserForAction && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 z-40'
            onClick={() => {
              setActionMenuOpen(false);
              setSelectedUserForAction(null);
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
                {(() => {
                  const firstName = selectedUserForAction.firstName || selectedUserForAction.first_name || '';
                  const lastName = selectedUserForAction.lastName || selectedUserForAction.last_name || '';
                  return `${firstName} ${lastName}`.trim() || selectedUserForAction.email || 'Unknown User';
                })()}
              </p>
            </div>
            <div className='py-1'>
              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  setSelectedUser(selectedUserForAction);
                  setSelectedUserForAction(null);
                }}
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150'
              >
                <Eye className='w-3.5 h-3.5' />
                Xem chi tiết
              </button>
              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  setUserToDelete(selectedUserForAction);
                  setIsDeleteDialogOpen(true);
                  setSelectedUserForAction(null);
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

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={handleDelete}
        title='Xác nhận xóa khách hàng'
        message={`Bạn có chắc chắn muốn xóa khách hàng "${
          userToDelete
            ? `${userToDelete.firstName || userToDelete.first_name || ''} ${
                userToDelete.lastName || userToDelete.last_name || ''
              }`.trim() || userToDelete.email || 'Unknown'
            : ''
        }"? Hành động này không thể hoàn tác.`}
        confirmText='Xóa'
        cancelText='Hủy'
        variant='danger'
        isLoading={isDeleting}
      />

      {/* User Details Modal */}
      {selectedUser && (
        <AdminModal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title='Chi tiết Khách hàng'
          size='xl'
        >
          <UserInfoCard userId={selectedUser.id} onUpdate={handleUserUpdate} />
        </AdminModal>
      )}
    </div>
  );
}
