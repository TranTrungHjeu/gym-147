import { gsap } from 'gsap';
import { Edit, LucideIcon, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import AdminButton from './AdminButton';

interface BulkOperationsProps {
  selectedItems: string[];
  totalItems: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete?: () => void;
  onBulkEdit?: () => void;
  bulkActions?: Array<{
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  }>;
}

// Animated counter component
const AnimatedCounter: React.FC<{ count: number }> = ({ count }) => {
  const counterRef = useRef<HTMLSpanElement>(null);
  const [displayCount, setDisplayCount] = useState(count);

  useEffect(() => {
    if (!counterRef.current) return;

    const element = counterRef.current;

    // Animate scale and number change
    gsap.to(element, {
      scale: 1.3,
      duration: 0.2,
      ease: 'power2.out',
      onComplete: () => {
        setDisplayCount(count);
        gsap.to(element, {
          scale: 1,
          duration: 0.3,
          ease: 'elastic.out(1, 0.5)',
        });
      },
    });
  }, [count]);

  return (
    <span ref={counterRef} className='inline-block'>
      {displayCount}
    </span>
  );
};

const BulkOperations: React.FC<BulkOperationsProps> = ({
  selectedItems,
  totalItems,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkEdit,
  bulkActions = [],
}) => {
  const allSelected = selectedItems.length === totalItems && totalItems > 0;
  const someSelected = selectedItems.length > 0 && selectedItems.length < totalItems;
  const buttonsRef = useRef<HTMLDivElement>(null);
  const deselectBtnRef = useRef<HTMLButtonElement>(null);
  const hasAnimatedButtons = useRef(false);

  // Reset animation flag when selections are cleared
  useEffect(() => {
    if (selectedItems.length === 0) {
      hasAnimatedButtons.current = false;
    }
  }, [selectedItems.length]);

  // Smooth buttons animation - ONLY on first selection
  useEffect(() => {
    if (selectedItems.length === 0 || !buttonsRef.current) return;

    // Skip if buttons already animated
    if (hasAnimatedButtons.current) return;

    const buttons = buttonsRef.current.querySelectorAll('button');
    if (!buttons.length) return;

    // Mark as animated
    hasAnimatedButtons.current = true;

    // Kill any existing animations
    gsap.killTweensOf(buttons);

    // Set initial state with hardware acceleration
    gsap.set(buttons, {
      willChange: 'transform, opacity',
    });

    // Animate buttons in with smooth elastic easing
    const tl = gsap.timeline();

    tl.fromTo(
      buttons,
      {
        opacity: 0,
        scale: 0.85,
        y: -8,
        rotationX: -15,
      },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        rotationX: 0,
        duration: 0.6,
        stagger: {
          amount: 0.15,
          ease: 'power2.out',
        },
        ease: 'elastic.out(1, 0.75)',
        clearProps: 'willChange',
      }
    );

    // Animate deselect button if exists
    if (deselectBtnRef.current && someSelected) {
      gsap.fromTo(
        deselectBtnRef.current,
        {
          opacity: 0,
          x: -15,
          scale: 0.9,
        },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.5,
          ease: 'power3.out',
        }
      );
    }

    return () => {
      tl.kill();
    };
  }, [selectedItems.length, someSelected]);

  if (selectedItems.length === 0) {
    return (
      <div className='flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 h-[52px]'>
        <div className='flex items-center gap-2'>
          <span
            className='text-sm text-gray-600 dark:text-gray-400 font-heading'
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {totalItems} mục
          </span>
        </div>
        <div className='flex items-center gap-2 w-[120px]'>
          {/* Placeholder để giữ không gian cho button Xóa */}
        </div>
      </div>
    );
  }

  return (
    <div className='flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-orange-50 dark:bg-orange-900/20 h-[52px]'>
      <div className='flex items-center gap-3'>
        <span
          className='text-sm font-medium text-gray-900 dark:text-white font-heading'
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          Đã chọn <AnimatedCounter count={selectedItems.length} /> /{' '}
          <AnimatedCounter count={totalItems} /> mục
        </span>
        {someSelected && (
          <button
            ref={deselectBtnRef}
            onClick={onDeselectAll}
            className='text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-heading transition-colors duration-200'
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Bỏ chọn tất cả
          </button>
        )}
      </div>

      <div ref={buttonsRef} className='flex items-center gap-2'>
        {bulkActions.map((action, index) => (
          <AdminButton
            key={index}
            variant={action.variant || 'secondary'}
            size='sm'
            icon={action.icon}
            onClick={action.onClick}
          >
            {action.label}
          </AdminButton>
        ))}
        {onBulkEdit && (
          <AdminButton variant='outline' size='sm' icon={Edit} onClick={onBulkEdit}>
            Sửa hàng loạt
          </AdminButton>
        )}
        {onBulkDelete && (
          <AdminButton variant='danger' size='sm' icon={Trash2} onClick={onBulkDelete}>
            Xóa (<AnimatedCounter count={selectedItems.length} />)
          </AdminButton>
        )}
      </div>
    </div>
  );
};

export default BulkOperations;
