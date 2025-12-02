import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttonText?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  suggestion?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  title,
  message,
  buttonText = 'OK',
  type = 'info',
  onClose,
  suggestion,
  showCancel = false,
  onConfirm,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      slideAnim.setValue(50);

      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade out animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      case 'warning':
        return theme.colors.warning;
      case 'info':
      default:
        return theme.colors.primary;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      case 'warning':
        return theme.colors.warning;
      case 'info':
      default:
        return theme.colors.primary;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <Animated.View
            style={[
              styles.container,
              {
                backgroundColor: theme.colors.surface,
                transform: [
                  { scale: scaleAnim },
                  { translateY: slideAnim },
                ],
              },
            ]}
          >
            {/* Icon */}
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: getIconColor() + '15' },
              ]}
            >
              <Ionicons name={getIcon()} size={48} color={getIconColor()} />
            </View>

            {/* Title */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {title}
              </Text>
            </View>

            {/* Message */}
            <View style={styles.content}>
              <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
                {message}
              </Text>
              {suggestion && (
                <View style={styles.suggestionContainer}>
                  <Text style={[styles.suggestion, { color: theme.colors.textSecondary }]}>
                    💡 {suggestion}
                  </Text>
                </View>
              )}
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {showCancel && (
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.cancelButton,
                    {
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                    {t('common.cancel', { defaultValue: 'Hủy' })}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: getButtonColor(),
                    flex: showCancel ? 1 : undefined,
                    width: showCancel ? undefined : '100%',
                  },
                ]}
                onPress={() => {
                  if (onConfirm) {
                    onConfirm();
                  }
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { color: '#fff' }]}>
                  {buttonText}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  safeArea: {
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 32,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    ...Typography.h3,
    textAlign: 'center',
  },
  content: {
    marginBottom: 24,
    width: '100%',
  },
  message: {
    ...Typography.bodyLarge,
    textAlign: 'center',
    lineHeight: 22,
  },
  suggestionContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  suggestion: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    ...Typography.buttonMedium,
    fontWeight: '600',
  },
});

