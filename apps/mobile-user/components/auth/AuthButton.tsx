import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';

interface AuthButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'large' | 'medium' | 'small';
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const AuthButton: React.FC<AuthButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'large',
  isLoading = false,
  icon,
  fullWidth = true,
  disabled,
  style,
  ...touchableProps
}) => {
  const { theme } = useTheme();

  if (!theme) {
    console.error('Theme is not available in AuthButton');
    return null;
  }
  const buttonStyle: ViewStyle[] = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    ...(fullWidth ? [styles.fullWidth] : []),
    ...(disabled ? [styles.disabled] : []),
    // Dynamic colors
    variant === 'primary' && { backgroundColor: theme.colors.primary },
    variant === 'secondary' && { backgroundColor: theme.colors.secondary },
    variant === 'outline' && { borderColor: theme.colors.primary },
  ];

  const textStyle: TextStyle[] = [
    size === 'large'
      ? Typography.buttonLarge
      : size === 'medium'
      ? Typography.buttonMedium
      : Typography.buttonSmall,
    styles[`text_${variant}`],
    ...(disabled ? [styles.textDisabled] : []),
    // Dynamic text colors
    variant === 'primary' && { color: theme.colors.textInverse },
    variant === 'secondary' && { color: theme.colors.textInverse },
    variant === 'outline' && { color: theme.colors.primary },
    variant === 'ghost' && { color: theme.colors.text },
  ];

  return (
    <TouchableOpacity
      style={[...buttonStyle, style]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...touchableProps}
    >
      {isLoading ? (
        <ActivityIndicator
          color={
            variant === 'primary'
              ? theme.colors.textInverse
              : theme.colors.primary
          }
          size="small"
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  fullWidth: {
    width: '100%',
  },

  // Sizes
  button_large: {
    height: 56,
    paddingHorizontal: 24,
  },
  button_medium: {
    height: 48,
    paddingHorizontal: 20,
  },
  button_small: {
    height: 40,
    paddingHorizontal: 16,
  },

  // Variants
  button_primary: {
    // backgroundColor will be set inline
  },
  button_secondary: {
    // backgroundColor will be set inline
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    // borderColor will be set inline
  },
  button_ghost: {
    backgroundColor: 'transparent',
  },

  // Text colors
  text_primary: {
    // color will be set inline
  },
  text_secondary: {
    // color will be set inline
  },
  text_outline: {
    // color will be set inline
  },
  text_ghost: {
    // color will be set inline
  },

  // Disabled state
  disabled: {
    opacity: 0.5,
  },
  textDisabled: {
    opacity: 0.7,
  },
});

export default AuthButton;
