export type ThemeMode = 'auto' | 'light' | 'dark';

export interface ThemeColors {
  // Primary colors
  primary: string;
  secondary: string;

  // Background colors
  background: string;
  surface: string;

  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // UI colors
  border: string;
  divider: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Interactive colors
  accent: string;
  disabled: string;

  // Legacy colors (for backward compatibility)
  white: string;
  black: string;
  gray: string;
}

export interface Theme {
  colors: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
}

export interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}
