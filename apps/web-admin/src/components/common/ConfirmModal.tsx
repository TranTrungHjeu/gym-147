import React from 'react';
import AdminModal from './AdminModal';
import AdminButton from './AdminButton';
import { AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning' | 'success';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'primary',
  isLoading = false,
  icon,
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const variantClasses = {
    primary: 'bg-orange-600 hover:bg-orange-700 text-white',
    danger: 'bg-error-600 hover:bg-error-700 text-white',
    warning: 'bg-warning-600 hover:bg-warning-700 text-white',
    success: 'bg-success-600 hover:bg-success-700 text-white',
  };

  const iconColors = {
    primary: 'text-orange-600 dark:text-orange-400',
    danger: 'text-error-600 dark:text-error-400',
    warning: 'text-warning-600 dark:text-warning-400',
    success: 'text-success-600 dark:text-success-400',
  };

  const defaultIcon = icon || <AlertCircle className={`w-12 h-12 ${iconColors[variant]}`} />;

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size='sm'
      showCloseButton={!isLoading}
      footer={
        <div className='flex items-center justify-end gap-3'>
          <AdminButton variant='outline' onClick={onClose} disabled={isLoading}>
            {cancelText}
          </AdminButton>
          <AdminButton
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={isLoading}
            isLoading={isLoading}
            className={variantClasses[variant]}
          >
            {confirmText}
          </AdminButton>
        </div>
      }
    >
      <div className='flex flex-col items-center text-center space-y-4 py-4'>
        <div className='flex-shrink-0'>{defaultIcon}</div>
        <div className='space-y-2'>
          <p className='text-theme-sm text-gray-900 dark:text-white font-inter'>{message}</p>
        </div>
      </div>
    </AdminModal>
  );
};

export default ConfirmModal;

