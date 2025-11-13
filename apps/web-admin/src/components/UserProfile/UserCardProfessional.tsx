import { CheckCircle2, XCircle, Mail, MoreVertical } from 'lucide-react';
import RoleBadge from '../common/RoleBadge';

interface UserCardProfessionalProps {
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
}

export default function UserCardProfessional({
  user,
  avatar,
  isSelected = false,
  onClick,
}: UserCardProfessionalProps) {
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
        group
        h-full
        flex flex-col
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-xl
        overflow-hidden
        cursor-pointer
        transition-all duration-200
        hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-600
        ${
          isSelected
            ? 'ring-2 ring-orange-500 dark:ring-orange-500 shadow-lg border-orange-500 dark:border-orange-500'
            : 'shadow-sm'
        }
      `}
      data-flip-card-id={`user-card-${user.id}`}
    >
      {/* Card Header with Avatar */}
      <div className="relative p-6 pb-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-900/10" />
        
        <div className="relative flex items-start justify-between">
          {/* Avatar */}
          <div className="relative">
            <div className="relative w-16 h-16 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-800 shadow-md">
              {avatar ? (
                <img
                  data-flip-id={`avatar-${user.id}`}
                  src={avatar}
                  alt={fullName}
                  className="w-full h-full object-cover"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent && !parent.querySelector('.avatar-fallback')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'avatar-fallback w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700 text-white font-semibold text-lg';
                      fallback.textContent = getInitials();
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <div
                  data-flip-id={`avatar-${user.id}`}
                  className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700 text-white font-semibold text-lg"
                >
                  {getInitials()}
                </div>
              )}
            </div>
            {/* Active Status Indicator */}
            {isActive && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-500 dark:bg-green-400 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* More Options Button */}
          <button
            onClick={e => {
              e.stopPropagation();
              // Handle menu
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <MoreVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex-1 flex flex-col px-6 pb-6 pt-2 min-h-0">
        {/* Name */}
        <h3 className="text-lg font-semibold font-heading text-gray-900 dark:text-white mb-1 line-clamp-1">
          {fullName}
        </h3>

        {/* Role Badge */}
        <div className="mb-3">
          <RoleBadge role={user.role} size="sm" />
        </div>

        {/* Email */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Mail className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{user.email || 'No email'}</span>
        </div>

        {/* Status Badge */}
        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md ${
                isActive
                  ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
              }`}
            >
              {isActive ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
                  <span>Active</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" />
                  <span>Inactive</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

