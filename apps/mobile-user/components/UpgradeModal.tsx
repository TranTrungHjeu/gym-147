import { MembershipBadge } from '@/components/MembershipBadge';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { Brain, Crown, Sparkles, X, Zap } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string; // Feature name that requires upgrade
  currentTier?: 'BASIC' | 'PREMIUM' | 'VIP' | 'STUDENT';
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  visible,
  onClose,
  feature,
  currentTier = 'BASIC',
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrance animation
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

      // Pulse animation for icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Sparkle animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  const handleUpgrade = () => {
    onClose();
    router.push('/subscription/plans');
  };

  const themedStyles = styles(theme);

  // Check if this is for AI Workout feature
  const isAIWorkoutFeature = feature === 'AI Workout Generation' || feature?.includes('AI');

  // Get benefits with AI highlight
  const premiumBenefits = t('profile.membershipBenefits.PREMIUM', {
    returnObjects: true,
  }) as string[];

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
      animationType="slide"
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
          {/* Header */}
          <View style={themedStyles.header}>
            <View style={themedStyles.headerContent}>
              {/* Icon with animation */}
              <View style={themedStyles.iconWrapper}>
                <Animated.View
                  style={[
                    themedStyles.iconContainer,
                    {
                      backgroundColor: isAIWorkoutFeature
                        ? theme.colors.primary + '20'
                        : theme.colors.warning + '20',
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  {isAIWorkoutFeature ? (
                    <>
                      <Brain size={32} color={theme.colors.primary} />
                      <Animated.View
                        style={[
                          themedStyles.sparkleOverlay,
                          {
                            opacity: sparkleOpacity,
                            transform: [{ rotate: sparkleRotation }],
                          },
                        ]}
                      >
                        <Sparkles
                          size={40}
                          color={theme.colors.primary}
                          strokeWidth={1.5}
                        />
                      </Animated.View>
                    </>
                  ) : (
                    <Crown size={32} color={theme.colors.warning} />
                  )}
                </Animated.View>
              </View>
              <Text style={[Typography.h3, { color: theme.colors.text }]}>
                {isAIWorkoutFeature
                  ? t('workouts.aiWorkoutUpgradeTitle', 'Unlock AI Workout Plans')
                  : t('workouts.premiumFeature')}
              </Text>
              {isAIWorkoutFeature && (
                <Text
                  style={[
                    Typography.bodySmall,
                    {
                      color: theme.colors.textSecondary,
                      marginTop: theme.spacing.xs,
                      textAlign: 'center',
                    },
                  ]}
                >
                  {t(
                    'workouts.aiWorkoutUpgradeSubtitle',
                    'Create personalized workout plans powered by AI'
                  )}
                </Text>
              )}
            </View>
            {/* View Plans Button in Header */}
            <TouchableOpacity
              style={[
                themedStyles.viewPlansHeaderButton,
                { borderColor: theme.colors.primary },
              ]}
              onPress={handleUpgrade}
            >
              <Text
                style={[
                  Typography.bodyMedium,
                  { color: theme.colors.primary, fontWeight: '600' },
                ]}
              >
                {t('profile.viewPlans')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={themedStyles.content}>
            {/* Current Tier Badge */}
            <View style={themedStyles.currentTierContainer}>
              <Text
                style={[
                  Typography.bodySmall,
                  {
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing.sm,
                  },
                ]}
              >
                {t('workouts.currentPlan', 'Your current plan')}:
              </Text>
              <MembershipBadge
                tier={currentTier}
                size="medium"
                showLabel={true}
                animated={false}
              />
            </View>

            {/* Feature Highlight Card */}
            {isAIWorkoutFeature && (
              <View
                style={[
                  themedStyles.featureHighlightCard,
                  {
                    backgroundColor: theme.colors.primary + '10',
                    borderColor: theme.colors.primary + '30',
                  },
                ]}
              >
                <View style={themedStyles.featureHighlightContent}>
                  <Zap size={20} color={theme.colors.primary} />
                  <View style={themedStyles.featureHighlightText}>
                    <Text
                      style={[
                        Typography.bodyMedium,
                        {
                          color: theme.colors.text,
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {t(
                        'workouts.aiWorkoutFeatureTitle',
                        'AI-Powered Workout Plans'
                      )}
                    </Text>
                    <Text
                      style={[
                        Typography.bodySmall,
                        {
                          color: theme.colors.textSecondary,
                          marginTop: 4,
                        },
                      ]}
                    >
                      {t(
                        'workouts.aiWorkoutFeatureDesc',
                        'Get personalized workout plans tailored to your goals, fitness level, and preferences'
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {feature && !isAIWorkoutFeature && (
              <Text
                style={[
                  Typography.bodyLarge,
                  {
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing.md,
                  },
                ]}
              >
                {t('workouts.premiumRequired')}
              </Text>
            )}

            <Text
              style={[
                Typography.bodyRegular,
                {
                  color: theme.colors.text,
                  marginBottom: theme.spacing.lg,
                  lineHeight: 24,
                },
              ]}
            >
              {isAIWorkoutFeature
                ? t(
                    'workouts.aiWorkoutUpgradeMessage',
                    'Upgrade to Premium or VIP to unlock AI-powered workout plans that adapt to your progress and goals!'
                  )
                : t('workouts.upgradeMessage')}
            </Text>

            {/* Benefits List */}
            <Text
              style={[
                Typography.h4,
                {
                  color: theme.colors.text,
                  marginBottom: theme.spacing.md,
                },
              ]}
            >
              {t('workouts.upgradeBenefits')}
            </Text>

            <View style={themedStyles.benefitsList}>
              {premiumBenefits.map((benefit: string, index: number) => {
                const isAIBenefit =
                  benefit.toLowerCase().includes('ai') ||
                  benefit.toLowerCase().includes('workout plan');
                return (
                  <View
                    key={index}
                    style={[
                      themedStyles.benefitItem,
                      isAIBenefit && {
                        backgroundColor: theme.colors.primary + '08',
                        padding: theme.spacing.sm,
                        borderRadius: theme.radius.md,
                        borderWidth: 1,
                        borderColor: theme.colors.primary + '20',
                      },
                    ]}
                  >
                    <View
                      style={[
                        themedStyles.benefitIcon,
                        {
                          backgroundColor: isAIBenefit
                            ? theme.colors.primary + '20'
                            : theme.colors.success + '20',
                        },
                      ]}
                    >
                      {isAIBenefit ? (
                        <Sparkles
                          size={16}
                          color={theme.colors.primary}
                          strokeWidth={2}
                        />
                      ) : (
                        <Text
                          style={{
                            color: isAIBenefit
                              ? theme.colors.primary
                              : theme.colors.success,
                            fontSize: 16,
                            fontWeight: 'bold',
                          }}
                        >
                          ✓
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        Typography.bodyRegular,
                        {
                          color: theme.colors.text,
                          flex: 1,
                          marginLeft: 12,
                          fontWeight: isAIBenefit ? '600' : '400',
                        },
                      ]}
                    >
                      {benefit}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* VIP Benefits (if current tier is PREMIUM) */}
            {currentTier === 'PREMIUM' && (
              <>
                <Text
                  style={[
                    Typography.h4,
                    {
                      color: theme.colors.text,
                      marginTop: theme.spacing.lg,
                      marginBottom: theme.spacing.md,
                    },
                  ]}
                >
                  {t('profile.upgradeToPremium').replace('Premium', 'VIP')}
                </Text>

                <View style={themedStyles.benefitsList}>
                  {t('profile.membershipBenefits.VIP', {
                    returnObjects: true,
                  }).map((benefit: string, index: number) => (
                    <View key={index} style={themedStyles.benefitItem}>
                      <Text
                        style={{
                          color: theme.colors.warning,
                          fontSize: 18,
                          fontWeight: 'bold',
                        }}
                      >
                        ★
                      </Text>
                      <Text
                        style={[
                          Typography.bodyRegular,
                          {
                            color: theme.colors.text,
                            flex: 1,
                            marginLeft: 12,
                          },
                        ]}
                      >
                        {benefit}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={themedStyles.footer}>
            <TouchableOpacity
              style={[
                themedStyles.upgradeButton,
                {
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                },
              ]}
              onPress={handleUpgrade}
              activeOpacity={0.8}
            >
              {isAIWorkoutFeature ? (
                <Sparkles size={20} color={theme.colors.textInverse} />
              ) : (
                <Crown size={20} color={theme.colors.textInverse} />
              )}
              <Text
                style={[
                  Typography.bodyLarge,
                  {
                    color: theme.colors.textInverse,
                    marginLeft: 8,
                    fontWeight: '700',
                  },
                ]}
              >
                {currentTier === 'PREMIUM'
                  ? t('profile.upgradeToPremium').replace('Premium', 'VIP')
                  : isAIWorkoutFeature
                  ? t('workouts.unlockAIWorkout', 'Unlock AI Workout Plans')
                  : t('profile.upgradeNow')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                themedStyles.cancelButton,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  Typography.bodyMedium,
                  {
                    color: theme.colors.text,
                    fontWeight: '600',
                  },
                ]}
              >
                {t('common.cancel', 'Cancel')}
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
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'column',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerContent: {
      width: '100%',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: theme.radius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    viewPlansHeaderButton: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.radius.md,
      borderWidth: 1.5,
      backgroundColor: 'transparent',
      alignSelf: 'center',
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    iconWrapper: {
      position: 'relative',
      marginBottom: theme.spacing.md,
    },
    sparkleOverlay: {
      position: 'absolute',
      top: -4,
      left: -4,
      right: -4,
      bottom: -4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    currentTierContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    featureHighlightCard: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      borderWidth: 1,
    },
    featureHighlightContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    featureHighlightText: {
      flex: 1,
      marginLeft: theme.spacing.sm,
    },
    benefitIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    benefitsList: {
      marginTop: theme.spacing.sm,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    footer: {
      padding: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    upgradeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md + 2,
      borderRadius: theme.radius.md,
      marginBottom: theme.spacing.sm,
    },
    cancelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      backgroundColor: 'transparent',
    },
  });
