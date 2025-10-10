import React, { useEffect, useRef, useState } from 'react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle search logic here
    console.log('Search query:', searchQuery);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className='search-model'
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
      }}
    >
      <div
        className='h-100 d-flex align-items-center justify-content-center'
        style={{ width: '100%', height: '100%' }}
      >
        <div
          className='search-close-switch'
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '50px',
            right: '50px',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <i className='fa fa-times'></i>
        </div>
        <form className='search-model-form' onSubmit={handleSubmit} style={{ textAlign: 'center' }}>
          <input
            ref={inputRef}
            type='text'
            id='search-input'
            placeholder='Tìm kiếm...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid white',
              color: 'white',
              fontSize: '24px',
              padding: '10px 0',
              width: '400px',
              maxWidth: '80vw',
              textAlign: 'center',
              outline: 'none',
            }}
          />
        </form>
      </div>
    </div>
  );
};
