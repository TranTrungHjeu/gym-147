import React, { useEffect, useRef } from 'react';
import { CheckSquare, Square, Trash2, Edit, MoreVertical } from 'lucide-react';
import { gsap } from 'gsap';
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
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  }>;
}

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
  const textRef = useRef<HTMLSpanElement>(null);

  const handleSelectAll = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  // Text animation when selectedItems changes
  useEffect(() => {
    if (selectedItems.length === 0 || !textRef.current) return;

    const element = textRef.current;
    if (!element || !element.isConnected) return;

    // Simple fade animation for text update
    const animation = gsap.to(element, {
      opacity: 0,
      duration: 0.15,
      onComplete: () => {
        if (element && element.isConnected) {
          // Text will be updated by React, then fade in
          gsap.to(element, {
            opacity: 1,
            duration: 0.3,
            ease: 'power2.out',
          });
        }
      },
    });

    return () => {
      // Cleanup animation on unmount or dependency change
      if (animation) {
        try {
          animation.kill();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [selectedItems.length, totalItems]);

  if (selectedItems.length === 0) {
    return (
      <div className='flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 h-[52px]'>
        <div className='flex items-center gap-2'>
          <span className='text-sm text-gray-600 dark:text-gray-400 font-heading' style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
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
          ref={textRef}
          className='text-sm font-medium text-gray-900 dark:text-white font-heading animate-button-slide-in' 
          style={{ fontFamily: 'Space Grotesk, sans-serif', animationDelay: '0.05s' }}
        >
          Đã chọn {selectedItems.length} / {totalItems} mục
        </span>
        {someSelected && (
          <button
            onClick={onDeselectAll}
            className='text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-heading animate-button-slide-in'
            style={{ fontFamily: 'Space Grotesk, sans-serif', animationDelay: '0.1s' }}
          >
            Bỏ chọn tất cả
          </button>
        )}
      </div>

      <div className='flex items-center gap-2'>
        {bulkActions.map((action, index) => (
          <AdminButton
            key={index}
            variant={action.variant || 'secondary'}
            size='sm'
            icon={action.icon}
            onClick={action.onClick}
            className='animate-button-slide-in'
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {action.label}
          </AdminButton>
        ))}
        {onBulkEdit && (
          <AdminButton
            variant='outline'
            size='sm'
            icon={Edit}
            onClick={onBulkEdit}
            className='animate-button-slide-in'
            style={{ animationDelay: `${bulkActions.length * 0.05}s` }}
          >
            Sửa hàng loạt
          </AdminButton>
        )}
        {onBulkDelete && (
          <AdminButton
            variant='danger'
            size='sm'
            icon={Trash2}
            onClick={onBulkDelete}
            className='animate-button-slide-in'
            style={{ animationDelay: `${(bulkActions.length + (onBulkEdit ? 1 : 0)) * 0.05}s` }}
          >
            Xóa ({selectedItems.length})
          </AdminButton>
        )}
      </div>
    </div>
  );
};

export default BulkOperations;

