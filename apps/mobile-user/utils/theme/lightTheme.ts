import { ThemeColors } from './types';

export const lightThemeColors: ThemeColors = {
  // Primary colors
  primary: '#f36100', // Orange - main brand color
  secondary: '#6B7280', // Gray

  // Background colors
  background: '#FFFFFF', // Pure white background for better contrast
  surface: '#F8F9FA', // Light gray surface

  // Text colors
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

  // Legacy colors (for backward compatibility)
  white: '#FFFFFF',
  black: '#000000',
  gray: '#E2E8F0',
};
