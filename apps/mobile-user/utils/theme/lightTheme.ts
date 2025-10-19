import { ThemeColors } from './types';

export const lightThemeColors: ThemeColors = {
  // Primary colors
  primary: '#f36100', // Orange - main brand color
  secondary: '#7c7c7cff', // Gray

  // Background colors
  background: '#F8FAFC', // Light gray background
  surface: '#FFFFFF', // White surface

  // Text colors
  text: '#1F2937', // Dark gray for primary text
  textSecondary: '#6B7280', // Medium gray for secondary text
  textTertiary: '#9CA3AF', // Light gray for tertiary text
  textInverse: '#FFFFFF', // White text on dark backgrounds

  // UI colors
  border: '#E2E8F0', // Light border
  divider: '#F3F4F6', // Divider color

  // Status colors
  success: '#10B981', // Green
  warning: '#F59E0B', // Orange
  error: '#EF4444', // Red
  info: '#3B82F6', // Blue

  // Interactive colors
  accent: '#f36100', // Same as primary
  disabled: '#D1D5DB', // Disabled state

  // Legacy colors (for backward compatibility)
  white: '#FFFFFF',
  black: '#000000',
  gray: '#F3F4F6',
};
