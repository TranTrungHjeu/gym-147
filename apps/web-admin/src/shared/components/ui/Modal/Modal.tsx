import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { ModalProps } from './Modal.types';

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  className = '',
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
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

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl"
      onClick={handleBackdropClick}
    >
      <div
        className={`relative w-full ${sizeClasses[size]} ${className} max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-surface-900/85 shadow-brand-soft`}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-surface-900/80">
            {title && <h3 className="text-lg font-semibold text-brand-50">{title}</h3>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-ink-300 transition-all duration-200 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" strokeWidth={1.7} />
              </button>
            )}
          </div>
        )}
        <div className="p-6 text-brand-50">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;