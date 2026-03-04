import React from 'react';
import styled from '@emotion/styled';

export interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  color?: string;
  className?: string;
  showBackdrop?: boolean;
  textColor?: string;
}

const SpectrumLoader: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({ size = 'medium' }) => {
  const scale = size === 'small' ? 0.7 : size === 'large' ? 1.2 : 1;

  return (
    <StyledLoader style={{ transform: `scale(${scale})` }}>
      <div className='loader'>
        <svg height={0} width={0} viewBox='0 0 64 64' className='absolute'>
          <defs xmlns='http://www.w3.org/2000/svg'>
            <linearGradient gradientUnits='userSpaceOnUse' y2={2} x2={0} y1={62} x1={0} id='b'>
              <stop stopColor='#FDBA74' />
              <stop stopColor='#F97316' offset={1} />
            </linearGradient>
            <linearGradient gradientUnits='userSpaceOnUse' y2={0} x2={0} y1={64} x1={0} id='c'>
              <stop stopColor='#FB923C' />
              <stop stopColor='#EA580C' offset={1} />
              <animateTransform
                repeatCount='indefinite'
                keySplines='.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1'
                keyTimes='0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1'
                dur='8s'
                values='0 22 27;-270 22 27;-270 22 27;-540 22 27;-540 22 27;-810 22 27;-810 22 27;-1080 22 27;-1080 22 27'
                type='rotate'
                attributeName='gradientTransform'
              />
            </linearGradient>
            <linearGradient gradientUnits='userSpaceOnUse' y2={2} x2={0} y1={62} x1={0} id='d'>
              <stop stopColor='#FED7AA' />
              <stop stopColor='#F97316' offset={1} />
            </linearGradient>
          </defs>
        </svg>

        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 96 54' height={64} width={122} className='inline-block'>
          <path
            strokeLinejoin='round'
            strokeLinecap='round'
            strokeWidth={5}
            stroke='url(#b)'
            d='M10 10 L20 4 L20 50'
            className='dash'
            pathLength={360}
          />
          <path
            strokeLinejoin='round'
            strokeLinecap='round'
            strokeWidth={5}
            stroke='url(#c)'
            d='M34 4 L34 30 M34 30 L56 30 M56 4 L56 50'
            className='dash'
            pathLength={360}
          />
          <path
            strokeLinejoin='round'
            strokeLinecap='round'
            strokeWidth={5}
            stroke='url(#d)'
            d='M70 6 L90 6 L78 50'
            className='dash'
            pathLength={360}
          />
        </svg>
      </div>
    </StyledLoader>
  );
};

/**
 * Base Loading Component với backdrop
 * Sử dụng BlinkBlur từ react-loading-indicators
 */
export const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  className = '',
  showBackdrop = true,
}) => {
  return (
    <>
      {showBackdrop && (
        <div className='fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999] flex items-center justify-center'>
          <div className={`font-space-grotesk text-center ${className}`}>
            <SpectrumLoader size={size} />
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
  <div className='fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999] flex items-center justify-center'>
    <div className='flex flex-col items-center justify-center'>
      <SpectrumLoader size='medium' />
    </div>
  </div>
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
  text = '',
  className = '',
}) => (
  <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 ${className}`}>
    <div className='flex flex-col items-center justify-center gap-3'>
      <div className='w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin' />
      {text && (
        <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
          {text}
        </div>
      )}
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
  <Loading />
);

/**
 * Simple Loading - Không có backdrop, để tái sử dụng inline
 * Sử dụng cho các trường hợp cần loading nhưng không muốn block toàn bộ UI
 */
export const SimpleLoading: React.FC<LoadingProps> = ({
  size = 'medium',
  className = '',
}) => {
  return (
    <div className={`font-space-grotesk text-center ${className}`}>
      <SpectrumLoader size={size} />
    </div>
  );
};

const StyledLoader = styled.div`
  .absolute {
    position: absolute;
  }

  .inline-block {
    display: inline-block;
  }

  .loader {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    margin: 0.25em 0;
  }

  .w-2 {
    width: 0.5em;
  }

  .dash {
    animation: dashArray 2s ease-in-out infinite, dashOffset 2s linear infinite;
  }

  @keyframes dashArray {
    0% {
      stroke-dasharray: 0 1 359 0;
    }

    50% {
      stroke-dasharray: 0 359 1 0;
    }

    100% {
      stroke-dasharray: 359 1 0 0;
    }
  }

  @keyframes dashOffset {
    0% {
      stroke-dashoffset: 365;
    }

    100% {
      stroke-dashoffset: 5;
    }
  }

`;
