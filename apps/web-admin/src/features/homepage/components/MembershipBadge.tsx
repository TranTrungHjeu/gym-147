import React from 'react';
import BasicSvg from '../../../assets/badges/basic.svg';
import PremiumSvg from '../../../assets/badges/premium.svg';
import StudentSvg from '../../../assets/badges/student.svg';
import VipSvg from '../../../assets/badges/vip.svg';

interface MembershipBadgeProps {
  tier: 'BASIC' | 'PREMIUM' | 'VIP' | 'STUDENT';
  size?: 'small' | 'medium' | 'large';
}

export const MembershipBadge: React.FC<MembershipBadgeProps> = ({ tier, size = 'large' }) => {
  const sizeMap = {
    small: 32,
    medium: 44,
    large: 56,
  };

  const tierConfig = {
    VIP: VipSvg,
    PREMIUM: PremiumSvg,
    STUDENT: StudentSvg,
    BASIC: BasicSvg,
  };

  const iconSize = sizeMap[size];
  const SvgIcon = tierConfig[tier] || tierConfig.BASIC;

  return (
    <div className='relative inline-block'>
      <img
        src={SvgIcon}
        alt={`${tier} badge`}
        width={iconSize}
        height={iconSize}
        className='drop-shadow-lg'
      />
    </div>
  );
};

