import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ErrorModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'email' | 'phone' | 'error' | 'warning';
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  onClose,
  title,
  message,
  type = 'error',
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const themedStyles = styles(theme);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Start animation when modal becomes visible
      Animated.parallel([
        // Scale animation with spring effect
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        // Fade animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animation when modal is hidden
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const getIcon = () => {
    switch (type) {
      case 'email':
        return 'mail-outline';
      case 'phone':
        return 'phone-portrait-outline';
      case 'warning':
        return 'warning-outline';
      default:
        return 'alert-circle-outline';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'email':
      case 'phone':
      case 'warning':
        return theme.colors.warning;
      default:
        return theme.colors.error;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'email':
      case 'phone':
      case 'warning':
        return theme.colors.warning + '20';
      default:
        return theme.colors.error + '20';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          themedStyles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            themedStyles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icon */}
          <View
            style={[
              themedStyles.iconContainer,
              { backgroundColor: getBackgroundColor() },
            ]}
          >
            <Ionicons name={getIcon()} size={24} color={getIconColor()} />
          </View>

          {/* Title */}
          {title && (
            <Text style={[Typography.h4, themedStyles.title]}>{title}</Text>
          )}

          {/* Message */}
          <Text style={[Typography.bodySmall, themedStyles.message]}>
            {message}
          </Text>

          {/* Button */}
          <TouchableOpacity
            style={[
              themedStyles.button,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text
              style={[
                Typography.bodyMedium,
                { color: theme.colors.textInverse },
              ]}
            >
              {t('common.ok')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    modalContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    title: {
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    message: {
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
      lineHeight: 20,
    },
    button: {
      width: '100%',
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
  });

