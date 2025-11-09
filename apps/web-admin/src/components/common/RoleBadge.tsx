import React from 'react';
import useTranslation from '../../hooks/useTranslation';

interface RoleBadgeProps {
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TRAINER' | 'MEMBER' | string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'dashboard';
  className?: string;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  size = 'sm',
  variant = 'default',
  className = '',
}) => {
  const { t } = useTranslation();

  const getRoleBadgeColor = (role: string, variant: 'default' | 'dashboard') => {
    if (variant === 'dashboard') {
      // Dashboard variant uses different colors for activity section
      switch (role) {
        case 'SUPER_ADMIN':
          return 'bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300';
        case 'ADMIN':
          return 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300';
        case 'TRAINER':
          return 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300';
        case 'MEMBER':
          return 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300';
        default:
          return 'bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300';
      }
    }

    // Default variant for user management
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-300';
      case 'ADMIN':
        return 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
      case 'TRAINER':
        return 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300';
      case 'MEMBER':
        return 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'SUPER_ADMIN':
        return t('userManagement.roles.superAdmin');
      case 'ADMIN':
        return t('userManagement.roles.admin');
      case 'TRAINER':
        return t('userManagement.roles.trainer');
      case 'MEMBER':
        return t('userManagement.roles.member');
      default:
        return role;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-[10px]';
      case 'md':
        return 'px-2.5 py-1 text-theme-xs';
      case 'lg':
        return 'px-3 py-1.5 text-sm';
      default:
        return 'px-2 py-0.5 text-[10px]';
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold font-heading border transition-all duration-200 ${getRoleBadgeColor(
        role,
        variant
      )} ${getSizeClasses()} ${className}`}
    >
      {getRoleLabel(role)}
    </span>
  );
};

export default RoleBadge;
