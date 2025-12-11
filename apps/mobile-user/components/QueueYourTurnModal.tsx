import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Bell, Clock, X } from 'lucide-react-native';
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
import { playNotificationSound } from '@/utils/sound';

interface QueueYourTurnModalProps {
  visible: boolean;
  onClose: () => void;
  onUseNow?: () => void;
  equipmentName?: string;
  expiresInMinutes?: number;
  equipmentId?: string;
  queueId?: string;
}

export default function QueueYourTurnModal({
  visible,
  onClose,
  onUseNow,
  equipmentName = 'Thiết bị',
  expiresInMinutes = 5,
  equipmentId,
  queueId,
}: QueueYourTurnModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // Play notification sound when modal appears
      playNotificationSound().catch((error) => {
        console.error('[ERROR] Failed to play notification sound:', error);
      });

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
    }
  }, [visible]);

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
              <Bell size={64} color={theme.colors.primary} />
            </View>

            {/* Title */}
            <Text style={themedStyles.title}>
              {t('equipment.queue.yourTurn.title') || 'Đến lượt bạn!'}
            </Text>

            {/* Equipment name */}
            <View style={themedStyles.equipmentContainer}>
              <Text style={themedStyles.equipmentLabel}>
                {t('equipment.queue.yourTurn.equipment') || 'Thiết bị'}
              </Text>
              <Text style={themedStyles.equipmentName}>{equipmentName}</Text>
            </View>

            {/* Time remaining */}
            <View style={themedStyles.timeContainer}>
              <Clock size={20} color={theme.colors.warning} />
              <Text style={themedStyles.timeText}>
                {t('equipment.queue.yourTurn.timeRemaining', {
                  minutes: expiresInMinutes,
                }) ||
                  `Bạn có ${expiresInMinutes} phút để sử dụng thiết bị`}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={themedStyles.actionsContainer}>
              {onUseNow && (
                <TouchableOpacity
                  style={[themedStyles.button, themedStyles.primaryButton]}
                  onPress={() => {
                    onUseNow();
                    onClose();
                  }}
                >
                  <Text style={themedStyles.primaryButtonText}>
                    {t('equipment.queue.yourTurn.useNow') || 'Sử dụng ngay'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[themedStyles.button, themedStyles.secondaryButton]}
                onPress={onClose}
              >
                <Text style={themedStyles.secondaryButtonText}>
                  {t('equipment.queue.yourTurn.close') || 'Đóng'}
                </Text>
              </TouchableOpacity>
            </View>
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
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    closeButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 1,
      padding: 4,
    },
    content: {
      alignItems: 'center',
    },
    iconContainer: {
      marginBottom: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: Typography.h2.fontFamily,
      fontSize: Typography.h2.fontSize,
      lineHeight: Typography.h2.lineHeight,
      letterSpacing: Typography.h2.letterSpacing,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 24,
    },
    equipmentContainer: {
      width: '100%',
      marginBottom: 16,
      alignItems: 'center',
    },
    equipmentLabel: {
      fontFamily: Typography.bodySmall.fontFamily,
      fontSize: Typography.bodySmall.fontSize,
      lineHeight: Typography.bodySmall.lineHeight,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    equipmentName: {
      fontFamily: Typography.h3.fontFamily,
      fontSize: Typography.h3.fontSize,
      lineHeight: Typography.h3.lineHeight,
      letterSpacing: Typography.h3.letterSpacing,
      color: theme.colors.primary,
      textAlign: 'center',
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.warning + '20',
      borderRadius: 12,
    },
    timeText: {
      fontFamily: Typography.bodyMedium.fontFamily,
      fontSize: Typography.bodyMedium.fontSize,
      lineHeight: Typography.bodyMedium.lineHeight,
      color: theme.colors.warning,
      marginLeft: 8,
      fontWeight: '600',
    },
    actionsContainer: {
      width: '100%',
      gap: 12,
    },
    button: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    primaryButtonText: {
      fontFamily: Typography.buttonLarge.fontFamily,
      fontSize: Typography.buttonLarge.fontSize,
      lineHeight: Typography.buttonLarge.lineHeight,
      letterSpacing: Typography.buttonLarge.letterSpacing,
      color: theme.colors.textInverse,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    secondaryButtonText: {
      fontFamily: Typography.buttonLarge.fontFamily,
      fontSize: Typography.buttonLarge.fontSize,
      lineHeight: Typography.buttonLarge.lineHeight,
      letterSpacing: Typography.buttonLarge.letterSpacing,
      color: theme.colors.text,
      fontWeight: '600',
    },
  });

