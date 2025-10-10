import { Eye, EyeOff } from 'lucide-react';
import React from 'react';
import { cn } from '../../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outlined';
  inputSize?: 'sm' | 'md' | 'lg';
}

const inputVariants = {
  default: 'border-neutral-300 bg-white focus:border-primary-500 focus:ring-primary-500',
  filled:
    'border-transparent bg-neutral-100 focus:border-primary-500 focus:ring-primary-500 focus:bg-white',
  outlined: 'border-2 border-neutral-300 bg-white focus:border-primary-500 focus:ring-0',
};

const inputSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      variant = 'default',
      inputSize = 'md',
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;
    const hasError = Boolean(error);

    const inputId = React.useId();

    return (
      <div className='w-full'>
        {label && (
          <label htmlFor={inputId} className='block text-sm font-medium text-neutral-700 mb-1'>
            {label}
          </label>
        )}

        <div className='relative'>
          {leftIcon && (
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <span className='text-neutral-400'>{leftIcon}</span>
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            type={inputType}
            className={cn(
              // Base styles
              'block w-full rounded-lg border shadow-sm transition-colors duration-200',
              'placeholder:text-neutral-400',
              'focus:outline-none focus:ring-1',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50',

              // Variant styles
              hasError
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : inputVariants[variant],

              // Size styles
              inputSizes[inputSize],

              // Icon padding
              leftIcon && 'pl-10',
              (rightIcon || isPassword) && 'pr-10',

              // Custom className
              className
            )}
            disabled={disabled}
            {...props}
          />

          {/* Right side icons */}
          <div className='absolute inset-y-0 right-0 flex items-center'>
            {isPassword && (
              <button
                type='button'
                className='px-3 text-neutral-400 hover:text-neutral-600 focus:outline-none'
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
              </button>
            )}

            {rightIcon && !isPassword && (
              <div className='px-3 pointer-events-none'>
                <span className='text-neutral-400'>{rightIcon}</span>
              </div>
            )}
          </div>
        </div>

        {/* Helper text or error */}
        {(error || helperText) && (
          <p className={cn('mt-1 text-xs', error ? 'text-red-600' : 'text-neutral-500')}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
