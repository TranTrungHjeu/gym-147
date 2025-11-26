import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import vi from './vi.json';

const LANGUAGE_STORAGE_KEY = '@gym147_language';

// Language detection function
const detectLanguage = async () => {
  try {
    // First, try to get saved language preference
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && ['en', 'vi', 'auto'].includes(savedLanguage)) {
      if (savedLanguage === 'auto') {
        // Auto-detect from system
        return detectSystemLanguage();
      }
      return savedLanguage;
    }

    // If no saved preference, auto-detect from system
    return detectSystemLanguage();
  } catch (error) {
    console.warn('Failed to detect language:', error);
    return 'en'; // Fallback to English
  }
};

// Detect system language
const detectSystemLanguage = () => {
  const systemLocale = Localization.getLocales()[0]?.languageCode || 'en';

  // Check if system language is Vietnamese
  if (systemLocale.startsWith('vi')) {
    return 'vi';
  }

  // Default to English for all other languages
  return 'en';
};

// Save language preference
export const saveLanguagePreference = async (language) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Failed to save language preference:', error);
  }
};

// Get current language preference
export const getLanguagePreference = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return savedLanguage || 'auto';
  } catch (error) {
    console.warn('Failed to get language preference:', error);
    return 'auto';
  }
};

// Initialize i18n
const initI18n = async () => {
  const detectedLanguage = await detectLanguage();

  await i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    lng: detectedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });
};

// Initialize i18n immediately
initI18n();

export default i18n;
