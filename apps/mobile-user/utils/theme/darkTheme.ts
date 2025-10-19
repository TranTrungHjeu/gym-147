import { ThemeColors } from './types';

export const darkThemeColors: ThemeColors = {
  // Primary colors
  primary: '#ff7a33', // Lighter orange for dark mode
  secondary: '#9CA3AF', // Lighter gray for dark mode

  // Background colors
  background: '#0F172A', // Dark blue-gray background
  surface: '#1E293B', // Dark surface

  // Text colors
  text: '#F8FAFC', // Light text for dark backgrounds
  textSecondary: '#CBD5E1', // Medium light gray
  textTertiary: '#94A3B8', // Light gray for tertiary text
  textInverse: '#0F172A', // Dark text on light backgrounds

  // UI colors
  border: '#334155', // Dark border
  divider: '#475569', // Dark divider

  // Status colors
  success: '#34D399', // Lighter green for dark mode
  warning: '#FBBF24', // Lighter orange for dark mode
  error: '#F87171', // Lighter red for dark mode
  info: '#60A5FA', // Lighter blue for dark mode

  // Interactive colors
  accent: '#ff7a33', // Same as primary
  disabled: '#64748B', // Disabled state for dark mode

  // Legacy colors (for backward compatibility)
  white: '#FFFFFF',
  black: '#000000',
  gray: '#475569', // Dark gray
};
