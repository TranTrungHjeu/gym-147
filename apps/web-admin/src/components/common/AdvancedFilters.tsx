import React, { useState } from 'react';
import { Filter, X } from 'lucide-react';
import useTranslation from '../../hooks/useTranslation';
import AdminCard from './AdminCard';
import AdminButton from './AdminButton';
import AdminInput from './AdminInput';
import CustomSelect from './CustomSelect';
import DatePicker from './DatePicker';

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
  const { t } = useTranslation();
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
    // Check if any filter has a meaningful value (not empty string or 'all')
    const hasDateRange = !!(localFilters.dateRange?.from || localFilters.dateRange?.to);
    const hasStatus = !!(localFilters.status && localFilters.status !== 'all' && localFilters.status !== '');
    const hasCategory = !!(localFilters.category && localFilters.category !== 'all' && localFilters.category !== '');
    const hasSearch = !!(localFilters.search && localFilters.search.trim() !== '');
    const hasCustomFilters = !!(localFilters.customFilters && 
      Object.keys(localFilters.customFilters).some(key => {
        const value = localFilters.customFilters[key];
        return value !== '' && value !== 'all' && value !== null && value !== undefined;
      })
    );
    
    return hasDateRange || hasStatus || hasCategory || hasSearch || hasCustomFilters;
  };

  // Date pickers are now handled by DatePicker component
  // Removed flatpickr initialization
  /*
  useEffect(() => {
    if (!showDateRange) {
      // Clean up when date range is not shown
      if (fromDateFlatpickrRef.current) {
        fromDateFlatpickrRef.current.destroy();
        fromDateFlatpickrRef.current = null;
      }
      if (toDateFlatpickrRef.current) {
        toDateFlatpickrRef.current.destroy();
        toDateFlatpickrRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      // Initialize from date picker
      if (fromDatePickerRef.current && !fromDateFlatpickrRef.current) {
        const fp = flatpickr(fromDatePickerRef.current, {
          dateFormat: 'Y-m-d',
          altFormat: 'd/m/Y',
          altInput: true,
          allowInput: true,
          clickOpens: true,
          static: false,
          inline: false,
          appendTo: document.body,
          enableTime: false,
          defaultDate: localFilters.dateRange?.from || undefined,
          locale: {
            firstDayOfWeek: 1,
            weekdays: {
              shorthand: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
              longhand: [
                'Chủ nhật',
                'Thứ hai',
                'Thứ ba',
                'Thứ tư',
                'Thứ năm',
                'Thứ sáu',
                'Thứ bảy',
              ],
            },
            months: {
              shorthand: [
                'T1',
                'T2',
                'T3',
                'T4',
                'T5',
                'T6',
                'T7',
                'T8',
                'T9',
                'T10',
                'T11',
                'T12',
              ],
              longhand: [
                'Tháng 1',
                'Tháng 2',
                'Tháng 3',
                'Tháng 4',
                'Tháng 5',
                'Tháng 6',
                'Tháng 7',
                'Tháng 8',
                'Tháng 9',
                'Tháng 10',
                'Tháng 11',
                'Tháng 12',
              ],
            },
          },
          onChange: selectedDates => {
            if (selectedDates.length > 0) {
              const date = selectedDates[0];
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const selectedDateISO = `${year}-${month}-${day}`;
              handleFilterChange('dateRange.from', selectedDateISO);
            } else {
              handleFilterChange('dateRange.from', '');
            }
          },
        });
        fromDateFlatpickrRef.current = Array.isArray(fp) ? fp[0] : fp;
      } else if (fromDateFlatpickrRef.current && localFilters.dateRange?.from) {
        // Update existing flatpickr instance
        fromDateFlatpickrRef.current.setDate(localFilters.dateRange.from, false);
      } else if (fromDateFlatpickrRef.current && !localFilters.dateRange?.from) {
        // Clear if no date
        fromDateFlatpickrRef.current.clear();
      }

      // Initialize to date picker
      if (toDatePickerRef.current && !toDateFlatpickrRef.current) {
        const fp = flatpickr(toDatePickerRef.current, {
          dateFormat: 'Y-m-d',
          altFormat: 'd/m/Y',
          altInput: true,
          allowInput: true,
          clickOpens: true,
          static: false,
          inline: false,
          appendTo: document.body,
          enableTime: false,
          defaultDate: localFilters.dateRange?.to || undefined,
          locale: {
            firstDayOfWeek: 1,
            weekdays: {
              shorthand: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
              longhand: [
                'Chủ nhật',
                'Thứ hai',
                'Thứ ba',
                'Thứ tư',
                'Thứ năm',
                'Thứ sáu',
                'Thứ bảy',
              ],
            },
            months: {
              shorthand: [
                'T1',
                'T2',
                'T3',
                'T4',
                'T5',
                'T6',
                'T7',
                'T8',
                'T9',
                'T10',
                'T11',
                'T12',
              ],
              longhand: [
                'Tháng 1',
                'Tháng 2',
                'Tháng 3',
                'Tháng 4',
                'Tháng 5',
                'Tháng 6',
                'Tháng 7',
                'Tháng 8',
                'Tháng 9',
                'Tháng 10',
                'Tháng 11',
                'Tháng 12',
              ],
            },
          },
          onChange: selectedDates => {
            if (selectedDates.length > 0) {
              const date = selectedDates[0];
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const selectedDateISO = `${year}-${month}-${day}`;
              handleFilterChange('dateRange.to', selectedDateISO);
            } else {
              handleFilterChange('dateRange.to', '');
            }
          },
        });
        toDateFlatpickrRef.current = Array.isArray(fp) ? fp[0] : fp;
      } else if (toDateFlatpickrRef.current && localFilters.dateRange?.to) {
        // Update existing flatpickr instance
        toDateFlatpickrRef.current.setDate(localFilters.dateRange.to, false);
      } else if (toDateFlatpickrRef.current && !localFilters.dateRange?.to) {
        // Clear if no date
        toDateFlatpickrRef.current.clear();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (fromDateFlatpickrRef.current) {
        fromDateFlatpickrRef.current.destroy();
        fromDateFlatpickrRef.current = null;
      }
      if (toDateFlatpickrRef.current) {
        toDateFlatpickrRef.current.destroy();
        toDateFlatpickrRef.current = null;
      }
    };
  }, [showDateRange]);
  */

  return (
    <>
      {/* Custom styles for compact professional flatpickr with orange theme */}
      <style>{`
        /* Compact Professional Flatpickr Calendar - Orange Theme */
        .flatpickr-calendar {
          font-family: 'Inter', sans-serif !important;
          font-size: 11px !important;
          border-radius: 10px !important;
          border: 1px solid rgba(249, 115, 22, 0.25) !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(249, 115, 22, 0.05) !important;
          background: #ffffff !important;
          overflow: hidden !important;
          width: 340px !important;
          padding: 10px !important;
          backdrop-filter: blur(10px) !important;
        }
        
        .dark .flatpickr-calendar {
          background: #1f2937 !important;
          border-color: rgba(249, 115, 22, 0.3) !important;
        }
        
        /* Month Header - Compact with Gradient */
        .flatpickr-months {
          padding: 8px 12px !important;
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%) !important;
          border-bottom: 1px solid rgba(249, 115, 22, 0.2) !important;
          margin-bottom: 6px !important;
          border-radius: 8px 8px 0 0 !important;
        }
        
        .dark .flatpickr-months {
          background: linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%) !important;
          border-bottom-color: rgba(249, 115, 22, 0.3) !important;
        }
        
        .flatpickr-current-month {
          font-size: 11px !important;
          font-weight: 700 !important;
          font-family: 'Inter', sans-serif !important;
          padding: 2px 0 !important;
        }
        
        .flatpickr-current-month .cur-month,
        .flatpickr-current-month input.cur-year {
          font-size: 11px !important;
          font-weight: 700 !important;
          font-family: 'Inter', sans-serif !important;
          color: #9a3412 !important;
          padding: 2px 4px !important;
        }
        
        .dark .flatpickr-current-month .cur-month,
        .dark .flatpickr-current-month input.cur-year {
          color: #fed7aa !important;
        }
        
        /* Navigation Arrows - Compact */
        .flatpickr-prev-month,
        .flatpickr-next-month {
          padding: 3px !important;
          border-radius: 4px !important;
          transition: all 0.2s ease !important;
          width: 20px !important;
          height: 20px !important;
          top: 6px !important;
        }
        
        .flatpickr-prev-month:hover,
        .flatpickr-next-month:hover {
          background: rgba(249, 115, 22, 0.15) !important;
        }
        
        .flatpickr-prev-month svg,
        .flatpickr-next-month svg {
          width: 10px !important;
          height: 10px !important;
          fill: #9a3412 !important;
        }
        
        .dark .flatpickr-prev-month svg,
        .dark .flatpickr-next-month svg {
          fill: #fed7aa !important;
        }
        
        /* Weekdays - Compact */
        .flatpickr-weekdays {
          padding: 6px 4px 4px !important;
          background: #fff7ed !important;
          margin-top: 2px !important;
        }
        
        .dark .flatpickr-weekdays {
          background: #7c2d12 !important;
        }
        
        .flatpickr-weekday {
          font-size: 9px !important;
          font-weight: 700 !important;
          font-family: 'Inter', sans-serif !important;
          color: #9a3412 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.3px !important;
          padding: 4px 0 !important;
        }
        
        .dark .flatpickr-weekday {
          color: #fed7aa !important;
        }
        
        /* Days Container - Compact */
        .flatpickr-days {
          padding: 4px 4px !important;
        }
        
        /* Individual Days - Compact */
        .flatpickr-day {
          font-size: 10px !important;
          font-family: 'Inter', sans-serif !important;
          height: 28px !important;
          line-height: 28px !important;
          border-radius: 6px !important;
          margin: 1.5px !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          font-weight: 500 !important;
          width: calc((100% - 21px) / 7) !important;
          color: #374151 !important;
          border: 1px solid transparent !important;
        }
        
        .dark .flatpickr-day {
          color: #f3f4f6 !important;
        }
        
        .flatpickr-day:hover {
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%) !important;
          border-color: #f97316 !important;
          color: #ea580c !important;
          transform: scale(1.08) translateY(-1px) !important;
          box-shadow: 0 2px 4px -1px rgba(249, 115, 22, 0.2) !important;
        }
        
        .dark .flatpickr-day:hover {
          background: linear-gradient(135deg, #9a3412 0%, #c2410c 100%) !important;
          border-color: #f97316 !important;
          color: #fed7aa !important;
          box-shadow: 0 2px 4px -1px rgba(249, 115, 22, 0.3) !important;
        }
        
        /* Selected Day - Gradient */
        .flatpickr-day.selected,
        .flatpickr-day.startRange,
        .flatpickr-day.endRange {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%) !important;
          border-color: #f97316 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          box-shadow: 0 4px 12px -2px rgba(249, 115, 22, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.1) !important;
          transform: scale(1.05) !important;
        }
        
        .flatpickr-day.selected:hover,
        .flatpickr-day.startRange:hover,
        .flatpickr-day.endRange:hover {
          background: linear-gradient(135deg, #ea580c 0%, #dc2626 50%, #c2410c 100%) !important;
          transform: scale(1.1) translateY(-1px) !important;
          box-shadow: 0 6px 16px -3px rgba(249, 115, 22, 0.6), 0 4px 6px -2px rgba(0, 0, 0, 0.15) !important;
        }
        
        /* Today - Compact */
        .flatpickr-day.today {
          border: 1.5px solid #f97316 !important;
          color: #f97316 !important;
          font-weight: 700 !important;
          background: #fff7ed !important;
        }
        
        .dark .flatpickr-day.today {
          background: #7c2d12 !important;
          border-color: #f97316 !important;
          color: #fed7aa !important;
        }
        
        .flatpickr-day.today:hover {
          background: #fff7ed !important;
          border-color: #ea580c !important;
          color: #ea580c !important;
        }
        
        .dark .flatpickr-day.today:hover {
          background: #9a3412 !important;
          border-color: #f97316 !important;
          color: #ffffff !important;
        }
        
        /* Disabled/Other Month Days */
        .flatpickr-day.flatpickr-disabled,
        .flatpickr-day.prevMonthDay,
        .flatpickr-day.nextMonthDay {
          color: #d1d5db !important;
          opacity: 0.4 !important;
          font-size: 9px !important;
        }
        
        .dark .flatpickr-day.flatpickr-disabled,
        .dark .flatpickr-day.prevMonthDay,
        .dark .flatpickr-day.nextMonthDay {
          color: #6b7280 !important;
        }
        
        /* Calendar inner container */
        .flatpickr-innerContainer {
          padding: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        
        .flatpickr-rContainer {
          width: 100% !important;
          box-sizing: border-box !important;
        }
        
        /* Reduce spacing */
        .flatpickr-month {
          height: 28px !important;
        }
        
        /* Ensure proper spacing for all elements */
        .flatpickr-calendar .flatpickr-weekdays {
          margin-bottom: 2px !important;
        }
        
        .flatpickr-calendar .flatpickr-days {
          min-height: 200px !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        
        /* Arrow styling */
        .flatpickr-calendar.arrowTop:before,
        .flatpickr-calendar.arrowTop:after {
          border-bottom-color: #ffffff !important;
        }
        
        .dark .flatpickr-calendar.arrowTop:before,
        .dark .flatpickr-calendar.arrowTop:after {
          border-bottom-color: #1f2937 !important;
        }
      `}</style>
      <AdminCard padding='sm'>
      <div className='space-y-2'>
        {/* Header */}
        <div className='flex items-center gap-1.5'>
          <Filter className='w-3.5 h-3.5 text-gray-600 dark:text-gray-400' />
          <h3 className='text-xs font-semibold font-heading text-gray-900 dark:text-white'>
            {t('advancedFilters.title')}
            </h3>
          {/* Badge with fixed size to prevent layout shift */}
          <div className='h-[18px] min-w-[60px] flex items-center'>
            {hasActiveFilters() && (
              <span className='px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-[10px] rounded-full font-inter whitespace-nowrap'>
                {t('advancedFilters.filtering')}
              </span>
            )}
          </div>
        </div>

        {/* All Filters in One Row */}
        <div className='flex flex-wrap items-end gap-2'>
          {showSearch && (
            <div className='flex-1 min-w-[200px]'>
            <AdminInput
              icon={Filter}
              iconPosition='left'
              placeholder={t('advancedFilters.searchPlaceholder')}
              value={localFilters.search || ''}
              onChange={e => handleFilterChange('search', e.target.value)}
                className='w-full text-[11px]'
              />
            </div>
          )}

          {showCategory && availableCategories.length > 0 && (
            <div className='w-[180px] h-[30px] flex-shrink-0'>
              <CustomSelect
                options={[
                  { value: '', label: t('advancedFilters.allCategories') },
                  ...availableCategories,
                ]}
              value={localFilters.category || ''}
                onChange={value => handleFilterChange('category', value)}
                placeholder={t('advancedFilters.allCategories')}
                className='font-inter h-[30px]'
              />
            </div>
          )}

          {showStatus && availableStatuses.length > 0 && (
            <div className='w-[180px] h-[30px] flex-shrink-0'>
              <CustomSelect
                options={[
                  { value: '', label: t('advancedFilters.allStatuses') },
                  ...availableStatuses,
                ]}
                value={localFilters.status || ''}
                onChange={value => handleFilterChange('status', value)}
                placeholder={t('advancedFilters.allStatuses')}
                className='font-inter h-[30px]'
              />
              </div>
            )}

            {/* Custom Filter Fields */}
                  {customFilterFields.map(field => (
            <div key={field.key} className='w-[160px]'>
                      {field.type === 'text' && (
                        <AdminInput
                          label={field.label}
                          value={localFilters.customFilters?.[field.key] || ''}
                          onChange={e => handleFilterChange(`custom.${field.key}`, e.target.value)}
                  className='text-[11px]'
                        />
                      )}
                      {field.type === 'number' && (
                        <AdminInput
                          label={field.label}
                          type='number'
                          value={localFilters.customFilters?.[field.key] || ''}
                          onChange={e => handleFilterChange(`custom.${field.key}`, e.target.value)}
                  className='text-[11px]'
                        />
                      )}
                      {field.type === 'select' && field.options && (
                <CustomSelect
                  options={[
                    { value: '', label: t('advancedFilters.allField', { field: field.label.toLowerCase() }) },
                    ...field.options,
                  ]}
                            value={localFilters.customFilters?.[field.key] || ''}
                  onChange={value => handleFilterChange(`custom.${field.key}`, value)}
                  placeholder={field.label}
                  className='font-inter'
                />
                      )}
                      {field.type === 'date' && (
                <AdminInput
                  label={field.label}
                            type='date'
                            value={localFilters.customFilters?.[field.key] || ''}
                            onChange={e => handleFilterChange(`custom.${field.key}`, e.target.value)}
                  className='text-[11px]'
                          />
                      )}
                    </div>
                  ))}

          {/* Date Range */}
          {showDateRange && (
            <>
              <div className='w-[140px] flex flex-col flex-shrink-0'>
                <label className='text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
                  {t('advancedFilters.fromDate')}
                </label>
                <DatePicker
                  value={localFilters.dateRange?.from}
                  onChange={(date) => {
                    if (typeof date === 'string') {
                      handleFilterChange('dateRange.from', date);
                    } else {
                      handleFilterChange('dateRange.from', '');
                    }
                  }}
                  placeholder='dd/mm/yyyy'
                  mode='single'
                />
              </div>
              <div className='w-[140px] flex flex-col flex-shrink-0'>
                <label className='text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
                  {t('advancedFilters.toDate')}
                </label>
                <DatePicker
                  value={localFilters.dateRange?.to}
                  onChange={(date) => {
                    if (typeof date === 'string') {
                      handleFilterChange('dateRange.to', date);
                    } else {
                      handleFilterChange('dateRange.to', '');
                    }
                  }}
                  placeholder='dd/mm/yyyy'
                  mode='single'
                />
              </div>
            </>
          )}

          {/* Reset Button - Fixed size to prevent layout shift */}
          <div className='w-[80px] h-[30px] flex items-center justify-end flex-shrink-0'>
            <AdminButton
              variant='outline'
              size='sm'
              icon={X}
              onClick={handleReset}
              disabled={!hasActiveFilters()}
              className='text-[10px] px-2 py-1 h-[30px] min-w-[80px] w-[80px] flex-shrink-0 transition-opacity duration-200'
              style={{
                opacity: hasActiveFilters() ? 1 : 0,
                pointerEvents: hasActiveFilters() ? 'auto' : 'none',
                visibility: 'visible',
              }}
            >
              {t('advancedFilters.clear')}
            </AdminButton>
          </div>
        </div>
      </div>
    </AdminCard>
    </>
  );
};

export default AdvancedFilters;

