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

interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  countdown?: number; // Countdown in seconds before auto-close
  onCountdownComplete?: () => void;
  actionButton?: {
    label: string;
    onPress: () => void;
  };
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  onClose,
  title,
  message,
  countdown,
  onCountdownComplete,
  actionButton,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const themedStyles = styles(theme);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

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

      // Animate checkmark icon with delay
      Animated.sequence([
        Animated.delay(150),
        Animated.spring(checkmarkScale, {
          toValue: 1,
          tension: 100,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animation when modal is hidden
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      checkmarkScale.setValue(0);
    }
  }, [visible]);

  // Countdown effect
  useEffect(() => {
    if (visible && countdown && countdown > 0) {
      const timer = setTimeout(() => {
        if (onCountdownComplete) {
          onCountdownComplete();
        } else {
          onClose();
        }
      }, countdown * 1000);

      return () => clearTimeout(timer);
    }
  }, [visible, countdown, onClose, onCountdownComplete]);

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
          {/* Icon Container with animated checkmark */}
          <Animated.View
            style={[
              themedStyles.iconContainer,
              {
                backgroundColor: theme.colors.success + '20',
                transform: [{ scale: checkmarkScale }],
              },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={theme.colors.success}
            />
          </Animated.View>

          {/* Title */}
          {title && (
            <Text style={[Typography.h4, themedStyles.title]}>{title}</Text>
          )}

          {/* Message */}
          <Text style={[Typography.bodySmall, themedStyles.message]}>
            {message}
          </Text>

          {/* Action Buttons */}
          <View style={themedStyles.buttonContainer}>
            {actionButton && (
              <TouchableOpacity
                style={[
                  themedStyles.button,
                  themedStyles.actionButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={actionButton.onPress}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    Typography.bodyMedium,
                    { color: theme.colors.textInverse, fontWeight: '600' },
                  ]}
                >
                  {actionButton.label}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                themedStyles.button,
                actionButton
                  ? [
                      themedStyles.secondaryButton,
                      { borderColor: theme.colors.border },
                    ]
                  : { backgroundColor: theme.colors.success },
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  Typography.bodyMedium,
                  {
                    color: actionButton
                      ? theme.colors.text
                      : theme.colors.textInverse,
                  },
                ]}
              >
                {t('common.ok')}
              </Text>
            </TouchableOpacity>
          </View>
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
      padding: theme.spacing.xl,
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
      width: 80,
      height: 80,
      borderRadius: theme.radius.full,
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
      marginBottom: theme.spacing.xl,
      lineHeight: 20,
    },
    buttonContainer: {
      width: '100%',
      gap: theme.spacing.sm,
    },
    button: {
      width: '100%',
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.success,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    actionButton: {
      shadowColor: theme.colors.primary,
    },
    secondaryButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: 'transparent',
      elevation: 0,
    },
  });

