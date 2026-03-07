import { scheduleApi } from '@/services/api';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, FileText, Key, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import UserInfoCard from '../../components/UserProfile/UserInfoCard';
import { ExportUtils } from '../../components/common/ExportButton';
import ChangePasswordModal from '../../components/modals/ChangePasswordModal';
import { PageLoading } from '../../components/ui/AppLoading';
import Button from '../../components/ui/Button/Button';
import { Trainer } from '../../services/trainer.service';
import { User as UserType, userService } from '../../services/user.service';

export default function TrainerProfile() {
  const [user, setUser] = useState<UserType | null>(null);
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    // Fetch trainer profile photo if user is a trainer
    if (user?.role === 'TRAINER' && user?.id) {
      fetchTrainerAvatar(user.id);
    }
  }, [user]);

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

  const fetchTrainerAvatar = async (userId: string) => {
    try {
      const response = await scheduleApi.get(`/trainers/user/${userId}`);

      if (response.data?.success || response.data?.data) {
        const data = response.data;
        const profilePhoto = data.data?.trainer?.profile_photo || data.data?.profile_photo || null;
        if (profilePhoto) {
          setTrainer({ profile_photo: profilePhoto } as Trainer);
        } else {
          setTrainer(null);
        }
      } else {
        setTrainer(null);
      }
    } catch (error) {
      console.error('Error fetching trainer avatar:', error);
      setTrainer(null);
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
    // Refetch trainer avatar if user is a trainer
    if (updatedUser.role === 'TRAINER' && updatedUser.id) {
      fetchTrainerAvatar(updatedUser.id);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  if (loading) {
    return <PageLoading />;
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

  const fullName = `${user?.firstName || user?.first_name || ''} ${
    user?.lastName || user?.last_name || ''
  }`.trim();
  const roleLabel = user?.role === 'TRAINER' ? 'Huấn luyện viên' : user?.role || 'N/A';
  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('vi-VN')
    : 'Không có thông tin';

  return (
    <div className='min-h-screen-full bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-900)]'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-full flex flex-col gap-3'>
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className='flex-shrink-0'
        >
          <div className='space-y-0.5'>
            <h1 className='text-xl lg:text-2xl font-bold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
              Hồ sơ cá nhân
            </h1>
            <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] text-xs font-sans'>
              Quản lý thông tin cá nhân và cài đặt tài khoản
            </p>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-3'>
          <div className='lg:col-span-8'>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className='relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-none shadow-sm border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'
            >
              <div className='relative bg-[var(--color-orange-50)] dark:bg-[var(--color-orange-900)]/20 px-4 py-3 border-b border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)]'>
                <div className='flex items-center space-x-3'>
                  <div className='p-2 rounded-none bg-[var(--color-orange-600)] shadow-sm'>
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

              <div className='p-3 flex-1'>
                <UserInfoCard userId='current' onUpdate={handleUserUpdate} />
              </div>
            </motion.div>
          </div>

          <div className='lg:col-span-4 space-y-3'>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className='bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-none shadow-sm border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] p-3 min-h-[200px]'
            >
              <h3 className='text-sm font-bold text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-3'>
                Tổng quan tài khoản
              </h3>
              <div className='space-y-2 text-xs'>
                <div className='flex justify-between border-b border-[var(--color-gray-100)] dark:border-[var(--color-gray-700)] pb-2'>
                  <span className='text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)]'>
                    Họ tên
                  </span>
                  <span className='font-semibold text-[var(--color-gray-800)] dark:text-[var(--color-gray-200)] text-right'>
                    {fullName || 'N/A'}
                  </span>
                </div>
                <div className='flex justify-between border-b border-[var(--color-gray-100)] dark:border-[var(--color-gray-700)] pb-2'>
                  <span className='text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)]'>
                    Vai trò
                  </span>
                  <span className='font-semibold text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'>
                    {roleLabel}
                  </span>
                </div>
                <div className='flex justify-between border-b border-[var(--color-gray-100)] dark:border-[var(--color-gray-700)] pb-2'>
                  <span className='text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)]'>
                    Email xác thực
                  </span>
                  <span className='font-semibold text-[var(--color-gray-800)] dark:text-[var(--color-gray-200)]'>
                    {user.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                  </span>
                </div>
                <div className='flex justify-between border-b border-[var(--color-gray-100)] dark:border-[var(--color-gray-700)] pb-2'>
                  <span className='text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)]'>
                    SĐT xác thực
                  </span>
                  <span className='font-semibold text-[var(--color-gray-800)] dark:text-[var(--color-gray-200)]'>
                    {user.phoneVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)]'>
                    Ngày tham gia
                  </span>
                  <span className='font-semibold text-[var(--color-gray-800)] dark:text-[var(--color-gray-200)]'>
                    {joinedDate}
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className='relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-none shadow-sm border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] p-3 min-h-[200px]'
            >
              <div className='mb-3 pb-2 border-b border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
                <h3 className='text-sm font-bold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                  Hành động nhanh
                </h3>
              </div>
              <div className='space-y-2 flex flex-col items-center'>
                <Button
                  onClick={() => setIsChangePasswordModalOpen(true)}
                  className='w-full max-w-[240px] bg-[var(--color-orange-600)] hover:bg-[var(--color-orange-700)] text-[var(--color-white)] border border-[var(--color-orange-700)] shadow-sm transition-all duration-200 h-8 rounded-none'
                >
                  <span className='flex items-center justify-center font-semibold text-xs font-sans'>
                    <Key className='w-3 h-3 mr-1' />
                    Đổi mật khẩu
                  </span>
                </Button>

                {user ? (
                  <div className='w-full max-w-[240px] space-y-2'>
                    <Button
                      onClick={() => {
                        ExportUtils.exportToPDF({
                          format: 'pdf',
                          filename: 'trainer-profile',
                          title: 'Thông tin Trainer',
                          data: [
                            {
                              'Họ và tên':
                                `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
                              Email: user.email || 'N/A',
                              'Số điện thoại': user.phone || 'N/A',
                              'Vai trò': user.role || 'N/A',
                              'Email đã xác thực': user.emailVerified ? 'Có' : 'Không',
                              'Số điện thoại đã xác thực': user.phoneVerified ? 'Có' : 'Không',
                              'Ảnh đại diện': trainer?.profile_photo || 'N/A',
                            },
                          ],
                          columns: [
                            { key: 'Họ và tên', label: 'Họ và tên' },
                            { key: 'Email', label: 'Email' },
                            { key: 'Số điện thoại', label: 'Số điện thoại' },
                            { key: 'Vai trò', label: 'Vai trò' },
                            { key: 'Email đã xác thực', label: 'Email đã xác thực' },
                            {
                              key: 'Số điện thoại đã xác thực',
                              label: 'Số điện thoại đã xác thực',
                            },
                            { key: 'Ảnh đại diện', label: 'Ảnh đại diện' },
                          ],
                        });
                      }}
                      className='w-full bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] border border-[var(--color-gray-200)] dark:border-[var(--color-gray-600)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)] hover:bg-[var(--color-orange-50)] dark:hover:bg-[var(--color-orange-900)]/10 transition-all duration-200 h-8 rounded-none'
                    >
                      <span className='flex items-center justify-center text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] group-hover:text-[var(--color-orange-600)] dark:group-hover:text-[var(--color-orange-400)] font-semibold text-xs font-sans'>
                        <FileText className='w-3 h-3 mr-1' />
                        Xuất PDF
                      </span>
                    </Button>
                    <Button
                      onClick={() => {
                        ExportUtils.exportToExcel({
                          format: 'excel',
                          filename: 'trainer-profile',
                          data: [
                            {
                              'Họ và tên':
                                `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
                              Email: user.email || 'N/A',
                              'Số điện thoại': user.phone || 'N/A',
                              'Vai trò': user.role || 'N/A',
                              'Email đã xác thực': user.emailVerified ? 'Có' : 'Không',
                              'Số điện thoại đã xác thực': user.phoneVerified ? 'Có' : 'Không',
                              'Ảnh đại diện': trainer?.profile_photo || 'N/A',
                            },
                          ],
                          columns: [
                            { key: 'Họ và tên', label: 'Họ và tên' },
                            { key: 'Email', label: 'Email' },
                            { key: 'Số điện thoại', label: 'Số điện thoại' },
                            { key: 'Vai trò', label: 'Vai trò' },
                            { key: 'Email đã xác thực', label: 'Email đã xác thực' },
                            {
                              key: 'Số điện thoại đã xác thực',
                              label: 'Số điện thoại đã xác thực',
                            },
                            { key: 'Ảnh đại diện', label: 'Ảnh đại diện' },
                          ],
                        });
                      }}
                      className='w-full bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] border border-[var(--color-gray-200)] dark:border-[var(--color-gray-600)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)] hover:bg-[var(--color-orange-50)] dark:hover:bg-[var(--color-orange-900)]/10 transition-all duration-200 h-8 rounded-none'
                    >
                      <span className='flex items-center justify-center text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] group-hover:text-[var(--color-orange-600)] dark:group-hover:text-[var(--color-orange-400)] font-semibold text-xs font-sans'>
                        <FileSpreadsheet className='w-3 h-3 mr-1' />
                        Xuất Excel
                      </span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant='outline'
                    disabled
                    className='w-full max-w-[240px] bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] border border-[var(--color-gray-200)] dark:border-[var(--color-gray-600)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)] hover:bg-[var(--color-orange-50)] dark:hover:bg-[var(--color-orange-900)]/10 transition-all duration-200 h-8 rounded-none'
                  >
                    <span className='flex items-center justify-center text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] group-hover:text-[var(--color-orange-600)] dark:group-hover:text-[var(--color-orange-400)] font-semibold text-xs font-sans'>
                      <Download className='w-3 h-3 mr-1' />
                      Xuất dữ liệu
                    </span>
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        userEmail={user?.email}
        userPhone={user?.phone}
      />
    </div>
  );
}
