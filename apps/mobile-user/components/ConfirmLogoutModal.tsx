import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ConfirmLogoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  onLogoutStart?: () => void;
  onLogoutComplete?: () => void;
  onLogoutError?: (error: Error) => void;
}

export const ConfirmLogoutModal: React.FC<ConfirmLogoutModalProps> = ({
  visible,
  onClose,
  onConfirm,
  loading = false,
  onLogoutStart,
  onLogoutComplete,
  onLogoutError,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const themedStyles = styles(theme);
  const [internalLoading, setInternalLoading] = React.useState(false);

  const handleConfirm = async () => {
    try {
      // Notify parent that logout is starting
      onLogoutStart?.();
      setInternalLoading(true);

      // Execute the confirm callback
      await onConfirm();

      // Notify parent that logout completed successfully
      onLogoutComplete?.();
    } catch (error) {
      // Notify parent about error
      onLogoutError?.(error as Error);
      console.error('Logout error in modal:', error);
    } finally {
      setInternalLoading(false);
    }
  };

  const isLoading = loading || internalLoading;

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={isLoading ? undefined : onClose}
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
              { backgroundColor: theme.colors.primary + '20' },
            ]}
          >
            <Ionicons
              name="log-out-outline"
              size={24}
              color={theme.colors.primary}
            />
          </View>

          {/* Title */}
          <Text style={[Typography.h4, themedStyles.title]}>
            {t('auth.logout')}
          </Text>

          {/* Message */}
          <Text style={[Typography.bodySmall, themedStyles.message]}>
            {t('profile.logoutConfirm') ||
              'Bạn có chắc muốn đăng xuất? Bạn sẽ cần đăng nhập lại để tiếp tục.'}
          </Text>

          {/* Buttons */}
          <View style={themedStyles.buttonContainer}>
            <TouchableOpacity
              style={[
                themedStyles.cancelButton,
                { borderColor: theme.colors.border },
              ]}
              onPress={onClose}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text
                style={[Typography.bodyMedium, { color: theme.colors.text }]}
              >
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                themedStyles.confirmButton,
                { backgroundColor: theme.colors.error },
                isLoading && themedStyles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.textInverse}
                />
              ) : (
                <Text
                  style={[
                    Typography.bodyMedium,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  {t('auth.logout')}
                </Text>
              )}
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
    buttonContainer: {
      flexDirection: 'row',
      width: '100%',
      gap: theme.spacing.sm,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmButton: {
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
    buttonDisabled: {
      opacity: 0.6,
      shadowOpacity: 0,
      elevation: 0,
    },
  });
