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
    <AdminCard hover onClick={onClick} className='cursor-pointer group'>
      <div className='flex items-center gap-2.5'>
        <div className={`w-9 h-9 ${iconBgColor} rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-md`}>
          <Icon className={`w-4.5 h-4.5 ${iconColor} transition-transform duration-300 group-hover:scale-110`} />
        </div>
        <div className='flex-1 min-w-0'>
          <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white mb-0.5 leading-tight group-hover:text-gray-950 dark:group-hover:text-white transition-colors'>
            {title}
          </h3>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter line-clamp-1 leading-tight'>
            {description}
          </p>
        </div>
        <svg className='w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
        </svg>
      </div>
    </AdminCard>
  );
};

export default QuickActionCard;

