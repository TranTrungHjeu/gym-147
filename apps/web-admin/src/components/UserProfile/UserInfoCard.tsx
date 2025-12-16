import { useEffect, useRef, useState } from 'react';
import Modal from '../../components/Modal/Modal';
import { useModal } from '../../hooks/useModal';
import { User, userService } from '../../services/user.service';
import { EnumBadge } from '../../shared/components/ui';
import Button from '../ui/Button/Button';
import ChangeEmailPhoneModal from '../modals/ChangeEmailPhoneModal';
import { memberApi, scheduleApi } from '@/services/api';
import { trainerService, Trainer } from '@/services/trainer.service';
import { MemberService, Member } from '@/services/member.service';
interface UserInfoCardProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

export default function UserInfoCard({ userId, onUpdate }: UserInfoCardProps) {
  console.log('[SYNC] UserInfoCard render:', { userId });
  const { isOpen, openModal, closeModal } = useModal();
  const {
    isOpen: isDeleteOpen,
    openModal: openDeleteModal,
    closeModal: closeDeleteModal,
  } = useModal();
  const {
    isOpen: isChangeEmailOpen,
    openModal: openChangeEmailModal,
    closeModal: closeChangeEmailModal,
  } = useModal();
  const {
    isOpen: isChangePhoneOpen,
    openModal: openChangePhoneModal,
    closeModal: closeChangePhoneModal,
  } = useModal();
  const [user, setUser] = useState<User | null>(null);
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
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Trainer-specific state
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [trainerLoading, setTrainerLoading] = useState(false);

  // Member-specific state
  const [member, setMember] = useState<Member | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberFormData, setMemberFormData] = useState<{
    date_of_birth: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | '';
    address: string;
    height: number | null;
    weight: number | null;
    body_fat_percent: number | null;
    emergency_contact: string;
    emergency_phone: string;
  } | null>(null);
  const [memberErrors, setMemberErrors] = useState<Record<string, string>>({});

  // Track user state changes
  useEffect(() => {
    console.log('👤 User state changed:', {
      userId: user?.id,
      firstName: user?.firstName || user?.first_name,
      lastName: user?.lastName || user?.last_name,
      isEditing: isEditingRef.current,
    });
  }, [user]);

  // Listen for avatar update events (optimistic update)
  useEffect(() => {
    const handleAvatarUpdate = (e: CustomEvent) => {
      if (e.detail && e.detail.userId && user && user.id === e.detail.userId) {
        // Optimistically update avatar if it matches current user
        setUserAvatar(e.detail.avatarUrl);
      }
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    };
  }, [user]);

  // Only fetch when userId actually changes (not when modal opens/closes or during editing)
  useEffect(() => {
    console.log('[SEARCH] useEffect triggered:', {
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
      console.log('[SUCCESS] Fetching user data...');
      fetchUser();
      setLastFetchedUserId(userId);
    } else {
      console.log('[ERROR] Skipping fetch:', {
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
    console.log('[DATA] fetchUser called for userId:', userId);
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

        // Check if current user is admin/super admin
        try {
          const storedUserData = localStorage.getItem('user');
          if (storedUserData) {
            const currentUser = JSON.parse(storedUserData);
            const currentUserRole = currentUser?.role;
            setIsAdmin(currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN');
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
        }

        console.log('[DATA] Fetched user data:', {
          userId: mappedUser.id,
          firstName: mappedUser.firstName,
          lastName: mappedUser.lastName,
        });

        // CRITICAL: Don't reset user state if currently editing
        if (!isEditingRef.current) {
          console.log('[SUCCESS] Setting user state (not editing)');
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
          console.log('[WARNING] SKIPPING setUser - currently editing!');
        }

        // Priority 1: Check if profile_photo exists in user data (from member/trainer service)
        // Priority 2: Fetch avatar from member/trainer service based on role
        // Priority 3: Fallback to face_photo_url from identity-service
        const existingProfilePhoto = (mappedUser as any)?.profile_photo;
        if (existingProfilePhoto) {
          setUserAvatar(existingProfilePhoto);
        } else {
          await fetchUserAvatar(mappedUser.id, mappedUser.role);
        }

        // Fetch trainer info if user is TRAINER
        if (mappedUser.role === 'TRAINER') {
          await fetchTrainerInfo(mappedUser.id);
        }

        // Fetch member info if user is MEMBER
        if (mappedUser.role === 'MEMBER') {
          await fetchMemberInfo(mappedUser.id);
        }
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

  const fetchTrainerInfo = async (userId: string) => {
    try {
      setTrainerLoading(true);
      const response = await trainerService.getTrainerByUserId(userId);
      console.log('[TRAINER] Fetch trainer response:', response);
      if (response.success && response.data) {
        // API returns Trainer directly, not wrapped in { trainer: {...} }
        const trainerData = response.data as Trainer;
        console.log('[TRAINER] Trainer data:', trainerData);
        console.log('[TRAINER] Hourly rate:', trainerData.hourly_rate);
        setTrainer(trainerData);
      } else {
        console.warn('[TRAINER] Failed to fetch trainer:', response);
      }
    } catch (error) {
      console.error('Error fetching trainer info:', error);
    } finally {
      setTrainerLoading(false);
    }
  };

  const fetchMemberInfo = async (userId: string) => {
    try {
      setMemberLoading(true);
      // Get member by user_id
      const response = await memberApi.get(`/members/user/${userId}`);
      if (response.data?.success && response.data?.data) {
        const memberData = response.data.data.member || response.data.data;
        setMember(memberData as Member);

        // Format date_of_birth for input (YYYY-MM-DD)
        const dateOfBirth = memberData.date_of_birth
          ? new Date(memberData.date_of_birth).toISOString().split('T')[0]
          : '';

        setMemberFormData({
          date_of_birth: dateOfBirth,
          gender: memberData.gender || '',
          address: memberData.address || '',
          height: memberData.height ? Number(memberData.height) : null,
          weight: memberData.weight ? Number(memberData.weight) : null,
          body_fat_percent: memberData.body_fat_percent
            ? Number(memberData.body_fat_percent)
            : null,
          emergency_contact: memberData.emergency_contact || '',
          emergency_phone: memberData.emergency_phone || '',
        });
      }
    } catch (error) {
      console.error('Error fetching member info:', error);
    } finally {
      setMemberLoading(false);
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
          const response = await memberApi.get(`/members/user/${userId}`);

          if (response.data?.success || response.data?.data) {
            const data = response.data;
            avatarUrl = data.data?.member?.profile_photo || data.data?.profile_photo || null;
          }
        } catch (error) {
          // Silently fail for 404 or network errors
        }
      } else if (role === 'TRAINER') {
        // Fetch from schedule-service
        try {
          const response = await scheduleApi.get(`/trainers/user/${userId}`);

          if (response.data?.success || response.data?.data) {
            const data = response.data;
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

  // Validation functions for member form
  const validateMemberForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!memberFormData) return false;

    // Date of birth: Must be valid date and not in the future
    if (memberFormData.date_of_birth) {
      const dob = new Date(memberFormData.date_of_birth);
      const today = new Date();
      if (dob > today) {
        errors.date_of_birth = 'Ngày sinh không được ở tương lai';
      } else {
        const age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          const actualAge = age - 1;
          if (actualAge < 13 || actualAge > 120) {
            errors.date_of_birth = 'Tuổi phải từ 13 đến 120';
          }
        } else if (age < 13 || age > 120) {
          errors.date_of_birth = 'Tuổi phải từ 13 đến 120';
        }
      }
    }

    // Height: If provided, must be between 50-250 cm
    if (memberFormData.height !== null && memberFormData.height !== undefined) {
      if (memberFormData.height < 50 || memberFormData.height > 250) {
        errors.height = 'Chiều cao phải từ 50 đến 250 cm';
      }
    }

    // Weight: If provided, must be between 20-300 kg
    if (memberFormData.weight !== null && memberFormData.weight !== undefined) {
      if (memberFormData.weight < 20 || memberFormData.weight > 300) {
        errors.weight = 'Cân nặng phải từ 20 đến 300 kg';
      }
    }

    // Body fat percent: If provided, must be between 0-100
    if (memberFormData.body_fat_percent !== null && memberFormData.body_fat_percent !== undefined) {
      if (memberFormData.body_fat_percent < 0 || memberFormData.body_fat_percent > 100) {
        errors.body_fat_percent = 'Tỷ lệ mỡ cơ thể phải từ 0 đến 100%';
      }
    }

    // Emergency phone: If emergency contact is provided, phone should also be provided
    if (memberFormData.emergency_contact && !memberFormData.emergency_phone) {
      errors.emergency_phone = 'Vui lòng nhập số điện thoại liên hệ khẩn cấp';
    }

    // Emergency phone format: Vietnamese phone number format
    if (memberFormData.emergency_phone) {
      const phoneRegex = /^(0|\+84)[1-9][0-9]{8,9}$/;
      const cleanPhone = memberFormData.emergency_phone.trim().replace(/\s/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        errors.emergency_phone = 'Số điện thoại không hợp lệ. Ví dụ: 0912345678 hoặc +84912345678';
      }
    }

    // Address: Max 500 chars
    if (memberFormData.address && memberFormData.address.length > 500) {
      errors.address = 'Địa chỉ không được vượt quá 500 ký tự';
    }

    setMemberErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveMember = async () => {
    if (!member || !memberFormData) return;

    if (!validateMemberForm()) {
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Vui lòng kiểm tra lại các trường thông tin',
          duration: 3000,
        });
      }
      throw new Error('Validation failed');
    }

    const updateData: any = {
      date_of_birth: memberFormData.date_of_birth
        ? new Date(memberFormData.date_of_birth)
        : undefined,
      gender: memberFormData.gender || undefined,
      address: memberFormData.address.trim() || undefined,
      height: memberFormData.height !== null ? memberFormData.height : undefined,
      weight: memberFormData.weight !== null ? memberFormData.weight : undefined,
      body_fat_percent:
        memberFormData.body_fat_percent !== null ? memberFormData.body_fat_percent : undefined,
      emergency_contact: memberFormData.emergency_contact.trim() || undefined,
      emergency_phone: memberFormData.emergency_phone.trim().replace(/\s/g, '') || undefined,
    };

    const updatedMember = await MemberService.updateMember(member.id, updateData);
    setMember(updatedMember);

    // Update form data
    const dateOfBirth = updatedMember.date_of_birth
      ? new Date(updatedMember.date_of_birth).toISOString().split('T')[0]
      : '';

    setMemberFormData({
      date_of_birth: dateOfBirth,
      gender: updatedMember.gender || '',
      address: updatedMember.address || '',
      height: updatedMember.height ? Number(updatedMember.height) : null,
      weight: updatedMember.weight ? Number(updatedMember.weight) : null,
      body_fat_percent: updatedMember.body_fat_percent
        ? Number(updatedMember.body_fat_percent)
        : null,
      emergency_contact: updatedMember.emergency_contact || '',
      emergency_phone: updatedMember.emergency_phone || '',
    });
  };

  const handleSave = async (skipSavingState = false) => {
    try {
      if (!skipSavingState) {
        setSaving(true);
      }

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

      // For admin editing other users, allow direct update without OTP
      // For admin editing other users, allow direct update without OTP
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

      // If admin is changing password for another user
      if (userId !== 'current' && isAdmin && newPassword && newPassword.trim() !== '') {
        if (newPassword !== confirmPassword) {
          throw new Error('Mật khẩu xác nhận không khớp');
        }
        await userService.changeUserPassword(user.id, newPassword);
        setNewPassword('');
        setConfirmPassword('');
      }

      // If admin is changing password for another user
      if (userId !== 'current' && isAdmin && newPassword && newPassword.trim() !== '') {
        if (newPassword !== confirmPassword) {
          throw new Error('Mật khẩu xác nhận không khớp');
        }
        await userService.changeUserPassword(user.id, newPassword);
        setNewPassword('');
        setConfirmPassword('');
      }

      // If admin is changing password for another user
      if (userId !== 'current' && isAdmin && newPassword && newPassword.trim() !== '') {
        if (newPassword !== confirmPassword) {
          throw new Error('Mật khẩu xác nhận không khớp');
        }
        await userService.changeUserPassword(user.id, newPassword);
        setNewPassword('');
        setConfirmPassword('');
      }

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
        console.log('[SUCCESS] Updated lastFetchedUserId to:', userId);
        setUser(normalizedUser);
        isEditingRef.current = false; // Reset editing flag after save
        console.log('[SUCCESS] Reset isEditingRef to false');

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

        if (window.showToast && !skipSavingState) {
          window.showToast({
            type: 'success',
            message: 'Cập nhật thông tin thành công!',
            duration: 3000,
          });
        }
        if (!skipSavingState) {
          closeModal();
        }
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      if (window.showToast && !skipSavingState) {
        window.showToast({
          type: 'error',
          message: `Lỗi cập nhật: ${error.message}`,
          duration: 3000,
        });
      }
      throw error; // Re-throw to let caller handle
    } finally {
      if (!skipSavingState) {
        setSaving(false);
      }
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
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center border-4 border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)] shadow-lg ${
                  [
                    'bg-[var(--color-orange-500)]',
                    'bg-[var(--color-orange-600)]',
                    'bg-[var(--color-orange-700)]',
                    'bg-[var(--color-orange-800)]',
                  ][
                    ((user?.firstName || user?.first_name || '').length +
                      (user?.lastName || user?.last_name || '').length) %
                      4
                  ]
                }`}
              >
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
                <EnumBadge type='ROLE' value={user.role} size='sm' showIcon={true} />
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

      {/* Member Information Section */}
      {user.role === 'MEMBER' && (
        <div className='mt-4 p-4 border border-[var(--color-green-200)] dark:border-[var(--color-green-700)] rounded-xl bg-gradient-to-br from-[var(--color-green-50)]/30 to-[var(--color-green-100)]/20 dark:from-[var(--color-green-900)]/10 dark:to-[var(--color-green-800)]/10'>
          <h3 className='text-lg font-bold font-heading text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <svg
              className='w-5 h-5 text-green-600 dark:text-green-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
              />
            </svg>
            Thông tin Cá nhân
          </h3>
          {memberLoading ? (
            <div className='text-center py-4 text-gray-500'>Đang tải...</div>
          ) : member ? (
            <div className='grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-3'>
              {member.date_of_birth && (
                <div className='group relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg p-2 border border-[var(--color-green-200)] dark:border-[var(--color-green-700)]'>
                  <p className='mb-2 text-xs font-semibold text-[var(--color-green-600)] dark:text-[var(--color-green-400)] uppercase tracking-wide'>
                    Ngày sinh
                  </p>
                  <p className='text-xs font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                    {new Date(member.date_of_birth).toLocaleDateString('vi-VN')}
                    {(() => {
                      const dob = new Date(member.date_of_birth);
                      const today = new Date();
                      let age = today.getFullYear() - dob.getFullYear();
                      const monthDiff = today.getMonth() - dob.getMonth();
                      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                        age--;
                      }
                      return ` (${age} tuổi)`;
                    })()}
                  </p>
                </div>
              )}
              {member.gender && (
                <div className='group relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg p-2 border border-[var(--color-green-200)] dark:border-[var(--color-green-700)]'>
                  <p className='mb-2 text-xs font-semibold text-[var(--color-green-600)] dark:text-[var(--color-green-400)] uppercase tracking-wide'>
                    Giới tính
                  </p>
                  <p className='text-xs font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                    {member.gender === 'MALE' ? 'Nam' : member.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                  </p>
                </div>
              )}
              {member.address && (
                <div className='lg:col-span-2 group relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg p-2 border border-[var(--color-green-200)] dark:border-[var(--color-green-700)]'>
                  <p className='mb-2 text-xs font-semibold text-[var(--color-green-600)] dark:text-[var(--color-green-400)] uppercase tracking-wide'>
                    Địa chỉ
                  </p>
                  <p className='text-xs font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                    {member.address}
                  </p>
                </div>
              )}
              {member.height && (
                <div className='group relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg p-2 border border-[var(--color-green-200)] dark:border-[var(--color-green-700)]'>
                  <p className='mb-2 text-xs font-semibold text-[var(--color-green-600)] dark:text-[var(--color-green-400)] uppercase tracking-wide'>
                    Chiều cao
                  </p>
                  <p className='text-xs font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                    {Number(member.height)} cm
                  </p>
                </div>
              )}
              {member.weight && (
                <div className='group relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg p-2 border border-[var(--color-green-200)] dark:border-[var(--color-green-700)]'>
                  <p className='mb-2 text-xs font-semibold text-[var(--color-green-600)] dark:text-[var(--color-green-400)] uppercase tracking-wide'>
                    Cân nặng
                  </p>
                  <p className='text-xs font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                    {Number(member.weight)} kg
                  </p>
                </div>
              )}
              {member.body_fat_percent && (
                <div className='group relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg p-2 border border-[var(--color-green-200)] dark:border-[var(--color-green-700)]'>
                  <p className='mb-2 text-xs font-semibold text-[var(--color-green-600)] dark:text-[var(--color-green-400)] uppercase tracking-wide'>
                    Tỷ lệ mỡ cơ thể
                  </p>
                  <p className='text-xs font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                    {Number(member.body_fat_percent).toFixed(1)}%
                  </p>
                </div>
              )}
              {member.emergency_contact && (
                <div className='group relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg p-2 border border-[var(--color-green-200)] dark:border-[var(--color-green-700)]'>
                  <p className='mb-2 text-xs font-semibold text-[var(--color-green-600)] dark:text-[var(--color-green-400)] uppercase tracking-wide'>
                    Liên hệ khẩn cấp
                  </p>
                  <p className='text-xs font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                    {member.emergency_contact}
                  </p>
                </div>
              )}
              {member.emergency_phone && (
                <div className='group relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg p-2 border border-[var(--color-green-200)] dark:border-[var(--color-green-700)]'>
                  <p className='mb-2 text-xs font-semibold text-[var(--color-green-600)] dark:text-[var(--color-green-400)] uppercase tracking-wide'>
                    SĐT liên hệ khẩn cấp
                  </p>
                  <p className='text-xs font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                    {member.emergency_phone}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className='text-center py-4 text-gray-500'>Không tìm thấy thông tin member</div>
          )}
        </div>
      )}

      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={() => {
            isEditingRef.current = false;
            // Reset toggle to user's current state
            if (user) {
              setIsActiveToggle(user.isActive ?? true);
            }
            // Reset member form data and errors
            if (member) {
              const dateOfBirth = member.date_of_birth
                ? new Date(member.date_of_birth).toISOString().split('T')[0]
                : '';
              setMemberFormData({
                date_of_birth: dateOfBirth,
                gender: member.gender || '',
                address: member.address || '',
                height: member.height ? Number(member.height) : null,
                weight: member.weight ? Number(member.weight) : null,
                body_fat_percent: member.body_fat_percent ? Number(member.body_fat_percent) : null,
                emergency_contact: member.emergency_contact || '',
                emergency_phone: member.emergency_phone || '',
              });
            }
            setMemberErrors({});
            closeModal();
          }}
          className='max-w-[900px] m-4'
        >
          <div className='relative w-full max-w-[700px] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] max-h-[90vh]'>
            {/* Header */}
            <div className='sticky top-0 z-10 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-b border-orange-200 dark:border-orange-700 px-6 py-4 rounded-t-2xl'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex-1'>
                  <h4 className='text-xl font-bold font-heading text-gray-900 dark:text-white mb-1'>
                    Chỉnh sửa thông tin
                  </h4>
                  <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter'>
                    Cập nhật thông tin để giữ hồ sơ luôn mới nhất
                  </p>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <form className='flex flex-col' onSubmit={e => e.preventDefault()}>
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
                        console.log('[EDIT] firstName onChange:', {
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
                            console.log('[WARNING] prev is null in onChange!');
                            return null;
                          }
                          const newUser = { ...prev, firstName: newValue };
                          console.log('[EDIT] Updated user state:', {
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
                        console.log('[EDIT] lastName onChange:', {
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
                            console.log('[WARNING] prev is null in onChange!');
                            return null;
                          }
                          const newUser = { ...prev, lastName: newValue };
                          console.log('[EDIT] Updated user state:', {
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
                    {userId !== 'current' && isAdmin ? (
                      <input
                        type='email'
                        value={formData?.email ?? user?.email ?? ''}
                        onChange={e => {
                          isEditingRef.current = true;
                          setFormData(prev => ({
                            ...(prev || {
                              firstName: user?.firstName || user?.first_name || '',
                              lastName: user?.lastName || user?.last_name || '',
                              email: user?.email || '',
                              phone: user?.phone || '',
                              isActive: user?.isActive ?? true,
                            }),
                            email: e.target.value,
                          }));
                        }}
                        className='w-full px-4 py-3 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
                      />
                    ) : (
                      <div className='flex gap-2'>
                        <input
                          type='email'
                          value={formData?.email ?? user?.email ?? ''}
                          readOnly
                          className='w-full px-4 py-3 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none transition-all duration-200 font-inter shadow-sm cursor-not-allowed'
                        />
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          onClick={() => {
                            isEditingRef.current = true;
                            openChangeEmailModal();
                          }}
                          className='px-4 py-3 text-theme-xs font-semibold font-inter border border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all duration-200 whitespace-nowrap'
                        >
                          Đổi Email
                        </Button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                      Số điện thoại
                    </label>
                    {userId !== 'current' && isAdmin ? (
                      <input
                        type='tel'
                        value={formData?.phone ?? user?.phone ?? ''}
                        onChange={e => {
                          isEditingRef.current = true;
                          setFormData(prev => ({
                            ...(prev || {
                              firstName: user?.firstName || user?.first_name || '',
                              lastName: user?.lastName || user?.last_name || '',
                              email: user?.email || '',
                              phone: user?.phone || '',
                              isActive: user?.isActive ?? true,
                            }),
                            phone: e.target.value,
                          }));
                        }}
                        className='w-full px-4 py-3 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
                      />
                    ) : (
                      <div className='flex gap-2'>
                        <input
                          type='tel'
                          value={formData?.phone ?? user?.phone ?? ''}
                          readOnly
                          className='w-full px-4 py-3 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none transition-all duration-200 font-inter shadow-sm cursor-not-allowed'
                        />
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          onClick={() => {
                            isEditingRef.current = true;
                            openChangePhoneModal();
                          }}
                          className='px-4 py-3 text-theme-xs font-semibold font-inter border border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all duration-200 whitespace-nowrap'
                        >
                          Đổi SĐT
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Password Change - Only for admin editing other users */}
                  {userId !== 'current' && isAdmin && (
                    <>
                      <div>
                        <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                          Mật khẩu mới (để trống nếu không đổi)
                        </label>
                        <input
                          type='password'
                          value={newPassword}
                          onChange={e => {
                            isEditingRef.current = true;
                            setNewPassword(e.target.value);
                          }}
                          placeholder='Nhập mật khẩu mới'
                          className='w-full px-4 py-3 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
                        />
                      </div>
                      <div>
                        <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                          Xác nhận mật khẩu
                        </label>
                        <input
                          type='password'
                          value={confirmPassword}
                          onChange={e => {
                            isEditingRef.current = true;
                            setConfirmPassword(e.target.value);
                          }}
                          placeholder='Nhập lại mật khẩu mới'
                          className='w-full px-4 py-3 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
                        />
                      </div>
                    </>
                  )}

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

              {/* Member Information Form */}
              {user.role === 'MEMBER' && memberFormData && (
                <div className='p-6 border-t border-gray-200 dark:border-gray-700 mt-4'>
                  <h4 className='text-lg font-bold font-heading text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                    <svg
                      className='w-5 h-5 text-green-600 dark:text-green-400'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                      />
                    </svg>
                    Thông tin Cá nhân
                  </h4>
                  <div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>
                    <div>
                      <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                        Ngày sinh
                      </label>
                      <input
                        type='date'
                        value={memberFormData.date_of_birth}
                        onChange={e => {
                          setMemberFormData(prev =>
                            prev ? { ...prev, date_of_birth: e.target.value } : null
                          );
                          if (memberErrors.date_of_birth) {
                            setMemberErrors(prev => ({ ...prev, date_of_birth: '' }));
                          }
                        }}
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full px-4 py-3 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 font-inter shadow-sm ${
                          memberErrors.date_of_birth
                            ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
                            : 'border-gray-300 dark:border-gray-700 focus:ring-green-500/30 focus:border-green-500 dark:focus:border-green-500'
                        }`}
                      />
                      {memberErrors.date_of_birth && (
                        <p className='mt-1 text-xs text-red-500'>{memberErrors.date_of_birth}</p>
                      )}
                    </div>

                    <div>
                      <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                        Giới tính
                      </label>
                      <select
                        value={memberFormData.gender}
                        onChange={e => {
                          setMemberFormData(prev =>
                            prev ? { ...prev, gender: e.target.value as any } : null
                          );
                        }}
                        className='w-full px-4 py-3 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 dark:focus:border-green-500 transition-all duration-200 font-inter shadow-sm'
                      >
                        <option value=''>Chọn giới tính</option>
                        <option value='MALE'>Nam</option>
                        <option value='FEMALE'>Nữ</option>
                        <option value='OTHER'>Khác</option>
                      </select>
                    </div>

                    <div className='lg:col-span-2'>
                      <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                        Địa chỉ
                      </label>
                      <textarea
                        value={memberFormData.address}
                        onChange={e => {
                          setMemberFormData(prev =>
                            prev ? { ...prev, address: e.target.value } : null
                          );
                          if (memberErrors.address) {
                            setMemberErrors(prev => ({ ...prev, address: '' }));
                          }
                        }}
                        rows={2}
                        maxLength={500}
                        placeholder='Nhập địa chỉ (tối đa 500 ký tự)'
                        className={`w-full px-4 py-3 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 font-inter shadow-sm resize-none ${
                          memberErrors.address
                            ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
                            : 'border-gray-300 dark:border-gray-700 focus:ring-green-500/30 focus:border-green-500 dark:focus:border-green-500'
                        }`}
                      />
                      <p className='mt-1 text-xs text-gray-500'>
                        {memberFormData.address.length}/500 ký tự
                      </p>
                      {memberErrors.address && (
                        <p className='mt-1 text-xs text-red-500'>{memberErrors.address}</p>
                      )}
                    </div>

                    <div>
                      <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                        Chiều cao (cm)
                      </label>
                      <input
                        type='number'
                        min='50'
                        max='250'
                        step='0.1'
                        value={memberFormData.height ?? ''}
                        onChange={e => {
                          const value = e.target.value === '' ? null : parseFloat(e.target.value);
                          setMemberFormData(prev => (prev ? { ...prev, height: value } : null));
                          if (memberErrors.height) {
                            setMemberErrors(prev => ({ ...prev, height: '' }));
                          }
                        }}
                        placeholder='Nhập chiều cao (cm)'
                        className={`w-full px-4 py-3 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 font-inter shadow-sm ${
                          memberErrors.height
                            ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
                            : 'border-gray-300 dark:border-gray-700 focus:ring-green-500/30 focus:border-green-500 dark:focus:border-green-500'
                        }`}
                      />
                      {memberErrors.height && (
                        <p className='mt-1 text-xs text-red-500'>{memberErrors.height}</p>
                      )}
                    </div>

                    <div>
                      <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                        Cân nặng (kg)
                      </label>
                      <input
                        type='number'
                        min='20'
                        max='300'
                        step='0.1'
                        value={memberFormData.weight ?? ''}
                        onChange={e => {
                          const value = e.target.value === '' ? null : parseFloat(e.target.value);
                          setMemberFormData(prev => (prev ? { ...prev, weight: value } : null));
                          if (memberErrors.weight) {
                            setMemberErrors(prev => ({ ...prev, weight: '' }));
                          }
                        }}
                        placeholder='Nhập cân nặng (kg)'
                        className={`w-full px-4 py-3 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 font-inter shadow-sm ${
                          memberErrors.weight
                            ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
                            : 'border-gray-300 dark:border-gray-700 focus:ring-green-500/30 focus:border-green-500 dark:focus:border-green-500'
                        }`}
                      />
                      {memberErrors.weight && (
                        <p className='mt-1 text-xs text-red-500'>{memberErrors.weight}</p>
                      )}
                    </div>

                    <div>
                      <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                        Tỷ lệ mỡ cơ thể (%)
                      </label>
                      <input
                        type='number'
                        min='0'
                        max='100'
                        step='0.1'
                        value={memberFormData.body_fat_percent ?? ''}
                        onChange={e => {
                          const value = e.target.value === '' ? null : parseFloat(e.target.value);
                          setMemberFormData(prev =>
                            prev ? { ...prev, body_fat_percent: value } : null
                          );
                          if (memberErrors.body_fat_percent) {
                            setMemberErrors(prev => ({ ...prev, body_fat_percent: '' }));
                          }
                        }}
                        placeholder='Nhập tỷ lệ mỡ cơ thể (%)'
                        className={`w-full px-4 py-3 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 font-inter shadow-sm ${
                          memberErrors.body_fat_percent
                            ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
                            : 'border-gray-300 dark:border-gray-700 focus:ring-green-500/30 focus:border-green-500 dark:focus:border-green-500'
                        }`}
                      />
                      {memberErrors.body_fat_percent && (
                        <p className='mt-1 text-xs text-red-500'>{memberErrors.body_fat_percent}</p>
                      )}
                    </div>

                    <div>
                      <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                        Tên liên hệ khẩn cấp
                      </label>
                      <input
                        type='text'
                        value={memberFormData.emergency_contact}
                        onChange={e => {
                          setMemberFormData(prev =>
                            prev ? { ...prev, emergency_contact: e.target.value } : null
                          );
                          if (memberErrors.emergency_contact) {
                            setMemberErrors(prev => ({ ...prev, emergency_contact: '' }));
                          }
                        }}
                        placeholder='Nhập tên người liên hệ khẩn cấp'
                        className='w-full px-4 py-3 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 dark:focus:border-green-500 transition-all duration-200 font-inter shadow-sm'
                      />
                    </div>

                    <div>
                      <label className='block text-theme-xs font-semibold text-gray-700 dark:text-gray-300 font-heading mb-2.5'>
                        SĐT liên hệ khẩn cấp
                      </label>
                      <input
                        type='tel'
                        value={memberFormData.emergency_phone}
                        onChange={e => {
                          setMemberFormData(prev =>
                            prev ? { ...prev, emergency_phone: e.target.value } : null
                          );
                          if (memberErrors.emergency_phone) {
                            setMemberErrors(prev => ({ ...prev, emergency_phone: '' }));
                          }
                        }}
                        placeholder='0912345678 hoặc +84912345678'
                        className={`w-full px-4 py-3 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 font-inter shadow-sm ${
                          memberErrors.emergency_phone
                            ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
                            : 'border-gray-300 dark:border-gray-700 focus:ring-green-500/30 focus:border-green-500 dark:focus:border-green-500'
                        }`}
                      />
                      {memberErrors.emergency_phone && (
                        <p className='mt-1 text-xs text-red-500'>{memberErrors.emergency_phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className='sticky bottom-0 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 rounded-b-2xl flex items-center justify-end gap-3'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={closeModal}
                  disabled={saving}
                  className='px-5 py-2.5 text-theme-xs font-semibold font-inter border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200'
                >
                  Hủy
                </Button>
                <Button
                  size='sm'
                  onClick={() => {
                    (async () => {
                    try {
                      setSaving(true);
                      // Save user info first (skip setting saving state as we handle it here)
                      await handleSave(true);
                      // Then save member info if user is member
                      if (user.role === 'MEMBER' && memberFormData && member) {
                        await handleSaveMember();
                      }
                      // Show success message and close modal
                      if (window.showToast) {
                        window.showToast({
                          type: 'success',
                          message: 'Cập nhật thông tin thành công!',
                          duration: 3000,
                        });
                      }
                      closeModal();
                    } catch (error: any) {
                      console.error('Error saving:', error);
                      if (window.showToast) {
                        window.showToast({
                          type: 'error',
                          message: error.message || 'Có lỗi xảy ra khi lưu',
                          duration: 3000,
                        });
                      }
                    } finally {
                      setSaving(false);
                    }
                    })();
                  }}
                  disabled={saving}
                  className='px-5 py-2.5 text-theme-xs font-semibold font-inter bg-orange-600 hover:bg-orange-700 text-white border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200'
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && (
        <Modal isOpen={isDeleteOpen} onClose={closeDeleteModal} className='max-w-[500px] m-4'>
          <div className='relative w-full max-w-[500px] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 shadow-xl'>
            {/* Header */}
            <div className='sticky top-0 z-10 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-b border-red-200 dark:border-red-700 px-6 py-4 rounded-t-2xl'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-center gap-3 flex-1'>
                  <div className='w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0'>
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
                  </div>
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
            </div>

            {/* Content */}
            <div className='p-6 space-y-4'>
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
            </div>

            {/* Footer */}
            <div className='sticky bottom-0 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 rounded-b-2xl flex items-center justify-end gap-3'>
              <Button
                size='sm'
                variant='outline'
                onClick={closeDeleteModal}
                disabled={deleting}
                className='px-5 py-2.5 text-theme-xs font-semibold font-inter border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200'
              >
                Hủy
              </Button>
              <Button
                size='sm'
                onClick={handleDelete}
                disabled={deleting || deleteConfirm.toLowerCase() !== 'delete'}
                className='px-5 py-2.5 text-theme-xs font-semibold font-inter bg-red-600 hover:bg-red-700 text-white border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {deleting ? 'Đang xóa...' : 'Xóa user'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Change Email Modal */}
      <ChangeEmailPhoneModal
        isOpen={isChangeEmailOpen}
        onClose={closeChangeEmailModal}
        onSuccess={newEmail => {
          if (newEmail && user) {
            const updatedUser = { ...user, email: newEmail };
            setUser(updatedUser);
            setFormData(prev => (prev ? { ...prev, email: newEmail } : null));
            onUpdate?.(updatedUser);
            if (window.showToast) {
              window.showToast({
                type: 'success',
                message: 'Đổi email thành công!',
                duration: 3000,
              });
            }
          }
        }}
        userEmail={user?.email}
        userPhone={user?.phone}
        type='EMAIL'
      />

      {/* Change Phone Modal */}
      <ChangeEmailPhoneModal
        isOpen={isChangePhoneOpen}
        onClose={closeChangePhoneModal}
        onSuccess={(_newEmail, newPhone) => {
          if (newPhone && user) {
            const updatedUser = { ...user, phone: newPhone };
            setUser(updatedUser);
            setFormData(prev => (prev ? { ...prev, phone: newPhone } : null));
            onUpdate?.(updatedUser);
            if (window.showToast) {
              window.showToast({
                type: 'success',
                message: 'Đổi số điện thoại thành công!',
                duration: 3000,
              });
            }
          }
        }}
        userEmail={user?.email}
        userPhone={user?.phone}
        type='PHONE'
      />
    </div>
  );
}
