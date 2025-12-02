import { useAuth } from '@/contexts/AuthContext';
import type { Reward } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Coins, Gift, Info, Sparkles, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface RewardRedemptionModalProps {
  visible: boolean;
  reward: Reward | null;
  pointsBalance: number;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function RewardRedemptionModal({
  visible,
  reward,
  pointsBalance,
  onClose,
  onConfirm,
  loading = false,
}: RewardRedemptionModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { member } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pointsPulseAnim = useRef(new Animated.Value(1)).current;

  const themedStyles = styles(theme);

  useEffect(() => {
    if (visible) {
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

      // Pulse animation for points
      Animated.loop(
        Animated.sequence([
          Animated.timing(pointsPulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pointsPulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      pointsPulseAnim.setValue(1);
    }
  }, [visible]);

  if (!reward) return null;

  const pointsAfter = pointsBalance - reward.points_cost;
  const canAfford = pointsBalance >= reward.points_cost;

  const getCategoryLabel = (category: string) => {
    return t(`rewards.category.${category}` as any) || category;
  };

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
        <TouchableOpacity
          style={themedStyles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
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
              <Text style={[Typography.h3, { color: theme.colors.text }]}>
                {t('rewards.redeemConfirm')}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={themedStyles.closeButton}
                disabled={loading}
              >
                <X size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Reward Preview */}
            <View style={themedStyles.rewardPreview}>
              {reward.image_url ? (
                <Image
                  source={{ uri: reward.image_url }}
                  style={themedStyles.rewardImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[themedStyles.rewardImage, themedStyles.rewardImagePlaceholder]}>
                  <Gift size={48} color={theme.colors.primary} />
                </View>
              )}

              {/* Category Badge */}
              <View style={themedStyles.categoryBadge}>
                <Gift size={14} color={theme.colors.primary} />
                <Text style={themedStyles.categoryText}>
                  {getCategoryLabel(reward.category)}
                </Text>
              </View>

              {/* Title */}
              <Text style={[Typography.h3, { color: theme.colors.text, marginTop: 12, textAlign: 'center' }]}>
                {reward.title}
              </Text>

              {/* Description */}
              {reward.description && (
                <Text
                  style={[
                    Typography.body,
                    { color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center' },
                  ]}
                >
                  {reward.description}
                </Text>
              )}
            </View>

            {/* Points Information */}
            <View style={themedStyles.pointsSection}>
              <View style={themedStyles.pointsRow}>
                <View style={themedStyles.pointsIconContainer}>
                  <Coins size={20} color="#FFD700" />
                  <Sparkles size={12} color="#FFD700" style={themedStyles.sparkleIcon} />
                </View>
                <View style={themedStyles.pointsInfo}>
                  <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary }]}>
                    {t('rewards.currentBalance')}
                  </Text>
                  <Animated.View
                    style={{
                      transform: [{ scale: pointsPulseAnim }],
                    }}
                  >
                    <Text style={themedStyles.pointsValue}>
                      {pointsBalance.toLocaleString()} {t('rewards.points')}
                    </Text>
                  </Animated.View>
                </View>
              </View>

              <View style={themedStyles.divider} />

              <View style={themedStyles.pointsRow}>
                <View style={themedStyles.pointsIconContainer}>
                  <Gift size={20} color={theme.colors.primary} />
                </View>
                <View style={themedStyles.pointsInfo}>
                  <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary }]}>
                    {t('rewards.pointsRequired')}
                  </Text>
                  <Text style={[themedStyles.pointsValue, { color: theme.colors.primary }]}>
                    -{reward.points_cost.toLocaleString()} {t('rewards.points')}
                  </Text>
                </View>
              </View>

              <View style={themedStyles.divider} />

              <View style={themedStyles.pointsRow}>
                <View style={themedStyles.pointsIconContainer}>
                  <Coins size={20} color={canAfford ? theme.colors.success : theme.colors.error} />
                </View>
                <View style={themedStyles.pointsInfo}>
                  <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary }]}>
                    {t('rewards.balanceAfter')}
                  </Text>
                  <Text
                    style={[
                      themedStyles.pointsValue,
                      {
                        color: canAfford ? theme.colors.success : theme.colors.error,
                      },
                    ]}
                  >
                    {pointsAfter.toLocaleString()} {t('rewards.points')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Insufficient Points Warning */}
            {!canAfford && (
              <View style={[themedStyles.warningCard, { backgroundColor: theme.colors.error + '15' }]}>
                <Info size={20} color={theme.colors.error} />
                <Text style={[Typography.bodySmall, { color: theme.colors.error, marginLeft: 8, flex: 1 }]}>
                  {t('rewards.insufficientPointsMessage', {
                    required: reward.points_cost,
                    current: pointsBalance,
                  })}
                </Text>
              </View>
            )}

            {/* Terms & Conditions */}
            {reward.terms_conditions && (
              <View style={themedStyles.termsSection}>
                <Text style={[Typography.h4, { color: theme.colors.text, marginBottom: 8 }]}>
                  {t('rewards.termsConditions')}
                </Text>
                <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary }]}>
                  {reward.terms_conditions}
                </Text>
              </View>
            )}

            {/* Validity Info */}
            <View style={themedStyles.infoSection}>
              {reward.valid_until && (
                <View style={themedStyles.infoRow}>
                  <Info size={16} color={theme.colors.textSecondary} />
                  <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary, marginLeft: 8 }]}>
                    {t('rewards.validUntil')}: {new Date(reward.valid_until).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              )}
              {reward.stock_quantity !== null && (
                <View style={[themedStyles.infoRow, { marginTop: 4 }]}>
                  <Info size={16} color={theme.colors.textSecondary} />
                  <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary, marginLeft: 8 }]}>
                    {t('rewards.stockAvailable')}: {reward.stock_quantity - (reward._count?.redemptions || 0)} / {reward.stock_quantity}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={themedStyles.footer}>
            <TouchableOpacity
              style={[themedStyles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[Typography.bodyMedium, { color: theme.colors.text }]}>
                {t('rewards.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                themedStyles.confirmButton,
                {
                  backgroundColor: canAfford ? theme.colors.primary : theme.colors.border,
                  opacity: loading ? 0.6 : 1,
                },
              ]}
              onPress={onConfirm}
              disabled={!canAfford || loading}
            >
              {loading ? (
                <Text style={[Typography.bodyMedium, { color: theme.colors.textInverse }]}>
                  {t('rewards.redeeming')}
                </Text>
              ) : (
                <>
                  <Gift size={18} color={theme.colors.textInverse} />
                  <Text style={[Typography.bodyMedium, { color: theme.colors.textInverse, marginLeft: 8 }]}>
                    {t('rewards.confirmRedeem')}
                  </Text>
                </>
              )}
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
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlayTouchable: {
      ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
      width: '90%',
      maxWidth: 400,
      maxHeight: '90%',
      backgroundColor: theme.colors.background,
      borderRadius: 24,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    scrollContent: {
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    closeButton: {
      padding: 4,
    },
    rewardPreview: {
      alignItems: 'center',
      marginBottom: 24,
    },
    rewardImage: {
      width: '100%',
      height: 180,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
    },
    rewardImagePlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
    categoryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: theme.colors.primary + '15',
    },
    categoryText: {
      ...Typography.bodySmall,
      color: theme.colors.primary,
      marginLeft: 6,
      fontFamily: 'Inter-SemiBold',
    },
    pointsSection: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    pointsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    pointsIconContainer: {
      position: 'relative',
      marginRight: 12,
    },
    sparkleIcon: {
      position: 'absolute',
      top: -4,
      right: -4,
    },
    pointsInfo: {
      flex: 1,
    },
    pointsValue: {
      ...Typography.h3,
      color: '#FFD700',
      fontFamily: 'SpaceGrotesk-Bold',
      marginTop: 4,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 12,
    },
    warningCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      marginBottom: 16,
    },
    termsSection: {
      marginBottom: 16,
    },
    infoSection: {
      marginBottom: 8,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    footer: {
      flexDirection: 'row',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmButton: {
      flex: 2,
      flexDirection: 'row',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });



















