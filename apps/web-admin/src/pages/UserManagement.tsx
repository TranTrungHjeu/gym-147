import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  User as UserIcon,
  Users,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import UserInfoCard from '../components/UserProfile/UserInfoCard';
import AdminCard from '../components/common/AdminCard';
import CustomSelect from '../components/common/CustomSelect';
import RoleBadge from '../components/common/RoleBadge';
import useTranslation from '../hooks/useTranslation';
import { User, userService } from '../services/user.service';

export default function UserManagement() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [roleFilter, setRoleFilter] = useState<string>(searchParams.get('role') || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userAvatars, setUserAvatars] = useState<Record<string, string | null>>({});
  // Track last explicit user interaction change to roleFilter to avoid accidental overrides
  const lastRoleFilterChangeRef = useRef<{ value: string; ts: number } | null>(null);

  // Sync search param and role param from URL
  useEffect(() => {
    const searchParam = searchParams.get('search');
    const roleParam = searchParams.get('role');
    
    if (searchParam !== null && searchParam !== searchTerm) {
      setSearchTerm(searchParam);
    }
    
    if (roleParam !== null && roleParam !== roleFilter) {
      setRoleFilter(roleParam);
    } else if (roleParam === null && roleFilter !== '') {
      // If role param is removed from URL, clear the filter
      setRoleFilter('');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAllUsers({
        role: roleFilter || undefined,
        page: currentPage,
        limit: 3,
      });

      if (response.success) {
        // Map backend fields to frontend fields
        const mappedUsers = (response.data.users || []).map((user: any) => ({
          ...user,
          isActive: user.is_active !== undefined ? user.is_active : user.isActive ?? true,
          firstName: user.first_name || user.firstName,
          lastName: user.last_name || user.lastName,
        }));
        setUsers(mappedUsers);
        setTotalPages(response.data.pagination?.pages || 1);
  // totalUsers removed (unused)

        // Fetch avatars for all users
        await fetchUserAvatars(mappedUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: t('userManagement.errors.loadUsersFailed'),
          duration: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAvatars = async (usersList: User[]) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const avatarMap: Record<string, string | null> = {};

    await Promise.all(
      usersList.map(async user => {
        try {
          let avatarUrl = null;

          if (user.role === 'MEMBER') {
            // Fetch from member-service
            try {
              const memberServiceUrl = 'http://localhost:3002';
              const response = await fetch(`${memberServiceUrl}/members/user/${user.id}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (response.ok) {
                const data = await response.json();
                avatarUrl = data.data?.member?.profile_photo || data.data?.profile_photo || null;
              }
            } catch (error) {
              // Silently fail for 404 or network errors
            }
          } else if (user.role === 'TRAINER') {
            // Fetch from schedule-service
            try {
              const scheduleServiceUrl = 'http://localhost:3003';
              const response = await fetch(`${scheduleServiceUrl}/trainers/user/${user.id}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (response.ok) {
                const data = await response.json();
                avatarUrl = data.data?.trainer?.profile_photo || data.data?.profile_photo || null;
              }
            } catch (error) {
              // Silently fail for 404 or network errors
            }
          }

          // Fallback to face_photo_url from identity-service if available
          if (!avatarUrl && (user as any)?.face_photo_url) {
            avatarUrl = (user as any).face_photo_url;
          }

          avatarMap[user.id] = avatarUrl;
        } catch (error) {
          // Silently fail
          avatarMap[user.id] = null;
        }
      })
    );

    setUserAvatars(prev => ({ ...prev, ...avatarMap }));
  };

  const handleUserUpdate = (updatedUser: User | null) => {
    // If updatedUser is null, it means the user was deleted
    if (updatedUser === null) {
      // Find the user that was deleted (should be selectedUser)
      const deletedUserId = selectedUser?.id;
      if (deletedUserId) {
        // Remove user from list
        setUsers(users.filter(u => u.id !== deletedUserId));
        // Clear selected user
        setSelectedUser(null);
        // Remove avatar from cache
        setUserAvatars(prev => {
          const newAvatars = { ...prev };
          delete newAvatars[deletedUserId];
          return newAvatars;
        });
      }
      return;
    }

    // Normal update: update user in list
    setUsers(users.map(u => (u.id === updatedUser.id ? updatedUser : u)));
    if (selectedUser?.id === updatedUser.id) {
      setSelectedUser(updatedUser);
    }
  };

  // handleDeleteUser removed (unused in current UI)

  const filteredUsers = users.filter(user => {
    // Map backend fields to frontend fields
    const firstName = user.firstName || user.first_name || '';
    const lastName = user.lastName || user.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
    const email = user.email || '';

    if (!user || (!firstName && !lastName && !email)) {
      return false;
    }

    // Trim and normalize search term
    const searchLower = searchTerm.trim().toLowerCase();
    
    // If search is empty, show all users
    if (!searchLower) {
      return true;
    }

    // Check if search term matches:
    // 1. Full name (e.g., "long phan" matches "Long Phan")
    // 2. First name
    // 3. Last name
    // 4. Email
    // 5. Any word in the full name (e.g., "long" matches "Long Phan")
    const matches =
      fullName.includes(searchLower) ||
      firstName.toLowerCase().includes(searchLower) ||
      lastName.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower) ||
      // Check if all words in search term are present in full name
      searchLower.split(/\s+/).every(word => fullName.includes(word));

    return matches;
  });

  const getUserInitials = (user: User) => {
    const firstName = user.firstName || user.first_name || '';
    const lastName = user.lastName || user.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='p-3 space-y-3'>
        {/* Header */}
        <div className='pb-4 border-b border-gray-200 dark:border-gray-800'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='w-11 h-11 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 rounded-xl flex items-center justify-center shadow-sm'>
              <Users className='w-5 h-5 text-orange-600 dark:text-orange-400' />
            </div>
            <div>
              <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
                {t('userManagement.title')}
              </h1>
              <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
                {t('userManagement.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 xl:grid-cols-3 gap-3'>
          {/* User List */}
          <div className='xl:col-span-1'>
            <AdminCard padding='sm'>
              <div className='mb-3'>
                <div className='flex items-center gap-2.5 mb-3'>
                  <div className='w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 rounded-lg flex items-center justify-center shadow-sm'>
                    <UserIcon className='w-4 h-4 text-orange-600 dark:text-orange-400' />
                  </div>
                  <h2 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white'>
                    {t('userManagement.userList.title')}
                  </h2>
                </div>

                <div className='space-y-2.5'>
                  {/* Search Input */}
                  <div className='relative group'>
                    <div className='absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10'>
                      <Search className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 dark:group-focus-within:text-orange-400 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-all duration-200' />
                    </div>
                    <input
                      type='text'
                      placeholder={t('userManagement.search.placeholder')}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className='w-full pl-9 pr-3 py-2 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    />
                  </div>

                  {/* Filter Select */}
                  {/*
                    Role filter is intentionally isolated. It should only change from direct user
                    interaction here, not from edit modal side-effects. If you see it change when
                    opening or editing a user, search for unintended calls to setRoleFilter.
                  */}
                  <CustomSelect
                    options={[
                      { value: '', label: t('userManagement.filter.allRoles') },
                      { value: 'SUPER_ADMIN', label: t('userManagement.roles.superAdmin') },
                      { value: 'ADMIN', label: t('userManagement.roles.admin') },
                      { value: 'TRAINER', label: t('userManagement.roles.trainer') },
                      { value: 'MEMBER', label: t('userManagement.roles.member') },
                    ]}
                    value={roleFilter}
                    onChange={value => {
                      // Guard: only update from this controlled interaction
                      lastRoleFilterChangeRef.current = { value, ts: Date.now() };
                      setRoleFilter(value);
                      // Update URL to reflect the role filter
                      setSearchParams(prev => {
                        const newParams = new URLSearchParams(prev);
                        if (value) {
                          newParams.set('role', value);
                        } else {
                          newParams.delete('role');
                        }
                        return newParams;
                      });
                    }}
                    placeholder={t('userManagement.filter.allRoles')}
                    icon={<Filter className='w-3.5 h-3.5' />}
                  />
                </div>
              </div>

              <div className='space-y-2'>
                {loading ? (
                  <div className='text-center py-6'>
                    <div className='inline-flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
                      <div className='w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-orange-500 rounded-full animate-spin'></div>
                      <span>{t('common.loading')}</span>
                    </div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className='text-center py-6'>
                    <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
                      {t('userManagement.userList.noUsers')}
                    </div>
                  </div>
                ) : (
                  filteredUsers.map(user => {
                    const initials = getUserInitials(user);
                    const isSelected = selectedUser?.id === user.id;
                    const userAvatar = userAvatars[user.id];

                    return (
                      <div
                        key={user.id}
                        className={`p-3 border rounded-xl cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-orange-500 dark:border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md shadow-orange-500/10'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-sm'
                        }`}
                        onClick={() => setSelectedUser(user)}
                      >
                        <div className='flex items-start gap-2.5'>
                          <div className='relative flex-shrink-0'>
                            {userAvatar ? (
                              <img
                                src={userAvatar}
                                alt={`${user.firstName || user.first_name} ${
                                  user.lastName || user.last_name
                                }`}
                                className={`w-9 h-9 rounded-full object-cover ${
                                  isSelected
                                    ? 'border-2 border-orange-500 dark:border-orange-600'
                                    : 'border-2 border-gray-300 dark:border-gray-600'
                                }`}
                              />
                            ) : (
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold font-heading ${
                                  isSelected
                                    ? 'bg-orange-500 dark:bg-orange-600'
                                    : 'bg-gray-400 dark:bg-gray-600'
                                }`}
                              >
                                {initials}
                              </div>
                            )}
                            {user.isActive && (
                              <div className='absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success-500 dark:bg-success-400 rounded-full border-2 border-white dark:border-gray-900'></div>
                            )}
                          </div>

                          <div className='flex-1 min-w-0'>
                            <h3 className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white truncate'>
                              {user.firstName || user.first_name} {user.lastName || user.last_name}
                            </h3>
                            <p className='text-[11px] text-gray-600 dark:text-gray-400 font-inter truncate mt-0.5'>
                              {user.email}
                            </p>
                            <div className='flex items-center gap-1.5 mt-1.5 flex-wrap'>
                              <RoleBadge role={user.role} size='sm' />
                              <span
                                className={`inline-flex items-center gap-0.5 text-[10px] font-medium font-inter ${
                                  user.isActive
                                    ? 'text-success-600 dark:text-success-400'
                                    : 'text-error-600 dark:text-error-400'
                                }`}
                              >
                                {user.isActive ? (
                                  <>
                                    <CheckCircle2 className='w-3 h-3' />
                                    <span>{t('userManagement.status.active')}</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className='w-3 h-3' />
                                    <span>{t('userManagement.status.inactive')}</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className='flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-800'>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-medium font-inter rounded-xl border transition-all duration-200 ${
                      currentPage === 1
                        ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500'
                    }`}
                  >
                    <ChevronLeft className='w-3.5 h-3.5' />
                    <span>{t('common.prev')}</span>
                  </button>

                  <div className='flex items-center gap-2.5'>
                    <span className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter font-medium'>
                      {t('common.page')}
                    </span>
                    <span className='px-3 py-1.5 text-theme-xs font-semibold font-heading text-orange-600 dark:text-orange-400 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 rounded-lg shadow-sm'>
                      {currentPage}
                    </span>
                    <span className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter font-medium'>
                      {t('common.of')} {totalPages}
                    </span>
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-medium font-inter rounded-xl border transition-all duration-200 ${
                      currentPage === totalPages
                        ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500'
                    }`}
                  >
                    <span>{t('common.next')}</span>
                    <ChevronRight className='w-3.5 h-3.5' />
                  </button>
                </div>
              )}
            </AdminCard>
          </div>

          {/* User Details */}
          <div className='xl:col-span-2'>
            {selectedUser ? (
              <UserInfoCard userId={selectedUser.id} onUpdate={handleUserUpdate} />
            ) : (
              <AdminCard padding='sm'>
                <div className='text-center py-16'>
                  <div className='w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 rounded-2xl flex items-center justify-center shadow-sm'>
                    <UserIcon className='w-8 h-8 text-orange-600 dark:text-orange-400' />
                  </div>
                  <div className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                    {t('userManagement.empty.selectUser')}
                  </div>
                  <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
                    {t('userManagement.empty.description')}
                  </div>
                </div>
              </AdminCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
