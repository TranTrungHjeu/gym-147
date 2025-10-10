import { useState, useCallback } from 'react';

interface ToastState {
  message: string;
  type: 'error' | 'success' | 'warning' | 'info';
  isVisible: boolean;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const showToast = useCallback(
    (message: string, type: 'error' | 'success' | 'warning' | 'info' = 'info') => {
      setToast({
        message,
        type,
        isVisible: true,
      });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast(prev => ({
      ...prev,
      isVisible: false,
    }));
  }, []);

  const showError = useCallback(
    (message: string) => {
      showToast(message, 'error');
    },
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string) => {
      showToast(message, 'success');
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string) => {
      showToast(message, 'warning');
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string) => {
      showToast(message, 'info');
    },
    [showToast]
  );

  return {
    toast,
    showToast,
    hideToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
}

