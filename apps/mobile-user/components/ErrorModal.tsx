import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { CheckCircle2, Info, XCircle } from 'lucide-react-native';
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
  type?: 'email' | 'phone' | 'error' | 'warning' | 'info';
  actionButton?: {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary';
  };
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  onClose,
  title,
  message,
  type = 'error',
  actionButton,
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
      case 'info':
        return 'information-circle-outline';
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
      case 'info':
        return theme.colors.info || theme.colors.primary;
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
      case 'info':
        return (theme.colors.info || theme.colors.primary) + '20';
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
            {type === 'info' ? (
              <Info size={28} color={getIconColor()} strokeWidth={2.5} />
            ) : type === 'warning' ? (
              <Ionicons name={getIcon()} size={28} color={getIconColor()} />
            ) : type === 'error' ? (
              <XCircle size={28} color={getIconColor()} strokeWidth={2.5} />
            ) : (
              <Ionicons name={getIcon()} size={28} color={getIconColor()} />
            )}
          </View>

          {/* Title */}
          {title && (
            <Text style={[Typography.h4, themedStyles.title]}>{title}</Text>
          )}

          {/* Message */}
          <Text style={[Typography.bodySmall, themedStyles.message]}>
            {message}
          </Text>

          {/* Buttons */}
          <View style={themedStyles.buttonContainer}>
            {actionButton && (
              <TouchableOpacity
                style={[
                  themedStyles.button,
                  themedStyles.actionButton,
                  {
                    backgroundColor:
                      actionButton.variant === 'secondary'
                        ? theme.colors.surface
                        : theme.colors.primary,
                    borderWidth: actionButton.variant === 'secondary' ? 1 : 0,
                    borderColor:
                      actionButton.variant === 'secondary'
                        ? theme.colors.border
                        : 'transparent',
                    marginRight: 8,
                  },
                ]}
                onPress={actionButton.onPress}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    Typography.bodyMedium,
                    {
                      color:
                        actionButton.variant === 'secondary'
                          ? theme.colors.text
                          : theme.colors.textInverse,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {actionButton.label}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                themedStyles.button,
                {
                  backgroundColor: theme.colors.primary,
                  flex: actionButton ? 1 : undefined,
                  width: actionButton ? undefined : '100%',
                },
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  Typography.bodyMedium,
                  {
                    color: theme.colors.textInverse,
                    fontWeight: actionButton ? '500' : '600',
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
      width: 64,
      height: 64,
      borderRadius: 32,
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
      lineHeight: 22,
      paddingHorizontal: 4,
    },
    buttonContainer: {
      width: '100%',
      flexDirection: 'row',
      gap: 8,
    },
    button: {
      flex: 1,
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
    actionButton: {
      flex: 1,
    },
  });
