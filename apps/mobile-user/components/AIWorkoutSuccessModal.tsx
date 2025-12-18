import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { CheckCircle, Sparkles, Target, Zap } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AIWorkoutSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  onViewWorkouts?: () => void;
  workoutPlanName?: string;
}

interface ConfettiParticle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  scale: Animated.Value;
  color: string;
}

export default function AIWorkoutSuccessModal({
  visible,
  onClose,
  onViewWorkouts,
  workoutPlanName,
}: AIWorkoutSuccessModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const successIconScale = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const confettiParticles = useRef<ConfettiParticle[]>([]).current;

  const themedStyles = styles(theme);

  // Colors for confetti - fitness themed
  const confettiColors = [
    theme.colors.primary,
    theme.colors.success,
    '#FF6B6B',
    '#4ECDC4',
    '#FFD700',
    '#FFA07A',
  ];

  useEffect(() => {
    if (visible) {
      // Initialize confetti particles
      confettiParticles.length = 0;
      for (let i = 0; i < 40; i++) {
        confettiParticles.push({
          id: i,
          x: new Animated.Value(Math.random() * SCREEN_WIDTH),
          y: new Animated.Value(-20),
          rotation: new Animated.Value(0),
          scale: new Animated.Value(1),
          color:
            confettiColors[Math.floor(Math.random() * confettiColors.length)],
        });
      }

      // Animate confetti
      confettiParticles.forEach((particle) => {
        const duration = 2000 + Math.random() * 1000;

        // Animate position (can use native driver)
        Animated.parallel([
          Animated.timing(particle.y, {
            toValue: SCREEN_WIDTH + 100,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(particle.x, {
            toValue: particle.x._value + (Math.random() - 0.5) * 200,
            duration: duration,
            useNativeDriver: true,
          }),
        ]).start();

        // Animate rotation separately (needs useNativeDriver: false for string interpolation)
        Animated.timing(particle.rotation, {
          toValue: 360,
          duration: duration,
          useNativeDriver: false,
        }).start();
      });

      // Main animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Success icon animation with delay
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(successIconScale, {
          toValue: 1,
          tension: 100,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();

      // Sparkle animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      successIconScale.setValue(0);
      sparkleAnim.setValue(0);
    }
  }, [visible]);

  const sparkleRotation = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sparkleOpacity = sparkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

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
        {/* Confetti particles */}
        {confettiParticles.map((particle) => {
          // Interpolate rotation to string format required by React Native
          const rotationString = particle.rotation.interpolate({
            inputRange: [0, 360],
            outputRange: ['0deg', '360deg'],
          });

          return (
            <Animated.View
              key={particle.id}
              style={[
                themedStyles.confetti,
                {
                  backgroundColor: particle.color,
                  transform: [
                    { translateX: particle.x },
                    { translateY: particle.y },
                    { rotate: rotationString },
                    { scale: particle.scale },
                  ],
                },
              ]}
            />
          );
        })}

        <Animated.View
          style={[
            themedStyles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Success Icon with sparkles */}
          <View style={themedStyles.iconContainer}>
            <Animated.View
              style={[
                themedStyles.successIconWrapper,
                {
                  transform: [{ scale: successIconScale }],
                },
              ]}
            >
              <CheckCircle
                size={64}
                color={theme.colors.success}
                strokeWidth={2.5}
              />
            </Animated.View>

            {/* Sparkle decorations */}
            <Animated.View
              style={[
                themedStyles.sparkle,
                themedStyles.sparkleTopLeft,
                {
                  transform: [{ rotate: sparkleRotation }],
                  opacity: sparkleOpacity,
                },
              ]}
            >
              <Sparkles size={24} color={theme.colors.primary} />
            </Animated.View>
            <Animated.View
              style={[
                themedStyles.sparkle,
                themedStyles.sparkleTopRight,
                {
                  transform: [{ rotate: sparkleRotation }],
                  opacity: sparkleOpacity,
                },
              ]}
            >
              <Zap size={20} color={theme.colors.warning} />
            </Animated.View>
            <Animated.View
              style={[
                themedStyles.sparkle,
                themedStyles.sparkleBottomLeft,
                {
                  transform: [{ rotate: sparkleRotation }],
                  opacity: sparkleOpacity,
                },
              ]}
            >
              <Target size={22} color={theme.colors.success} />
            </Animated.View>
          </View>

          {/* Title */}
          <Text style={[Typography.h3, themedStyles.title]}>
            {t('workouts.aiSuccess') ||
              'Kế hoạch tập luyện AI đã được tạo thành công!'}
          </Text>

          {/* Message */}
          <Text style={[Typography.bodyMedium, themedStyles.message]}>
            {workoutPlanName
              ? t('workouts.aiPlanCreatedWithName', {
                  name: workoutPlanName,
                }) || `Kế hoạch "${workoutPlanName}" đã sẵn sàng cho bạn!`
              : t('workouts.aiPlanCreatedDesc') ||
                'Kế hoạch tập luyện AI của bạn đã được tạo. Hãy kiểm tra phần đề xuất bài tập!'}
          </Text>

          {/* Action Buttons */}
          <View style={themedStyles.buttonContainer}>
            {onViewWorkouts && (
              <TouchableOpacity
                style={[
                  themedStyles.button,
                  themedStyles.primaryButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={onViewWorkouts}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    Typography.bodyMedium,
                    themedStyles.primaryButtonText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  {t('workouts.viewWorkouts') || 'Xem kế hoạch tập luyện'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                themedStyles.button,
                themedStyles.secondaryButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  Typography.bodyMedium,
                  themedStyles.secondaryButtonText,
                  { color: theme.colors.text },
                ]}
              >
                {t('common.ok') || 'Đóng'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    modalContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.xl,
      width: '100%',
      maxWidth: 380,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
      overflow: 'hidden',
    },
    iconContainer: {
      width: 120,
      height: 120,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
      position: 'relative',
    },
    successIconWrapper: {
      width: 80,
      height: 80,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.success + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sparkle: {
      position: 'absolute',
    },
    sparkleTopLeft: {
      top: 0,
      left: 0,
    },
    sparkleTopRight: {
      top: 0,
      right: 0,
    },
    sparkleBottomLeft: {
      bottom: 0,
      left: 0,
    },
    title: {
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
      fontWeight: '700',
    },
    message: {
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      lineHeight: 22,
      paddingHorizontal: theme.spacing.sm,
    },
    buttonContainer: {
      width: '100%',
      gap: theme.spacing.sm,
    },
    button: {
      width: '100%',
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButton: {
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    primaryButtonText: {
      fontWeight: '600',
    },
    secondaryButton: {
      borderWidth: 1.5,
    },
    secondaryButtonText: {
      fontWeight: '500',
    },
    confetti: {
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: 4,
    },
  });









