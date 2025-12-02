import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Shield, User } from 'lucide-react-native';
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

interface FaceEnrollmentSuggestModalProps {
  visible: boolean;
  onEnroll: () => void;
  onSkip: () => void;
}

export const FaceEnrollmentSuggestModal: React.FC<
  FaceEnrollmentSuggestModalProps
> = ({ visible, onEnroll, onSkip }) => {
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

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onSkip}
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
          onPress={onSkip}
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
                { backgroundColor: theme.colors.primary + '15' },
              ]}
            >
              <Shield size={48} color={theme.colors.primary} />
            </View>

            {/* Title */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {t('faceLogin.suggestTitle', {
                  defaultValue: 'Bảo mật tài khoản của bạn',
                })}
              </Text>
            </View>

            {/* Message */}
            <View style={styles.content}>
              <Text
                style={[
                  styles.message,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('faceLogin.suggestMessage', {
                  defaultValue:
                    'Thiết lập đăng nhập bằng khuôn mặt để truy cập nhanh hơn và an toàn hơn. Chỉ cần một cú chạm để đăng nhập.',
                })}
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[
                  styles.skipButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={onSkip}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.skipButtonText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('faceLogin.skip', { defaultValue: 'Bỏ qua' })}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.enrollButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={onEnroll}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.enrollButtonText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  {t('faceLogin.enrollNow', {
                    defaultValue: 'Thiết lập ngay',
                  })}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    ...Typography.h3,
    textAlign: 'center',
  },
  content: {
    marginBottom: 32,
  },
  message: {
    ...Typography.bodyRegular,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  enrollButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enrollButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
});

