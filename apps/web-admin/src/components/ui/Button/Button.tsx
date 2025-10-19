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
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 disabled:bg-gray-300',
    outline:
      'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500 disabled:bg-gray-50 disabled:text-gray-300',
    ghost:
      'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 disabled:bg-transparent disabled:text-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${className} ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
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
