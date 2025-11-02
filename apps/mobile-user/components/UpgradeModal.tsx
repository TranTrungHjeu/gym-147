import { MembershipBadge } from '@/components/MembershipBadge';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { Crown, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
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

  const handleUpgrade = () => {
    onClose();
    router.push('/subscription/plans');
  };

  const themedStyles = styles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={themedStyles.overlay}>
        <View style={themedStyles.modalContainer}>
          {/* Header */}
          <View style={themedStyles.header}>
            <View style={themedStyles.headerContent}>
              <View
                style={[
                  themedStyles.iconContainer,
                  { backgroundColor: theme.colors.warning + '20' },
                ]}
              >
                <Crown size={32} color={theme.colors.warning} />
              </View>
              <Text style={[Typography.h3, { color: theme.colors.text }]}>
                {t('workouts.premiumFeature')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={themedStyles.closeButton}
            >
              <X size={24} color={theme.colors.text} />
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
                Your current plan:
              </Text>
              <MembershipBadge
                tier={currentTier}
                size="medium"
                showLabel={true}
                animated={false}
              />
            </View>

            {feature && (
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
              {t('workouts.upgradeMessage')}
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
              {t('profile.membershipBenefits.PREMIUM', {
                returnObjects: true,
              }).map((benefit: string, index: number) => (
                <View key={index} style={themedStyles.benefitItem}>
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontSize: 18,
                      fontWeight: 'bold',
                    }}
                  >
                    ✓
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
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleUpgrade}
            >
              <Crown size={20} color={theme.colors.textInverse} />
              <Text
                style={[
                  Typography.bodyLarge,
                  {
                    color: theme.colors.textInverse,
                    marginLeft: 8,
                    fontWeight: '600',
                  },
                ]}
              >
                {currentTier === 'PREMIUM'
                  ? t('profile.upgradeToPremium').replace('Premium', 'VIP')
                  : t('profile.upgradeNow')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                themedStyles.viewPlansButton,
                { borderColor: theme.colors.border },
              ]}
              onPress={handleUpgrade}
            >
              <Text
                style={[
                  Typography.bodyRegular,
                  { color: theme.colors.primary },
                ]}
              >
                {t('profile.viewPlans')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerContent: {
      flex: 1,
      alignItems: 'center',
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: theme.radius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    currentTierContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
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
    },
    viewPlansButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      backgroundColor: 'transparent',
    },
  });
