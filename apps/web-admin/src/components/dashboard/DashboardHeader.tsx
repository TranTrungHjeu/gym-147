import React from 'react';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  onLogout: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className='pb-4 border-b border-gray-200 dark:border-gray-800'>
      <div>
        <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight mb-1'>
          {title}
        </h1>
        <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight'>
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default DashboardHeader;
