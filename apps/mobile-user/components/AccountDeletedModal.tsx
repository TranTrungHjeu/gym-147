import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
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

interface AccountDeletedModalProps {
  visible: boolean;
  onLogout: () => void;
}

export const AccountDeletedModal: React.FC<AccountDeletedModalProps> = ({
  visible,
  onLogout,
}) => {
  const { theme } = useTheme();
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
      onRequestClose={onLogout}
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
          onPress={onLogout}
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
                { backgroundColor: theme.colors.error + '15' },
              ]}
            >
              <Ionicons name="close-circle" size={48} color={theme.colors.error} />
            </View>

            {/* Title */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Tài khoản đã bị xóa
              </Text>
            </View>

            {/* Message */}
            <View style={styles.content}>
              <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
                Tài khoản của bạn đã bị xóa bởi quản trị viên. Vui lòng đăng xuất và liên hệ với quản trị viên nếu bạn có thắc mắc.
              </Text>
            </View>

            {/* Button */}
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: theme.colors.error,
                },
              ]}
              onPress={onLogout}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>
                Đăng xuất
              </Text>
            </TouchableOpacity>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  container: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    ...Typography.h3,
    textAlign: 'center',
    fontWeight: '700',
  },
  content: {
    marginBottom: 24,
  },
  message: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...Typography.buttonMedium,
    color: '#fff',
    fontWeight: '600',
  },
});











