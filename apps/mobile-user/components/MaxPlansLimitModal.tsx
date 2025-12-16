import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { AlertCircle, Crown, Sparkles, Zap } from 'lucide-react-native';
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

interface MaxPlansLimitModalProps {
  visible: boolean;
  onClose: () => void;
  currentCount?: number;
  maxAllowed?: number;
  membershipType?: string;
}

export const MaxPlansLimitModal: React.FC<MaxPlansLimitModalProps> = ({
  visible,
  onClose,
  currentCount = 0,
  maxAllowed = 0,
  membershipType = 'BASIC',
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
        <Animated.View
          style={[
            themedStyles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={themedStyles.scrollContent}
          >
            {/* Header */}
            <View style={themedStyles.header}>
              <View style={themedStyles.headerContent}>
                {/* Icon with animation */}
                <Animated.View
                  style={[
                    themedStyles.iconContainer,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  <AlertCircle
                    size={48}
                    color={theme.colors.warning || '#FFA500'}
                    strokeWidth={2}
                  />
                  <View style={themedStyles.sparkleContainer}>
                    <Sparkles
                      size={24}
                      color={theme.colors.primary}
                      style={themedStyles.sparkle}
                    />
                  </View>
                </Animated.View>

                <Text style={[Typography.h3, { color: theme.colors.text }]}>
                  {t(
                    'workouts.maxPlansReached',
                    'Đã đạt giới hạn kế hoạch tập luyện'
                  )}
                </Text>
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
                    'workouts.maxPlansReachedDesc',
                    'Bạn đã sử dụng hết số lượt tạo kế hoạch tập luyện AI cho gói hội viên hiện tại của bạn.'
                  )}
                </Text>

                <TouchableOpacity
                  onPress={handleUpgrade}
                  style={[
                    themedStyles.viewPlansHeaderButton,
                    { borderColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      Typography.bodyRegular,
                      { color: theme.colors.primary, fontWeight: '600' },
                    ]}
                  >
                    {t('profile.viewPlans', 'Xem gói')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Current Status Card */}
            <View style={themedStyles.statusCard}>
              <View style={themedStyles.statusRow}>
                <Text
                  style={[
                    Typography.bodyMedium,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('workouts.currentPlans', 'Kế hoạch hiện tại')}:
                </Text>
                <Text
                  style={[
                    Typography.bodyLarge,
                    { color: theme.colors.text, fontWeight: '700' },
                  ]}
                >
                  {currentCount} / {maxAllowed}
                </Text>
              </View>
              <View style={themedStyles.statusRow}>
                <Text
                  style={[
                    Typography.bodyMedium,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('workouts.membershipType', 'Loại hội viên')}:
                </Text>
                <Text
                  style={[
                    Typography.bodyMedium,
                    { color: theme.colors.text, fontWeight: '600' },
                  ]}
                >
                  {membershipType}
                </Text>
              </View>
            </View>

            {/* Feature Highlight Card */}
            <View style={themedStyles.featureCard}>
              <View style={themedStyles.featureHeader}>
                <Zap size={20} color={theme.colors.primary} />
                <Text
                  style={[
                    Typography.bodyLarge,
                    {
                      color: theme.colors.text,
                      fontWeight: '700',
                      marginLeft: 8,
                    },
                  ]}
                >
                  {t('workouts.upgradeBenefits', 'Lợi ích khi nâng cấp')}
                </Text>
              </View>
              <View style={themedStyles.benefitList}>
                <View style={themedStyles.benefitItem}>
                  <Sparkles size={16} color={theme.colors.primary} />
                  <Text
                    style={[
                      Typography.bodyRegular,
                      { color: theme.colors.text, marginLeft: 12 },
                    ]}
                  >
                    {t(
                      'workouts.upgradeBenefit1',
                      'Tạo nhiều kế hoạch tập luyện AI hơn'
                    )}
                  </Text>
                </View>
                <View style={themedStyles.benefitItem}>
                  <Crown size={16} color={theme.colors.primary} />
                  <Text
                    style={[
                      Typography.bodyRegular,
                      { color: theme.colors.text, marginLeft: 12 },
                    ]}
                  >
                    {t(
                      'workouts.upgradeBenefit2',
                      'Truy cập các tính năng cao cấp khác'
                    )}
                  </Text>
                </View>
                <View style={themedStyles.benefitItem}>
                  <Zap size={16} color={theme.colors.primary} />
                  <Text
                    style={[
                      Typography.bodyRegular,
                      { color: theme.colors.text, marginLeft: 12 },
                    ]}
                  >
                    {t(
                      'workouts.upgradeBenefit3',
                      'Hỗ trợ ưu tiên và nhiều quyền lợi khác'
                    )}
                  </Text>
                </View>
              </View>
            </View>

            {/* Footer */}
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
                <Crown size={20} color={theme.colors.textInverse} />
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
                  {membershipType === 'PREMIUM'
                    ? t('profile.upgradeToPremium', 'Nâng cấp lên VIP')
                    : t('profile.upgradeNow', 'Nâng cấp ngay')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  themedStyles.cancelButton,
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
                    Typography.bodyRegular,
                    { color: theme.colors.text, fontWeight: '600' },
                  ]}
                >
                  {t('common.cancel', 'Hủy')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    modalContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      width: '100%',
      maxWidth: 420,
      maxHeight: '90%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 16,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    header: {
      marginBottom: theme.spacing.lg,
    },
    headerContent: {
      alignItems: 'center',
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primaryLight + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      position: 'relative',
    },
    sparkleContainer: {
      position: 'absolute',
      top: -8,
      right: -8,
    },
    sparkle: {
      opacity: 0.8,
    },
    viewPlansHeaderButton: {
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: 12,
      borderWidth: 2,
      backgroundColor: 'transparent',
    },
    statusCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    featureCard: {
      backgroundColor: theme.colors.primaryLight + '10',
      borderRadius: 16,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.primaryLight,
    },
    featureHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    benefitList: {
      gap: theme.spacing.sm,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    footer: {
      gap: theme.spacing.sm,
    },
    upgradeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: 16,
    },
    cancelButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: 16,
      borderWidth: 1,
    },
  });
