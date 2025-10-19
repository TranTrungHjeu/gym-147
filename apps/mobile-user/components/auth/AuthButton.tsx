import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Typography, TextColors } from '@/utils/typography';

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
  const buttonStyle: ViewStyle[] = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    ...(fullWidth ? [styles.fullWidth] : []),
    ...(disabled ? [styles.disabled] : []),
  ];

  const textStyle: TextStyle[] = [
    size === 'large'
      ? Typography.buttonLarge
      : size === 'medium'
      ? Typography.buttonMedium
      : Typography.buttonSmall,
    styles[`text_${variant}`],
    ...(disabled ? [styles.textDisabled] : []),
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
          color={variant === 'primary' ? '#FFFFFF' : TextColors.accent}
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
    backgroundColor: TextColors.accent,
  },
  button_secondary: {
    backgroundColor: '#F3F4F6',
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: TextColors.accent,
  },
  button_ghost: {
    backgroundColor: 'transparent',
  },

  // Text colors
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: TextColors.primary,
  },
  text_outline: {
    color: TextColors.accent,
  },
  text_ghost: {
    color: TextColors.accent,
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
