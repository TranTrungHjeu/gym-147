import React from 'react';

interface DashboardLayoutProps {
  leftColumn: React.ReactNode;
  rightColumn?: React.ReactNode;
}

/**
 * Professional dashboard layout with two-column structure
 * Left: Main content (metrics, actions, charts)
 * Right: Sidebar (recent activity, secondary info)
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({ leftColumn, rightColumn }) => {
  return (
    <div className='grid grid-cols-1 lg:grid-cols-12 gap-3'>
      {/* Main Content - Left Column */}
      <div className='lg:col-span-8 space-y-3'>{leftColumn}</div>

      {/* Sidebar - Right Column */}
      {rightColumn && (
        <div className='lg:col-span-4 space-y-3'>{rightColumn}</div>
      )}
    </div>
  );
};

export default DashboardLayout;

