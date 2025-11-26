import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  icon,
  className = '',
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const selectRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        selectRef.current &&
        !selectRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex(prev => {
            const next = prev < options.length - 1 ? prev + 1 : 0;
            scrollToOption(next);
            return next;
          });
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev => {
            const next = prev > 0 ? prev - 1 : options.length - 1;
            scrollToOption(next);
            return next;
          });
          break;
        case 'Enter':
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < options.length) {
            handleSelect(options[focusedIndex].value);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, focusedIndex, options]);

  const scrollToOption = (index: number) => {
    if (listRef.current) {
      const optionElement = listRef.current.children[index] as HTMLElement;
      if (optionElement) {
        optionElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const updateDropdownPosition = () => {
    if (selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      // Use getBoundingClientRect directly since dropdown uses position: fixed
      // No need to add scroll offsets for fixed positioning
      setDropdownPosition({
        top: rect.bottom + 8, // mt-2 = 8px
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updateDropdownPosition();
      const currentIndex = options.findIndex(opt => opt.value === value);
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen) {
      // Update position immediately when opening
      updateDropdownPosition();
      
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        updateDropdownPosition();
      });

      const handleResize = () => updateDropdownPosition();
      const handleScroll = () => {
        // Update position on any scroll (including modal scroll)
        updateDropdownPosition();
      };
      
      window.addEventListener('resize', handleResize);
      // Listen to scroll on all scrollable containers (window, modal, etc.)
      window.addEventListener('scroll', handleScroll, true);
      document.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
        document.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen]);

  // Extract error class from className if present
  const hasError = className.includes('border-red-500');
  const baseClassName = className.replace(/border-red-500[^\s]*/g, '').trim();

  const hasFullHeight = baseClassName.includes('h-full');
  const hasFixedHeight = baseClassName.match(/h-\[(\d+px?)\]/);
  const fixedHeight = hasFixedHeight ? hasFixedHeight[1] : null;

  // Ensure width is applied to container if w-full is in className
  const hasFullWidth = baseClassName.includes('w-full');
  const containerClassName = `relative ${hasFullHeight ? 'h-full' : ''} ${hasFullWidth ? 'w-full' : ''} ${baseClassName
    .replace('h-full', '')
    .replace('w-full', '')
    .trim()}`;

  return (
    <div
      ref={selectRef}
      className={containerClassName}
    >
      {/* Select Button */}
      <button
        type='button'
        onClick={handleToggle}
        disabled={disabled}
        style={fixedHeight ? { height: fixedHeight } : {}}
        className={`group relative w-full ${
          hasFullHeight ? 'h-full' : fixedHeight ? '' : 'h-[30px]'
        } ${fixedHeight ? 'py-1.5' : ''} pl-9 pr-9 text-[11px] border rounded-lg bg-white dark:bg-gray-900 text-left transition-all duration-200 font-inter appearance-none shadow-sm ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
            : 'cursor-pointer hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500'
        } ${
          hasError
            ? 'border-red-500 dark:border-red-500'
            : disabled
            ? ''
            : 'border-gray-300 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600'
        } ${
          isOpen && !disabled
            ? 'border-orange-500 dark:border-orange-500 ring-2 ring-orange-500/30'
            : ''
        } ${selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-400'}`}
      >
        {/* Left Icon */}
        {icon && (
          <div className='absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10'>
            <div className='text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 dark:group-focus-within:text-orange-400 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-all duration-200'>
              {icon}
            </div>
          </div>
        )}

        {/* Selected Value or Placeholder */}
        <span className='block truncate'>
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        {/* Right Chevron Icon */}
        <div className='absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10'>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 dark:group-focus-within:text-orange-400 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-all duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown List - Rendered via Portal */}
      {isOpen &&
        !disabled &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className='fixed bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden'
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 100002,
              position: 'fixed',
            }}
          >
            <div
              ref={listRef}
              className='custom-select-scrollbar max-h-60 overflow-y-auto'
              style={{
                scrollbarWidth: 'thin',
              }}
            >
              {options.map((option, index) => {
                const isSelected = option.value === value;
                const isFocused = index === focusedIndex;

                return (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() => handleSelect(option.value)}
                    className={`w-full px-2.5 py-1.5 text-[10px] text-left font-inter transition-all duration-150 ${
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-semibold'
                        : 'text-gray-900 dark:text-white'
                    } ${
                      isFocused && !isSelected ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                    } hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 focus:outline-none focus:bg-orange-50 dark:focus:bg-orange-900/20`}
                  >
                    <div className='flex items-center justify-between'>
                      <span>{option.label}</span>
                      {isSelected && (
                        <svg
                          className='w-3 h-3 text-orange-600 dark:text-orange-400'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M5 13l4 4L19 7'
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
