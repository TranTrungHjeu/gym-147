import { Loader2 } from 'lucide-react';
import React from 'react';
import { cn } from '../../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const buttonVariants = {
  primary:
    'bg-primary-600 hover:bg-primary-700 text-white shadow-sm border-transparent focus:ring-primary-500',
  secondary:
    'bg-secondary-600 hover:bg-secondary-700 text-white shadow-sm border-transparent focus:ring-secondary-500',
  outline:
    'bg-transparent hover:bg-neutral-50 text-neutral-900 border-neutral-300 focus:ring-primary-500',
  ghost:
    'bg-transparent hover:bg-neutral-100 text-neutral-900 border-transparent focus:ring-primary-500',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm border-transparent focus:ring-red-500',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm font-medium',
  md: 'px-4 py-2 text-sm font-medium',
  lg: 'px-6 py-3 text-base font-medium',
  xl: 'px-8 py-4 text-lg font-semibold',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',

          // Variant styles
          buttonVariants[variant],

          // Size styles
          buttonSizes[size],

          // Full width
          fullWidth && 'w-full',

          // Custom className
          className
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && <Loader2 className='h-4 w-4 animate-spin text-blue-500' />}
        {!loading && leftIcon && <span className='flex-shrink-0'>{leftIcon}</span>}

        {children && <span className={loading ? 'opacity-70' : ''}>{children}</span>}

        {!loading && rightIcon && <span className='flex-shrink-0'>{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
