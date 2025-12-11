import { CheckCircle2, XCircle, Users, Briefcase } from 'lucide-react';
import { EnumBadge } from '../../shared/components/ui';
import useTranslation from '../../hooks/useTranslation';

interface UserCardProps {
  user: {
    id: string;
    firstName?: string;
    first_name?: string;
    lastName?: string;
    last_name?: string;
    email?: string;
    role: string;
    isActive?: boolean;
    is_active?: boolean;
  };
  avatar?: string | null;
  isSelected?: boolean;
  onClick?: () => void;
  stats?: {
    followers?: number;
    projects?: number;
  };
}

export default function UserCard({
  user,
  avatar,
  isSelected = false,
  onClick,
  stats,
}: UserCardProps) {
  const { t } = useTranslation();
  const firstName = user.firstName || user.first_name || '';
  const lastName = user.lastName || user.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';
  const isActive = user.isActive ?? user.is_active ?? true;

  // Get initials for avatar fallback
  const getInitials = () => {
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastInitial = lastName.charAt(0).toUpperCase();
    return `${firstInitial}${lastInitial}` || 'U';
  };

  return (
    <div
      onClick={onClick}
      className={`
        h-full
        flex flex-col
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700 
        rounded-lg
        w-full 
        cursor-pointer
        transition-all duration-200
        overflow-hidden
        ${
          isSelected
            ? 'ring-2 ring-[var(--color-orange-500)] dark:ring-[var(--color-orange-600)] shadow-sm border-[var(--color-orange-500)] dark:border-[var(--color-orange-600)]'
            : 'shadow-sm hover:shadow hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'
        }
      `}
      data-flip-card-id={`user-card-${user.id}`}
    >
      {/* Profile Image Section - Compact height */}
      <div className='relative h-28 w-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-[var(--color-orange-50)] to-[var(--color-orange-100)] dark:from-[var(--color-orange-900)]/20 dark:to-[var(--color-orange-800)]/20'>
        {avatar ? (
          <img
            data-flip-id={`avatar-${user.id}`}
            src={avatar}
            alt={fullName}
            className='h-full w-full object-cover object-center'
            onError={e => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent && !parent.querySelector('.avatar-fallback')) {
                const initialsDiv = document.createElement('div');
                initialsDiv.className =
                  'avatar-fallback absolute inset-0 flex items-center justify-center';
                initialsDiv.innerHTML = `<div class="h-16 w-16 rounded-full bg-gradient-to-br from-[var(--color-orange-500)] to-[var(--color-orange-600)] flex items-center justify-center text-white text-lg font-heading font-semibold shadow-md border-2 border-white dark:border-gray-800">${getInitials()}</div>`;
                parent.appendChild(initialsDiv);
              }
            }}
          />
        ) : (
          <div className='absolute inset-0 flex items-center justify-center'>
            <div
              data-flip-id={`avatar-${user.id}`}
              className='h-16 w-16 rounded-full bg-gradient-to-br from-[var(--color-orange-500)] to-[var(--color-orange-600)] flex items-center justify-center text-white text-lg font-heading font-semibold shadow-md border-2 border-white dark:border-gray-800'
            >
              {getInitials()}
            </div>
          </div>
        )}
        {/* Active Status Badge - Top right corner */}
        {isActive && (
          <div className='absolute top-2 right-2 z-10'>
            <div className='bg-green-500 dark:bg-green-400 rounded-full p-1 shadow-md border-2 border-white dark:border-gray-800'>
              <CheckCircle2 className='w-3 h-3 text-white' />
            </div>
          </div>
        )}
      </div>

      {/* User Info Section - Compact layout */}
      <div className='flex-1 flex flex-col px-3.5 py-2.5 min-h-0'>
        {/* Name */}
        <h3 className='text-sm font-semibold font-heading text-gray-900 dark:text-white leading-tight line-clamp-1 mb-1'>
          {fullName}
        </h3>

        {/* Role Badge */}
        <div className='mb-1.5'>
          <EnumBadge type='ROLE' value={user.role} size='sm' showIcon={true} />
        </div>

        {/* Email */}
        <p className='text-[11px] text-gray-600 dark:text-gray-400 font-heading leading-tight line-clamp-1 mb-2 flex-1'>
          {user.email || t('userManagement.badges.noEmail')}
        </p>

        {/* Status Badge */}
        <div className='mt-auto'>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-medium font-heading px-2 py-0.5 rounded ${
              isActive
                ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
            }`}
          >
            {isActive ? (
              <>
                <CheckCircle2 className='w-2.5 h-2.5' />
                <span>{t('userManagement.status.active')}</span>
              </>
            ) : (
              <>
                <XCircle className='w-2.5 h-2.5' />
                <span>{t('userManagement.status.inactive')}</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Stats Section - Compact footer */}
      <div className='px-3.5 pb-2.5 pt-2 border-t border-gray-100 dark:border-gray-700 flex-shrink-0'>
        <div className='flex items-center justify-between gap-2'>
          {/* Stats Container */}
          <div className='flex items-center gap-2.5 flex-1 min-w-0'>
            {/* Members stat */}
            <div className='flex items-center gap-1'>
              <Users className='w-3 h-3 text-gray-500 dark:text-gray-400 flex-shrink-0' />
              <span className='text-[11px] font-semibold font-heading text-gray-900 dark:text-white'>
                {stats?.followers || 0}
              </span>
            </div>

            {/* Classes stat */}
            <div className='flex items-center gap-1'>
              <Briefcase className='w-3 h-3 text-gray-500 dark:text-gray-400 flex-shrink-0' />
              <span className='text-[11px] font-semibold font-heading text-gray-900 dark:text-white'>
                {stats?.projects || 0}
              </span>
            </div>
          </div>

          {/* View Button */}
          <button
            className={`
              flex-shrink-0
              h-6
              px-2.5
              rounded-md
              text-[11px] font-semibold font-heading
              transition-all duration-200
              flex items-center justify-center
              whitespace-nowrap
              ${
                isSelected
                  ? 'bg-[var(--color-orange-500)] dark:bg-[var(--color-orange-600)] text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-[var(--color-orange-50)] dark:hover:bg-[var(--color-orange-900)]/30 hover:text-[var(--color-orange-600)] dark:hover:text-[var(--color-orange-400)]'
              }
            `}
            onClick={e => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            {t('userManagement.badges.view')}
          </button>
        </div>
      </div>
    </div>
  );
}
