import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AdminButton from './AdminButton';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  showItemsPerPage?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50, 100],
  showItemsPerPage = true,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className='flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50'>
      {/* Items info */}
      <div className='text-sm text-gray-600 dark:text-gray-400 font-inter'>
        Hiển thị <span className='font-medium text-gray-900 dark:text-white'>{startItem}</span> đến{' '}
        <span className='font-medium text-gray-900 dark:text-white'>{endItem}</span> trong tổng số{' '}
        <span className='font-medium text-gray-900 dark:text-white'>{totalItems}</span> mục
      </div>

      <div className='flex items-center gap-4'>
        {/* Items per page */}
        {showItemsPerPage && onItemsPerPageChange && (
          <div className='flex items-center gap-2'>
            <label className='text-sm text-gray-600 dark:text-gray-400 font-inter'>
              Hiển thị:
            </label>
            <select
              value={itemsPerPage}
              onChange={e => onItemsPerPageChange(Number(e.target.value))}
              className='px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 font-inter'
            >
              {itemsPerPageOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page navigation */}
        <div className='flex items-center gap-1'>
          <AdminButton
            variant='outline'
            size='sm'
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            icon={ChevronLeft}
            iconPosition='left'
          >
            Trước
          </AdminButton>

          <div className='flex items-center gap-1 mx-2'>
            {getPageNumbers().map((page, index) => {
              if (page === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className='px-2 py-1 text-sm text-gray-500 dark:text-gray-400 font-inter'
                  >
                    ...
                  </span>
                );
              }

              const pageNum = page as number;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors duration-200 font-inter ${
                    currentPage === pageNum
                      ? 'bg-orange-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <AdminButton
            variant='outline'
            size='sm'
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            icon={ChevronRight}
            iconPosition='right'
          >
            Sau
          </AdminButton>
        </div>
      </div>
    </div>
  );
};

export default Pagination;

