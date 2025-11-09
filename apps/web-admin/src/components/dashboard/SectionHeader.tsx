import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

/**
 * Section header component for dashboard sections
 * Provides consistent typography and spacing
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title, subtitle, action }) => {
  return (
    <div className='flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-800/50'>
      <div className='flex items-center gap-2'>
        {Icon && <Icon className='w-4 h-4 text-gray-400 dark:text-gray-600' />}
        <div>
          <h2 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white leading-tight'>
            {title}
          </h2>
          {subtitle && (
            <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

export default SectionHeader;

