import { CheckCircle2, XCircle } from 'lucide-react';
import React from 'react';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | boolean;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  showText = false,
  className = '',
}) => {
  const isActive = typeof status === 'boolean' ? status : status === 'active';

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-1.5 sm:px-2 py-0.5',
          icon: 'w-2 h-2 sm:w-2.5 sm:h-2.5',
          text: 'text-[8px] sm:text-[9px]',
        };
      case 'md':
        return {
          container: 'px-2 py-1',
          icon: 'w-3 h-3',
          text: 'text-[10px]',
        };
      case 'lg':
        return {
          container: 'px-2.5 py-1.5',
          icon: 'w-4 h-4',
          text: 'text-xs',
        };
      default:
        return {
          container: 'px-1.5 sm:px-2 py-0.5',
          icon: 'w-2 h-2 sm:w-2.5 sm:h-2.5',
          text: 'text-[8px] sm:text-[9px]',
        };
    }
  };

  const sizeClasses = getSizeClasses();

  // Active: Orange color (matching system theme)
  const activeClasses =
    'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700';
  // Inactive: Gray/Black color
  const inactiveClasses =
    'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold font-heading border ${
        isActive ? activeClasses : inactiveClasses
      } ${sizeClasses.container} ${className}`}
      title={isActive ? 'Hoạt động' : 'Không hoạt động'}
    >
      {isActive ? (
        <CheckCircle2 className={sizeClasses.icon} />
      ) : (
        <XCircle className={sizeClasses.icon} />
      )}
      {showText && (
        <span className={`ml-1 ${sizeClasses.text}`}>
          {isActive ? 'Hoạt động' : 'Không hoạt động'}
        </span>
      )}
    </span>
  );
};

export default StatusBadge;
