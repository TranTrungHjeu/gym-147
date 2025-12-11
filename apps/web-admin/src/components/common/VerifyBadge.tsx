import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import useTranslation from '../../hooks/useTranslation';

interface VerifyBadgeProps {
  verified: boolean;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  type?: 'email' | 'phone' | 'general';
}

const VerifyBadge: React.FC<VerifyBadgeProps> = ({
  verified,
  size = 'sm',
  showText = false,
  className = '',
  type = 'general',
}) => {
  const { t } = useTranslation();
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-1.5 sm:px-2 py-0.5',
          icon: 'w-2 h-2 sm:w-2.5 sm:h-2.5',
          text: 'text-[8px] sm:text-[9px]',
        };
      case 'md':
        return {
          container: 'px-2 py-1',
          icon: 'w-3 h-3',
          text: 'text-[10px]',
        };
      case 'lg':
        return {
          container: 'px-2.5 py-1.5',
          icon: 'w-4 h-4',
          text: 'text-xs',
        };
      default:
        return {
          container: 'px-1.5 sm:px-2 py-0.5',
          icon: 'w-2 h-2 sm:w-2.5 sm:h-2.5',
          text: 'text-[8px] sm:text-[9px]',
        };
    }
  };

  const sizeClasses = getSizeClasses();

  // Verified: Orange color
  const verifiedClasses = 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700';
  // Not verified: Gray/Black color
  const notVerifiedClasses = 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600';

  const getLabel = () => {
    if (!showText) return '';
    if (type === 'email') {
      return verified ? t('verifyBadge.email.verified') : t('verifyBadge.email.unverified');
    }
    if (type === 'phone') {
      return verified ? t('verifyBadge.phone.verified') : t('verifyBadge.phone.unverified');
    }
    return verified ? t('verifyBadge.general.verified') : t('verifyBadge.general.unverified');
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold font-heading border transition-all duration-200 ${
        verified ? verifiedClasses : notVerifiedClasses
      } ${sizeClasses.container} ${className}`}
      title={getLabel() || (verified ? t('verifyBadge.general.verified') : t('verifyBadge.general.unverified'))}
    >
      {verified ? (
        <CheckCircle2 className={sizeClasses.icon} />
      ) : (
        <X className={sizeClasses.icon} />
      )}
      {showText && (
        <span className={`ml-1 ${sizeClasses.text}`}>
          {getLabel()}
        </span>
      )}
    </span>
  );
};

export default VerifyBadge;



