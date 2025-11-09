import { AnimatePresence, motion } from 'framer-motion';
import { Mail, Phone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useModal } from '../../hooks/useModal';
import { User, userService } from '../../services/user.service';
import RoleBadge from '../common/RoleBadge';
import Button from '../ui/Button/Button';
import EmailPhoneOTPModal from '../modals/EmailPhoneOTPModal';
import ChangeEmailPhoneModal from '../modals/ChangeEmailPhoneModal';
interface UserInfoCardProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

export default function UserInfoCard({ userId, onUpdate }: UserInfoCardProps) {
  console.log('🔄 UserInfoCard render:', { userId });
  const { isOpen, openModal, closeModal } = useModal();
  const {
    isOpen: isDeleteOpen,
    openModal: openDeleteModal,
    closeModal: closeDeleteModal,
  } = useModal();
  const {
    isOpen: isOTPModalOpen,
    openModal: openOTPModal,
    closeModal: closeOTPModal,
  } = useModal();
  const {
    isOpen: isChangeEmailModalOpen,
    openModal: openChangeEmailModal,
    closeModal: closeChangeEmailModal,
  } = useModal();
  const {
    isOpen: isChangePhoneModalOpen,
    openModal: openChangePhoneModal,
    closeModal: closeChangePhoneModal,
  } = useModal();
  const [user, setUser] = useState<User | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    isActive?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [lastFetchedUserId, setLastFetchedUserId] = useState<string | null>(null);
  const isEditingRef = useRef(false);
  // Local state for form inputs to prevent reset on re-render
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    isActive?: boolean;
  } | null>(null);
  const [isActiveToggle, setIsActiveToggle] = useState<boolean>(true);

  // Disable body scroll completely when modal is open
  useEffect(() => {
    if (isOpen || isDeleteOpen) {
      // Store original overflow values
      const originalOverflow = document.body.style.overflow;
      const originalOverflowY = document.body.style.overflowY;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const scrollY = window.scrollY;

      // Disable scroll completely
      document.body.style.overflow = 'hidden';
      document.body.style.overflowY = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      return () => {
        // Restore original styles
        document.body.style.overflow = originalOverflow;
        document.body.style.overflowY = originalOverflowY;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, isDeleteOpen]);

  // Track user state changes
  useEffect(() => {
    console.log('👤 User state changed:', {
      userId: user?.id,
      firstName: user?.firstName || user?.first_name,
      lastName: user?.lastName || user?.last_name,
      isEditing: isEditingRef.current,
    });
  }, [user]);

  // Only fetch when userId actually changes (not when modal opens/closes or during editing)
  useEffect(() => {
    console.log('🔍 useEffect triggered:', {
      userId,
      lastFetchedUserId,
      isEditing: isEditingRef.current,
      isOpen,
      shouldFetch: userId && userId !== lastFetchedUserId && !isEditingRef.current && !isOpen,
    });

    // Don't fetch if:
    // 1. No userId
    // 2. Same userId as last fetch
    // 3. Currently editing
    // 4. Modal is open (we already have the data)
    if (userId && userId !== lastFetchedUserId && !isEditingRef.current && !isOpen) {
      console.log('✅ Fetching user data...');
      fetchUser();
      setLastFetchedUserId(userId);
    } else {
      console.log('❌ Skipping fetch:', {
        reason: !userId
          ? 'No userId'
          : userId === lastFetchedUserId
          ? 'Same userId'
          : isEditingRef.current
          ? 'Currently editing'
          : isOpen
          ? 'Modal is open'
          : 'Unknown',
      });
    }
  }, [userId, isOpen]); // Include isOpen to track modal state changes

  const fetchUser = async () => {
    console.log('📥 fetchUser called for userId:', userId);
    try {
      setLoading(true);
      // Use profile API for current user, getUserById for other users
      const response =
        userId === 'current'
          ? await userService.getProfile()
          : await userService.getUserById(userId);

      if (response.success) {
        // Map backend fields to frontend fields
        const userData = response.data.user as any;
        const mappedUser = {
          ...userData,
          isActive:
            userData.is_active !== undefined ? userData.is_active : userData.isActive ?? true,
          firstName: userData.first_name || userData.firstName || '',
          lastName: userData.last_name || userData.lastName || '',
        };
        console.log('📥 Fetched user data:', {
          userId: mappedUser.id,
          firstName: mappedUser.firstName,
          lastName: mappedUser.lastName,
        });

        // CRITICAL: Don't reset user state if currently editing
        if (!isEditingRef.current) {
          console.log('✅ Setting user state (not editing)');
          setUser(mappedUser);
          setIsActiveToggle(mappedUser.isActive ?? true);
          // Also update formData when not editing
          setFormData({
            firstName: mappedUser.firstName || mappedUser.first_name || '',
            lastName: mappedUser.lastName || mappedUser.last_name || '',
            email: mappedUser.email || '',
            phone: mappedUser.phone || '',
            isActive: mappedUser.isActive ?? true,
          });
        } else {
          console.log('⚠️ SKIPPING setUser - currently editing!');
        }

        // Fetch avatar based on role
        await fetchUserAvatar(mappedUser.id, mappedUser.role);
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

  const fetchUserAvatar = async (userId: string, role: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      let avatarUrl = null;

      if (role === 'MEMBER') {
        // Fetch from member-service
        try {
          const memberServiceUrl = 'http://localhost:3002';
          const response = await fetch(`${memberServiceUrl}/members/user/${userId}`, {
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
      } else if (role === 'TRAINER') {
        // Fetch from schedule-service
        try {
          const scheduleServiceUrl = 'http://localhost:3003';
          const response = await fetch(`${scheduleServiceUrl}/trainers/user/${userId}`, {
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

      setUserAvatar(avatarUrl);
    } catch (error) {
      // Silently fail
      setUserAvatar(null);
    }
  };

  const getUserInitials = (user: User | null) => {
    if (!user) return 'U';
    const firstName = user.firstName || user.first_name || '';
    const lastName = user.lastName || user.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!user) {
        throw new Error('No user data to save');
      }

      // Use formData if available (more recent), otherwise fallback to user state
      const firstName = formData?.firstName ?? user.firstName ?? user.first_name ?? '';
      const lastName = formData?.lastName ?? user.lastName ?? user.last_name ?? '';
      const email = formData?.email ?? user.email ?? '';
      const phone = formData?.phone ?? user.phone ?? undefined;
      // Use toggle state for isActive (only allow for non-current users)
      const isActive = userId !== 'current' ? isActiveToggle : undefined;

      console.log('💾 handleSave - values to send:', {
        firstName,
        lastName,
        email,
        phone,
        isActive,
        formDataEmail: formData?.email,
        userEmail: user.email,
        formDataPhone: formData?.phone,
        userPhone: user.phone,
      });

      // No need to check for email/phone change anymore - they're changed via modal with OTP verification
      // Proceed with normal update
      const response =
        userId === 'current'
          ? await userService.updateProfile({
              firstName,
              lastName,
              email,
              phone,
            })
          : await userService.updateUser(user.id, {
              firstName,
              lastName,
              email,
              phone,
              isActive,
            });

      if (response.success) {
        // Normalize the response data to match frontend format
        const userData = response.data.user as any;
        // Use isActiveToggle if available (for non-current users), otherwise use response data
        const finalIsActive =
          userId !== 'current' && isActiveToggle !== undefined
            ? isActiveToggle
            : userData.is_active !== undefined
            ? userData.is_active
            : userData.isActive ?? true;

        const normalizedUser = {
          ...userData,
          isActive: finalIsActive,
          firstName: userData.first_name || userData.firstName || '',
          lastName: userData.last_name || userData.lastName || '',
          email: userData.email || '',
          phone: userData.phone || '',
        };

        // Update toggle state to match normalized user
        setIsActiveToggle(finalIsActive);

        console.log('💾 Saving user:', {
          userId,
          currentLastFetched: lastFetchedUserId,
          normalizedUser: {
            id: normalizedUser.id,
            firstName: normalizedUser.firstName,
            lastName: normalizedUser.lastName,
            isActive: normalizedUser.isActive,
            isActiveToggle,
            finalIsActive,
          },
        });

        // CRITICAL: Update lastFetchedUserId FIRST before calling onUpdate
        // This prevents race condition where onUpdate triggers parent re-render
        // and parent might cause useEffect to run again
        setLastFetchedUserId(userId);
        console.log('✅ Updated lastFetchedUserId to:', userId);
        setUser(normalizedUser);
        isEditingRef.current = false; // Reset editing flag after save
        console.log('✅ Reset isEditingRef to false');

        // Call onUpdate AFTER updating lastFetchedUserId
        // This ensures that any parent re-render won't trigger fetch
        console.log('📤 Calling onUpdate callback...');
        onUpdate?.(normalizedUser as User);

        // Update localStorage ONLY when updating the logged-in user
        const storedUserData = localStorage.getItem('user');
        if (storedUserData) {
          const currentUser = JSON.parse(storedUserData);
          const isEditingSelf = userId === 'current' || currentUser?.id === normalizedUser.id;

          if (isEditingSelf) {
            const updatedUserData = {
              ...currentUser,
              firstName: normalizedUser.firstName,
              lastName: normalizedUser.lastName,
              email: normalizedUser.email,
              phone: normalizedUser.phone,
            };
            localStorage.setItem('user', JSON.stringify(updatedUserData));

            // Dispatch custom event to notify other components
            window.dispatchEvent(
              new CustomEvent('userDataUpdated', {
                detail: updatedUserData,
              })
            );
          }
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

  const handleOTPSuccess = async () => {
    if (!pendingUpdate || !user) return;

    try {
      setSaving(true);
      // OTP verification already handled the update, just refresh user data
      await fetchUser();
      setPendingUpdate(null);
      closeModal();
      if (window.showToast) {
        window.showToast({
          type: 'success',
          message: 'Thông tin đã được cập nhật thành công',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error refreshing user after OTP:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChangeSuccess = (newEmail?: string) => {
    if (newEmail) {
      setFormData(prev => ({
        ...(prev || {
          firstName: user?.firstName || user?.first_name || '',
          lastName: user?.lastName || user?.last_name || '',
          email: user?.email || '',
          phone: user?.phone || '',
          isActive: user?.isActive ?? true,
        }),
        email: newEmail,
      }));
      setUser(prev => prev ? { ...prev, email: newEmail } : null);
      isEditingRef.current = true;
    }
  };

  const handlePhoneChangeSuccess = (newPhone?: string) => {
    if (newPhone) {
      setFormData(prev => ({
        ...(prev || {
          firstName: user?.firstName || user?.first_name || '',
          lastName: user?.lastName || user?.last_name || '',
          email: user?.email || '',
          phone: user?.phone || '',
          isActive: user?.isActive ?? true,
        }),
        phone: newPhone,
      }));
      setUser(prev => prev ? { ...prev, phone: newPhone } : null);
      isEditingRef.current = true;
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm.toLowerCase() !== 'delete') {
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Vui lòng nhập "delete" để xác nhận xóa',
          duration: 3000,
        });
      }
      return;
    }

    try {
      setDeleting(true);

      if (!user) {
        throw new Error('No user data to delete');
      }

      const response = await userService.deleteUser(user.id);

      if (response.success) {
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: 'Xóa user thành công!',
            duration: 3000,
          });
        }
        closeDeleteModal();
        setDeleteConfirm('');
        onUpdate?.(null as any);
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
    } finally {
      setDeleting(false);
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
        {/* Avatar Section with Buttons */}
        <div className='lg:col-span-1 flex flex-col items-center lg:items-start mb-4 lg:mb-0 gap-4'>
          <div className='relative'>
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={`${user.firstName || user.first_name} ${user.lastName || user.last_name}`}
                className='w-24 h-24 rounded-full object-cover border-4 border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)] shadow-lg'
              />
            ) : (
              <div className='w-24 h-24 rounded-full bg-gradient-to-br from-[var(--color-orange-500)] to-[var(--color-orange-600)] flex items-center justify-center border-4 border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)] shadow-lg'>
                <span className='text-2xl font-bold text-white font-heading'>
                  {getUserInitials(user)}
                </span>
              </div>
            )}
            {user.isActive && (
              <div className='absolute bottom-0 right-0 w-6 h-6 bg-success-500 dark:bg-success-400 rounded-full border-4 border-white dark:border-gray-800'></div>
            )}
          </div>

          <div className='space-y-2 w-full'>
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
              onClick={openDeleteModal}
              disabled={userId === 'current'}
              className='group relative overflow-hidden flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-red-500)] to-[var(--color-red-600)] hover:from-[var(--color-red-600)] hover:to-[var(--color-red-700)] text-[var(--color-white)] px-4 py-3 text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
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
              <div className='flex items-center gap-2'>
                <RoleBadge role={user.role} size='sm' />
              </div>
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
                  className={`w-2 h-2 rounded-full ${
                    user.isActive ? 'bg-green-500' : 'bg-red-500'
                  } animate-pulse`}
                ></div>
                <p
                  className={`text-sm font-bold ${
                    user.isActive ? 'text-green-600' : 'text-red-600'
                  }`}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {user.isActive ? 'Hoạt động' : 'Tạm khóa'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
      {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='fixed inset-0 z-[100000] flex items-center justify-center p-4'
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
            }}
            onClick={() => {
            isEditingRef.current = false;
            if (user) {
              setIsActiveToggle(user.isActive ?? true);
            }
            closeModal();
          }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 300,
                duration: 0.3,
              }}
              className='relative w-full max-w-[700px] rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden'
              onClick={e => e.stopPropagation()}
            >
            {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className='sticky top-0 z-10 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-b border-orange-200 dark:border-orange-700 px-6 py-4 rounded-t-2xl'
              >
              <div className='flex items-start justify-between gap-4'>
                <div className='flex-1'>
                  <h4 className='text-xl font-bold font-heading text-gray-900 dark:text-white mb-1'>
                    Chỉnh sửa thông tin
                  </h4>
                  <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter'>
                    Cập nhật thông tin để giữ hồ sơ luôn mới nhất
                  </p>
                </div>
                <button
                    onClick={() => {
                      isEditingRef.current = false;
                      if (user) {
                        setIsActiveToggle(user.isActive ?? true);
                      }
                      closeModal();
                    }}
                  className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0'
                >
                  <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                </button>
              </div>
              </motion.div>

            {/* Form Content */}
              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.15 }}
                className='flex flex-col'
                onSubmit={e => e.preventDefault()}
              >
              <div className='p-6 space-y-5'>
                <div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>
                  <div>
                    <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                      Tên
                    </label>
                    <input
                      type='text'
                      value={formData?.firstName ?? user?.firstName ?? user?.first_name ?? ''}
                      onFocus={() => {
                        console.log('👆 Input focused, setting isEditingRef to true');
                        isEditingRef.current = true;
                        // Initialize formData if not exists
                        if (!formData && user) {
                          setFormData({
                            firstName: user.firstName || user.first_name || '',
                            lastName: user.lastName || user.last_name || '',
                            email: user.email || '',
                            phone: user.phone || '',
                            isActive: user.isActive ?? true,
                          });
                        }
                      }}
                      onChange={e => {
                        const newValue = e.target.value;
                        console.log('✏️ firstName onChange:', {
                          newValue,
                          currentUserState: user?.firstName || user?.first_name,
                          fullUserState: user,
                          isEditingBefore: isEditingRef.current,
                        });
                        isEditingRef.current = true;
                        // Update formData first (immediate UI update, won't reset on re-render)
                        setFormData(prev => ({
                          ...(prev || {
                            firstName: user?.firstName || user?.first_name || '',
                            lastName: user?.lastName || user?.last_name || '',
                            email: user?.email || '',
                            phone: user?.phone || '',
                            isActive: user?.isActive ?? true,
                          }),
                          firstName: newValue,
                        }));
                        // Also update user state for consistency
                        setUser(prev => {
                          if (!prev) {
                            console.log('⚠️ prev is null in onChange!');
                            return null;
                          }
                          const newUser = { ...prev, firstName: newValue };
                          console.log('✏️ Updated user state:', {
                            oldFirstName: prev?.firstName || prev?.first_name,
                            newFirstName: newUser?.firstName,
                          });
                          return newUser;
                        });
                      }}
                      onBlur={() => {
                        console.log(
                          '👋 Input blurred, current value:',
                          user?.firstName || user?.first_name
                        );
                      }}
                      className='w-full px-4 py-3 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
                    />
                  </div>

                  <div>
                    <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                      Họ
                    </label>
                    <input
                      type='text'
                      value={formData?.lastName ?? user?.lastName ?? user?.last_name ?? ''}
                      onFocus={() => {
                        console.log('👆 lastName input focused, setting isEditingRef to true');
                        isEditingRef.current = true;
                        // Initialize formData if not exists
                        if (!formData && user) {
                          setFormData({
                            firstName: user.firstName || user.first_name || '',
                            lastName: user.lastName || user.last_name || '',
                            email: user.email || '',
                            phone: user.phone || '',
                            isActive: user.isActive ?? true,
                          });
                        }
                      }}
                      onChange={e => {
                        const newValue = e.target.value;
                        console.log('✏️ lastName onChange:', {
                          newValue,
                          currentUserState: user?.lastName || user?.last_name,
                          fullUserState: user,
                          isEditingBefore: isEditingRef.current,
                        });
                        isEditingRef.current = true;
                        // Update formData first (immediate UI update, won't reset on re-render)
                        setFormData(prev => ({
                          ...(prev || {
                            firstName: user?.firstName || user?.first_name || '',
                            lastName: user?.lastName || user?.last_name || '',
                            email: user?.email || '',
                            phone: user?.phone || '',
                            isActive: user?.isActive ?? true,
                          }),
                          lastName: newValue,
                        }));
                        // Also update user state for consistency
                        setUser(prev => {
                          if (!prev) {
                            console.log('⚠️ prev is null in onChange!');
                            return null;
                          }
                          const newUser = { ...prev, lastName: newValue };
                          console.log('✏️ Updated user state:', {
                            oldLastName: prev?.lastName || prev?.last_name,
                            newLastName: newUser?.lastName,
                          });
                          return newUser;
                        });
                      }}
                      onBlur={() => {
                        console.log(
                          '👋 lastName input blurred, current value:',
                          user?.lastName || user?.last_name
                        );
                      }}
                      className='w-full px-4 py-3 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
                    />
                  </div>

                  <div>
                    <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                      Email
                    </label>
                    <div className='flex gap-2'>
                    <input
                      type='email'
                      value={formData?.email ?? user?.email ?? ''}
                        disabled
                        className='flex-1 px-4 py-3 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 cursor-not-allowed font-inter'
                      />
                      <motion.button
                        type='button'
                        onClick={() => {
                        if (!formData && user) {
                          setFormData({
                            firstName: user.firstName || user.first_name || '',
                            lastName: user.lastName || user.last_name || '',
                            email: user.email || '',
                            phone: user.phone || '',
                            isActive: user.isActive ?? true,
                          });
                        }
                          openChangeEmailModal();
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className='px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-md hover:shadow-orange-500/30 transition-all duration-200 font-space-grotesk text-xs whitespace-nowrap flex items-center gap-2'
                      >
                        <Mail className='w-3.5 h-3.5' />
                        <span>Đổi</span>
                      </motion.button>
                    </div>
                  </div>

                  <div>
                    <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                      Số điện thoại
                    </label>
                    <div className='flex gap-2'>
                    <input
                      type='tel'
                      value={formData?.phone ?? user?.phone ?? ''}
                        disabled
                        className='flex-1 px-4 py-3 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 cursor-not-allowed font-inter'
                      />
                      <motion.button
                        type='button'
                        onClick={() => {
                        if (!formData && user) {
                          setFormData({
                            firstName: user.firstName || user.first_name || '',
                            lastName: user.lastName || user.last_name || '',
                            email: user.email || '',
                            phone: user.phone || '',
                            isActive: user.isActive ?? true,
                          });
                        }
                          openChangePhoneModal();
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className='px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-md hover:shadow-orange-500/30 transition-all duration-200 font-space-grotesk text-xs whitespace-nowrap flex items-center gap-2'
                      >
                        <Phone className='w-3.5 h-3.5' />
                        <span>Đổi</span>
                      </motion.button>
                    </div>
                  </div>

                  {/* Status Toggle - Only show for non-current users */}
                  {userId !== 'current' && (
                    <div className='col-span-2'>
                      <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                        Trạng thái tài khoản
                      </label>
                      <div className='flex items-center gap-4'>
                        <div className='flex items-center gap-2'>
                          <span
                            className={`text-sm font-medium ${
                              isActiveToggle
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {isActiveToggle ? 'Hoạt động' : 'Đã khóa'}
                          </span>
                        </div>
                        <button
                          type='button'
                          onClick={() => {
                            const newValue = !isActiveToggle;
                            setIsActiveToggle(newValue);
                            isEditingRef.current = true;
                            // Update formData to keep it in sync
                            setFormData(prev => ({
                              ...(prev || {
                                firstName: user?.firstName || user?.first_name || '',
                                lastName: user?.lastName || user?.last_name || '',
                                email: user?.email || '',
                                phone: user?.phone || '',
                                isActive: user?.isActive ?? true,
                              }),
                              isActive: newValue,
                            }));
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                            isActiveToggle
                              ? 'bg-green-500 dark:bg-green-600'
                              : 'bg-red-500 dark:bg-red-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isActiveToggle ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className='text-xs text-gray-500 dark:text-gray-400'>
                          {isActiveToggle
                            ? 'Tài khoản đang hoạt động'
                            : 'Tài khoản đã bị khóa (user vi phạm)'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.2 }}
                  className='sticky bottom-0 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 rounded-b-2xl flex items-center justify-end gap-3'
                >
                <Button
                  size='sm'
                  variant='outline'
                    onClick={() => {
                      isEditingRef.current = false;
                      if (user) {
                        setIsActiveToggle(user.isActive ?? true);
                      }
                      closeModal();
                    }}
                  disabled={saving}
                    className='px-5 py-2 text-xs font-semibold font-space-grotesk border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200'
                >
                  Hủy
                </Button>
                <Button
                  size='sm'
                  onClick={handleSave}
                  disabled={saving}
                    className='px-5 py-2 text-xs font-semibold font-space-grotesk bg-orange-600 hover:bg-orange-700 text-white border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200'
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
                </motion.div>
              </motion.form>
            </motion.div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
      {isDeleteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='fixed inset-0 z-[100000] flex items-center justify-center p-4'
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
            }}
            onClick={closeDeleteModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 300,
                duration: 0.3,
              }}
              className='relative w-full max-w-[500px] rounded-2xl bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 shadow-xl overflow-hidden'
              onClick={e => e.stopPropagation()}
            >
            {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className='sticky top-0 z-10 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-b border-red-200 dark:border-red-700 px-6 py-4 rounded-t-2xl'
              >
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-center gap-3 flex-1'>
                    <motion.div
                      initial={{ scale: 0.8, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.15 }}
                      className='w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0'
                    >
                    <svg
                      className='w-5 h-5 text-red-600 dark:text-red-400'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                      />
                    </svg>
                    </motion.div>
                  <div>
                    <h4 className='text-xl font-bold font-heading text-gray-900 dark:text-white mb-1'>
                      Xác nhận xóa user
                    </h4>
                    <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter'>
                      Hành động này không thể hoàn tác
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeDeleteModal}
                  className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0'
                >
                  <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                </button>
              </div>
              </motion.div>

            {/* Content */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.15 }}
                className='p-6 space-y-4'
              >
              <div className='bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4'>
                <p className='text-theme-xs text-gray-700 dark:text-gray-300 font-inter mb-3'>
                  Bạn đang xóa user:{' '}
                  <span className='font-semibold text-gray-900 dark:text-white'>
                    {user?.firstName || user?.first_name} {user?.lastName || user?.last_name}
                  </span>
                </p>
                <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter'>
                  Để xác nhận, vui lòng nhập{' '}
                  <span className='font-semibold text-red-600 dark:text-red-400'>"delete"</span> vào
                  ô bên dưới:
                </p>
              </div>

              <div>
                <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                  Nhập "delete" để xác nhận
                </label>
                <input
                  type='text'
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder='delete'
                  className='w-full px-4 py-3 text-theme-xs border border-red-300 dark:border-red-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-500 transition-all duration-200 font-inter shadow-sm'
                  autoFocus
                />
              </div>
              </motion.div>

            {/* Footer */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.2 }}
                className='sticky bottom-0 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 rounded-b-2xl flex items-center justify-end gap-3'
              >
              <Button
                size='sm'
                variant='outline'
                onClick={closeDeleteModal}
                disabled={deleting}
                  className='px-5 py-2 text-xs font-semibold font-space-grotesk border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200'
              >
                Hủy
              </Button>
              <Button
                size='sm'
                onClick={handleDelete}
                disabled={deleting || deleteConfirm.toLowerCase() !== 'delete'}
                  className='px-5 py-2 text-xs font-semibold font-space-grotesk bg-red-600 hover:bg-red-700 text-white border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {deleting ? 'Đang xóa...' : 'Xóa user'}
              </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OTP Modal for email/phone change */}
      <EmailPhoneOTPModal
        isOpen={isOTPModalOpen}
        onClose={closeOTPModal}
        onSuccess={handleOTPSuccess}
        userEmail={user?.email}
        userPhone={user?.phone}
        newEmail={pendingUpdate?.email}
        newPhone={pendingUpdate?.phone}
        firstName={pendingUpdate?.firstName}
        lastName={pendingUpdate?.lastName}
      />

      {/* Change Email Modal */}
      <ChangeEmailPhoneModal
        isOpen={isChangeEmailModalOpen}
        onClose={closeChangeEmailModal}
        onSuccess={handleEmailChangeSuccess}
        userEmail={user?.email}
        userPhone={user?.phone}
        type='EMAIL'
      />

      {/* Change Phone Modal */}
      <ChangeEmailPhoneModal
        isOpen={isChangePhoneModalOpen}
        onClose={closeChangePhoneModal}
        onSuccess={handlePhoneChangeSuccess}
        userEmail={user?.email}
        userPhone={user?.phone}
        type='PHONE'
      />
    </div>
  );
}
