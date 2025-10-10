import React, { useEffect } from 'react';

interface ImagePopupProps {
  src: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ImagePopup: React.FC<ImagePopupProps> = ({ src, isOpen, onClose }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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

  return (
    <div
      className='image-popup-overlay'
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className='image-popup-content'
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '90vh',
        }}
      >
        <img
          src={src}
          alt='Gallery'
          style={{
            maxWidth: '100%',
            maxHeight: '90vh',
            objectFit: 'contain',
          }}
        />
        <button
          className='image-popup-close'
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-40px',
            right: '0',
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '30px',
            cursor: 'pointer',
            padding: '5px',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};
