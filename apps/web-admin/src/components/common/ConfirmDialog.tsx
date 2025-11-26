import { AlertTriangle } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import Modal from '../Modal/Modal';
import { ButtonSpinner } from '../ui/AppLoading';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  requireType?: boolean;
  typeText?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger',
  isLoading = false,
  requireType = true,
  typeText = 'delete',
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
      // Focus input after modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (requireType && confirmInput.toLowerCase() !== typeText.toLowerCase()) {
      return;
    }
    await onConfirm();
  };

  const isConfirmDisabled =
    isLoading || (requireType && confirmInput.toLowerCase() !== typeText.toLowerCase());

  const variantStyles = {
    danger: {
      headerGradient: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
      headerBorder: 'border-red-200 dark:border-red-700',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      contentBg: 'bg-red-50 dark:bg-red-900/20',
      contentBorder: 'border-red-200 dark:border-red-800',
      buttonBg: 'bg-error-600 hover:bg-error-700 dark:bg-error-500 dark:hover:bg-error-600',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    warning: {
      headerGradient:
        'from-warning-50 to-warning-100 dark:from-warning-900/20 dark:to-warning-800/20',
      headerBorder: 'border-warning-200 dark:border-warning-700',
      iconBg: 'bg-warning-100 dark:bg-warning-900/30',
      iconColor: 'text-warning-600 dark:text-warning-400',
      contentBg: 'bg-warning-50 dark:bg-warning-900/20',
      contentBorder: 'border-warning-200 dark:border-warning-800',
      buttonBg: 'bg-warning-600 hover:bg-warning-700 dark:bg-warning-500 dark:hover:bg-warning-600',
      borderColor: 'border-warning-200 dark:border-warning-800',
    },
    info: {
      headerGradient: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
      headerBorder: 'border-blue-200 dark:border-blue-700',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      contentBg: 'bg-blue-50 dark:bg-blue-900/20',
      contentBorder: 'border-blue-200 dark:border-blue-800',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className='max-w-[500px] m-4'>
      <div
        className={`relative w-full max-w-[500px] rounded-2xl bg-white dark:bg-gray-900 border ${styles.borderColor} shadow-xl flex flex-col`}
      >
        {/* Header */}
        <div
          className={`flex-shrink-0 bg-gradient-to-r ${styles.headerGradient} border-b ${styles.headerBorder} px-6 py-4 rounded-t-2xl`}
        >
          <div className='flex items-start justify-between gap-4'>
            <div className='flex items-center gap-3 flex-1'>
              <div
                className={`w-10 h-10 ${styles.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}
              >
                <AlertTriangle className={`w-5 h-5 ${styles.iconColor}`} />
              </div>
              <div>
                <h4 className='text-lg font-semibold font-heading text-gray-900 dark:text-white mb-1'>
                  {title}
                </h4>
                <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-heading'>
                  Hành động này không thể hoàn tác
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 p-6 space-y-4'>
          <div
            className={`flex gap-4 p-4 rounded-lg border ${styles.contentBg} ${styles.contentBorder}`}
          >
            <div className={`flex-shrink-0 ${styles.iconColor}`}>
              <AlertTriangle className='w-6 h-6' />
            </div>
            <div className='flex-1'>
              <p className='text-sm font-heading text-gray-700 dark:text-gray-300 whitespace-pre-line'>
                {message}
              </p>
            </div>
          </div>

          {requireType && (
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 mb-2'>
                Nhập "<span className='font-mono font-bold'>{typeText}</span>" để xác nhận
              </label>
              <input
                ref={inputRef}
                type='text'
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                placeholder={typeText}
                className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-heading shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                  confirmInput && confirmInput.toLowerCase() !== typeText.toLowerCase()
                    ? 'border-red-500 dark:border-red-500'
                    : styles.contentBorder
                }`}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !isConfirmDisabled) {
                    handleConfirm();
                  }
                }}
                autoFocus
              />
              {confirmInput && confirmInput.toLowerCase() !== typeText.toLowerCase() && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-heading'>
                  Vui lòng nhập đúng "{typeText}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-6 py-4 rounded-b-2xl'>
          <div className='flex justify-end gap-3'>
            <button
              type='button'
              onClick={onClose}
              disabled={isLoading}
              className='px-5 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
            >
              {cancelText}
            </button>
            <button
              type='button'
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-theme-xs font-semibold font-heading text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${styles.buttonBg}`}
            >
              {isLoading ? (
                <>
                  <ButtonSpinner />
                  Đang xử lý...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
