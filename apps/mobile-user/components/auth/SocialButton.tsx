import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Image } from 'react-native';
import { Typography, TextColors } from '@/utils/typography';

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
  const getProviderConfig = () => {
    switch (provider) {
      case 'google':
        return {
          text: 'Continue with Google',
          icon: '🔍', // Replace with actual icon/image
          backgroundColor: '#FFFFFF',
          textColor: TextColors.primary,
        };
      case 'apple':
        return {
          text: 'Continue with Apple',
          icon: '🍎', // Replace with actual icon/image
          backgroundColor: '#000000',
          textColor: '#FFFFFF',
        };
      case 'facebook':
        return {
          text: 'Continue with Facebook',
          icon: '📘', // Replace with actual icon/image
          backgroundColor: '#1877F2',
          textColor: '#FFFFFF',
        };
    }
  };

  const config = getProviderConfig();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: config.backgroundColor },
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
    borderColor: '#E2E8F0',
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
