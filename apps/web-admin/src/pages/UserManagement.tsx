import { useEffect, useState } from 'react';
import UserInfoCard from '../components/UserProfile/UserInfoCard';
import Input from '../components/form/input/InputField';
import Button from '../components/ui/Button/Button';
import { User, userService } from '../services/user.service';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAllUsers({
        role: roleFilter || undefined,
        page: currentPage,
        limit: 10,
      });

      if (response.success) {
        setUsers(response.data.users || []);
        setTotalPages(response.data.pagination?.pages || 1);
        setTotalUsers(response.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi tải danh sách users',
          duration: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUsers(users.map(u => (u.id === updatedUser.id ? updatedUser : u)));
    if (selectedUser?.id === updatedUser.id) {
      setSelectedUser(updatedUser);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa user này?')) return;

    try {
      const response = await userService.deleteUser(userId);
      if (response.success) {
        setUsers(users.filter(u => u.id !== userId));
        if (selectedUser?.id === userId) {
          setSelectedUser(null);
        }

        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: 'Xóa user thành công!',
            duration: 3000,
          });
        }
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: `Lỗi xóa user: ${error.message}`,
          duration: 3000,
        });
      }
    }
  };

  const filteredUsers = users.filter(user => {
    // Map backend fields to frontend fields
    const firstName = user.firstName || user.first_name;
    const lastName = user.lastName || user.last_name;

    if (!user || !firstName || !lastName || !user.email) {
      return false;
    }

    const searchLower = searchTerm.toLowerCase();
    const matches =
      firstName.toLowerCase().includes(searchLower) ||
      lastName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower);

    return matches;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-red-100 text-red-800';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800';
      case 'TRAINER':
        return 'bg-green-100 text-green-800';
      case 'MEMBER':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className='p-6'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-800 dark:text-white/90 mb-2'>
          User Management
        </h1>
        <p className='text-gray-600 dark:text-gray-400'>
          Quản lý tài khoản người dùng trong hệ thống
        </p>
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
        {/* User List */}
        <div className='xl:col-span-1'>
          <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
            <div className='mb-4'>
              <h2 className='text-lg font-semibold text-gray-800 dark:text-white/90 mb-4'>
                Danh sách Users ({totalUsers})
              </h2>

              {/* Search and Filter */}
              <div className='space-y-3 mb-4'>
                <Input
                  type='text'
                  placeholder='Tìm kiếm user...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />

                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value=''>Tất cả roles</option>
                  <option value='SUPER_ADMIN'>Super Admin</option>
                  <option value='ADMIN'>Admin</option>
                  <option value='TRAINER'>Trainer</option>
                  <option value='MEMBER'>Member</option>
                </select>
              </div>
            </div>

            {/* User List */}
            <div className='space-y-3 max-h-96 overflow-y-auto'>
              {loading ? (
                <div className='text-center py-4'>
                  <div className='text-gray-500'>Đang tải...</div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className='text-center py-4'>
                  <div className='text-gray-500'>Không tìm thấy user nào</div>
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedUser?.id === user.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex-1'>
                        <h3 className='font-medium text-gray-800 dark:text-white/90'>
                          {user.firstName || user.first_name} {user.lastName || user.last_name}
                        </h3>
                        <p className='text-sm text-gray-600 dark:text-gray-400'>{user.email}</p>
                        <div className='flex items-center gap-2 mt-1'>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(user.role)}`}
                          >
                            {user.role}
                          </span>
                          <span
                            className={`text-xs ${user.isActive ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      <div className='flex items-center gap-1'>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={(e: any) => {
                            e.stopPropagation();
                            setSelectedUser(user);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={(e: any) => {
                            e.stopPropagation();
                            handleDeleteUser(user.id);
                          }}
                          className='text-red-600 hover:text-red-700'
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='flex items-center justify-between mt-4'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                <span className='text-sm text-gray-600 dark:text-gray-400'>
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* User Details */}
        <div className='xl:col-span-2'>
          {selectedUser ? (
            <div className='space-y-6'>
              <UserInfoCard userId={selectedUser.id} onUpdate={handleUserUpdate} />
            </div>
          ) : (
            <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
              <div className='text-center py-12'>
                <div className='text-gray-500 dark:text-gray-400'>
                  Chọn một user để xem chi tiết
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
