import React from 'react';
import { LucideIcon } from 'lucide-react';
import AdminCard from '../common/AdminCard';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  iconBgColor?: string;
  iconColor?: string;
  valueColor?: string;
  isLoading?: boolean;
}

/**
 * Enhanced metric card with trend indicator
 * Used for primary metrics display
 */
const MetricCard: React.FC<MetricCardProps> = ({
  icon: Icon,
  label,
  value,
  change,
  iconBgColor = 'bg-orange-100 dark:bg-orange-900/30',
  iconColor = 'text-orange-600 dark:text-orange-400',
  valueColor = 'text-gray-900 dark:text-white',
  isLoading = false,
}) => {
  const displayValue = isLoading ? '...' : (value ?? 0);

  return (
    <AdminCard variant='compact' className='relative'>
      <div className='flex items-center gap-2.5'>
        {/* Icon Container - Compact */}
        <div className={`w-8 h-8 ${iconBgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        
        {/* Value and Label Container */}
        <div className='flex-1 min-w-0'>
          <div className={`text-xl font-bold font-heading ${valueColor} leading-tight mb-0.5`}>
            {displayValue}
          </div>
          <div className='text-xs text-gray-600 dark:text-gray-400 font-inter leading-tight'>
            {label}
          </div>
        </div>
      </div>
    </AdminCard>
  );
};

export default MetricCard;

