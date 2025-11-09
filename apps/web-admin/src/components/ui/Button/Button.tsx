import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode; // Button text or content
  size?: 'xs' | 'sm' | 'md' | 'lg'; // Button size
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'; // Button variant
  startIcon?: ReactNode; // Icon before the text
  endIcon?: ReactNode; // Icon after the text
  onClick?: () => void; // Click handler
  disabled?: boolean; // Disabled state
  className?: string; // Additional CSS classes
  type?: 'button' | 'submit' | 'reset'; // Button type
}

const Button: React.FC<ButtonProps> = ({
  children,
  size = 'md',
  variant = 'primary',
  startIcon,
  endIcon,
  onClick,
  className = '',
  disabled = false,
  type = 'button',
}) => {
  // Size Classes
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  // Variant Classes
  const variantClasses = {
    primary: 'bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 focus:ring-orange-500/30 disabled:bg-orange-300 disabled:opacity-60 shadow-sm hover:shadow-md',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 focus:ring-gray-500/30 disabled:bg-gray-300 disabled:opacity-60 shadow-sm hover:shadow-md',
    outline:
      'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-orange-400 dark:hover:border-orange-600 focus:ring-orange-500/30 disabled:bg-gray-50 disabled:text-gray-300 disabled:opacity-60 shadow-sm hover:shadow-md',
    ghost:
      'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500/30 disabled:bg-transparent disabled:text-gray-300 disabled:opacity-60',
    danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 focus:ring-red-500/30 disabled:bg-red-300 disabled:opacity-60 shadow-sm hover:shadow-md',
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 active:scale-95 ${className} ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${disabled ? 'cursor-not-allowed' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {startIcon && <span className='flex items-center'>{startIcon}</span>}
      {children}
      {endIcon && <span className='flex items-center'>{endIcon}</span>}
    </button>
  );
};

export default Button;
