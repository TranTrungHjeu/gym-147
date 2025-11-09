import React, { createContext, useCallback, useContext, useState } from 'react';
import Toast from '../components/common/Toast';

interface ToastData {
  id: string;
  message: string;
  type: 'error' | 'success' | 'warning' | 'info';
  duration?: number;
  countdown?: number; // Thời gian countdown (giây)
}

interface ToastContextType {
  showToast: (toast: Omit<ToastData, 'id'>) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastData = {
      id,
      ...toast,
    };

    setToasts(prev => [...prev, newToast]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Expose showToast globally for backward compatibility
  React.useEffect(() => {
    (window as any).showToast = showToast;
    return () => {
      delete (window as any).showToast;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {/* Render all toasts - stack from top-right */}
      <div className='fixed top-4 right-4 z-[100000] flex flex-col gap-3 pointer-events-none'>
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className='pointer-events-auto'
            style={{
              transform: `translateY(${index * 8}px)`,
            }}
          >
            <Toast
              message={toast.message}
              type={toast.type}
              isVisible={true}
              onClose={() => hideToast(toast.id)}
              duration={toast.duration}
              countdown={toast.countdown}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
