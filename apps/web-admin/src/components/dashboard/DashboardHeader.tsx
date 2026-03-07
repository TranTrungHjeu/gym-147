import React from 'react';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  onLogout: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className='pb-3 border-b border-gray-200 dark:border-gray-700'>
      <div>
        <h1 className='text-lg lg:text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight mb-1'>
          {title}
        </h1>
        <p className='text-[11px] text-gray-600 dark:text-gray-400 font-inter leading-tight'>
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default DashboardHeader;
