import { ThemeColors, ThemeRadius, ThemeShadows, ThemeSpacing } from './types';

export const spacing: ThemeSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius: ThemeRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 9999,
  full: 9999, // Alias for round
};

export const lightShadows: ThemeShadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
};

export const lightThemeColors: ThemeColors = {
  // Primary colors
  primary: '#f36100', // Orange - main brand color
  secondary: '#6B7280', // Gray

  // Background colors - FLAT structure
  background: '#FFFFFF', // Pure white background for better contrast
  surface: '#F8F9FA', // Light gray surface

  // Text colors - FLAT structure
  text: '#000000', // Pure black for maximum contrast
  textSecondary: '#374151', // Dark gray for secondary text
  textTertiary: '#6B7280', // Medium gray for tertiary text
  textInverse: '#FFFFFF', // White text on dark backgrounds

  // UI colors
  border: '#CBD5E1', // Darker border for better visibility
  divider: '#E2E8F0', // Darker divider

  // Status colors
  success: '#059669', // Darker green for better contrast
  warning: '#D97706', // Darker orange for better contrast
  error: '#DC2626', // Darker red for better contrast
  info: '#2563EB', // Darker blue for better contrast

  // Interactive colors
  accent: '#f36100', // Same as primary
  disabled: '#9CA3AF', // Better contrast disabled state

  // Legacy colors
  white: '#FFFFFF',
  black: '#000000',
  gray: '#E2E8F0',
};
