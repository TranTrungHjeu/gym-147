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
          return 'bg-gradient-to-r from-orange-600 via-orange-700 to-orange-600 dark:from-orange-800 dark:via-orange-900 dark:to-orange-800 border border-orange-700 dark:border-orange-600 text-white dark:text-orange-100';
        case 'ADMIN':
          return 'bg-gradient-to-r from-orange-50 via-orange-100 to-orange-50 dark:from-orange-900/20 dark:via-orange-800/30 dark:to-orange-900/20 border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300';
        case 'TRAINER':
          return 'bg-gradient-to-r from-orange-100 via-amber-50 to-orange-100 dark:from-orange-900/30 dark:via-amber-900/20 dark:to-orange-900/30 border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300';
        case 'MEMBER':
          return 'bg-gradient-to-r from-gray-700 via-gray-800 to-gray-700 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border border-gray-900 dark:border-gray-700 text-white dark:text-gray-100';
        default:
          return 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300';
      }
    }

    // Default variant for user management - all roles use orange-based colors with gradients
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-gradient-to-r from-orange-600 via-orange-700 to-orange-600 dark:from-orange-800 dark:via-orange-900 dark:to-orange-800 border border-orange-700 dark:border-orange-600 text-white dark:text-orange-100 shadow-sm';
      case 'ADMIN':
        return 'bg-gradient-to-r from-orange-100 via-orange-200 to-orange-100 dark:from-orange-900/30 dark:via-orange-800/40 dark:to-orange-900/30 border border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-300';
      case 'TRAINER':
        return 'bg-gradient-to-r from-orange-100 via-amber-50 to-orange-100 dark:from-orange-900/30 dark:via-amber-900/20 dark:to-orange-900/30 border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300';
      case 'MEMBER':
        return 'bg-gradient-to-r from-gray-700 via-gray-800 to-gray-700 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border border-gray-900 dark:border-gray-700 text-white dark:text-gray-100';
      default:
        return 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300';
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
      className={`inline-flex items-center rounded-full font-semibold font-heading border ${getRoleBadgeColor(role, variant)} ${getSizeClasses()} ${className}`}
    >
      {getRoleLabel(role)}
    </span>
  );
};

export default RoleBadge;
