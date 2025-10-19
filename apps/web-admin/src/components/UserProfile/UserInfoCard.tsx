import { useEffect, useState } from 'react';
import Modal from '../../components/Modal/Modal';
import { useModal } from '../../hooks/useModal';
import { User, userService } from '../../services/user.service';
import Button from '../ui/Button/Button';
interface UserInfoCardProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

export default function UserInfoCard({ userId, onUpdate }: UserInfoCardProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      // Use profile API for current user, getUserById for other users
      const response =
        userId === 'current'
          ? await userService.getProfile()
          : await userService.getUserById(userId);

      if (response.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
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

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!user) {
        throw new Error('No user data to save');
      }

      const response = await userService.updateProfile({
        firstName: user.firstName || user.first_name,
        lastName: user.lastName || user.last_name,
        email: user.email,
        phone: user.phone || undefined,
      });

      if (response.success) {
        setUser(response.data.user);
        onUpdate?.(response.data.user);

        // Update localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          const currentUser = JSON.parse(userData);
          const updatedUserData = {
            ...currentUser,
            firstName: response.data.user.firstName || response.data.user.first_name,
            lastName: response.data.user.lastName || response.data.user.last_name,
            email: response.data.user.email,
            phone: response.data.user.phone,
          };
          localStorage.setItem('user', JSON.stringify(updatedUserData));

          // Dispatch custom event to notify other components
          window.dispatchEvent(
            new CustomEvent('userDataUpdated', {
              detail: updatedUserData,
            })
          );
        }

        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: 'Cập nhật thông tin thành công!',
            duration: 3000,
          });
        }
        closeModal();
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: `Lỗi cập nhật: ${error.message}`,
          duration: 3000,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6'>
        <div className='flex items-center justify-center h-32'>
          <div className='text-gray-500'>Đang tải...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className='p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6'>
        <div className='flex items-center justify-center h-32'>
          <div className='text-red-500'>Không tìm thấy user</div>
        </div>
      </div>
    );
  }
  return (
    <div className='p-4 border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)] rounded-xl bg-gradient-to-br from-[var(--color-orange-50)]/30 to-[var(--color-orange-100)]/20 dark:from-[var(--color-orange-900)]/10 dark:to-[var(--color-orange-800)]/10'>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        <div className='lg:col-span-2'>
          <div className='grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-3'>
            <div className='group relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg p-2 border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)] hover:shadow-md transition-all duration-300 hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'>
              <p
                className='mb-2 text-xs font-semibold text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] uppercase tracking-wide'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Tên
              </p>
              <p
                className='text-xs font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)]'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {user.firstName || user.first_name}
              </p>
            </div>

            <div className='group relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg p-2 border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)] hover:shadow-md transition-all duration-300 hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'>
              <p
                className='mb-2 text-xs font-semibold text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] uppercase tracking-wide'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Họ
              </p>
              <p
                className='text-xs font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)]'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {user.lastName || user.last_name}
              </p>
            </div>

            <div className='group relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg p-2 border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)] hover:shadow-md transition-all duration-300 hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'>
              <p
                className='mb-2 text-xs font-semibold text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] uppercase tracking-wide'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Email
              </p>
              <p
                className='text-xs font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)]'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {user.email}
              </p>
            </div>

            <div className='group relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg p-2 border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)] hover:shadow-md transition-all duration-300 hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'>
              <p
                className='mb-2 text-xs font-semibold text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] uppercase tracking-wide'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Số điện thoại
              </p>
              <p
                className='text-xs font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)]'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {user.phone || 'Chưa cập nhật'}
              </p>
            </div>

            <div className='group relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg p-2 border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)] hover:shadow-md transition-all duration-300 hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'>
              <p
                className='mb-2 text-xs font-semibold text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] uppercase tracking-wide'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Vai trò
              </p>
              <p
                className='text-xs font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)]'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {user.role === 'TRAINER' ? 'Huấn luyện viên' : user.role}
              </p>
            </div>

            <div className='group relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg p-2 border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)] hover:shadow-md transition-all duration-300 hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'>
              <p
                className='mb-2 text-xs font-semibold text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] uppercase tracking-wide'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Trạng thái
              </p>
              <div className='flex items-center gap-2'>
                <div
                  className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}
                ></div>
                <p
                  className={`text-sm font-bold ${user.isActive ? 'text-green-600' : 'text-red-600'}`}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {user.isActive ? 'Hoạt động' : 'Tạm khóa'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='space-y-2'>
          <button
            onClick={openModal}
            className='group relative overflow-hidden flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-orange-500)] to-[var(--color-orange-600)] hover:from-[var(--color-orange-600)] hover:to-[var(--color-orange-700)] text-[var(--color-white)] px-4 py-3 text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105'
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            <svg
              className='fill-current w-4 h-4'
              viewBox='0 0 18 18'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z'
                fill='currentColor'
              />
            </svg>
            <span className='relative z-10'>Chỉnh sửa</span>
            <div className='absolute inset-0 bg-gradient-to-r from-[var(--color-orange-400)]/0 via-[var(--color-orange-400)]/20 to-[var(--color-orange-400)]/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700'></div>
          </button>

          <button
            onClick={() => {
              if (window.showToast) {
                window.showToast({
                  type: 'warning',
                  message: 'Chức năng xóa tài khoản đang được phát triển',
                  duration: 3000,
                });
              }
            }}
            className='group relative overflow-hidden flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-red-500)] to-[var(--color-red-600)] hover:from-[var(--color-red-600)] hover:to-[var(--color-red-700)] text-[var(--color-white)] px-4 py-3 text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105'
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            <svg
              className='fill-current w-4 h-4'
              viewBox='0 0 20 20'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z'
                fill='currentColor'
              />
            </svg>
            <span className='relative z-10'>Xóa tài khoản</span>
            <div className='absolute inset-0 bg-gradient-to-r from-[var(--color-red-400)]/0 via-[var(--color-red-400)]/20 to-[var(--color-red-400)]/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700'></div>
          </button>
        </div>
      </div>

      {isOpen && (
        <Modal isOpen={isOpen} onClose={closeModal} className='max-w-[700px] m-4'>
          <div className='no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] p-4 lg:p-11'>
            <div className='px-2 pr-14'>
              <h4
                className='mb-2 text-2xl font-semibold text-[var(--color-gray-800)] dark:text-[var(--color-white)]'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Chỉnh sửa thông tin cá nhân
              </h4>
              <p
                className='mb-6 text-sm text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] lg:mb-7'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Cập nhật thông tin để giữ hồ sơ của bạn luôn mới nhất.
              </p>
            </div>
            <form className='flex flex-col'>
              <div className='custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3'>
                <div>
                  <h5
                    className='mb-5 text-lg font-medium text-[var(--color-gray-800)] dark:text-[var(--color-white)] lg:mb-6'
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    Thông tin cơ bản
                  </h5>

                  <div className='grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2'>
                    <div>
                      <label
                        className='block text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-2'
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        Tên
                      </label>
                      <input
                        type='text'
                        value={user?.firstName || user?.first_name || ''}
                        onChange={e =>
                          setUser(prev => (prev ? { ...prev, firstName: e.target.value } : null))
                        }
                        className='w-full px-3 py-2 border border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] rounded-lg bg-[var(--color-white)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-900)] dark:text-[var(--color-white)] focus:border-[var(--color-orange-500)] focus:ring-1 focus:ring-[var(--color-orange-500)] transition-colors duration-200'
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      />
                    </div>

                    <div>
                      <label
                        className='block text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-2'
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        Họ
                      </label>
                      <input
                        type='text'
                        value={user?.lastName || user?.last_name || ''}
                        onChange={e =>
                          setUser(prev => (prev ? { ...prev, lastName: e.target.value } : null))
                        }
                        className='w-full px-3 py-2 border border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] rounded-lg bg-[var(--color-white)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-900)] dark:text-[var(--color-white)] focus:border-[var(--color-orange-500)] focus:ring-1 focus:ring-[var(--color-orange-500)] transition-colors duration-200'
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      />
                    </div>

                    <div>
                      <label
                        className='block text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-2'
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        Email
                      </label>
                      <input
                        type='email'
                        value={user?.email || ''}
                        onChange={e =>
                          setUser(prev => (prev ? { ...prev, email: e.target.value } : null))
                        }
                        className='w-full px-3 py-2 border border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] rounded-lg bg-[var(--color-white)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-900)] dark:text-[var(--color-white)] focus:border-[var(--color-orange-500)] focus:ring-1 focus:ring-[var(--color-orange-500)] transition-colors duration-200'
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      />
                    </div>

                    <div>
                      <label
                        className='block text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-2'
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        Số điện thoại
                      </label>
                      <input
                        type='tel'
                        value={user?.phone || ''}
                        onChange={e =>
                          setUser(prev => (prev ? { ...prev, phone: e.target.value } : null))
                        }
                        className='w-full px-3 py-2 border border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] rounded-lg bg-[var(--color-white)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-900)] dark:text-[var(--color-white)] focus:border-[var(--color-orange-500)] focus:ring-1 focus:ring-[var(--color-orange-500)] transition-colors duration-200'
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-3 px-2 mt-6 lg:justify-end'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={closeModal}
                  disabled={saving}
                  className='px-4 py-2 text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] border border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] hover:bg-[var(--color-gray-50)] dark:hover:bg-[var(--color-gray-700)] transition-colors duration-200'
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Hủy
                </Button>
                <Button
                  size='sm'
                  onClick={handleSave}
                  disabled={saving}
                  className='px-4 py-2 text-sm font-medium bg-[var(--color-orange-600)] hover:bg-[var(--color-orange-700)] text-[var(--color-white)] border-0 shadow-sm hover:shadow-md transition-all duration-200'
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
