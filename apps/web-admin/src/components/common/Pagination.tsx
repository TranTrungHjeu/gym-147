import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  const handlePageChange = (page: number) => {
    onPageChange(page);
    // Smooth scroll to top of table with a small delay to allow state update
    setTimeout(() => {
      const tableElement = document.querySelector('.admin-table-container, .admin-card, table');
      if (tableElement) {
        tableElement.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      } else {
        // Fallback: scroll to top of page
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  return (
    <div className='flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50'>
      {/* Items info */}
      <div className='text-sm text-gray-600 dark:text-gray-400 font-heading'>
        Hiển thị <span className='font-medium text-gray-900 dark:text-white'>{startItem}</span> đến{' '}
        <span className='font-medium text-gray-900 dark:text-white'>{endItem}</span> trong tổng số{' '}
        <span className='font-medium text-gray-900 dark:text-white'>{totalItems}</span> mục
      </div>

      <div className='flex items-center gap-4'>
        {/* Items per page */}
        {showItemsPerPage && onItemsPerPageChange && (
          <div className='flex items-center gap-2'>
            <label className='text-sm text-gray-600 dark:text-gray-400 font-heading'>
              Hiển thị:
            </label>
            <select
              value={itemsPerPage}
              onChange={e => onItemsPerPageChange(Number(e.target.value))}
              className='px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 font-heading'
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
        <div className='flex items-center gap-2'>
          {/* Previous Button */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-semibold font-heading rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-gray-300 ${
              currentPage === 1
                ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-400 dark:hover:border-orange-600 hover:text-orange-600 dark:hover:text-orange-400 shadow-sm hover:shadow-md active:scale-95'
            }`}
          >
            <ChevronLeft className='w-4 h-4' />
            <span>Trước</span>
          </button>

          {/* Page Numbers */}
          <div className='flex items-center gap-1 mx-1'>
            {getPageNumbers().map((page, index) => {
              if (page === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className='px-2 py-1 text-sm text-gray-500 dark:text-gray-400 font-heading'
                  >
                    ...
                  </span>
                );
              }

              const pageNum = page as number;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3.5 py-2 text-sm font-semibold font-heading rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:ring-offset-1 ${
                    currentPage === pageNum
                      ? 'bg-orange-600 text-white shadow-md hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:text-orange-600 dark:hover:text-orange-400 shadow-sm hover:shadow-md active:scale-95'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-semibold font-heading rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-gray-300 ${
              currentPage === totalPages
                ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-400 dark:hover:border-orange-600 hover:text-orange-600 dark:hover:text-orange-400 shadow-sm hover:shadow-md active:scale-95'
            }`}
          >
            <span>Sau</span>
            <ChevronRight className='w-4 h-4' />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;

