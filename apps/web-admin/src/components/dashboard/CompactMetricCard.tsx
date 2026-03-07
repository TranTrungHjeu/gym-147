import React from 'react';
import { LucideIcon } from 'lucide-react';
import AdminCard from '../common/AdminCard';

interface CompactMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor?: string;
  valueColor?: string;
  isLoading?: boolean;
}

/**
 * Compact metric card for secondary metrics
 * Horizontal layout, minimal design
 */
const CompactMetricCard: React.FC<CompactMetricCardProps> = ({
  icon: Icon,
  label,
  value,
  iconColor = 'text-gray-400 dark:text-gray-500',
  valueColor = 'text-gray-900 dark:text-white',
  isLoading = false,
}) => {
  const displayValue = isLoading ? '...' : (value ?? 0);

  return (
    <AdminCard
      padding='sm'
      className='bg-gray-50/60 dark:bg-gray-900/50 group rounded-none border border-gray-200 dark:border-gray-700'
    >
      <div className='flex items-center gap-2.5'>
        <div className='flex-shrink-0'>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className='flex-1 min-w-0'>
          <div className={`text-base font-semibold font-heading ${valueColor} leading-tight mb-0.5`}>
            {displayValue}
          </div>
          <div className='text-[11px] text-gray-600 dark:text-gray-400 font-inter leading-tight'>
            {label}
          </div>
        </div>
      </div>
    </AdminCard>
  );
};

export default CompactMetricCard;

