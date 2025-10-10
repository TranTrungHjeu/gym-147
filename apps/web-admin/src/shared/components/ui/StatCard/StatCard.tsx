import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';
import React from 'react';
import { cn } from '../../../utils/cn';
import { Card, CardContent } from '../Card/Card';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period?: string;
  };
  icon?: LucideIcon;
  iconColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  className?: string;
}

const iconColorClasses = {
  primary: 'text-primary-600 bg-primary-100',
  secondary: 'text-secondary-600 bg-secondary-100',
  success: 'text-green-600 bg-green-100',
  warning: 'text-yellow-600 bg-yellow-100',
  error: 'text-red-600 bg-red-100',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'primary',
  className,
}) => {
  return (
    <Card variant='elevated' className={cn('relative overflow-hidden', className)}>
      <CardContent className='p-6'>
        <div className='flex items-center justify-between'>
          <div className='flex-1'>
            <p className='text-sm font-medium text-neutral-600 mb-1'>{title}</p>
            <p className='text-2xl font-bold text-neutral-900'>{value}</p>

            {change && (
              <div className='flex items-center mt-2'>
                {change.type === 'increase' ? (
                  <TrendingUp className='h-4 w-4 text-green-600 mr-1' />
                ) : (
                  <TrendingDown className='h-4 w-4 text-red-600 mr-1' />
                )}
                <span
                  className={cn(
                    'text-sm font-medium',
                    change.type === 'increase' ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {Math.abs(change.value)}%
                </span>
                {change.period && (
                  <span className='text-sm text-neutral-500 ml-1'>{change.period}</span>
                )}
              </div>
            )}
          </div>

          {Icon && (
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg',
                iconColorClasses[iconColor]
              )}
            >
              <img src={Icon} alt='Stat' className='h-6 w-6' />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
