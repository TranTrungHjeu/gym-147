import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import React from 'react';
import useTranslation from '../../hooks/useTranslation';
import ErrorModal, { ErrorModalProps } from './ErrorModal';
import { useNavigate } from 'react-router-dom';

interface ServiceUnavailableModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName?: string;
  onRetry?: () => void;
}

const ServiceUnavailableModal: React.FC<ServiceUnavailableModalProps> = ({
  isOpen,
  onClose,
  serviceName,
  onRetry,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const defaultServiceName = serviceName || t('serviceUnavailable.defaultServiceName');

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    navigate('/dashboard');
    onClose();
  };

  return (
    <ErrorModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('serviceUnavailable.title')}
      message={t('serviceUnavailable.message', { serviceName: defaultServiceName })}
      variant='warning'
      icon={<AlertTriangle className='w-6 h-6 text-yellow-600 dark:text-yellow-400' />}
      actions={{
        primary: {
          label: t('serviceUnavailable.actions.retry'),
          onClick: handleRetry,
          variant: 'primary',
        },
        secondary: {
          label: t('serviceUnavailable.actions.goHome'),
          onClick: handleGoHome,
        },
      }}
      showContactSupport={true}
    />
  );
};

export default ServiceUnavailableModal;

