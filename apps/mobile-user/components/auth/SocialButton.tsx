import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SocialButtonProps {
  provider: 'google' | 'apple' | 'facebook';
  onPress: () => void;
  disabled?: boolean;
}

const SocialButton: React.FC<SocialButtonProps> = ({
  provider,
  onPress,
  disabled,
}) => {
  const { theme } = useTheme();
  const getProviderConfig = () => {
    switch (provider) {
      case 'google':
        return {
          text: 'Continue with Google',
          icon: '[SEARCH]', // Replace with actual icon/image
          backgroundColor: theme.colors.surface,
          textColor: theme.colors.text,
        };
      case 'apple':
        return {
          text: 'Continue with Apple',
          icon: '🍎', // Replace with actual icon/image
          backgroundColor: theme.isDark
            ? theme.colors.text
            : theme.colors.textInverse,
          textColor: theme.isDark
            ? theme.colors.textInverse
            : theme.colors.text,
        };
      case 'facebook':
        return {
          text: 'Continue with Facebook',
          icon: '📘', // Replace with actual icon/image
          backgroundColor: theme.colors.info,
          textColor: theme.colors.textInverse,
        };
    }
  };

  const config = getProviderConfig();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: config.backgroundColor,
          borderColor: theme.colors.border,
        },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{config.icon}</Text>
      </View>
      <Text style={[styles.text, { color: config.textColor }]}>
        {config.text}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  text: {
    ...Typography.buttonMedium,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default SocialButton;
