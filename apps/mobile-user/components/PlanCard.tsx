import { MembershipBadge } from '@/components/MembershipBadge';
import type { MembershipPlan } from '@/types/billingTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Check, Crown, Star, Zap } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PlanCardProps {
  plan: MembershipPlan;
  isCurrentPlan: boolean;
  canUpgrade: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onUpgrade?: () => void;
  onRenew?: () => void;
  upgrading?: boolean;
}

export default function PlanCard({
  plan,
  isCurrentPlan,
  canUpgrade,
  isSelected = false,
  onSelect,
  onUpgrade,
  onRenew,
  upgrading = false,
}: PlanCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'BASIC':
        return <Zap size={20} color="#ffffff" />;
      case 'PREMIUM':
        return <Star size={20} color="#ffffff" />;
      case 'VIP':
        return <Crown size={20} color="#ffffff" />;
      default:
        return <Zap size={20} color="#ffffff" />;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'BASIC':
        return theme.colors.primary;
      case 'PREMIUM':
        return theme.colors.warning;
      case 'VIP':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  const primaryColor = getPlanColor(plan.type);
  const secondaryColor = theme.colors.primary;
  const accentColor = theme.colors.success;

  // Animation for badge entrance
  const badgeScale = React.useRef(new Animated.Value(0)).current;
  const badgeRotation = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Badge entrance animation
    Animated.parallel([
      Animated.spring(badgeScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(badgeRotation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation animation for selected card
    if (isSelected) {
      Animated.loop(
        Animated.timing(badgeRotation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isSelected]);

  const badgeRotationInterpolate = badgeRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Get tier for badge
  const getTier = (
    planType: string
  ): 'BASIC' | 'PREMIUM' | 'VIP' | 'STUDENT' => {
    // Normalize plan type to uppercase string
    const normalizedType = String(planType).toUpperCase().trim();

    switch (normalizedType) {
      case 'BASIC':
        return 'BASIC';
      case 'PREMIUM':
        return 'PREMIUM';
      case 'VIP':
        return 'VIP';
      case 'STUDENT':
        return 'STUDENT';
      default:
        // Fallback: try to match any case variation
        if (normalizedType.includes('VIP')) return 'VIP';
        if (normalizedType.includes('PREMIUM')) return 'PREMIUM';
        if (normalizedType.includes('STUDENT')) return 'STUDENT';
        if (normalizedType.includes('BASIC')) return 'BASIC';
        return 'BASIC';
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: '#050505',
          backgroundColor: theme.colors.surface,
          shadowColor: '#000000',
        },
        isSelected && {
          transform: [{ translateX: -4 }, { translateY: -4 }],
        },
      ]}
    >
      {/* Pattern Grid Background */}
      <View style={styles.patternGrid} />

      {/* Overlay Dots */}
      <View style={styles.overlayDots} />

      {/* Bold Pattern Corner */}
      <View style={[styles.boldPattern, { opacity: 0.15 }]} />

      {/* Membership Badge with Animation */}
      <Animated.View
        style={[
          styles.badgeContainer,
          {
            transform: [
              { scale: badgeScale },
              { rotate: isSelected ? badgeRotationInterpolate : '0deg' },
            ],
          },
        ]}
      >
        <MembershipBadge tier={getTier(plan.type || 'BASIC')} size="large" />
      </Animated.View>

      {/* Card Title Area */}
      <View
        style={[
          styles.cardTitleArea,
          {
            backgroundColor: primaryColor,
            borderBottomColor: '#050505',
          },
        ]}
      >
        <View style={styles.titlePattern} />
        <Text
          style={[
            Typography.h3,
            {
              color: theme.colors.surface,
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: 1,
            },
          ]}
        >
          {plan.name}
        </Text>
        {isCurrentPlan && (
          <View
            style={[
              styles.cardTag,
              {
                backgroundColor: theme.colors.surface,
                borderColor: '#050505',
                shadowColor: '#000000',
              },
            ]}
          >
            <Text
              style={[
                Typography.caption,
                {
                  color: '#050505',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                },
              ]}
            >
              Current
            </Text>
          </View>
        )}
      </View>

      {/* Card Body */}
      <View style={styles.cardBody}>
        {/* Description */}
        <Text
          style={[
            Typography.bodyMedium,
            {
              color: theme.colors.text,
              marginBottom: 16,
              lineHeight: 20,
            },
          ]}
        >
          {plan.description}
        </Text>

        {/* Features Grid */}
        <View style={styles.featureGrid}>
          {plan.benefits.slice(0, 4).map((benefit, index) => (
            <View key={index} style={styles.featureItem}>
              <View
                style={[
                  styles.featureIcon,
                  {
                    backgroundColor: secondaryColor,
                    borderColor: '#050505',
                    shadowColor: '#000000',
                  },
                ]}
              >
                <Check size={14} color="#ffffff" />
              </View>
              <Text
                style={[
                  Typography.caption,
                  {
                    color: theme.colors.text,
                    fontWeight: '600',
                    flex: 1,
                  },
                ]}
                numberOfLines={1}
              >
                {benefit}
              </Text>
            </View>
          ))}
        </View>

        {/* Additional Features */}
        {(plan.class_credits !== null && plan.class_credits !== undefined) ||
        plan.guest_passes !== undefined ? (
          <View style={styles.additionalFeatures}>
            {plan.class_credits !== null &&
              plan.class_credits !== undefined && (
                <View style={styles.featureRow}>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t('subscription.plans.classCredits') || 'Class Credits:'}
                  </Text>
                  <Text
                    style={[
                      Typography.bodyMedium,
                      { color: theme.colors.text, fontWeight: '600' },
                    ]}
                  >
                    {plan.class_credits === null
                      ? 'Unlimited'
                      : plan.class_credits.toString()}
                  </Text>
                </View>
              )}
            {plan.guest_passes !== undefined && (
              <View style={styles.featureRow}>
                <Text
                  style={[
                    Typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('subscription.plans.guestPasses') || 'Guest Passes:'}
                </Text>
                <Text
                  style={[
                    Typography.bodyMedium,
                    { color: theme.colors.text, fontWeight: '600' },
                  ]}
                >
                  {plan.guest_passes.toString()}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Card Actions */}
        <View style={styles.cardActions}>
          <View style={styles.priceContainer}>
            <View style={styles.priceWrapper}>
              <Text
                style={[
                  Typography.h2,
                  {
                    color: theme.colors.primary, // Màu cam của hệ thống (#f36100)
                    fontWeight: '800',
                  },
                ]}
              >
                {(() => {
                  // Format price as VND
                  const priceValue =
                    typeof plan.price === 'string'
                      ? parseFloat(plan.price)
                      : Number(plan.price);

                  if (isNaN(priceValue)) return '0 ₫';

                  // Format number with commas for thousands
                  const formattedPrice = priceValue
                    .toFixed(0)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                  return (
                    <>
                      {formattedPrice}
                      <Text
                        style={{
                          fontSize: 18,
                          marginLeft: 4,
                          color: theme.colors.primary,
                        }}
                      >
                        ₫
                      </Text>
                    </>
                  );
                })()}
              </Text>
              <Text
                style={[
                  Typography.caption,
                  {
                    color: theme.colors.textSecondary,
                    fontWeight: '600',
                    marginTop: 4,
                  },
                ]}
              >
                /
                {(plan.billing_interval || 'MONTHLY')
                  .toLowerCase()
                  .replace('ly', '')}
              </Text>
            </View>
            <View
              style={[
                styles.priceUnderline,
                { backgroundColor: accentColor, opacity: 0.5 },
              ]}
            />
          </View>

          {/* Action Buttons */}
          {isCurrentPlan ? (
            <TouchableOpacity
              style={[
                styles.cardButton,
                {
                  backgroundColor: secondaryColor,
                  borderColor: '#050505',
                  shadowColor: '#000000',
                },
              ]}
              onPress={() => {
                console.log('🔄 Renew button pressed');
                onRenew?.();
              }}
              disabled={upgrading}
            >
              <Text
                style={[
                  Typography.bodyMedium,
                  {
                    color: theme.colors.surface,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                  },
                ]}
              >
                {upgrading
                  ? t('subscription.plans.processing')
                  : t('subscription.plans.extend')}
              </Text>
            </TouchableOpacity>
          ) : canUpgrade ? (
            <TouchableOpacity
              style={[
                styles.cardButton,
                {
                  backgroundColor: secondaryColor,
                  borderColor: '#050505',
                  shadowColor: '#000000',
                },
              ]}
              onPress={() => {
                console.log('⬆️ Upgrade/Subscribe button pressed', {
                  hasOnUpgrade: !!onUpgrade,
                  hasOnSelect: !!onSelect,
                });
                if (onUpgrade) {
                  onUpgrade();
                } else if (onSelect) {
                  onSelect();
                }
              }}
              disabled={upgrading}
            >
              <Text
                style={[
                  Typography.bodyMedium,
                  {
                    color: theme.colors.surface,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                  },
                ]}
              >
                {upgrading
                  ? t('subscription.plans.processing')
                  : t('subscription.plans.subscribe')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.cardButton,
                {
                  backgroundColor: 'transparent',
                  borderColor: '#050505',
                  shadowColor: '#000000',
                },
              ]}
              onPress={onSelect}
            >
              <Text
                style={[
                  Typography.bodyMedium,
                  {
                    color: '#050505',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                  },
                ]}
              >
                {t('subscription.plans.select')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Dots Pattern */}
      <View style={styles.dotsPattern} />

      {/* Accent Shape */}
      <View
        style={[
          styles.accentShape,
          {
            backgroundColor: secondaryColor,
            borderColor: '#050505',
          },
        ]}
      />

      {/* Corner Slice */}
      <View
        style={[
          styles.cornerSlice,
          {
            backgroundColor: theme.colors.surface,
            borderColor: '#050505',
          },
        ]}
      />

      {/* Stamp */}
      {plan.is_featured && (
        <View style={styles.stamp}>
          <Text
            style={[
              Typography.caption,
              {
                color: theme.colors.textSecondary,
                fontWeight: '800',
                textTransform: 'uppercase',
                opacity: 0.3,
              },
            ]}
          >
            Featured
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    width: SCREEN_WIDTH - 32,
    borderWidth: 3.5,
    borderRadius: 6,
    marginBottom: 24,
    overflow: 'hidden',
    shadowOffset: { width: 7, height: 7 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  patternGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.5,
    backgroundColor: 'transparent',
    // Grid pattern would need a custom implementation or image
  },
  overlayDots: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    backgroundColor: 'transparent',
    // Dots pattern would need a custom implementation
  },
  boldPattern: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 60,
    height: 60,
    backgroundColor: '#000000',
  },
  badgeContainer: {
    position: 'absolute',
    top: 30,
    right: 20,
    zIndex: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardTitleArea: {
    position: 'relative',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 3.5,
    overflow: 'hidden',
  },
  titlePattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  cardTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    borderWidth: 1.5,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  cardBody: {
    position: 'relative',
    padding: 15,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    gap: 6,
  },
  featureIcon: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 2,
  },
  additionalFeatures: {
    marginBottom: 16,
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(0, 0, 0, 0.15)',
    borderStyle: 'dashed',
  },
  priceContainer: {
    position: 'relative',
  },
  priceWrapper: {
    backgroundColor: 'transparent',
  },
  priceUnderline: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
    height: 3,
    zIndex: -1,
  },
  currentPlanActions: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  cardButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 4,
    borderWidth: 2,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  dotsPattern: {
    position: 'absolute',
    bottom: 20,
    left: -20,
    width: 80,
    height: 40,
    opacity: 0.3,
    transform: [{ rotate: '-10deg' }],
  },
  accentShape: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderRadius: 3,
    borderWidth: 1.5,
    bottom: -12,
    right: 20,
    transform: [{ rotate: '45deg' }],
  },
  cornerSlice: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 15,
    height: 15,
    borderRightWidth: 2.5,
    borderTopWidth: 2.5,
    borderTopRightRadius: 5,
  },
  stamp: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.2,
    transform: [{ rotate: '-15deg' }],
  },
});
