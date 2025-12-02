import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import React from 'react';
import { ActivityIndicator, Pressable, Text, ViewStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = React.memo(({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  fullWidth = false,
}) => {
  const { theme } = useTheme();

  const getButtonStyle = () => {
    const baseStyle = {
      borderRadius: 8,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
    };

    const sizeStyle = {
      small: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 36 },
      medium: { paddingHorizontal: 16, paddingVertical: 12, minHeight: 44 },
      large: { paddingHorizontal: 20, paddingVertical: 16, minHeight: 52 },
    };

    const variantStyle = {
      primary: {
        backgroundColor: disabled
          ? theme.colors.textSecondary
          : theme.colors.primary,
        borderWidth: 0,
      },
      secondary: {
        backgroundColor: disabled
          ? theme.colors.textSecondary
          : theme.colors.secondary,
        borderWidth: 0,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled
          ? theme.colors.textSecondary
          : theme.colors.primary,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
      destructive: {
        backgroundColor: disabled
          ? theme.colors.textSecondary
          : theme.colors.error,
        borderWidth: 0,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyle[size],
      ...variantStyle[variant],
      ...(fullWidth && { width: '100%' as const }),
    };
  };

  const getTextStyle = () => {
    const sizeTextStyle = {
      small: Typography.bodySmall,
      medium: Typography.bodyMedium,
      large: Typography.bodyLarge,
    };

    const variantTextStyle = {
      primary: { color: theme.colors.surface },
      secondary: { color: theme.colors.surface },
      outline: {
        color: disabled ? theme.colors.textSecondary : theme.colors.primary,
      },
      ghost: {
        color: disabled ? theme.colors.textSecondary : theme.colors.primary,
      },
      destructive: { color: theme.colors.surface },
    };

    return {
      ...sizeTextStyle[size],
      ...variantTextStyle[variant],
      fontWeight: '600' as const,
    };
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };

  return (
    <Pressable
      style={[getButtonStyle(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'outline' || variant === 'ghost'
              ? theme.colors.primary
              : theme.colors.surface
          }
        />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </Pressable>
  );
});

export default Button;
