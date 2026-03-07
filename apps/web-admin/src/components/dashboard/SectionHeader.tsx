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
    <div className='flex items-center justify-between mb-2.5 pb-2 border-b border-gray-200 dark:border-gray-700'>
      <div className='flex items-center gap-2'>
        {Icon && <Icon className='w-3.5 h-3.5 text-orange-500 dark:text-orange-400' />}
        <div>
          <h2 className='text-xs font-semibold font-heading text-gray-900 dark:text-white leading-tight uppercase tracking-wide'>
            {title}
          </h2>
          {subtitle && (
            <p className='text-[11px] text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
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

