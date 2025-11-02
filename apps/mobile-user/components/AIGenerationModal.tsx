import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Brain, CheckCircle, Dumbbell, Zap } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface AIGenerationModalProps {
  visible: boolean;
  status: 'preparing' | 'analyzing' | 'generating' | 'completed';
  onComplete?: () => void;
}

const { width } = Dimensions.get('window');

export const AIGenerationModal: React.FC<AIGenerationModalProps> = ({
  visible,
  status,
  onComplete,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulse animation for icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Progress animation
      const targetProgress = getProgressForStatus(status);
      Animated.timing(progressAnim, {
        toValue: targetProgress,
        duration: 600,
        useNativeDriver: false,
      }).start();
    } else {
      fadeAnim.setValue(0);
      progressAnim.setValue(0);
    }
  }, [visible, status]);

  useEffect(() => {
    if (status === 'completed' && onComplete) {
      setTimeout(() => {
        onComplete();
      }, 1500);
    }
  }, [status, onComplete]);

  const getProgressForStatus = (currentStatus: typeof status) => {
    switch (currentStatus) {
      case 'preparing':
        return 0.25;
      case 'analyzing':
        return 0.5;
      case 'generating':
        return 0.75;
      case 'completed':
        return 1;
      default:
        return 0;
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'preparing':
        return {
          icon: Brain,
          title: t('workouts.ai.preparing'),
          description: t('workouts.ai.preparingDesc'),
          color: theme.colors.primary,
        };
      case 'analyzing':
        return {
          icon: Zap,
          title: t('workouts.ai.analyzing'),
          description: t('workouts.ai.analyzingDesc'),
          color: theme.colors.primary,
        };
      case 'generating':
        return {
          icon: Dumbbell,
          title: t('workouts.ai.generating'),
          description: t('workouts.ai.generatingDesc'),
          color: theme.colors.primary,
        };
      case 'completed':
        return {
          icon: CheckCircle,
          title: t('workouts.ai.completed'),
          description: t('workouts.ai.completedDesc'),
          color: theme.colors.success,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.surface,
              transform: [{ scale: fadeAnim }],
            },
          ]}
        >
          {/* Icon Container */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                backgroundColor: config.color + '15',
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Icon size={48} color={config.color} strokeWidth={2} />
          </Animated.View>

          {/* Title */}
          <Text
            style={[styles.title, { color: theme.colors.text }, Typography.h4]}
          >
            {config.title}
          </Text>

          {/* Description */}
          <Text
            style={[
              styles.description,
              { color: theme.colors.textSecondary },
              Typography.bodyRegular,
            ]}
          >
            {config.description}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: theme.colors.border },
              ]}
            >
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: config.color,
                    width: progressWidth,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.progressText,
                { color: theme.colors.textSecondary },
                Typography.caption,
              ]}
            >
              {Math.round(getProgressForStatus(status) * 100)}%
            </Text>
          </View>

          {/* Status Steps */}
          <View style={styles.stepsContainer}>
            {['preparing', 'analyzing', 'generating', 'completed'].map(
              (step, index) => {
                const isActive =
                  ['preparing', 'analyzing', 'generating', 'completed'].indexOf(
                    status
                  ) >= index;
                const isCompleted =
                  ['preparing', 'analyzing', 'generating', 'completed'].indexOf(
                    status
                  ) > index;

                return (
                  <View key={step} style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepDot,
                        {
                          backgroundColor: isCompleted
                            ? theme.colors.success
                            : isActive
                            ? theme.colors.primary
                            : theme.colors.border,
                          borderColor: isCompleted
                            ? theme.colors.success
                            : isActive
                            ? theme.colors.primary
                            : theme.colors.border,
                        },
                      ]}
                    >
                      {isActive && !isCompleted && (
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.textInverse}
                        />
                      )}
                      {isCompleted && (
                        <CheckCircle
                          size={16}
                          color={theme.colors.textInverse}
                          fill={theme.colors.success}
                          strokeWidth={3}
                        />
                      )}
                    </View>
                    {index < 3 && (
                      <View
                        style={[
                          styles.stepLine,
                          {
                            backgroundColor: isCompleted
                              ? theme.colors.success
                              : theme.colors.border,
                          },
                        ]}
                      />
                    )}
                  </View>
                );
              }
            )}
          </View>

          {/* Loading Spinner (show only when not completed) */}
          {status !== 'completed' && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text
                style={[
                  styles.loadingText,
                  { color: theme.colors.textSecondary },
                  Typography.caption,
                ]}
              >
                {t('workouts.ai.pleaseWait')}
              </Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '700',
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLine: {
    width: 24,
    height: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontWeight: '500',
  },
});
