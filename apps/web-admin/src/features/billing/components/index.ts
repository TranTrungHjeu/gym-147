// Re-export shared components
export { default as Button } from '../../../shared/components/ui/Button/Button';
export { default as Card } from '../../../shared/components/ui/Card/Card';

// IconBadge component
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface IconBadgeProps {
  icon: LucideIcon;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info';
}

export function IconBadge({ icon: Icon, tone = 'brand' }: IconBadgeProps) {
  const toneClasses = {
    brand: 'bg-brand-500/20 text-brand-200 border-brand-500/40',
    success: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
    warning: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
    danger: 'bg-red-500/20 text-red-200 border-red-500/40',
    info: 'bg-blue-500/20 text-blue-200 border-blue-500/40',
  };

  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-xl border ${toneClasses[tone]}`}
    >
      <Icon className='h-6 w-6' strokeWidth={1.6} />
    </div>
  );
}

// Export analytics components
export { AnalyticsDashboard } from './AnalyticsDashboard';
export { RevenueReports } from './RevenueReports';
export { MemberAnalytics } from './MemberAnalytics';

