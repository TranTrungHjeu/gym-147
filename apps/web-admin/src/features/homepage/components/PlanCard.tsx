import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { MembershipPlan } from '../../../services/billing.service';
import { MembershipBadge } from './MembershipBadge';

interface PlanCardProps {
  plan: MembershipPlan;
  onEnroll?: () => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, onEnroll }) => {
  const { t } = useTranslation();

  const getPlanColor = (planType: string) => {
    switch (planType?.toUpperCase()) {
      case 'BASIC':
        return 'bg-[#f36100]'; // Primary orange
      case 'PREMIUM':
        return 'bg-amber-500';
      case 'VIP':
        return 'bg-red-600';
      case 'STUDENT':
        return 'bg-blue-500';
      default:
        return 'bg-[#f36100]';
    }
  };

  const getTier = (planType: string): 'BASIC' | 'PREMIUM' | 'VIP' | 'STUDENT' => {
    const upperType = planType?.toUpperCase();
    if (upperType === 'BASIC' || upperType === 'PREMIUM' || upperType === 'VIP' || upperType === 'STUDENT') {
      return upperType;
    }
    return 'BASIC';
  };

  const primaryColor = getPlanColor(plan.type || 'BASIC');
  const planTier = getTier(plan.type || 'BASIC');

  // Format price as VND
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Get duration text
  const getDurationText = () => {
    // Check if duration_months is available (from API)
    if (plan.duration_months && plan.duration_months > 0) {
      return `${plan.duration_months} ${t(`homepage.pricing.duration.month${plan.duration_months === 1 ? '' : 's'}`)}`;
    }
    
    // Fallback to duration_days if available
    const durationDays = plan.duration_days;
    if (!durationDays || durationDays <= 0) {
      return t('homepage.pricing.duration.unknown');
    }
    if (durationDays >= 365) {
      const years = Math.floor(durationDays / 365);
      return `${years} ${t(`homepage.pricing.duration.year${years === 1 ? '' : 's'}`)}`;
    } else if (durationDays >= 30) {
      const months = Math.floor(durationDays / 30);
      return `${months} ${t(`homepage.pricing.duration.month${months === 1 ? '' : 's'}`)}`;
    } else {
      return `${durationDays} ${t(`homepage.pricing.duration.day${durationDays === 1 ? '' : 's'}`)}`;
    }
  };

  const handleEnrollClick = (e: React.MouseEvent) => {
    if (onEnroll) {
      e.preventDefault();
      onEnroll();
    }
  };

  return (
    <div className='relative w-full max-w-sm h-full flex flex-col border-[3.5px] border-[#050505] rounded-md overflow-hidden bg-white shadow-[7px_7px_0_0_#000000] hover:shadow-[9px_9px_0_0_#000000] transition-shadow'>
      {/* Pattern Grid Background */}
      <div
        className='absolute inset-0 opacity-5 pointer-events-none'
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M0 0h40v40H0z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Bold Pattern Corner */}
      <div className='absolute top-0 right-0 w-16 h-16 bg-black opacity-15' />

      {/* Membership Badge */}
      <div className='absolute top-6 right-5 z-10'>
        <MembershipBadge tier={planTier} size='large' />
      </div>

      {/* Card Title Area */}
      <div className={`relative ${primaryColor} p-4 border-b-[3.5px] border-[#050505] overflow-hidden`}>
        <div className='absolute inset-0 opacity-30 bg-black' />
        <div className='relative flex items-center justify-between'>
          <h3 className='text-white font-extrabold text-lg uppercase tracking-wide'>
            {plan.name}
          </h3>
        </div>
      </div>

      {/* Card Body */}
      <div className='relative p-4 bg-white flex-1 flex flex-col'>
        {/* Description */}
        {plan.description && (
          <p className='text-sm text-gray-700 mb-4 leading-5'>{plan.description}</p>
        )}

        {/* Features Container - flex-grow to push actions down */}
        <div className='flex-1 flex flex-col'>
          {/* Features Grid */}
          {plan.features && plan.features.length > 0 && (
            <div className='grid grid-cols-2 gap-3 mb-4'>
              {plan.features.slice(0, 4).map((feature, index) => (
                <div key={index} className='flex items-center gap-2'>
                  <div className='bg-[#f36100] w-5 h-5 rounded border border-[#050505] flex items-center justify-center shadow-sm flex-shrink-0'>
                    <Check className='w-3 h-3 text-white' />
                  </div>
                  <span className='text-xs font-semibold text-gray-800 truncate'>{feature}</span>
                </div>
              ))}
            </div>
          )}

          {/* Additional Features */}
          {(plan.features && plan.features.length > 4) && (
            <div className='mb-4 space-y-2'>
              {plan.features.slice(4).map((feature, index) => (
                <div key={index + 4} className='flex items-center gap-2'>
                  <div className='bg-[#f36100] w-4 h-4 rounded border border-[#050505] flex items-center justify-center shadow-sm flex-shrink-0'>
                    <Check className='w-2.5 h-2.5 text-white' />
                  </div>
                  <span className='text-xs text-gray-700'>{feature}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card Actions - Always at bottom */}
        <div className='flex items-center justify-between mt-auto pt-3 border-t border-dashed border-gray-300'>
          <div className='relative'>
            <div className='flex flex-col'>
              <span className='text-2xl font-extrabold text-[#f36100]'>
                {formatPrice(plan.price)}
              </span>
              <span className='text-xs font-semibold text-gray-500 mt-1'>
                / {getDurationText()}
              </span>
            </div>
            <div className='absolute bottom-1 left-0 right-0 h-1 bg-green-500 opacity-50 -z-10' />
          </div>

          {/* Enroll Button */}
          <Link
            to={`/auth?planId=${plan.id}`}
            onClick={handleEnrollClick}
            className='px-4 py-2 bg-[#f36100] border-2 border-[#050505] rounded shadow-[3px_3px_0_0_#000000] hover:shadow-[4px_4px_0_0_#000000] transition-shadow text-white font-bold text-sm uppercase hover:bg-[#e55a00]'
          >
            {t('homepage.pricing.enroll')}
          </Link>
        </div>
      </div>

      {/* Accent Shape */}
      <div className='absolute bottom-0 right-5 w-6 h-6 bg-[#f36100] border-2 border-[#050505] rounded transform rotate-45 -mb-3' />

      {/* Corner Slice */}
      <div className='absolute bottom-0 left-0 w-4 h-4 border-r-2 border-t-2 border-[#050505] rounded-tr-md' />
    </div>
  );
};

export default PlanCard;

