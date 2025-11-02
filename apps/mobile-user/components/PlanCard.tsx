import { MembershipBadge } from '@/components/MembershipBadge';
import { MembershipPlan } from '@/types/billingTypes';
import { useTheme } from '@/utils/theme';
import { FontFamily } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PlanCardProps {
  plan: MembershipPlan;
  isSelected?: boolean;
  onSelect: () => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isSelected = false,
  onSelect,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(numPrice);
  };

  const getPlanTier = (type: string): 'BASIC' | 'PREMIUM' | 'VIP' | 'STUDENT' => {
    switch (type.toUpperCase()) {
      case 'BASIC':
        return 'BASIC';
      case 'PREMIUM':
        return 'PREMIUM';
      case 'VIP':
        return 'VIP';
      case 'STUDENT':
        return 'STUDENT';
      default:
        return 'BASIC';
    }
  };

  const styles = StyleSheet.create({
    container: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.xl,
      borderWidth: isSelected ? 3 : 2,
      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
      backgroundColor: isSelected
        ? `${theme.colors.primary}08`
        : theme.colors.background,
      marginBottom: theme.spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isSelected ? 0.15 : 0.08,
      shadowRadius: 12,
      elevation: isSelected ? 8 : 4,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: theme.spacing.xs,
      paddingLeft: theme.spacing.xs,
    },
    benefitsContainer: {
      marginBottom: theme.spacing.sm,
    },
  });

  // Build IoT features
  const iotFeatures: string[] = [];
  if (plan.smart_workout_plans) {
    const feature = t('registration.smartWorkoutPlans');
    if (feature) iotFeatures.push(feature);
  }
  if (plan.wearable_integration) {
    const feature = t('registration.wearableIntegration');
    if (feature) iotFeatures.push(feature);
  }
  if (plan.advanced_analytics) {
    const feature = t('registration.advancedAnalytics');
    if (feature) iotFeatures.push(feature);
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: theme.spacing.lg,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <MembershipBadge tier={getPlanTier(plan.type)} size="large" />
        </View>
        {plan.is_featured ? (
          <View
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.primary,
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text
              style={{
                fontFamily: FontFamily.spaceGroteskSemiBold,
                fontSize: 11,
                lineHeight: 14,
                letterSpacing: 0.5,
                color: theme.colors.textInverse,
                textTransform: 'uppercase',
              }}
            >
              {String(t('registration.popular') || 'PHỔ BIẾN')}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Title */}
      <Text
        style={{
          fontFamily: FontFamily.spaceGroteskBold,
          fontSize: 26,
          lineHeight: 32,
          letterSpacing: -0.5,
          color: theme.colors.text,
          marginBottom: theme.spacing.xs,
        }}
      >
        {String(plan.name || '')}
      </Text>

      {/* Description */}
      <Text
        style={{
          fontFamily: FontFamily.interRegular,
          fontSize: 14,
          lineHeight: 20,
          color: theme.colors.textSecondary,
          marginBottom: theme.spacing.lg,
        }}
      >
        {String(plan.description || '')}
      </Text>

      {/* Price */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          marginBottom: theme.spacing.md,
          paddingBottom: theme.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: `${theme.colors.border}50`,
        }}
      >
        <Text
          style={{
            fontFamily: FontFamily.spaceGroteskBold,
            fontSize: 36,
            lineHeight: 42,
            letterSpacing: -1,
            color: theme.colors.primary,
          }}
        >
          {formatPrice(plan.price)}
        </Text>
        <Text
          style={{
            fontFamily: FontFamily.interMedium,
            fontSize: 14,
            lineHeight: 20,
            color: theme.colors.textSecondary,
            marginLeft: theme.spacing.sm,
          }}
        >
          {String(`/${plan.duration_months} ${t('common.months') || 'tháng'}`)}
        </Text>
      </View>

      {/* Setup Fee */}
      {plan.setup_fee && Number(plan.setup_fee) > 0 ? (
        <Text
          style={{
            fontFamily: FontFamily.interMedium,
            fontSize: 12,
            lineHeight: 16,
            color: theme.colors.warning,
            marginBottom: theme.spacing.md,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
            backgroundColor: `${theme.colors.warning}10`,
            borderRadius: theme.radius.sm,
            alignSelf: 'flex-start',
          }}
        >
          {String(`+ ${formatPrice(plan.setup_fee)} Phí thiết lập`)}
        </Text>
      ) : null}

      {/* Benefits Section Header */}
      <Text
        style={{
          fontFamily: FontFamily.spaceGroteskSemiBold,
          fontSize: 15,
          lineHeight: 20,
          letterSpacing: 0.3,
          color: theme.colors.text,
          marginTop: theme.spacing.sm,
          marginBottom: theme.spacing.md,
          textTransform: 'uppercase',
        }}
      >
        {String('Quyền lợi cơ bản')}
      </Text>

      {/* Benefits from array */}
      {Array.isArray(plan.benefits) && plan.benefits.length > 0 ? (
        <View style={styles.benefitsContainer}>
          {plan.benefits.map((benefit, index) => (
            <View key={`benefit-${index}`} style={styles.benefitItem}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={theme.colors.success}
                style={{ marginRight: theme.spacing.sm, marginTop: 2 }}
              />
              <Text
                style={{
                  fontFamily: FontFamily.interRegular,
                  fontSize: 14,
                  lineHeight: 20,
                  color: theme.colors.text,
                  flex: 1,
                }}
              >
                {String(benefit)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Additional Benefits Section */}
      {plan.class_credits ||
      plan.guest_passes ||
      plan.personal_training_sessions ||
      plan.nutritionist_consultations ? (
        <View>
          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: `${theme.colors.border}40`,
              marginVertical: theme.spacing.lg,
            }}
          />

          {/* Additional Benefits Header */}
          <Text
            style={{
              fontFamily: FontFamily.spaceGroteskSemiBold,
              fontSize: 15,
              lineHeight: 20,
              letterSpacing: 0.3,
              color: theme.colors.text,
              marginBottom: theme.spacing.md,
              textTransform: 'uppercase',
            }}
          >
            {String('Quyền lợi bổ sung')}
          </Text>
        </View>
      ) : null}

      {/* Class Credits */}
      {plan.class_credits && Number(plan.class_credits) > 0 ? (
        <View style={styles.benefitItem}>
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={theme.colors.primary}
            style={{ marginRight: theme.spacing.sm, marginTop: 2 }}
          />
          <Text
            style={{
              fontFamily: FontFamily.interMedium,
              fontSize: 14,
              lineHeight: 20,
              color: theme.colors.text,
              flex: 1,
            }}
          >
            {String(`${plan.class_credits} Lượt lớp học`)}
          </Text>
        </View>
      ) : null}

      {/* Guest Passes */}
      {plan.guest_passes && Number(plan.guest_passes) > 0 ? (
        <View style={styles.benefitItem}>
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={theme.colors.primary}
            style={{ marginRight: theme.spacing.sm, marginTop: 2 }}
          />
          <Text
            style={{
              fontFamily: FontFamily.interMedium,
              fontSize: 14,
              lineHeight: 20,
              color: theme.colors.text,
              flex: 1,
            }}
          >
            {String(`${plan.guest_passes} Lượt khách mời`)}
          </Text>
        </View>
      ) : null}

      {/* PT Sessions */}
      {plan.personal_training_sessions &&
      Number(plan.personal_training_sessions) > 0 ? (
        <View style={styles.benefitItem}>
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={theme.colors.primary}
            style={{ marginRight: theme.spacing.sm, marginTop: 2 }}
          />
          <Text
            style={{
              fontFamily: FontFamily.interMedium,
              fontSize: 14,
              lineHeight: 20,
              color: theme.colors.text,
              flex: 1,
            }}
          >
            {Number(plan.personal_training_sessions) === 999
              ? String('PT Không giới hạn')
              : String(`${plan.personal_training_sessions} Buổi PT`)}
          </Text>
        </View>
      ) : null}

      {/* Nutritionist Consultations */}
      {plan.nutritionist_consultations &&
      Number(plan.nutritionist_consultations) > 0 ? (
        <View style={styles.benefitItem}>
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={theme.colors.primary}
            style={{ marginRight: theme.spacing.sm, marginTop: 2 }}
          />
          <Text
            style={{
              fontFamily: FontFamily.interMedium,
              fontSize: 14,
              lineHeight: 20,
              color: theme.colors.text,
              flex: 1,
            }}
          >
            {String(`${plan.nutritionist_consultations} Tư vấn dinh dưỡng`)}
          </Text>
        </View>
      ) : null}

      {/* IoT Features */}
      {iotFeatures.length > 0 ? (
        <View
          style={{
            marginTop: theme.spacing.md,
            padding: theme.spacing.md,
            borderRadius: theme.radius.lg,
            backgroundColor: `${theme.colors.info}08`,
            borderWidth: 1,
            borderColor: `${theme.colors.info}20`,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.sm,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: theme.radius.md,
                backgroundColor: `${theme.colors.info}15`,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: theme.spacing.sm,
              }}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={16}
                color={theme.colors.info}
              />
            </View>
            <Text
              style={{
                fontFamily: FontFamily.spaceGroteskSemiBold,
                fontSize: 13,
                lineHeight: 18,
                letterSpacing: 0.3,
                color: theme.colors.info,
                textTransform: 'uppercase',
              }}
            >
              {String('Tính năng IoT')}
            </Text>
          </View>
          {iotFeatures.map((feature, index) => (
            <View
              key={`iot-${index}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: index > 0 ? theme.spacing.xs : 0,
                paddingLeft: theme.spacing.sm,
              }}
            >
              <Ionicons
                name="chevron-forward"
                size={14}
                color={theme.colors.info}
                style={{ marginRight: theme.spacing.xs }}
              />
              <Text
                style={{
                  fontFamily: FontFamily.interRegular,
                  fontSize: 13,
                  lineHeight: 18,
                  color: theme.colors.text,
                  flex: 1,
                }}
              >
                {String(feature)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Select Button */}
      <TouchableOpacity
        style={{
          marginTop: theme.spacing.xl,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          backgroundColor: isSelected ? theme.colors.primary : 'transparent',
          borderWidth: 2,
          borderColor: theme.colors.primary,
          alignItems: 'center',
          shadowColor: isSelected ? theme.colors.primary : 'transparent',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: isSelected ? 4 : 0,
        }}
        onPress={onSelect}
        activeOpacity={0.8}
      >
        <Text
          style={{
            fontFamily: FontFamily.spaceGroteskSemiBold,
            fontSize: 16,
            lineHeight: 24,
            letterSpacing: 0.3,
            color: isSelected ? theme.colors.textInverse : theme.colors.primary,
          }}
        >
          {String(isSelected ? 'Đã chọn' : 'Chọn gói này')}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};
