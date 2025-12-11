import { AlertCircle, CreditCard, RefreshCw, XCircle } from 'lucide-react';
import React from 'react';
import useTranslation from '../../hooks/useTranslation';
import ErrorModal from './ErrorModal';

export type PaymentErrorType =
  | 'PAYMENT_FAILED'
  | 'PAYMENT_TIMEOUT'
  | 'INVALID_AMOUNT'
  | 'INVALID_SIGNATURE'
  | 'DUPLICATE_PAYMENT'
  | 'SUBSCRIPTION_CREATION_FAILED'
  | 'DISCOUNT_CODE_INVALID'
  | 'DISCOUNT_CODE_EXPIRED'
  | 'DISCOUNT_CODE_LIMIT_REACHED'
  | 'SERVICE_UNAVAILABLE'
  | 'UNKNOWN';

interface PaymentErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorType: PaymentErrorType;
  amount?: number;
  onRetry?: () => void;
  onContactSupport?: () => void;
}

const PaymentErrorModal: React.FC<PaymentErrorModalProps> = ({
  isOpen,
  onClose,
  errorType,
  amount,
  onRetry,
  onContactSupport,
}) => {
  const { t } = useTranslation();
  const getErrorDetails = () => {
    switch (errorType) {
      case 'PAYMENT_FAILED':
        return {
          title: t('paymentError.paymentFailed.title'),
          message: amount
            ? t('paymentError.paymentFailed.messageWithAmount', { amount: amount.toLocaleString('vi-VN') })
            : t('paymentError.paymentFailed.message'),
          icon: <CreditCard className='w-6 h-6 text-red-600 dark:text-red-400' />,
          variant: 'error' as const,
        };
      case 'PAYMENT_TIMEOUT':
        return {
          title: t('paymentError.paymentTimeout.title'),
          message: t('paymentError.paymentTimeout.message'),
          icon: <AlertCircle className='w-6 h-6 text-yellow-600 dark:text-yellow-400' />,
          variant: 'warning' as const,
        };
      case 'INVALID_AMOUNT':
        return {
          title: t('paymentError.invalidAmount.title'),
          message: t('paymentError.invalidAmount.message'),
          icon: <XCircle className='w-6 h-6 text-red-600 dark:text-red-400' />,
          variant: 'error' as const,
        };
      case 'INVALID_SIGNATURE':
        return {
          title: t('paymentError.invalidSignature.title'),
          message: t('paymentError.invalidSignature.message'),
          icon: <AlertCircle className='w-6 h-6 text-red-600 dark:text-red-400' />,
          variant: 'error' as const,
        };
      case 'DUPLICATE_PAYMENT':
        return {
          title: t('paymentError.duplicatePayment.title'),
          message: t('paymentError.duplicatePayment.message'),
          icon: <AlertCircle className='w-6 h-6 text-blue-600 dark:text-blue-400' />,
          variant: 'info' as const,
        };
      case 'SUBSCRIPTION_CREATION_FAILED':
        return {
          title: t('paymentError.subscriptionCreationFailed.title'),
          message: t('paymentError.subscriptionCreationFailed.message'),
          icon: <AlertCircle className='w-6 h-6 text-red-600 dark:text-red-400' />,
          variant: 'error' as const,
        };
      case 'DISCOUNT_CODE_INVALID':
        return {
          title: t('paymentError.discountCodeInvalid.title'),
          message: t('paymentError.discountCodeInvalid.message'),
          icon: <XCircle className='w-6 h-6 text-yellow-600 dark:text-yellow-400' />,
          variant: 'warning' as const,
        };
      case 'DISCOUNT_CODE_EXPIRED':
        return {
          title: t('paymentError.discountCodeExpired.title'),
          message: t('paymentError.discountCodeExpired.message'),
          icon: <XCircle className='w-6 h-6 text-yellow-600 dark:text-yellow-400' />,
          variant: 'warning' as const,
        };
      case 'DISCOUNT_CODE_LIMIT_REACHED':
        return {
          title: t('paymentError.discountCodeLimitReached.title'),
          message: t('paymentError.discountCodeLimitReached.message'),
          icon: <XCircle className='w-6 h-6 text-yellow-600 dark:text-yellow-400' />,
          variant: 'warning' as const,
        };
      case 'SERVICE_UNAVAILABLE':
        return {
          title: t('paymentError.serviceUnavailable.title'),
          message: t('paymentError.serviceUnavailable.message'),
          icon: <AlertCircle className='w-6 h-6 text-yellow-600 dark:text-yellow-400' />,
          variant: 'warning' as const,
        };
      default:
        return {
          title: t('paymentError.unknown.title'),
          message: t('paymentError.unknown.message'),
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

  if (onRetry && ['PAYMENT_FAILED', 'PAYMENT_TIMEOUT', 'SERVICE_UNAVAILABLE'].includes(errorType)) {
    actions.primary = {
      label: t('paymentError.actions.retry'),
      onClick: onRetry,
      variant: 'primary',
    };
  }

  if (onContactSupport && ['SUBSCRIPTION_CREATION_FAILED', 'INVALID_SIGNATURE'].includes(errorType)) {
    actions.secondary = {
      label: t('paymentError.actions.contactSupport'),
      onClick: onContactSupport,
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
      showContactSupport={
        ['SUBSCRIPTION_CREATION_FAILED', 'INVALID_SIGNATURE', 'SERVICE_UNAVAILABLE', 'UNKNOWN'].includes(
          errorType
        )
      }
    />
  );
};

export default PaymentErrorModal;

