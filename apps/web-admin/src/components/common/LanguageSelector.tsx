import { Check, ChevronDown, Globe } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { changeLanguage, getCurrentLanguage } from '../../locales/i18n';

interface LanguageOption {
  code: 'en' | 'vi';
  label: string;
  nativeLabel: string;
}

const languages: LanguageOption[] = [
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
];

/**
 * Language selector dropdown component
 * Allows users to switch between English and Vietnamese
 */
const LanguageSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<'en' | 'vi'>(getCurrentLanguage());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLang(getCurrentLanguage());
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  const handleLanguageChange = (langCode: 'en' | 'vi') => {
    changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className='relative' ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-transparent hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors'
      >
        <Globe className='w-4 h-4 text-gray-700 dark:text-gray-300' />
        <span className='uppercase'>{currentLang}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-700 dark:text-gray-300 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Dropdown Menu */}
          <div className='absolute right-0 mt-2 w-56 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-lg z-50 overflow-hidden'>
            <div className='py-1'>
              {languages.map(language => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-300 ${
                    currentLang === language.code
                      ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>{language.nativeLabel}</span>
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      ({language.label})
                    </span>
                  </div>
                  {currentLang === language.code && <Check className='w-4 h-4' />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;
