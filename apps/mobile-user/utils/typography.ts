import { StyleSheet, TextStyle } from 'react-native';

/**
 * Font Families
 * Space Grotesk: Used for headings, titles, and emphasis
 * Inter: Used for body text and general UI elements
 */
export const FontFamily = {
  // Space Grotesk - for headings and emphasis
  spaceGroteskLight: 'SpaceGrotesk-Light',
  spaceGroteskRegular: 'SpaceGrotesk-Regular',
  spaceGroteskMedium: 'SpaceGrotesk-Medium',
  spaceGroteskSemiBold: 'SpaceGrotesk-SemiBold',
  spaceGroteskBold: 'SpaceGrotesk-Bold',

  // Inter - for body text
  interRegular: 'Inter-Regular',
  interMedium: 'Inter-Medium',
  interSemiBold: 'Inter-SemiBold',
  interBold: 'Inter-Bold',
} as const;

/**
 * Typography Styles
 * Pre-defined text styles for consistent typography throughout the app
 */
export const Typography = StyleSheet.create({
  // Headings - using Space Grotesk
  h1: {
    fontFamily: FontFamily.spaceGroteskBold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  } as TextStyle,

  h2: {
    fontFamily: FontFamily.spaceGroteskBold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.5,
  } as TextStyle,

  h3: {
    fontFamily: FontFamily.spaceGroteskSemiBold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.3,
  } as TextStyle,

  h4: {
    fontFamily: FontFamily.spaceGroteskSemiBold,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2,
  } as TextStyle,

  h5: {
    fontFamily: FontFamily.spaceGroteskMedium,
    fontSize: 18,
    lineHeight: 24,
  } as TextStyle,

  h6: {
    fontFamily: FontFamily.spaceGroteskMedium,
    fontSize: 16,
    lineHeight: 22,
  } as TextStyle,

  // Body text - using Inter
  bodyLarge: {
    fontFamily: FontFamily.interRegular,
    fontSize: 18,
    lineHeight: 28,
  } as TextStyle,

  bodyRegular: {
    fontFamily: FontFamily.interRegular,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  bodyMedium: {
    fontFamily: FontFamily.interMedium,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  bodySmall: {
    fontFamily: FontFamily.interRegular,
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,

  bodySmallMedium: {
    fontFamily: FontFamily.interMedium,
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,

  // Labels & Captions - Form Labels (using Space Grotesk)
  label: {
    fontFamily: FontFamily.spaceGroteskMedium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  } as TextStyle,

  labelSmall: {
    fontFamily: FontFamily.spaceGroteskMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  } as TextStyle,

  // Footer Text - for "Already have account?", "Don't have account?" etc.
  footerText: {
    fontFamily: FontFamily.spaceGroteskRegular,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  footerTextBold: {
    fontFamily: FontFamily.spaceGroteskSemiBold,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  caption: {
    fontFamily: FontFamily.interRegular,
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,

  captionMedium: {
    fontFamily: FontFamily.interMedium,
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,

  // Buttons
  buttonLarge: {
    fontFamily: FontFamily.spaceGroteskSemiBold,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.2,
  } as TextStyle,

  buttonMedium: {
    fontFamily: FontFamily.spaceGroteskMedium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.2,
  } as TextStyle,

  buttonSmall: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
  } as TextStyle,

  // Numbers & Stats - Space Grotesk looks great for numbers
  numberLarge: {
    fontFamily: FontFamily.spaceGroteskBold,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
  } as TextStyle,

  numberMedium: {
    fontFamily: FontFamily.spaceGroteskBold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  } as TextStyle,

  numberSmall: {
    fontFamily: FontFamily.spaceGroteskSemiBold,
    fontSize: 24,
    lineHeight: 32,
  } as TextStyle,
});

/**
 * Helper function to get font family based on weight
 */
export const getFontFamily = (
  type: 'heading' | 'body' = 'body',
  weight: 'light' | 'regular' | 'medium' | 'semibold' | 'bold' = 'regular'
): string => {
  if (type === 'heading') {
    switch (weight) {
      case 'light':
        return FontFamily.spaceGroteskLight;
      case 'regular':
        return FontFamily.spaceGroteskRegular;
      case 'medium':
        return FontFamily.spaceGroteskMedium;
      case 'semibold':
        return FontFamily.spaceGroteskSemiBold;
      case 'bold':
        return FontFamily.spaceGroteskBold;
      default:
        return FontFamily.spaceGroteskRegular;
    }
  } else {
    switch (weight) {
      case 'regular':
        return FontFamily.interRegular;
      case 'medium':
        return FontFamily.interMedium;
      case 'semibold':
        return FontFamily.interSemiBold;
      case 'bold':
        return FontFamily.interBold;
      default:
        return FontFamily.interRegular;
    }
  }
};

/**
 * Color palette for text
 */
export const TextColors = {
  primary: '#1F2937', // Dark gray for main text
  secondary: '#6B7280', // Medium gray for secondary text
  tertiary: '#9CA3AF', // Light gray for disabled/placeholder
  inverse: '#FFFFFF', // White text on dark backgrounds
  accent: '#3B82F6', // Blue for links and emphasis
  success: '#10B981', // Green for success states
  warning: '#F59E0B', // Orange for warnings
  error: '#EF4444', // Red for errors
} as const;
