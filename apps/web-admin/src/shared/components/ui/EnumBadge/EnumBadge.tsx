/**
 * Unified Enum Badge Component
 *
 * A professional, consistent badge component for all enum types in the system
 * Supports icons, colors, gradients, and translations
 */

import React from 'react';
import { getEnumConfig, EnumType } from '../../../config/enumConfig';
import useTranslation from '../../../../hooks/useTranslation';
import { cn } from '../../../utils/cn';

export interface EnumBadgeProps {
  type: EnumType;
  value: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'solid';
}

const sizeClasses = {
  xs: {
    container: 'px-1.5 py-0.5',
    text: 'text-[10px]',
    icon: 'w-2.5 h-2.5',
  },
  sm: {
    container: 'px-2 py-0.5',
    text: 'text-xs',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-2.5 py-1',
    text: 'text-sm',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    container: 'px-3 py-1.5',
    text: 'text-base',
    icon: 'w-4 h-4',
  },
};

const EnumBadge: React.FC<EnumBadgeProps> = ({
  type,
  value,
  size = 'sm',
  showIcon = true,
  className = '',
  variant = 'default',
}) => {
  const { t } = useTranslation();
  const config = getEnumConfig(type, value);

  // Fallback if config not found
  if (!config) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
          'bg-gray-100 text-gray-700 border-gray-300',
          'dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700',
          className
        )}
      >
        {value}
      </span>
    );
  }

  const sizeClass = sizeClasses[size];
  const Icon = config.icon;
  const label = t(config.label) || value;

  // Build color classes
  const colorClasses = cn(
    config.color.bg,
    config.color.text,
    config.color.border,
    config.color.dark?.bg,
    config.color.dark?.text,
    config.color.dark?.border
  );

  // Variant styles
  const variantClasses =
    variant === 'outline' ? 'bg-transparent border-2' : variant === 'solid' ? 'border-0' : 'border';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full font-semibold font-heading',
        'transition-all duration-200',
        'shadow-sm',
        colorClasses,
        variantClasses,
        sizeClass.container,
        sizeClass.text,
        className
      )}
      title={label}
    >
      {showIcon && Icon && <Icon className={sizeClass.icon} strokeWidth={2.5} />}
      <span className='whitespace-nowrap'>{label}</span>
    </span>
  );
};

export default EnumBadge;















