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
    <AdminCard padding='sm' className='relative overflow-hidden group'>
      {/* Subtle corner accent */}
      <div className={`absolute -top-px -right-px w-16 h-16 ${iconBgColor} opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10`}></div>
      
      {/* Subtle left border accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${iconBgColor} opacity-20 rounded-r`}></div>
      
      <div className='relative'>
        <div className='flex items-center gap-3.5'>
          {/* Icon Container - Enhanced */}
          <div className={`relative w-10 h-10 ${iconBgColor} rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20`}>
            <div className={`absolute inset-0 ${iconBgColor} opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300`}></div>
            <Icon className={`relative w-5 h-5 ${iconColor} transition-transform duration-300 group-hover:scale-110`} />
          </div>
          
          {/* Value and Label Container */}
          <div className='flex-1 min-w-0'>
            <div className='flex items-baseline gap-2 mb-1'>
              <div className={`text-2xl font-bold font-heading ${valueColor} leading-none tracking-tight`}>
                {displayValue}
              </div>
              {change && (
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all duration-200 ${
                  change.isPositive 
                    ? 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                }`}>
                  <span>{change.isPositive ? '↑' : '↓'}</span>
                  <span>{Math.abs(change.value)}%</span>
                </div>
              )}
            </div>
            <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
              {label}
            </div>
          </div>
        </div>
      </div>
    </AdminCard>
  );
};

export default MetricCard;

