import React from 'react';
import BasicSvg from '../../assets/badges/basic.svg';
import PremiumSvg from '../../assets/badges/premium.svg';
import StudentSvg from '../../assets/badges/student.svg';
import VipSvg from '../../assets/badges/vip.svg';

interface MembershipBadgeProps {
  tier: 'BASIC' | 'PREMIUM' | 'VIP' | 'STUDENT';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const sizeMap = {
  small: 24,
  medium: 32,
  large: 40,
};

const tierConfig = {
  VIP: {
    SvgIcon: VipSvg,
    hasEffect: true,
    glowColor: '#FFD700',
  },
  PREMIUM: {
    SvgIcon: PremiumSvg,
    hasEffect: true,
    glowColor: '#C0C0C0',
  },
  STUDENT: {
    SvgIcon: StudentSvg,
    hasEffect: false,
    glowColor: '#000000',
  },
  BASIC: {
    SvgIcon: BasicSvg,
    hasEffect: false,
    glowColor: '#000000',
  },
};

export const MembershipBadge: React.FC<MembershipBadgeProps> = ({
  tier,
  size = 'medium',
  className = '',
}) => {
  const config = tierConfig[tier];
  const iconSize = sizeMap[size];

  const SvgIcon = config.SvgIcon;

  if (!config.hasEffect) {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <img
          src={SvgIcon}
          alt={`${tier} membership badge`}
          width={iconSize}
          height={iconSize}
          className='object-contain drop-shadow-sm'
        />
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Outer glow ring */}
      <div
        className='absolute rounded-full border-2 animate-pulse'
        style={{
          width: iconSize + 12,
          height: iconSize + 12,
          borderColor: config.glowColor,
          boxShadow: `0 0 12px ${config.glowColor}40`,
        }}
      />

      {/* Main icon */}
      <div className='relative'>
        <img
          src={SvgIcon}
          alt={`${tier} membership badge`}
          width={iconSize}
          height={iconSize}
          className='object-contain relative z-10 drop-shadow-lg'
          style={{
            filter: `drop-shadow(0 0 8px ${config.glowColor}80)`,
          }}
        />
      </div>

      {/* Sparkle effect */}
      <div
        className='absolute inset-0 animate-spin'
        style={{
          animationDuration: '3s',
          width: iconSize + 16,
          height: iconSize + 16,
        }}
      >
        {[0, 1, 2, 3].map(index => (
          <div
            key={index}
            className='absolute rounded-full'
            style={{
              width: 4,
              height: 4,
              backgroundColor: config.glowColor,
              top: index === 0 || index === 2 ? 0 : undefined,
              bottom: index === 1 || index === 3 ? 0 : undefined,
              left: index === 0 || index === 1 ? 0 : undefined,
              right: index === 2 || index === 3 ? 0 : undefined,
              boxShadow: `0 0 6px ${config.glowColor}`,
            }}
          />
        ))}
      </div>
    </div>
  );
};











