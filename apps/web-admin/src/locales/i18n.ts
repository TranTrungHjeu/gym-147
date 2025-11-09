import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import vi from './vi.json';

const LANGUAGE_STORAGE_KEY = 'gym147_language';

// Detect language from localStorage or browser
const detectLanguage = (): string => {
  try {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && ['en', 'vi'].includes(savedLanguage)) {
      return savedLanguage;
    }
    // Auto-detect from browser
    const browserLang = navigator.language.split('-')[0];
    return ['en', 'vi'].includes(browserLang) ? browserLang : 'vi';
  } catch (error) {
    console.warn('Failed to detect language:', error);
    return 'vi'; // Default to Vietnamese
  }
};

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    lng: detectLanguage(),
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
  });

// Function to change language
export const changeLanguage = (lng: 'en' | 'vi') => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  i18n.changeLanguage(lng);
  // Dispatch custom event to notify components
  window.dispatchEvent(new CustomEvent('languageChanged'));
};

// Function to get current language
export const getCurrentLanguage = (): 'en' | 'vi' => {
  return (i18n.language || 'vi') as 'en' | 'vi';
};

export default i18n;
