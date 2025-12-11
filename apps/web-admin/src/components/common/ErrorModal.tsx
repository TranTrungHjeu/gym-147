import { AlertCircle, X, RefreshCw, Home, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import useTranslation from '../../hooks/useTranslation';

export interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  errorCode?: string;
  variant?: 'error' | 'warning' | 'info';
  icon?: React.ReactNode;
  actions?: {
    primary?: {
      label: string;
      onClick: () => void;
      variant?: 'danger' | 'primary' | 'secondary';
    };
    secondary?: {
      label: string;
      onClick: () => void;
    };
  };
  showContactSupport?: boolean;
  supportEmail?: string;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  errorCode,
  variant = 'error',
  icon,
  actions,
  showContactSupport = false,
  supportEmail = 'support@gym147.vn',
}) => {
  const { t } = useTranslation();
  const defaultTitle = title || t('errorModal.defaultTitle');
  const variantStyles = {
    error: {
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      headerBg: 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
      borderColor: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-800 dark:text-red-200',
    },
    warning: {
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      headerBg: 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      textColor: 'text-yellow-800 dark:text-yellow-200',
    },
    info: {
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      headerBg: 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-800 dark:text-blue-200',
    },
  };

  const styles = variantStyles[variant];

  const defaultIcon = icon || <AlertCircle className={`w-6 h-6 ${styles.iconColor}`} />;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-[99999] flex items-center justify-center p-4 pointer-events-none'>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='fixed inset-0 bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm pointer-events-auto'
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
            }}
            className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border ${styles.borderColor} max-w-md w-full z-10 pointer-events-auto`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className={`${styles.headerBg} border-b ${styles.borderColor} px-6 py-4 rounded-t-2xl`}
            >
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-center gap-3 flex-1'>
                  <div
                    className={`w-12 h-12 ${styles.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}
                  >
                    {defaultIcon}
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white mb-1'>
                      {defaultTitle}
                    </h3>
                    {errorCode && (
                      <p className='text-xs font-mono text-gray-500 dark:text-gray-400'>
                        {t('errorModal.errorCode', { code: errorCode })}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className='p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 flex-shrink-0'
                  aria-label={t('common.close')}
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className='p-6'>
              <div className='mb-6'>
                <p className='text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line'>
                  {message}
                </p>
              </div>

              {showContactSupport && (
                <div className='mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700'>
                  <div className='flex items-start gap-3'>
                    <Mail className='w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5' />
                    <div className='flex-1'>
                      <p className='text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'>
                        {t('errorModal.needSupport')}
                      </p>
                      <a
                        href={`mailto:${supportEmail}`}
                        className='text-xs text-orange-600 dark:text-orange-400 hover:underline'
                      >
                        {supportEmail}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className='flex flex-col sm:flex-row gap-3 justify-end'>
                {actions?.secondary && (
                  <button
                    onClick={actions.secondary.onClick}
                    className='px-4 py-2.5 text-sm font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md'
                  >
                    {actions.secondary.label}
                  </button>
                )}
                {actions?.primary && (
                  <button
                    onClick={actions.primary.onClick}
                    className={`px-4 py-2.5 text-sm font-semibold font-heading text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${
                      actions.primary.variant === 'danger'
                        ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
                        : actions.primary.variant === 'secondary'
                          ? 'bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600'
                          : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600'
                    }`}
                  >
                    {actions.primary.label}
                  </button>
                )}
                {!actions && (
                  <button
                    onClick={onClose}
                    className='px-4 py-2.5 text-sm font-semibold font-heading text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200'
                  >
                    {t('common.close')}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ErrorModal;

