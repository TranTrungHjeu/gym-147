import { ThemeColors } from './types';

export const darkThemeColors: ThemeColors = {
  // Primary colors
  primary: '#ff7a33', // Lighter orange for dark mode
  secondary: '#9CA3AF', // Lighter gray for dark mode

  // Background colors
  background: '#121212', // Pure dark background for better contrast
  surface: '#1E1E1E', // Slightly lighter dark surface

  // Text colors
  text: '#FFFFFF', // Pure white for maximum contrast
  textSecondary: '#E0E0E0', // High contrast light gray
  textTertiary: '#B0B0B0', // Medium light gray
  textInverse: '#FFFFFF', // White text on dark backgrounds for better visibility

  // UI colors
  border: '#4A4A4A', // Lighter border for better visibility
  divider: '#333333', // Dark divider

  // Status colors
  success: '#4CAF50', // Brighter green for better visibility
  warning: '#FF9800', // Brighter orange for better visibility
  error: '#F44336', // Brighter red for better visibility
  info: '#2196F3', // Brighter blue for better visibility

  // Interactive colors
  accent: '#ff7a33', // Same as primary
  disabled: '#666666', // Better contrast disabled state

  // Legacy colors (for backward compatibility)
  white: '#FFFFFF',
  black: '#000000',
  gray: '#4A4A4A', // Better contrast gray
};
