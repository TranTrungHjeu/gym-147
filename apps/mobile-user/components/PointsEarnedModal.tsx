import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Coins, Sparkles, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';

interface PointsEarnedModalProps {
  visible: boolean;
  onClose: () => void;
  points: number;
  source?: string;
  description?: string;
  newBalance?: number;
}

export default function PointsEarnedModal({
  visible,
  onClose,
  points,
  source,
  description,
  newBalance,
}: PointsEarnedModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);

      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto close after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const getSourceLabel = (source?: string) => {
    if (!source) return '';
    const sourceMap: Record<string, string> = {
      CHALLENGE: t('points.source.challenge') || 'Thử thách',
      STREAK: t('points.source.streak') || 'Chuỗi ngày',
      ACHIEVEMENT: t('points.source.achievement') || 'Thành tích',
      SYSTEM: t('points.source.system') || 'Hệ thống',
      REFUND: t('points.source.refund') || 'Hoàn tiền',
      ATTENDANCE: t('points.source.attendance') || 'Hoàn thành lớp học',
      PAYMENT: t('points.source.payment') || 'Thanh toán',
    };
    return sourceMap[source] || source;
  };

  const themedStyles = styles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={themedStyles.overlay}>
        <Animated.View
          style={[
            themedStyles.modal,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={themedStyles.closeButton}
            onPress={onClose}
          >
            <X size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={themedStyles.content}>
            {/* Icon with animation */}
            <View style={themedStyles.iconContainer}>
              <Coins size={64} color="#FFD700" />
              <Sparkles
                size={32}
                color="#FFD700"
                style={themedStyles.sparkleIcon}
              />
            </View>

            {/* Title */}
            <Text style={themedStyles.title}>
              {t('points.earned.title') || 'Bạn đã nhận được điểm!'}
            </Text>

            {/* Points amount */}
            <View style={themedStyles.pointsContainer}>
              <Text style={themedStyles.pointsLabel}>
                {t('points.earned.amount') || 'Số điểm nhận được'}
              </Text>
              <Text style={themedStyles.pointsValue}>+{points.toLocaleString()}</Text>
            </View>

            {/* Source */}
            {source && (
              <View style={themedStyles.sourceContainer}>
                <Text style={themedStyles.sourceLabel}>
                  {t('points.earned.from') || 'Từ'}
                </Text>
                <Text style={themedStyles.sourceValue}>
                  {getSourceLabel(source)}
                </Text>
              </View>
            )}

            {/* Description */}
            {description && (
              <Text style={themedStyles.description}>{description}</Text>
            )}

            {/* New balance */}
            {newBalance !== undefined && (
              <View style={themedStyles.balanceContainer}>
                <Text style={themedStyles.balanceLabel}>
                  {t('points.earned.newBalance') || 'Số điểm hiện tại'}
                </Text>
                <Text style={themedStyles.balanceValue}>
                  {newBalance.toLocaleString()} {t('rewards.points') || 'điểm'}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
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
      padding: 20,
    },
    modal: {
      backgroundColor: theme.colors.card,
      borderRadius: 24,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    closeButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      padding: 8,
      zIndex: 1,
    },
    content: {
      alignItems: 'center',
      width: '100%',
    },
    iconContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    sparkleIcon: {
      position: 'absolute',
      top: -8,
      right: -8,
    },
    title: {
      ...Typography.h4,
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk-Bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    pointsContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    pointsLabel: {
      ...Typography.caption,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    pointsValue: {
      fontSize: 48,
      fontFamily: 'SpaceGrotesk-Bold',
      color: '#FFD700',
      fontWeight: '700',
    },
    sourceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    sourceLabel: {
      ...Typography.bodySmall,
      color: theme.colors.textSecondary,
    },
    sourceValue: {
      ...Typography.body,
      color: theme.colors.primary,
      fontFamily: 'Inter-SemiBold',
    },
    description: {
      ...Typography.bodySmall,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    balanceContainer: {
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      width: '100%',
    },
    balanceLabel: {
      ...Typography.caption,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    balanceValue: {
      ...Typography.h6,
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk-SemiBold',
    },
  });


