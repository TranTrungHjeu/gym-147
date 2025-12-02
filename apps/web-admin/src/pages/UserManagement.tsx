import { motion } from 'framer-motion';
import {
  Clock,
  Download,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UserInfoCard from '../components/UserProfile/UserInfoCard';
import AdminCard from '../components/common/AdminCard';
import AdminModal from '../components/common/AdminModal';
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHeader,
  AdminTableRow,
} from '../components/common/AdminTable';
import ConfirmDialog from '../components/common/ConfirmDialog';
import CustomSelect from '../components/common/CustomSelect';
import Pagination from '../components/common/Pagination';
import RoleBadge from '../components/common/RoleBadge';
import StatusBadge from '../components/common/StatusBadge';
import { TableLoading } from '../components/ui/AppLoading';
import { memberApi, scheduleApi } from '../services/api';
import { User, userService } from '../services/user.service';

interface UserManagementFilters {
  search: string;
  role: string;
  status: string;
  sortBy: 'name' | 'role' | 'status' | 'date' | 'email';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  superAdmins: number;
  admins: number;
  trainers: number;
  members: number;
  newThisMonth: number;
}

export default function UserManagement() {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
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
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);

  // Filters state - no URL params, just local state
  const [filters, setFilters] = useState<UserManagementFilters>({
    search: '',
    role: '',
    status: '',
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    limit: 10,
  });

  // Refs to track changes
  const isInitialLoadRef = useRef(true);

  // Fetch user statistics from API
  const fetchUserStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await userService.getUserStats();

      if (response.success && response.data) {
        const statsData: UserStats = {
          total: 0,
          active: 0,
          inactive: 0,
          superAdmins: 0,
          admins: 0,
          trainers: 0,
          members: 0,
          newThisMonth: 0,
        };

        response.data.forEach((stat: any) => {
          const count = stat.count || 0;
          const recent = stat.recentRegistrations || 0;

          statsData.total += count;
          statsData.newThisMonth += recent;

          switch (stat.role) {
            case 'SUPER_ADMIN':
              statsData.superAdmins = count;
              break;
            case 'ADMIN':
              statsData.admins = count;
              break;
            case 'TRAINER':
              statsData.trainers = count;
              break;
            case 'MEMBER':
              statsData.members = count;
              break;
          }
        });

        setStats(statsData);
      }
    } catch (error: any) {
      console.error('Error fetching user stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Calculate stats from users list (fallback or supplement)
  const calculateStatsFromUsers = useCallback((usersList: User[]) => {
    setStats(prev => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const baseStats: UserStats = prev || {
        total: 0,
        active: 0,
        inactive: 0,
        superAdmins: 0,
        admins: 0,
        trainers: 0,
        members: 0,
        newThisMonth: 0,
      };

      return {
        ...baseStats,
        active: usersList.filter(u => u.isActive).length,
        inactive: usersList.filter(u => !u.isActive).length,
        newThisMonth: usersList.filter(u => new Date(u.createdAt || 0) >= startOfMonth).length,
      };
    });
  }, []);

  // Fetch all users once (no pagination from API, pagination is client-side)
  const fetchUsers = useCallback(
    async (isPageChange = false) => {
      try {
        // Only show loading on initial load, not on page changes (page changes are client-side)
        if (!isPageChange && !isPageTransitioning) {
          setLoading(true);
        }
        // Load all users with a large limit (or load all pages)
        // For now, load first 1000 users - if more needed, can implement pagination
        const response = await userService.getAllUsers({
          page: 1,
          limit: 1000, // Load many users at once for client-side filtering
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
          // Note: totalPages and totalUsers will be calculated from filtered results
          calculateStatsFromUsers(mappedUsers);
          fetchUserAvatars(mappedUsers).catch(() => {});
        }
      } catch (error: any) {
        console.error('Error fetching users:', error);
        if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
          if (window.showToast) {
            window.showToast({
              type: 'error',
              message:
                'Network error: Cannot connect to API. Please check if services are running.',
              duration: 5000,
            });
          }
        } else if (error.response?.status !== 401) {
          if (window.showToast) {
            window.showToast({
              type: 'error',
              message: error.response?.data?.message || 'Không thể tải danh sách người dùng',
              duration: 3000,
            });
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [filters.page, filters.limit, calculateStatsFromUsers]
  );

  // Fetch user avatars
  const fetchUserAvatars = async (usersList: User[]) => {
    const avatarMap: Record<string, string | null> = {};

    const results = await Promise.allSettled(
      usersList.map(async user => {
        try {
          let avatarUrl = null;

          if (user.role === 'MEMBER') {
            const response = await memberApi.get(`/user/${user.id}`).catch(() => null);
            if (response?.data?.success && response?.data?.data) {
              const memberData = response.data.data?.member || response.data.data;
              avatarUrl = memberData?.profile_photo || null;
            }
          } else if (user.role === 'TRAINER') {
            const response = await scheduleApi.get(`/trainers/user/${user.id}`).catch(() => null);
            if (response?.data?.success && response?.data?.data) {
              const trainerData = response.data.data?.trainer || response.data.data;
              avatarUrl = trainerData?.profile_photo || null;
            }
          }

          if (!avatarUrl) {
            const facePhotoUrl =
              (user as any)?.face_photo_url || (user as any)?.facePhoto || (user as any)?.photo;
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

  // Initial stats fetch
  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  // Fetch all users once on mount (all filtering and pagination is client-side)
  useEffect(() => {
    if (isInitialLoadRef.current) {
      fetchUsers(false);
      isInitialLoadRef.current = false;
    }
  }, [fetchUsers]);

  // Filter and sort users (all filters are client-side)
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...users];

    // Role filter
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(user => {
        const firstName = user.firstName || user.first_name || '';
        const lastName = user.lastName || user.last_name || '';
        const fullName = `${firstName} ${lastName}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        return (
          fullName.includes(searchLower) ||
          email.includes(searchLower) ||
          firstName.toLowerCase().includes(searchLower) ||
          lastName.toLowerCase().includes(searchLower)
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

    filtered.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (filters.sortBy) {
        case 'name':
          aValue = `${a.firstName || a.first_name || ''} ${a.lastName || a.last_name || ''}`
            .trim()
            .toLowerCase();
          bValue = `${b.firstName || b.first_name || ''} ${b.lastName || b.last_name || ''}`
            .trim()
            .toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'role':
          aValue = a.role.toLowerCase();
          bValue = b.role.toLowerCase();
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
        fetchUsers();
        fetchUserStats();
      }
      return;
    }

    setUsers(users.map(u => (u.id === updatedUser.id ? updatedUser : u)));
    if (selectedUser?.id === updatedUser.id) {
      setSelectedUser(updatedUser);
    }
    fetchUserStats();
  };

  // Handle delete user
  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);
      await userService.deleteUser(userToDelete.id);

      setUsers(users.filter(u => u.id !== userToDelete.id));
      setUserAvatars(prev => {
        const newAvatars = { ...prev };
        delete newAvatars[userToDelete.id];
        return newAvatars;
      });

      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      setActionMenuOpen(false);
      setSelectedUserForAction(null);

      fetchUsers();
      fetchUserStats();

      if (window.showToast) {
        window.showToast({
          type: 'success',
          message: 'Xóa người dùng thành công',
          duration: 3000,
        });
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: error.response?.data?.message || 'Không thể xóa người dùng',
          duration: 3000,
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Export users
  const handleExport = () => {
    const exportUsers = filteredAndSortedUsers;

    if (exportUsers.length === 0) {
      if (window.showToast) {
        window.showToast({
          type: 'warning',
          message: 'No users to export',
          duration: 3000,
        });
      }
      return;
    }

    const data = exportUsers.map(user => {
      let createdDate = '';
      if (user.createdAt) {
        try {
          const date = new Date(user.createdAt);
          if (!isNaN(date.getTime())) {
            createdDate = date.toLocaleDateString('vi-VN', {
              timeZone: 'Asia/Ho_Chi_Minh',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            });
          }
        } catch {
          // Invalid date
        }
      }

      return {
        Name: `${user.firstName || user.first_name || ''} ${
          user.lastName || user.last_name || ''
        }`.trim(),
        Email: user.email || '',
        Phone: user.phone || '',
        Role: user.role,
        Status: user.isActive ? 'Active' : 'Inactive',
        'Email Verified': user.emailVerified ? 'Yes' : 'No',
        'Phone Verified': user.phoneVerified ? 'Yes' : 'No',
        'Created At': createdDate,
      };
    });

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    if (window.showToast) {
      window.showToast({
        type: 'success',
        message: `${exportUsers.length} user${
          exportUsers.length > 1 ? 's' : ''
        } exported successfully`,
        duration: 3000,
      });
    }
  };

  // Calculate pagination from filtered results
  const totalFilteredUsers = useMemo(() => {
    return filteredAndSortedUsers.length;
  }, [filteredAndSortedUsers]);

  const totalPagesFiltered = useMemo(() => {
    return Math.ceil(totalFilteredUsers / filters.limit);
  }, [totalFilteredUsers, filters.limit]);

  // Display users with client-side pagination
  const displayUsers = useMemo(() => {
    const startIndex = (filters.page - 1) * filters.limit;
    const endIndex = startIndex + filters.limit;
    return filteredAndSortedUsers.slice(startIndex, endIndex);
  }, [filteredAndSortedUsers, filters.page, filters.limit]);

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-start'>
        <div>
          <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
            Quản lý Người dùng
          </h1>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
            Quản lý tất cả người dùng trong hệ thống (Admin, Trainer, Member)
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => {
              fetchUsers();
              fetchUserStats();
            }}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md'
          >
            <RefreshCw className='w-4 h-4' />
            Làm mới
          </button>
          <button
            onClick={handleExport}
            disabled={users.length === 0}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <Download className='w-4 h-4' />
            Xuất dữ liệu
          </button>
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
                    {statsLoading ? '...' : stats?.total || 0}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Tổng số người dùng
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
                <UserCheck className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
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
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <UserX className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {statsLoading
                      ? '...'
                      : stats?.inactive || users.filter(u => !u.isActive).length}
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
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <TrendingUp className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
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
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md p-4'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
          {/* Search Input */}
          <div className='md:col-span-2 group relative'>
            <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500' />
            <input
              type='text'
              placeholder='Tìm kiếm người dùng...'
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              className='w-full py-2 pl-9 pr-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            />
          </div>

          {/* Role Filter */}
          <div>
            <CustomSelect
              options={[
                { value: '', label: 'Tất cả vai trò' },
                { value: 'SUPER_ADMIN', label: 'Super Admin' },
                { value: 'ADMIN', label: 'Admin' },
                { value: 'TRAINER', label: 'Trainer' },
                { value: 'MEMBER', label: 'Member' },
              ]}
              value={filters.role}
              onChange={value => {
                // Only update if value actually changed to avoid unnecessary reloads
                if (value !== filters.role) {
                  setFilters(prev => ({ ...prev, role: value, page: 1 }));
                }
              }}
              placeholder='Tất cả vai trò'
              className='font-inter'
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
              onChange={value => {
                // Only update if value actually changed to avoid unnecessary reloads
                if (value !== filters.status) {
                  setFilters(prev => ({ ...prev, status: value, page: 1 }));
                }
              }}
              placeholder='Tất cả trạng thái'
              className='font-inter'
            />
          </div>
        </div>
      </div>

      {/* Users List */}
      {loading && !isPageTransitioning ? (
        <TableLoading text='Đang tải danh sách người dùng...' />
      ) : filteredAndSortedUsers.length === 0 ? (
        <AdminCard padding='md' className='text-center'>
          <div className='flex flex-col items-center justify-center py-12'>
            <Users className='w-20 h-20 text-gray-300 dark:text-gray-700 mb-4' />
            <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-heading mb-2'>
              {filters.search ? 'Không tìm thấy người dùng nào' : 'Không có người dùng nào'}
            </div>
            {!filters.search && users.length === 0 && (
              <div className='text-theme-xs text-gray-400 dark:text-gray-500 font-inter mt-2'>
                Chưa có người dùng trong hệ thống
              </div>
            )}
          </div>
        </AdminCard>
      ) : (
        <>
          <motion.div
            key={filters.page}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={isPageTransitioning ? 'opacity-0' : 'opacity-100'}
          >
            <AdminCard padding='sm' className='p-0 admin-table-container'>
              <AdminTable>
                <AdminTableHeader>
                  <AdminTableRow>
                    <AdminTableCell header className='w-[15%]'>
                      <span className='whitespace-nowrap'>Người dùng</span>
                    </AdminTableCell>
                    <AdminTableCell header className='w-[20%]'>
                      <span className='whitespace-nowrap'>Email</span>
                    </AdminTableCell>
                    <AdminTableCell header className='w-[15%] hidden md:table-cell'>
                      <span className='whitespace-nowrap'>Số điện thoại</span>
                    </AdminTableCell>
                    <AdminTableCell header className='w-[12%]'>
                      <span className='whitespace-nowrap'>Vai trò</span>
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
                  {displayUsers.map((user, index) => {
                    const firstName = user.firstName || user.first_name || '';
                    const lastName = user.lastName || user.last_name || '';
                    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';
                    const isActive = user.isActive ?? true;
                    const avatar = userAvatars[user.id];

                    return (
                      <AdminTableRow
                        key={user.id}
                        className={`group relative border-l-4 cursor-pointer border-l-transparent hover:border-l-orange-500 ${
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
                                      const fallback = e.currentTarget
                                        .nextElementSibling as HTMLElement;
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
                          <RoleBadge role={user.role} size='sm' />
                        </AdminTableCell>
                        <AdminTableCell>
                          <StatusBadge status={isActive} size='sm' />
                        </AdminTableCell>
                        <AdminTableCell className='hidden lg:table-cell'>
                          {(() => {
                            const dateValue = user.createdAt || (user as any).created_at;
                            if (!dateValue) return null;

                            try {
                              const date = new Date(dateValue);
                              if (isNaN(date.getTime())) return null;

                              return (
                                <div className='flex items-center gap-1 sm:gap-1.5'>
                                  <Clock className='w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 dark:text-gray-500 flex-shrink-0' />
                                  <span className='text-[9px] sm:text-[10px] md:text-[11px] font-semibold font-heading text-gray-900 dark:text-white'>
                                    {date.toLocaleDateString('vi-VN', {
                                      timeZone: 'Asia/Ho_Chi_Minh',
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
          </motion.div>

          {/* Pagination - only show if there are multiple pages */}
          {/* Client-side pagination based on filtered results */}
          {totalPagesFiltered > 1 && (
            <Pagination
              currentPage={filters.page}
              totalPages={totalPagesFiltered}
              totalItems={totalFilteredUsers}
              itemsPerPage={filters.limit}
              onPageChange={page => {
                setIsPageTransitioning(true);
                setFilters(prev => ({ ...prev, page }));
                setTimeout(() => {
                  setIsPageTransitioning(false);
                }, 150);
              }}
              onItemsPerPageChange={newLimit => {
                setIsPageTransitioning(true);
                setFilters(prev => ({ ...prev, limit: newLimit, page: 1 }));
                setTimeout(() => {
                  setIsPageTransitioning(false);
                }, 150);
              }}
            />
          )}
        </>
      )}

      {/* Action Menu Popup */}
      {actionMenuOpen && selectedUserForAction && (
        <>
          <div
            className='fixed inset-0 z-40'
            onClick={() => {
              setActionMenuOpen(false);
              setSelectedUserForAction(null);
            }}
          />
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
                  const firstName =
                    selectedUserForAction.firstName || selectedUserForAction.first_name || '';
                  const lastName =
                    selectedUserForAction.lastName || selectedUserForAction.last_name || '';
                  return (
                    `${firstName} ${lastName}`.trim() ||
                    selectedUserForAction.email ||
                    'Unknown User'
                  );
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
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
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
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20'
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
        title='Xác nhận xóa người dùng'
        message={`Bạn có chắc chắn muốn xóa người dùng "${
          userToDelete
            ? `${userToDelete.firstName || userToDelete.first_name || ''} ${
                userToDelete.lastName || userToDelete.last_name || ''
              }`.trim() ||
              userToDelete.email ||
              'Unknown'
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
          title='Chi tiết Người dùng'
          size='xl'
        >
          <UserInfoCard userId={selectedUser.id} onUpdate={handleUserUpdate} />
        </AdminModal>
      )}
    </div>
  );
}
