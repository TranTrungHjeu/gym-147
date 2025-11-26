import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import AdminCard from './AdminCard';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  footer?: React.ReactNode;
}

const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  footer,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full mx-4',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className='fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto'
          onClick={onClose}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className='fixed inset-0 h-full w-full bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm'
            aria-hidden='true'
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 400,
              mass: 0.8,
            }}
            className={`relative z-99999 w-full ${sizeClasses[size]} mx-4 my-8`}
            onClick={e => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-labelledby={title ? 'modal-title' : undefined}
          >
            <AdminCard className='overflow-hidden max-h-[90vh] flex flex-col' padding='none'>
              {/* Header */}
              {(title || showCloseButton) && (
                <motion.div
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.3, ease: 'easeOut' }}
                  className='flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0'
                >
                  {title && (
                    <h2
                      id='modal-title'
                      className='text-xl font-semibold font-heading text-gray-900 dark:text-white'
                    >
                      {title}
                    </h2>
                  )}
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className='ml-auto p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200'
                      aria-label='Close modal'
                    >
                      <X className='w-5 h-5' />
                    </button>
                  )}
                </motion.div>
              )}

              {/* Content */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3, ease: 'easeOut' }}
                className='px-6 py-4 overflow-y-auto flex-1 min-h-0 modal-scrollbar'
              >
                {children}
              </motion.div>

              {/* Footer */}
              {footer && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.3, ease: 'easeOut' }}
                  className='px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0'
                >
                  {footer}
                </motion.div>
              )}
            </AdminCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AdminModal;
