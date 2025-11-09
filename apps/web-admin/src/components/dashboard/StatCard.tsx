import React from 'react';
import { LucideIcon } from 'lucide-react';
import AdminCard from '../common/AdminCard';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor?: string;
  valueColor?: string;
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  iconColor = 'text-gray-400 dark:text-gray-500',
  valueColor = 'text-gray-900 dark:text-white',
  isLoading = false,
}) => {
  // Ensure value is displayed correctly
  const displayValue = isLoading ? '...' : (value ?? 0);
  
  return (
    <AdminCard padding='sm'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2.5 flex-1 min-w-0'>
          <Icon className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
          <div className='min-w-0'>
            <div className={`text-2xl font-bold font-heading ${valueColor} leading-tight`}>
              {displayValue}
            </div>
            <div className='text-xs text-gray-600 dark:text-gray-400 font-inter mt-0.5'>
              {label}
            </div>
          </div>
        </div>
      </div>
    </AdminCard>
  );
};

export default StatCard;

