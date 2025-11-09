import React from 'react';

interface AdminCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'stat';
  onClick?: () => void;
}

const AdminCard: React.FC<AdminCardProps> = ({
  children,
  className = '',
  hover = false,
  padding = 'md',
  variant = 'default',
  onClick,
}) => {
  const paddingClasses = {
    sm: variant === 'compact' ? 'p-3' : 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variantClasses = {
    default: '',
    compact: 'p-3',
    stat: 'p-4',
  };

  const finalPadding = variant !== 'default' ? variantClasses[variant] : paddingClasses[padding];

  return (
    <div
      className={`
        ${finalPadding}
        bg-white dark:bg-gray-900/95
        rounded-lg
        border border-gray-200 dark:border-gray-800
        transition-all duration-200 ease-in-out
        ${hover ? 'hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm' : ''}
        ${onClick ? 'cursor-pointer active:scale-[0.995]' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default AdminCard;
