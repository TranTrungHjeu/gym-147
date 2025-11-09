import React from 'react';
import { CheckSquare, Square, Trash2, Edit, MoreVertical } from 'lucide-react';
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

  const handleSelectAll = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  if (selectedItems.length === 0) {
    return (
      <div className='flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50'>
        <button
          onClick={handleSelectAll}
          className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
          title={allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        >
          {allSelected ? (
            <CheckSquare className='w-5 h-5 text-orange-600 dark:text-orange-400' />
          ) : (
            <Square className='w-5 h-5 text-gray-400 dark:text-gray-500' />
          )}
        </button>
        <span className='text-sm text-gray-600 dark:text-gray-400 font-inter'>
          {totalItems} mục
        </span>
      </div>
    );
  }

  return (
    <div className='flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-orange-50 dark:bg-orange-900/20'>
      <div className='flex items-center gap-3'>
        <button
          onClick={handleSelectAll}
          className='p-2 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors'
          title={allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        >
          {allSelected ? (
            <CheckSquare className='w-5 h-5 text-orange-600 dark:text-orange-400' />
          ) : (
            <Square className='w-5 h-5 text-orange-600 dark:text-orange-400' />
          )}
        </button>
        <span className='text-sm font-medium text-gray-900 dark:text-white font-inter'>
          Đã chọn {selectedItems.length} / {totalItems} mục
        </span>
        {someSelected && (
          <button
            onClick={onDeselectAll}
            className='text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-inter'
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
          >
            Xóa ({selectedItems.length})
          </AdminButton>
        )}
      </div>
    </div>
  );
};

export default BulkOperations;

