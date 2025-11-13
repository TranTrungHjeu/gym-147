import React, { useState, useEffect, useCallback } from 'react';
import Toast, { ToastProps } from './Toast';

export interface ToastMessage extends Omit<ToastProps, 'onClose'> {
  id: string;
}

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
  maxToasts = 5,
}) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Listen for toast events from window
  useEffect(() => {
    const handleShowToast = (event: CustomEvent<Omit<ToastMessage, 'id'>>) => {
      const toast: ToastMessage = {
        id: `toast-${Date.now()}-${Math.random()}`,
        ...event.detail,
      };

      setToasts(prev => {
        const newToasts = [toast, ...prev].slice(0, maxToasts);
        return newToasts;
      });
    };

    // Also support window.showToast function for backward compatibility
    (window as any).showToast = (toast: Omit<ToastMessage, 'id'>) => {
      const toastEvent = new CustomEvent('show-toast', { detail: toast });
      window.dispatchEvent(toastEvent);
    };

    window.addEventListener('show-toast', handleShowToast as EventListener);

    return () => {
      window.removeEventListener('show-toast', handleShowToast as EventListener);
      delete (window as any).showToast;
    };
  }, [maxToasts]);

  const handleClose = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  if (toasts.length === 0) return null;

  return (
    <div
      className={`
        fixed ${positionClasses[position]}
        z-50 flex flex-col gap-2 pointer-events-none
      `}
    >
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onClose={handleClose} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;

