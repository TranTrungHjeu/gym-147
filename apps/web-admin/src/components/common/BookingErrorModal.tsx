import { AlertCircle, Calendar, RefreshCw, XCircle } from 'lucide-react';
import React from 'react';
import useTranslation from '../../hooks/useTranslation';
import ErrorModal from './ErrorModal';

export type BookingErrorType =
  | 'CAPACITY_FULL'
  | 'ALREADY_BOOKED'
  | 'SCHEDULE_NOT_FOUND'
  | 'SCHEDULE_EXPIRED'
  | 'SCHEDULE_CANCELLED'
  | 'MEMBER_NOT_FOUND'
  | 'SUBSCRIPTION_EXPIRED'
  | 'PAYMENT_FAILED'
  | 'SERVICE_UNAVAILABLE'
  | 'UNKNOWN';

interface BookingErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorType: BookingErrorType;
  scheduleName?: string;
  onRetry?: () => void;
  onViewSchedule?: () => void;
}

const BookingErrorModal: React.FC<BookingErrorModalProps> = ({
  isOpen,
  onClose,
  errorType,
  scheduleName,
  onRetry,
  onViewSchedule,
}) => {
  const { t } = useTranslation();
  const getErrorDetails = () => {
    switch (errorType) {
      case 'CAPACITY_FULL':
        return {
          title: t('bookingError.capacityFull.title'),
          message: scheduleName
            ? t('bookingError.capacityFull.messageWithName', { name: scheduleName })
            : t('bookingError.capacityFull.message'),
          icon: <XCircle className='w-6 h-6 text-yellow-600 dark:text-yellow-400' />,
          variant: 'warning' as const,
        };
      case 'ALREADY_BOOKED':
        return {
          title: t('bookingError.alreadyBooked.title'),
          message: scheduleName
            ? t('bookingError.alreadyBooked.messageWithName', { name: scheduleName })
            : t('bookingError.alreadyBooked.message'),
          icon: <Calendar className='w-6 h-6 text-blue-600 dark:text-blue-400' />,
          variant: 'info' as const,
        };
      case 'SCHEDULE_NOT_FOUND':
        return {
          title: t('bookingError.scheduleNotFound.title'),
          message: t('bookingError.scheduleNotFound.message'),
          icon: <AlertCircle className='w-6 h-6 text-red-600 dark:text-red-400' />,
          variant: 'error' as const,
        };
      case 'SCHEDULE_EXPIRED':
        return {
          title: t('bookingError.scheduleExpired.title'),
          message: scheduleName
            ? t('bookingError.scheduleExpired.messageWithName', { name: scheduleName })
            : t('bookingError.scheduleExpired.message'),
          icon: <XCircle className='w-6 h-6 text-red-600 dark:text-red-400' />,
          variant: 'error' as const,
        };
      case 'SCHEDULE_CANCELLED':
        return {
          title: t('bookingError.scheduleCancelled.title'),
          message: scheduleName
            ? t('bookingError.scheduleCancelled.messageWithName', { name: scheduleName })
            : t('bookingError.scheduleCancelled.message'),
          icon: <AlertCircle className='w-6 h-6 text-orange-600 dark:text-orange-400' />,
          variant: 'warning' as const,
        };
      case 'MEMBER_NOT_FOUND':
        return {
          title: t('bookingError.memberNotFound.title'),
          message: t('bookingError.memberNotFound.message'),
          icon: <AlertCircle className='w-6 h-6 text-red-600 dark:text-red-400' />,
          variant: 'error' as const,
        };
      case 'SUBSCRIPTION_EXPIRED':
        return {
          title: t('bookingError.subscriptionExpired.title'),
          message: t('bookingError.subscriptionExpired.message'),
          icon: <AlertCircle className='w-6 h-6 text-yellow-600 dark:text-yellow-400' />,
          variant: 'warning' as const,
        };
      case 'PAYMENT_FAILED':
        return {
          title: t('bookingError.paymentFailed.title'),
          message: t('bookingError.paymentFailed.message'),
          icon: <AlertCircle className='w-6 h-6 text-red-600 dark:text-red-400' />,
          variant: 'error' as const,
        };
      case 'SERVICE_UNAVAILABLE':
        return {
          title: t('bookingError.serviceUnavailable.title'),
          message: t('bookingError.serviceUnavailable.message'),
          icon: <AlertCircle className='w-6 h-6 text-yellow-600 dark:text-yellow-400' />,
          variant: 'warning' as const,
        };
      default:
        return {
          title: t('bookingError.unknown.title'),
          message: t('bookingError.unknown.message'),
          icon: <AlertCircle className='w-6 h-6 text-red-600 dark:text-red-400' />,
          variant: 'error' as const,
        };
    }
  };

  const errorDetails = getErrorDetails();

  const actions: {
    primary?: {
      label: string;
      onClick: () => void;
      variant?: 'danger' | 'primary' | 'secondary';
    };
    secondary?: {
      label: string;
      onClick: () => void;
    };
  } = {};

  if (onRetry && (errorType === 'PAYMENT_FAILED' || errorType === 'SERVICE_UNAVAILABLE')) {
    actions.primary = {
      label: t('bookingError.actions.retry'),
      onClick: onRetry,
      variant: 'primary',
    };
  }

  if (onViewSchedule && (errorType === 'ALREADY_BOOKED' || errorType === 'SCHEDULE_CANCELLED')) {
    actions.primary = {
      label:
        errorType === 'ALREADY_BOOKED'
          ? t('bookingError.actions.viewBookings')
          : t('bookingError.actions.viewOtherClasses'),
      onClick: onViewSchedule,
      variant: 'primary',
    };
  }

  if (!actions.primary) {
    actions.primary = {
      label: t('common.close'),
      onClick: onClose,
      variant: 'secondary',
    };
  }

  return (
    <ErrorModal
      isOpen={isOpen}
      onClose={onClose}
      title={errorDetails.title}
      message={errorDetails.message}
      variant={errorDetails.variant}
      icon={errorDetails.icon}
      actions={actions}
      showContactSupport={errorType === 'SERVICE_UNAVAILABLE' || errorType === 'UNKNOWN'}
    />
  );
};

export default BookingErrorModal;
