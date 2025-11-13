import { Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import useTranslation from '../../hooks/useTranslation';
import { changeLanguage, getCurrentLanguage } from '../../locales/i18n';
import { User as UserType } from '../../services/user.service';
import { Trainer } from '../../services/trainer.service';
import { Dropdown } from '../ui/dropdown/Dropdown';
import { DropdownItem } from '../ui/dropdown/DropdownItem';
import { API_CONFIG } from '@/config/api.config';
import { scheduleApi } from '@/services/api';

export default function UserDropdown() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [currentLang, setCurrentLang] = useState<'en' | 'vi'>(getCurrentLanguage());
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Get user data from localStorage
    const loadUserData = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    };

    // Load initial user data
    loadUserData();

    // Fetch trainer avatar if user is a trainer (same as UserInfoCard)
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
        }
      } catch (error) {
        // Silently fail for 404 or network errors
        setTrainer(null);
      }
    };

    // Load trainer avatar if user is a trainer
    const loadTrainerAvatar = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          if (parsedUser.role === 'TRAINER' && parsedUser.id) {
            fetchTrainerAvatar(parsedUser.id);
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    };

    loadTrainerAvatar();

    // Listen for storage changes (when user data is updated from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' && e.newValue) {
        try {
          const updatedUser = JSON.parse(e.newValue);
          setUser(updatedUser);
          // Refetch trainer avatar if user is a trainer
          if (updatedUser.role === 'TRAINER' && updatedUser.id) {
            fetchTrainerAvatar(updatedUser.id);
          } else {
            setTrainer(null);
          }
        } catch (error) {
          console.error('Error parsing updated user data:', error);
        }
      }
      // Update language when it changes
      if (e.key === 'gym147_language' && e.newValue) {
        setCurrentLang(e.newValue as 'en' | 'vi');
      }
    };

    // Listen for custom user data update events (from same tab)
    const handleUserDataUpdate = (e: CustomEvent) => {
      if (e.detail) {
        setUser(e.detail);
        // Refetch trainer avatar if user is a trainer
        if (e.detail.role === 'TRAINER' && e.detail.id) {
          fetchTrainerAvatar(e.detail.id);
        } else {
          setTrainer(null);
        }
      }
    };

    // Listen for language changes
    const handleLanguageChange = () => {
      setCurrentLang(getCurrentLanguage());
    };

    // Add event listeners
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    window.addEventListener('languageChanged', handleLanguageChange);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  function toggleDropdown() {
    setIsOpen(prev => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleSignOut = () => {
    // Clear all authentication data
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    // Close dropdown
    closeDropdown();

    // Redirect to login page
    window.location.href = '/';
  };

  const handleLanguageChange = (langCode: 'en' | 'vi') => {
    changeLanguage(langCode);
    setCurrentLang(langCode);
    // Close dropdown after language change
    closeDropdown();
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
        className={`w-full h-full ${colors[colorIndex]} flex items-center justify-center text-[var(--color-white)] font-bold text-sm`}
        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
      >
        {initials}
      </div>
    );
  };
  return (
    <div className='relative'>
      <button
        ref={toggleButtonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleDropdown();
        }}
        onMouseDown={(e) => {
          // Prevent dropdown from closing immediately when clicking toggle button
          e.stopPropagation();
        }}
        className='dropdown-toggle flex items-center text-[var(--color-gray-700)] dark:text-[var(--color-gray-400)] hover:text-[var(--color-orange-600)] dark:hover:text-[var(--color-orange-400)] transition-colors duration-200'
      >
        <span className='mr-3 overflow-hidden rounded-full h-11 w-11 border-2 border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)]'>
          {trainer?.profile_photo ? (
            <>
              <img
                src={trainer.profile_photo}
                alt={user ? `${user?.firstName || user?.first_name || ''} ${user?.lastName || user?.last_name || ''}`.trim() : 'User'}
                className='w-full h-full object-cover'
                onError={e => {
                  // Hide image and show fallback
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.classList.remove('hidden');
                    fallback.classList.add('flex');
                  }
                }}
              />
              <div className='hidden w-full h-full'>
                {user ? (
                  generateAvatar(
                    user?.firstName || user?.first_name || 'U',
                    user?.lastName || user?.last_name || 'S'
                  )
                ) : (
                  <img src='/images/user/owner.jpg' alt='User' className='w-full h-full object-cover' />
                )}
              </div>
            </>
          ) : user ? (
            generateAvatar(
              user?.firstName || user?.first_name || 'U',
              user?.lastName || user?.last_name || 'S'
            )
          ) : (
            <img src='/images/user/owner.jpg' alt='User' className='w-full h-full object-cover' />
          )}
        </span>

        <span
          className='block mr-1 font-medium text-sm'
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {user
            ? `${user?.firstName || user?.first_name || ''} ${
                user?.lastName || user?.last_name || ''
              }`.trim() || t('common.defaultUserName')
            : t('common.defaultUserName')}
        </span>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className='stroke-[var(--color-gray-500)] dark:stroke-[var(--color-gray-400)]'
          width='18'
          height='20'
          viewBox='0 0 18 20'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path
            d='M4.3125 8.65625L9 13.3437L13.6875 8.65625'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </motion.svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className='absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] p-3 shadow-lg'
      >
        <div>
          <span
            className='block font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] text-sm'
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {user
              ? `${user?.firstName || user?.first_name || ''} ${
                  user?.lastName || user?.last_name || ''
                }`.trim() || t('common.defaultUserName')
              : t('common.defaultUserName')}
          </span>
          <span
            className='mt-0.5 block text-xs text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)]'
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {user?.email || 'randomuser@pimjo.com'}
          </span>
        </div>

        <ul className='flex flex-col gap-1 pt-4 pb-3 border-b border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
          <motion.li
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
          >
            <DropdownItem
              onItemClick={closeDropdown}
              tag='a'
              to='/profile'
              baseClassName=''
              className='user-dropdown-item flex items-center gap-3 px-3 py-2 font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] rounded-lg group text-sm hover:bg-[var(--color-orange-50)] dark:hover:bg-[var(--color-orange-900)]/20 transition-colors duration-200'
              onMouseEnter={e => {
                e.currentTarget.style.setProperty('color', 'var(--color-orange-700)', 'important');
                if (document.documentElement.classList.contains('dark')) {
                  e.currentTarget.style.setProperty(
                    'color',
                    'var(--color-orange-300)',
                    'important'
                  );
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.setProperty('color', 'var(--color-gray-700)', 'important');
                if (document.documentElement.classList.contains('dark')) {
                  e.currentTarget.style.setProperty('color', 'var(--color-gray-300)', 'important');
                }
              }}
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                color: 'var(--color-gray-700)',
              }}
            >
              <svg
                className='fill-[var(--color-gray-600)] group-hover:fill-[var(--color-orange-700)] dark:fill-[var(--color-gray-300)] dark:group-hover:fill-[var(--color-orange-300)]'
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  fillRule='evenodd'
                  clipRule='evenodd'
                  d='M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.1526 4.3002 16.1184 5.61936 17.616C6.17279 15.3096 8.24852 13.5955 10.7246 13.5955H13.2746C15.7509 13.5955 17.8268 15.31 18.38 17.6167C19.6996 16.119 20.5 14.153 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM17.0246 18.8566V18.8455C17.0246 16.7744 15.3457 15.0955 13.2746 15.0955H10.7246C8.65354 15.0955 6.97461 16.7744 6.97461 18.8455V18.856C8.38223 19.8895 10.1198 20.5 12 20.5C13.8798 20.5 15.6171 19.8898 17.0246 18.8566ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.9991 7.25C10.8847 7.25 9.98126 8.15342 9.98126 9.26784C9.98126 10.3823 10.8847 11.2857 11.9991 11.2857C13.1135 11.2857 14.0169 10.3823 14.0169 9.26784C14.0169 8.15342 13.1135 7.25 11.9991 7.25ZM8.48126 9.26784C8.48126 7.32499 10.0563 5.75 11.9991 5.75C13.9419 5.75 15.5169 7.32499 15.5169 9.26784C15.5169 11.2107 13.9419 12.7857 11.9991 12.7857C10.0563 12.7857 8.48126 11.2107 8.48126 9.26784Z'
                  fill=''
                />
              </svg>
              {t('user.menu.editProfile')}
            </DropdownItem>
          </motion.li>
          <motion.li
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.08 }}
          >
            <DropdownItem
              onItemClick={closeDropdown}
              tag='a'
              to='/profile'
              baseClassName=''
              className='user-dropdown-item flex items-center gap-3 px-3 py-2 font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] rounded-lg group text-sm hover:bg-[var(--color-orange-50)] dark:hover:bg-[var(--color-orange-900)]/20 transition-colors duration-200'
              onMouseEnter={e => {
                e.currentTarget.style.setProperty('color', 'var(--color-orange-700)', 'important');
                if (document.documentElement.classList.contains('dark')) {
                  e.currentTarget.style.setProperty(
                    'color',
                    'var(--color-orange-300)',
                    'important'
                  );
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.setProperty('color', 'var(--color-gray-700)', 'important');
                if (document.documentElement.classList.contains('dark')) {
                  e.currentTarget.style.setProperty('color', 'var(--color-gray-300)', 'important');
                }
              }}
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                color: 'var(--color-gray-700)',
              }}
            >
              <svg
                className='fill-[var(--color-gray-600)] group-hover:fill-[var(--color-orange-700)] dark:fill-[var(--color-gray-300)] dark:group-hover:fill-[var(--color-orange-300)]'
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  fillRule='evenodd'
                  clipRule='evenodd'
                  d='M10.4858 3.5L13.5182 3.5C13.9233 3.5 14.2518 3.82851 14.2518 4.23377C14.2518 5.9529 16.1129 7.02795 17.602 6.1682C17.9528 5.96567 18.4014 6.08586 18.6039 6.43667L20.1203 9.0631C20.3229 9.41407 20.2027 9.86286 19.8517 10.0655C18.3625 10.9253 18.3625 13.0747 19.8517 13.9345C20.2026 14.1372 20.3229 14.5859 20.1203 14.9369L18.6039 17.5634C18.4013 17.9142 17.9528 18.0344 17.602 17.8318C16.1129 16.9721 14.2518 18.0471 14.2518 19.7663C14.2518 20.1715 13.9233 20.5 13.5182 20.5H10.4858C10.0804 20.5 9.75182 20.1714 9.75182 19.766C9.75182 18.0461 7.88983 16.9717 6.40067 17.8314C6.04945 18.0342 5.60037 17.9139 5.39767 17.5628L3.88167 14.937C3.67903 14.586 3.79928 14.1372 4.15026 13.9346C5.63949 13.0748 5.63946 10.9253 4.15025 10.0655C3.79926 9.86282 3.67901 9.41401 3.88165 9.06303L5.39764 6.43725C5.60034 6.08617 6.04943 5.96581 6.40065 6.16858C7.88982 7.02836 9.75182 5.9539 9.75182 4.23399C9.75182 3.82862 10.0804 3.5 10.4858 3.5ZM13.5182 2L10.4858 2C9.25201 2 8.25182 3.00019 8.25182 4.23399C8.25182 4.79884 7.64013 5.15215 7.15065 4.86955C6.08213 4.25263 4.71559 4.61859 4.0986 5.68725L2.58261 8.31303C1.96575 9.38146 2.33183 10.7477 3.40025 11.3645C3.88948 11.647 3.88947 12.3531 3.40026 12.6355C2.33184 13.2524 1.96578 14.6186 2.58263 15.687L4.09863 18.3128C4.71562 19.3814 6.08215 19.7474 7.15067 19.1305C7.64015 18.8479 8.25182 19.2012 8.25182 19.766C8.25182 20.9998 9.25201 22 10.4858 22H13.5182C14.7519 22 15.7518 20.9998 15.7518 19.7663C15.7518 19.2015 16.3632 18.8487 16.852 19.1309C17.9202 19.7476 19.2862 19.3816 19.9029 18.3134L21.4193 15.6869C22.0361 14.6185 21.6701 13.2523 20.6017 12.6355C20.1125 12.3531 20.1125 11.647 20.6017 11.3645C21.6701 10.7477 22.0362 9.38152 21.4193 8.3131L19.903 5.68667C19.2862 4.61842 17.9202 4.25241 16.852 4.86917C16.3632 5.15138 15.7518 4.79856 15.7518 4.23377C15.7518 3.00024 14.7519 2 13.5182 2ZM9.6659 11.9999C9.6659 10.7103 10.7113 9.66493 12.0009 9.66493C13.2905 9.66493 14.3359 10.7103 14.3359 11.9999C14.3359 13.2895 13.2905 14.3349 12.0009 14.3349C10.7113 14.3349 9.6659 13.2895 9.6659 11.9999ZM12.0009 8.16493C9.88289 8.16493 8.1659 9.88191 8.1659 11.9999C8.1659 14.1179 9.88289 15.8349 12.0009 15.8349C14.1189 15.8349 15.8359 14.1179 15.8359 11.9999C15.8359 9.88191 14.1189 8.16493 12.0009 8.16493Z'
                  fill=''
                />
              </svg>
              {t('user.menu.accountSettings')}
            </DropdownItem>
          </motion.li>
          <motion.li
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.11 }}
          >
            <DropdownItem
              onItemClick={closeDropdown}
              tag='a'
              to='/profile'
              baseClassName=''
              className='user-dropdown-item flex items-center gap-3 px-3 py-2 font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] rounded-lg group text-sm hover:bg-[var(--color-orange-50)] dark:hover:bg-[var(--color-orange-900)]/20 transition-colors duration-200'
              onMouseEnter={e => {
                e.currentTarget.style.setProperty('color', 'var(--color-orange-700)', 'important');
                if (document.documentElement.classList.contains('dark')) {
                  e.currentTarget.style.setProperty(
                    'color',
                    'var(--color-orange-300)',
                    'important'
                  );
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.setProperty('color', 'var(--color-gray-700)', 'important');
                if (document.documentElement.classList.contains('dark')) {
                  e.currentTarget.style.setProperty('color', 'var(--color-gray-300)', 'important');
                }
              }}
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                color: 'var(--color-gray-700)',
              }}
            >
              <svg
                className='fill-[var(--color-gray-600)] group-hover:fill-[var(--color-orange-700)] dark:fill-[var(--color-gray-300)] dark:group-hover:fill-[var(--color-orange-300)]'
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  fillRule='evenodd'
                  clipRule='evenodd'
                  d='M3.5 12C3.5 7.30558 7.30558 3.5 12 3.5C16.6944 3.5 20.5 7.30558 20.5 12C20.5 16.6944 16.6944 20.5 12 20.5C7.30558 20.5 3.5 16.6944 3.5 12ZM12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM11.0991 7.52507C11.0991 8.02213 11.5021 8.42507 11.9991 8.42507H12.0001C12.4972 8.42507 12.9001 8.02213 12.9001 7.52507C12.9001 7.02802 12.4972 6.62507 12.0001 6.62507H11.9991C11.5021 6.62507 11.0991 7.02802 11.0991 7.52507ZM12.0001 17.3714C11.5859 17.3714 11.2501 17.0356 11.2501 16.6214V10.9449C11.2501 10.5307 11.5859 10.1949 12.0001 10.1949C12.4143 10.1949 12.7501 10.5307 12.7501 10.9449V16.6214C12.7501 17.0356 12.4143 17.3714 12.0001 17.3714Z'
                  fill=''
                />
              </svg>
              {t('user.menu.support')}
            </DropdownItem>
          </motion.li>
          <motion.li
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.14 }}
          >
            <div className='px-3 py-2'>
              <div className='flex items-center gap-3 mb-2'>
                <Globe className='w-5 h-5 text-[var(--color-gray-600)] dark:text-[var(--color-gray-300)]' />
                <span
                  className='font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] text-sm'
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {t('user.menu.language')}
                </span>
              </div>
              <div className='flex gap-2 ml-8'>
                <button
                  onClick={() => handleLanguageChange('vi')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    currentLang === 'vi'
                      ? 'bg-[var(--color-orange-500)] text-white'
                      : 'bg-[var(--color-gray-100)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] hover:bg-[var(--color-orange-50)] dark:hover:bg-[var(--color-orange-900)]/20'
                  }`}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {t('user.languages.vietnameseNative')}
                </button>
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    currentLang === 'en'
                      ? 'bg-[var(--color-orange-500)] text-white'
                      : 'bg-[var(--color-gray-100)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] hover:bg-[var(--color-orange-50)] dark:hover:bg-[var(--color-orange-900)]/20'
                  }`}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {t('user.languages.englishNative')}
                </button>
              </div>
            </div>
          </motion.li>
        </ul>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.17 }}
          onClick={handleSignOut}
          className='flex items-center gap-3 px-3 py-2 mt-3 font-medium text-[var(--color-red-600)] dark:text-[var(--color-red-400)] rounded-lg group text-sm hover:bg-[var(--color-red-50)] dark:hover:bg-[var(--color-red-900)]/20 hover:text-[var(--color-red-700)] dark:hover:text-[var(--color-red-200)] transition-colors duration-200 w-full text-left'
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          <svg
            className='fill-[var(--color-red-600)] group-hover:fill-[var(--color-red-700)] dark:fill-[var(--color-red-400)] dark:group-hover:fill-[var(--color-red-200)]'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              fillRule='evenodd'
              clipRule='evenodd'
              d='M15.1007 19.247C14.6865 19.247 14.3507 18.9112 14.3507 18.497L14.3507 14.245H12.8507V18.497C12.8507 19.7396 13.8581 20.747 15.1007 20.747H18.5007C19.7434 20.747 20.7507 19.7396 20.7507 18.497L20.7507 5.49609C20.7507 4.25345 19.7433 3.24609 18.5007 3.24609H15.1007C13.8581 3.24609 12.8507 4.25345 12.8507 5.49609V9.74501L14.3507 9.74501V5.49609C14.3507 5.08188 14.6865 4.74609 15.1007 4.74609L18.5007 4.74609C18.9149 4.74609 19.2507 5.08188 19.2507 5.49609L19.2507 18.497C19.2507 18.9112 18.9149 19.247 18.5007 19.247H15.1007ZM3.25073 11.9984C3.25073 12.2144 3.34204 12.4091 3.48817 12.546L8.09483 17.1556C8.38763 17.4485 8.86251 17.4487 9.15549 17.1559C9.44848 16.8631 9.44863 16.3882 9.15583 16.0952L5.81116 12.7484L16.0007 12.7484C16.4149 12.7484 16.7507 12.4127 16.7507 11.9984C16.7507 11.5842 16.4149 11.2484 16.0007 11.2484L5.81528 11.2484L9.15585 7.90554C9.44864 7.61255 9.44847 7.13767 9.15547 6.84488C8.86248 6.55209 8.3876 6.55226 8.09481 6.84525L3.52309 11.4202C3.35673 11.5577 3.25073 11.7657 3.25073 11.9984Z'
              fill=''
            />
          </svg>
          {t('user.menu.signOut')}
        </motion.button>
      </Dropdown>
    </div>
  );
}
