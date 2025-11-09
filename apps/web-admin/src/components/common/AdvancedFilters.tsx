import React, { useState } from 'react';
import { Calendar, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import AdminCard from './AdminCard';
import AdminButton from './AdminButton';
import AdminInput from './AdminInput';

interface AdvancedFiltersProps {
  filters: {
    dateRange?: {
      from?: string;
      to?: string;
    };
    status?: string;
    category?: string;
    search?: string;
    customFilters?: Record<string, any>;
  };
  onFiltersChange: (filters: any) => void;
  onReset?: () => void;
  availableStatuses?: Array<{ value: string; label: string }>;
  availableCategories?: Array<{ value: string; label: string }>;
  showDateRange?: boolean;
  showStatus?: boolean;
  showCategory?: boolean;
  showSearch?: boolean;
  customFilterFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'date';
    options?: Array<{ value: string; label: string }>;
  }>;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  availableStatuses = [],
  availableCategories = [],
  showDateRange = true,
  showStatus = true,
  showCategory = true,
  showSearch = true,
  customFilterFields = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...localFilters };
    
    if (key.startsWith('dateRange.')) {
      const dateKey = key.split('.')[1];
      newFilters.dateRange = {
        ...newFilters.dateRange,
        [dateKey]: value,
      };
    } else if (key.startsWith('custom.')) {
      const customKey = key.split('.')[1];
      newFilters.customFilters = {
        ...newFilters.customFilters,
        [customKey]: value,
      };
    } else {
      newFilters[key] = value;
    }
    
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: any = {
      dateRange: { from: '', to: '' },
      status: '',
      category: '',
      search: '',
      customFilters: {},
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    if (onReset) {
      onReset();
    }
  };

  const hasActiveFilters = () => {
    return !!(
      localFilters.dateRange?.from ||
      localFilters.dateRange?.to ||
      localFilters.status ||
      localFilters.category ||
      localFilters.search ||
      (localFilters.customFilters && Object.keys(localFilters.customFilters).length > 0)
    );
  };

  return (
    <AdminCard>
      <div className='space-y-4'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Filter className='w-5 h-5 text-gray-600 dark:text-gray-400' />
            <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
              Bộ lọc nâng cao
            </h3>
            {hasActiveFilters() && (
              <span className='px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs rounded-full font-inter'>
                Đang lọc
              </span>
            )}
          </div>
          <div className='flex items-center gap-2'>
            {hasActiveFilters() && (
              <AdminButton
                variant='outline'
                size='sm'
                icon={X}
                onClick={handleReset}
              >
                Xóa bộ lọc
              </AdminButton>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
            >
              {isExpanded ? (
                <ChevronUp className='w-5 h-5 text-gray-600 dark:text-gray-400' />
              ) : (
                <ChevronDown className='w-5 h-5 text-gray-600 dark:text-gray-400' />
              )}
            </button>
          </div>
        </div>

        {/* Quick Filters (Always Visible) */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {showSearch && (
            <AdminInput
              icon={Filter}
              iconPosition='left'
              placeholder='Tìm kiếm...'
              value={localFilters.search || ''}
              onChange={e => handleFilterChange('search', e.target.value)}
              className='w-full'
            />
          )}

          {showStatus && availableStatuses.length > 0 && (
            <select
              value={localFilters.status || ''}
              onChange={e => handleFilterChange('status', e.target.value)}
              className='px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 font-inter'
            >
              <option value=''>Tất cả trạng thái</option>
              {availableStatuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          )}

          {showCategory && availableCategories.length > 0 && (
            <select
              value={localFilters.category || ''}
              onChange={e => handleFilterChange('category', e.target.value)}
              className='px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 font-inter'
            >
              <option value=''>Tất cả danh mục</option>
              {availableCategories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className='border-t border-gray-200 dark:border-gray-800 pt-4 space-y-4'>
            {showDateRange && (
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
                  <Calendar className='inline w-4 h-4 mr-1' />
                  Khoảng thời gian
                </label>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <input
                      type='date'
                      value={localFilters.dateRange?.from || ''}
                      onChange={e => handleFilterChange('dateRange.from', e.target.value)}
                      className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 font-inter'
                      placeholder='Từ ngày'
                    />
                  </div>
                  <div>
                    <input
                      type='date'
                      value={localFilters.dateRange?.to || ''}
                      onChange={e => handleFilterChange('dateRange.to', e.target.value)}
                      className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 font-inter'
                      placeholder='Đến ngày'
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Custom Filter Fields */}
            {customFilterFields.length > 0 && (
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
                  Bộ lọc tùy chỉnh
                </label>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {customFilterFields.map(field => (
                    <div key={field.key}>
                      {field.type === 'text' && (
                        <AdminInput
                          label={field.label}
                          value={localFilters.customFilters?.[field.key] || ''}
                          onChange={e => handleFilterChange(`custom.${field.key}`, e.target.value)}
                        />
                      )}
                      {field.type === 'number' && (
                        <AdminInput
                          label={field.label}
                          type='number'
                          value={localFilters.customFilters?.[field.key] || ''}
                          onChange={e => handleFilterChange(`custom.${field.key}`, e.target.value)}
                        />
                      )}
                      {field.type === 'select' && field.options && (
                        <div>
                          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
                            {field.label}
                          </label>
                          <select
                            value={localFilters.customFilters?.[field.key] || ''}
                            onChange={e => handleFilterChange(`custom.${field.key}`, e.target.value)}
                            className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 font-inter'
                          >
                            <option value=''>Tất cả</option>
                            {field.options.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {field.type === 'date' && (
                        <div>
                          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
                            {field.label}
                          </label>
                          <input
                            type='date'
                            value={localFilters.customFilters?.[field.key] || ''}
                            onChange={e => handleFilterChange(`custom.${field.key}`, e.target.value)}
                            className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 font-inter'
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Filters Summary */}
            {hasActiveFilters() && (
              <div className='flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-800'>
                <span className='text-sm font-medium text-gray-700 dark:text-gray-300 font-inter'>
                  Bộ lọc đang áp dụng:
                </span>
                {localFilters.dateRange?.from && (
                  <span className='px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full font-inter'>
                    Từ: {new Date(localFilters.dateRange.from).toLocaleDateString('vi-VN')}
                  </span>
                )}
                {localFilters.dateRange?.to && (
                  <span className='px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full font-inter'>
                    Đến: {new Date(localFilters.dateRange.to).toLocaleDateString('vi-VN')}
                  </span>
                )}
                {localFilters.status && (
                  <span className='px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs rounded-full font-inter'>
                    Trạng thái: {availableStatuses.find(s => s.value === localFilters.status)?.label || localFilters.status}
                  </span>
                )}
                {localFilters.category && (
                  <span className='px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded-full font-inter'>
                    Danh mục: {availableCategories.find(c => c.value === localFilters.category)?.label || localFilters.category}
                  </span>
                )}
                {localFilters.search && (
                  <span className='px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 text-xs rounded-full font-inter'>
                    Tìm: {localFilters.search}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminCard>
  );
};

export default AdvancedFilters;

