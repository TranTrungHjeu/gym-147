import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AdminInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

const AdminInput: React.FC<AdminInputProps> = ({
  label,
  error,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  ...props
}) => {
  const baseClasses = 'w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter';
  
  const errorClasses = error ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20' : '';
  const iconPadding = Icon && iconPosition === 'left' ? 'pl-10' : Icon && iconPosition === 'right' ? 'pr-10' : '';

  return (
    <div className='w-full'>
      {label && (
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
          {label}
        </label>
      )}
      <div className='relative'>
        {Icon && iconPosition === 'left' && (
          <div className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500'>
            <Icon className='w-5 h-5' />
          </div>
        )}
        <input
          className={`${baseClasses} ${errorClasses} ${iconPadding} ${className}`}
          {...props}
        />
        {Icon && iconPosition === 'right' && (
          <div className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500'>
            <Icon className='w-5 h-5' />
          </div>
        )}
      </div>
      {error && (
        <p className='mt-1 text-sm text-error-600 dark:text-error-400 font-inter'>{error}</p>
      )}
    </div>
  );
};

export default AdminInput;

