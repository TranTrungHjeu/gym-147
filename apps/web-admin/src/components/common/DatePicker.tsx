import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import { Calendar } from 'lucide-react';
import { useEffect, useRef } from 'react';

export interface DatePickerProps {
  value?: string | Date | string[]; // YYYY-MM-DD format, Date object, or array for range/multiple
  onChange?: (value: string | string[]) => void;
  mode?: 'single' | 'range' | 'multiple' | 'time';
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  dateFormat?: string; // Display format, default: 'd/m/Y'
  time_24hr?: boolean; // For time mode
  allowInput?: boolean; // Default: true
  enableTime?: boolean; // Enable time picker
  noCalendar?: boolean; // For time-only mode
}

export default function DatePicker({
  value,
  onChange,
  mode = 'single',
  placeholder = 'Chọn ngày',
  disabled = false,
  minDate,
  maxDate,
  className = '',
  dateFormat = 'd/m/Y',
  time_24hr = true,
  allowInput = true,
  enableTime = false,
  noCalendar = false,
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const flatpickrInstanceRef = useRef<any>(null);

  // Convert value to Date or Date[] for flatpickr
  const getDateValue = (): Date | Date[] | undefined => {
    if (!value) return undefined;

    if (Array.isArray(value)) {
      return value
        .map((v: any) => {
          if (v instanceof Date) return v;
          const date = new Date(v);
          return isNaN(date.getTime()) ? undefined : date;
        })
        .filter(Boolean) as Date[];
    }

    if (value instanceof Date) {
      return isNaN(value.getTime()) ? undefined : value;
    }

    // String format YYYY-MM-DD
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  };

  // Initialize flatpickr
  useEffect(() => {
    if (!inputRef.current) {
      return;
    }

    // Destroy existing instance if any
    if (flatpickrInstanceRef.current) {
      flatpickrInstanceRef.current.destroy();
      flatpickrInstanceRef.current = null;
    }

    // Check if already has flatpickr instance and destroy it
    if ((inputRef.current as any)._flatpickr) {
      (inputRef.current as any)._flatpickr.destroy();
    }

    const dateValue = getDateValue();

    // Determine flatpickr mode
    let flatpickrMode: 'single' | 'multiple' | 'range' | 'time' = 'single';
    if (mode === 'range') {
      flatpickrMode = 'range';
    } else if (mode === 'multiple') {
      flatpickrMode = 'multiple';
    } else if (mode === 'time' || noCalendar) {
      flatpickrMode = 'time';
    }

    const fp = flatpickr(inputRef.current, {
      mode: flatpickrMode,
      dateFormat: dateFormat,
      altFormat: dateFormat,
      altInput: false,
      allowInput: allowInput,
      clickOpens: !disabled,
      static: false,
      inline: false,
      appendTo: document.body,
      defaultDate: dateValue,
      minDate: minDate,
      maxDate: maxDate,
      enableTime: enableTime || mode === 'time' || noCalendar,
      noCalendar: noCalendar || mode === 'time',
      time_24hr: time_24hr,
      locale: {
        firstDayOfWeek: 1, // Monday
        weekdays: {
          shorthand: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
          longhand: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
        },
        months: {
          shorthand: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
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
        if (!onChange) return;

        if (flatpickrMode === 'range') {
          if (selectedDates.length === 2) {
            const startDate = selectedDates[0];
            const endDate = selectedDates[1];
            const start = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(
              2,
              '0'
            )}-${String(startDate.getDate()).padStart(2, '0')}`;
            const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(
              2,
              '0'
            )}-${String(endDate.getDate()).padStart(2, '0')}`;
            onChange([start, end]);
          }
        } else if (flatpickrMode === 'multiple') {
          const dates = selectedDates.map(date => {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
              date.getDate()
            ).padStart(2, '0')}`;
          });
          onChange(dates);
        } else {
          // single or time
          if (selectedDates.length > 0) {
            const date = selectedDates[0];
            if (enableTime || mode === 'time' || noCalendar) {
              // Include time in format YYYY-MM-DD HH:mm
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
                2,
                '0'
              )}-${String(date.getDate()).padStart(2, '0')} ${hours}:${minutes}`;
              onChange(dateStr);
            } else {
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
                2,
                '0'
              )}-${String(date.getDate()).padStart(2, '0')}`;
              onChange(dateStr);
            }
          }
        }
      },
    });

    flatpickrInstanceRef.current = Array.isArray(fp) ? fp[0] : fp;

    return () => {
      if (flatpickrInstanceRef.current) {
        flatpickrInstanceRef.current.destroy();
        flatpickrInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, disabled, minDate, maxDate, dateFormat, allowInput, enableTime, noCalendar, time_24hr]);

  // Update flatpickr when value changes externally
  useEffect(() => {
    if (flatpickrInstanceRef.current && value !== undefined && inputRef.current) {
      const dateValue = getDateValue();
      if (dateValue) {
        try {
          const currentDates = flatpickrInstanceRef.current.selectedDates;
          let shouldUpdate = false;

          if (Array.isArray(dateValue)) {
            // Range or multiple
            if (currentDates.length !== dateValue.length) {
              shouldUpdate = true;
            } else {
              shouldUpdate = dateValue.some((d, i) => {
                const current = currentDates[i];
                return !current || current.getTime() !== d.getTime();
              });
            }
          } else {
            // Single
            const current = currentDates[0];
            if (!current || current.getTime() !== dateValue.getTime()) {
              shouldUpdate = true;
            }
          }

          if (shouldUpdate) {
            flatpickrInstanceRef.current.setDate(dateValue, false);
          }
        } catch (error) {
          // Ignore errors if flatpickr is not ready
        }
      }
    }
  }, [value]);

  // Extract error class from className if present
  const hasError = className.includes('border-red-500');
  const baseClassName = className.replace(/border-red-500[^\s]*/g, '').trim();

  return (
    <div className={`relative group ${baseClassName}`}>
      <Calendar className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 dark:group-focus-within:text-orange-400 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-all duration-200 pointer-events-none z-10' />
      <input
        ref={inputRef}
        type='text'
        placeholder={placeholder}
        disabled={disabled}
        readOnly
        className={`w-full h-[30px] pl-9 pr-3 text-[11px] border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 font-inter appearance-none shadow-sm ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
            : 'cursor-pointer hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500'
        } ${
          hasError
            ? 'border-red-500 dark:border-red-500'
            : disabled
            ? ''
            : 'border-gray-300 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600'
        }`}
      />
    </div>
  );
}
