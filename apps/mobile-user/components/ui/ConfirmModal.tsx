import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonStyle?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonStyle = 'default',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);

      // Start animations - center modal with scale and fade
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
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
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
          onPress={onCancel}
        />
        <SafeAreaView style={styles.safeArea} edges={[]}>
          <Animated.View
            style={[
              styles.container,
              {
                backgroundColor: theme.colors.surface,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Title */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {title}
              </Text>
            </View>

            {/* Message */}
            <View style={styles.content}>
              <Text
                style={[styles.message, { color: theme.colors.textSecondary }]}
              >
                {message}
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={onCancel}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: theme.colors.text },
                  ]}
                >
                  {cancelText}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  {
                    backgroundColor:
                      confirmButtonStyle === 'destructive'
                        ? theme.colors.error
                        : theme.colors.primary,
                    opacity: loading ? 0.6 : 1,
                  },
                ]}
                onPress={onConfirm}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <Text style={[styles.confirmButtonText, { color: '#fff' }]}>
                    Processing...
                  </Text>
                ) : (
                  <Text style={[styles.confirmButtonText, { color: '#fff' }]}>
                    {confirmText}
                  </Text>
                )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  safeArea: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  container: {
    borderRadius: 20,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    ...Typography.h3,
    textAlign: 'center',
  },
  content: {
    marginBottom: 24,
  },
  message: {
    ...Typography.bodyLarge,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    alignItems: 'stretch',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    // backgroundColor set dynamically
  },
  cancelButtonText: {
    ...Typography.buttonMedium,
  },
  confirmButtonText: {
    ...Typography.buttonMedium,
    fontWeight: '600',
  },
});
