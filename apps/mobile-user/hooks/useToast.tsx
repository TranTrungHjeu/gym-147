import React, { useState, useCallback } from 'react';
import { Toast } from '@/components/ui/Toast';
import type { ToastType } from '@/components/ui/Toast';

export const useToast = () => {
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<ToastType>('info');
  const [message, setMessage] = useState('');
  const [duration, setDuration] = useState<number | undefined>(undefined);

  const showToast = useCallback((toastType: ToastType, toastMessage: string, toastDuration?: number) => {
    setType(toastType);
    setMessage(toastMessage);
    setDuration(toastDuration);
    setVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setVisible(false);
  }, []);

  const showSuccess = useCallback(
    (toastMessage: string, toastDuration?: number) => {
      showToast('success', toastMessage, toastDuration);
    },
    [showToast]
  );

  const showError = useCallback(
    (toastMessage: string, toastDuration?: number) => {
      showToast('error', toastMessage, toastDuration);
    },
    [showToast]
  );

  const showWarning = useCallback(
    (toastMessage: string, toastDuration?: number) => {
      showToast('warning', toastMessage, toastDuration);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (toastMessage: string, toastDuration?: number) => {
      showToast('info', toastMessage, toastDuration);
    },
    [showToast]
  );

  const ToastComponent = React.useCallback(
    () => <Toast visible={visible} type={type} message={message} duration={duration} onClose={hideToast} />,
    [visible, type, message, duration, hideToast]
  );

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideToast,
    ToastComponent,
  };
};

