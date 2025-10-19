import { motion } from 'framer-motion';
import { Camera, Download, Key, Mail, Phone, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import UserInfoCard from '../../components/UserProfile/UserInfoCard';
import Button from '../../components/ui/Button/Button';
import { User as UserType, userService } from '../../services/user.service';

export default function TrainerProfile() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const response = await userService.getProfile();
      if (response.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi tải thông tin user',
          duration: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = (updatedUser: UserType) => {
    setUser(updatedUser);
    // Update localStorage with new user data
    const userData = localStorage.getItem('user');
    if (userData) {
      const currentUser = JSON.parse(userData);
      const updatedUserData = {
        ...currentUser,
        firstName: updatedUser.firstName || updatedUser.first_name,
        lastName: updatedUser.lastName || updatedUser.last_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
      };
      localStorage.setItem('user', JSON.stringify(updatedUserData));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Function to generate avatar based on name
  const generateAvatar = (firstName: string, lastName: string) => {
    const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
    const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
    const initials = firstInitial + lastInitial;

    // Generate a consistent color based on name
    const colors = [
      'bg-[var(--color-orange-500)]',
      'bg-[var(--color-orange-600)]',
      'bg-[var(--color-orange-700)]',
      'bg-[var(--color-orange-800)]',
      'bg-[var(--color-gray-600)]',
      'bg-[var(--color-gray-700)]',
      'bg-[var(--color-gray-800)]',
      'bg-[var(--color-gray-900)]',
    ];
    const colorIndex = (firstName + lastName).length % colors.length;

    return (
      <div
        className={`w-full h-full ${colors[colorIndex]} flex items-center justify-center text-[var(--color-white)] font-bold text-xl lg:text-2xl`}
      >
        {initials}
      </div>
    );
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4'></div>
          <p className='text-gray-600 dark:text-gray-400'>Đang tải thông tin hồ sơ...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='text-red-500 text-xl mb-4'>Không tìm thấy thông tin user</div>
          <Button onClick={handleLogout}>Đăng xuất</Button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen-full bg-gradient-to-br from-[var(--color-gray-50)] via-[var(--color-white)] to-[var(--color-gray-100)] dark:from-[var(--color-gray-900)] dark:via-[var(--color-gray-800)] dark:to-[var(--color-gray-900)]'>
      <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 h-full flex flex-col'>
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className='mb-2 flex-shrink-0'
        >
          <div className='grid grid-cols-1 lg:grid-cols-5 gap-4'>
            {/* Title Section */}
            <div className='lg:col-span-1 space-y-0.5'>
              <h1 className='text-xl lg:text-2xl font-bold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                Hồ sơ cá nhân
              </h1>
              <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] text-xs font-sans'>
                Quản lý thông tin cá nhân và cài đặt tài khoản
              </p>
            </div>

            {/* Profile Overview + Account Status - Combined */}
            <div className='lg:col-span-3'>
              <div className='relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg shadow-sm border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] p-3'>
                <div className='flex items-center gap-4'>
                  {/* Avatar */}
                  <div className='relative group flex-shrink-0'>
                    <div className='relative w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--color-white)] dark:border-[var(--color-gray-700)] shadow-sm'>
                      {generateAvatar(
                        user?.firstName || user?.first_name || 'U',
                        user?.lastName || user?.last_name || 'S'
                      )}
                    </div>
                    <button className='absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-[var(--color-orange-600)] to-[var(--color-orange-700)] hover:from-[var(--color-orange-700)] hover:to-[var(--color-orange-800)] text-[var(--color-white)] p-1 rounded-full shadow-sm transition-all duration-300 hover:scale-110'>
                      <Camera className='w-2.5 h-2.5' />
                    </button>
                  </div>

                  {/* User Info */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <h2 className='text-sm font-bold text-[var(--color-gray-900)] dark:text-[var(--color-white)] truncate font-sans'>
                        {user?.firstName || user?.first_name} {user?.lastName || user?.last_name}
                      </h2>
                      <span className='inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--color-orange-50)] dark:bg-[var(--color-orange-900)]/20 border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)]'>
                        <span className='text-xs font-semibold text-[var(--color-orange-700)] dark:text-[var(--color-orange-300)] font-sans'>
                          {user?.role === 'TRAINER' ? 'Huấn luyện viên' : user?.role}
                        </span>
                      </span>
                    </div>
                    <div className='flex items-center gap-4 mt-2'>
                      <div className='flex items-center gap-1'>
                        <Mail
                          className={`w-4 h-4 ${user?.emailVerified ? 'text-[var(--color-orange-500)]' : 'text-[var(--color-gray-400)]'}`}
                        />
                        <span
                          className={`text-xs font-medium ${user?.emailVerified ? 'text-[var(--color-orange-600)]' : 'text-[var(--color-gray-500)]'}`}
                        >
                          Email
                        </span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <Phone
                          className={`w-4 h-4 ${user?.phone ? 'text-[var(--color-orange-500)]' : 'text-[var(--color-gray-400)]'}`}
                        />
                        <span
                          className={`text-xs font-medium ${user?.phone ? 'text-[var(--color-orange-600)]' : 'text-[var(--color-gray-500)]'}`}
                        >
                          SĐT
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Account Status */}
                  <div className='flex-shrink-0'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center space-x-2'>
                        <div className='w-2 h-2 bg-[var(--color-orange-500)] rounded-full animate-pulse'></div>
                        <span className='text-xs font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                          Trạng thái
                        </span>
                      </div>
                      <div className='text-right ml-4'>
                        <div
                          className='text-sm font-bold text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                        >
                          Hoạt động
                        </div>
                      </div>
                    </div>
                    <div className='mt-2 pt-2 border-t border-[var(--color-gray-100)] dark:border-[var(--color-gray-700)]'>
                      <div className='flex justify-between text-xs'>
                        <span className='text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                          Tham gia:
                        </span>
                        <span className='text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-medium font-sans'>
                          {user?.createdAt
                            ? new Date(user.createdAt).toLocaleDateString('vi-VN')
                            : 'Không có thông tin'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className='lg:col-span-1'>
              <div className='relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg shadow-sm border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] p-3'>
                <div className='text-center mb-3'>
                  <h3 className='text-sm font-bold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                    Quản lý
                  </h3>
                </div>
                <div className='space-y-2'>
                  <Button
                    onClick={() => {
                      if (window.showToast) {
                        window.showToast({
                          type: 'info',
                          message: 'Chức năng đổi mật khẩu đang được phát triển',
                          duration: 3000,
                        });
                      }
                    }}
                    className='w-full group relative overflow-hidden bg-gradient-to-r from-[var(--color-orange-600)] to-[var(--color-orange-700)] hover:from-[var(--color-orange-700)] hover:to-[var(--color-orange-800)] text-[var(--color-white)] border-0 shadow-sm hover:shadow-md transition-all duration-300 h-8'
                  >
                    <span className='relative z-10 flex items-center justify-center font-semibold text-xs font-sans'>
                      <Key className='w-3 h-3 mr-1' />
                      Đổi mật khẩu
                    </span>
                    <div className='absolute inset-0 bg-gradient-to-r from-[var(--color-orange-500)]/0 via-[var(--color-orange-500)]/20 to-[var(--color-orange-500)]/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700'></div>
                  </Button>

                  <Button
                    variant='outline'
                    onClick={() => {
                      if (window.showToast) {
                        window.showToast({
                          type: 'info',
                          message: 'Chức năng xuất dữ liệu đang được phát triển',
                          duration: 3000,
                        });
                      }
                    }}
                    className='w-full group relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] border-[var(--color-gray-200)] dark:border-[var(--color-gray-600)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)] hover:bg-[var(--color-orange-50)] dark:hover:bg-[var(--color-orange-900)]/10 transition-all duration-300 h-8'
                  >
                    <span className='relative z-10 flex items-center justify-center text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] group-hover:text-[var(--color-orange-600)] dark:group-hover:text-[var(--color-orange-400)] font-semibold text-xs font-sans'>
                      <Download className='w-3 h-3 mr-1' />
                      Xuất dữ liệu
                    </span>
                    <div className='absolute inset-0 bg-gradient-to-r from-[var(--color-orange-500)]/0 via-[var(--color-orange-500)]/5 to-[var(--color-orange-500)]/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700'></div>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className='grid grid-cols-1 gap-3'>
          {/* Personal Info - Full Width */}
          <div className='space-y-3 flex flex-col'>
            {/* Personal Information */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className='relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-xl shadow-md border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'
            >
              {/* Card Header */}
              <div className='relative bg-gradient-to-r from-[var(--color-orange-50)] to-[var(--color-orange-100)] dark:from-[var(--color-orange-900)]/20 dark:to-[var(--color-orange-800)]/20 px-4 py-3 border-b border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)]'>
                <div className='flex items-center space-x-3'>
                  <div className='p-2 rounded-xl bg-gradient-to-br from-[var(--color-orange-500)] to-[var(--color-orange-600)] shadow-md hover:shadow-lg transition-all duration-300'>
                    <User className='w-5 h-5 text-[var(--color-white)]' />
                  </div>
                  <div>
                    <h3 className='text-lg font-bold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      Thông tin cá nhân
                    </h3>
                    <p className='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] text-xs font-medium font-sans'>
                      Quản lý thông tin cơ bản
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className='p-2 flex-1'>
                <UserInfoCard userId='current' onUpdate={handleUserUpdate} />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
