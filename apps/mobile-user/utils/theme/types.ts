export type ThemeMode = 'auto' | 'light' | 'dark';

export interface ThemeColors {
  // Primary colors
  primary: string;
  secondary: string;

  // Background colors - KEEP FLAT for backward compatibility
  background: string;
  surface: string;

  // Text colors - KEEP FLAT for backward compatibility
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

  // Legacy colors
  white: string;
  black: string;
  gray: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeRadius {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  round: number;
  full: number; // Alias for round (9999)
}

export interface ThemeShadows {
  sm: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  md: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  lg: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

export interface Theme {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  shadows: ThemeShadows;
  mode: ThemeMode;
  isDark: boolean;
}

export interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}
