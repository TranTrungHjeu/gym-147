import React from 'react';
import { BlinkBlur } from 'react-loading-indicators';

export interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  color?: string;
  className?: string;
  showBackdrop?: boolean;
  textColor?: string;
}

/**
 * Base Loading Component với backdrop
 * Sử dụng BlinkBlur từ react-loading-indicators
 */
export const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  text = '',
  color = '#f97316',
  className = '',
  showBackdrop = true,
  textColor = '#ffffff',
}) => {
  const getSizeValue = () => {
    switch (size) {
      case 'small':
        return 'small';
      case 'large':
        return 'large';
      default: // medium
        return 'medium';
    }
  };

  return (
    <>
      {showBackdrop && (
        <div className='fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center'>
          <div
            className={`loading-container font-space-grotesk ${className}`}
            style={{ textAlign: 'center' }}
          >
            <BlinkBlur color={color} size={getSizeValue()} text={text} textColor={textColor} />
            <style>{`
              .loading-container * {
                font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
              }
            `}</style>
          </div>
        </div>
      )}
    </>
  );
};

// ============================================
// STANDARDIZED LOADING COMPONENTS
// ============================================

/**
 * Page Loading - Full page với backdrop
 * Sử dụng cho initial page load
 */
export const PageLoading: React.FC = () => (
  <Loading size='large' text='Đang tải...' color='#f97316' />
);

/**
 * Table Loading - Loading state cho tables và data lists
 * Hiển thị spinner với text trong container
 */
export interface TableLoadingProps {
  text?: string;
  className?: string;
}

export const TableLoading: React.FC<TableLoadingProps> = ({
  text = 'Đang tải...',
  className = '',
}) => (
  <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 ${className}`}>
    <div className='flex flex-col items-center justify-center gap-3'>
      <div className='w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin' />
      <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
        {text}
      </div>
    </div>
  </div>
);

/**
 * Inline Spinner - Spinner nhỏ gọn cho inline loading
 * Có thể tùy chỉnh size và color
 */
export interface InlineSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'orange' | 'white' | 'gray';
  className?: string;
}

export const InlineSpinner: React.FC<InlineSpinnerProps> = ({
  size = 'md',
  color = 'orange',
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2',
    lg: 'w-8 h-8 border-[3px]',
  };

  const colorClasses = {
    orange: 'border-orange-500 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-400 dark:border-gray-500 border-t-transparent',
  };

  return (
    <div
      className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin ${className}`}
    />
  );
};

/**
 * Button Spinner - Spinner cho buttons
 * Size nhỏ, màu trắng (cho button có background)
 */
export interface ButtonSpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}

export const ButtonSpinner: React.FC<ButtonSpinnerProps> = ({
  size = 'sm',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-2 border-white border-t-transparent rounded-full animate-spin ${className}`}
    />
);
};

/**
 * Button Loading - Full button loading với text
 * Professional & Beautiful với animation phức tạp
 * Sử dụng cho các button quan trọng (Login, Submit, etc.)
 */
export const ButtonLoading: React.FC = () => (
  <div className='flex items-center justify-center space-x-3 animate-pulse'>
    <div className='relative'>
      {/* Ripple effect background */}
      <div className='absolute inset-0 w-6 h-6 border-2 border-orange-400/20 rounded-full animate-ping'></div>
      {/* Outer glow ring with orange theme */}
      <div className='w-6 h-6 border-2 border-orange-300/30 rounded-full animate-spin shadow-lg shadow-orange-500/20'></div>
      {/* Main spinning ring with gradient */}
      <div
        className='absolute top-0 left-0 w-6 h-6 border-2 border-transparent rounded-full animate-spin shadow-lg'
        style={{
          animationDuration: '1s',
          borderTopColor: '#ffffff',
          borderRightColor: 'rgba(255, 255, 255, 0.8)',
          boxShadow: '0 0 12px rgba(249, 115, 22, 0.4), 0 0 24px rgba(249, 115, 22, 0.2)',
        }}
      ></div>
      {/* Inner fast ring with orange accent */}
      <div
        className='absolute top-0.5 left-0.5 w-5 h-5 border-2 border-transparent rounded-full animate-spin'
        style={{
          animationDuration: '0.6s',
          animationDirection: 'reverse',
          borderBottomColor: 'rgba(249, 115, 22, 0.6)',
          borderLeftColor: 'rgba(249, 115, 22, 0.4)',
        }}
      ></div>
      {/* Center pulsing dot with orange glow */}
      <div
        className='absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse shadow-lg'
        style={{
          animationDuration: '1.2s',
          boxShadow:
            '0 0 8px rgba(255, 255, 255, 0.9), 0 0 16px rgba(249, 115, 22, 0.3), 0 0 24px rgba(249, 115, 22, 0.1)',
        }}
      ></div>
    </div>
    <span className='font-semibold text-sm animate-pulse tracking-wide drop-shadow-lg bg-gradient-to-r from-white to-orange-100 bg-clip-text text-transparent font-space-grotesk'>
      Đang xử lý...
    </span>
  </div>
);

/**
 * Search Loading - Loading cho Search Modal với AI
 */
export const SearchLoading: React.FC = () => (
  <Loading text='AI đang phân tích...' color='#f97316' />
);

/**
 * Simple Loading - Không có backdrop, để tái sử dụng inline
 * Sử dụng cho các trường hợp cần loading nhưng không muốn block toàn bộ UI
 */
export const SimpleLoading: React.FC<LoadingProps> = ({
  size = 'medium',
  text = '',
  color = '#f97316',
  className = '',
  textColor = '#374151',
}) => {
  const getSizeValue = () => {
    switch (size) {
      case 'small':
        return 'small';
      case 'large':
        return 'large';
      default: // medium
        return 'medium';
    }
  };

  return (
    <div
      className={`simple-loading-container font-space-grotesk ${className}`}
      style={{ textAlign: 'center' }}
    >
      <BlinkBlur color={color} size={getSizeValue()} text={text} textColor={textColor} />
      <style>{`
        .simple-loading-container * {
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        }
      `}</style>
    </div>
  );
};
