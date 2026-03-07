import React from 'react';
import { LucideIcon } from 'lucide-react';
import AdminCard from '../common/AdminCard';

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconBgColor?: string;
  iconColor?: string;
  onClick: () => void;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon: Icon,
  title,
  description,
  iconBgColor = 'bg-orange-100 dark:bg-orange-900/30',
  iconColor = 'text-orange-600 dark:text-orange-400',
  onClick,
}) => {
  return (
    <AdminCard
      hover
      onClick={onClick}
      className='cursor-pointer group rounded-none border border-gray-200 dark:border-gray-700'
    >
      <div className='flex items-center gap-2.5'>
        <div
          className={`w-8 h-8 ${iconBgColor} rounded-none flex items-center justify-center flex-shrink-0 transition-colors duration-200`}
        >
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className='flex-1 min-w-0'>
          <h3 className='text-xs font-semibold font-heading text-gray-900 dark:text-white mb-0.5 leading-tight'>
            {title}
          </h3>
          <p className='text-[11px] text-gray-600 dark:text-gray-400 font-inter line-clamp-1 leading-tight'>
            {description}
          </p>
        </div>
        <svg
          className='w-3.5 h-3.5 text-gray-600 dark:text-gray-400 flex-shrink-0 opacity-70 transition-all duration-200 group-hover:translate-x-0.5'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
        </svg>
      </div>
    </AdminCard>
  );
};

export default QuickActionCard;

