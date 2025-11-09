import { useTranslation as useI18nextTranslation } from 'react-i18next';

/**
 * Custom hook for translations with type safety
 * Provides easy access to translation function and current language
 */
export const useTranslation = () => {
  const { t, i18n } = useI18nextTranslation();

  return {
    t: (key: string, options?: Record<string, any>) => t(key, options),
    currentLanguage: i18n.language as 'en' | 'vi',
    changeLanguage: (lng: 'en' | 'vi') => i18n.changeLanguage(lng),
  };
};

export default useTranslation;

