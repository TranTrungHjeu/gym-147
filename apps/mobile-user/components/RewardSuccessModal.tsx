import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { CheckCircle, Copy, Gift, Share2, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RewardSuccessModalProps {
  visible: boolean;
  rewardTitle: string;
  rewardImageUrl?: string | null;
  redemptionCode: string;
  pointsSpent: number;
  newBalance: number;
  onClose: () => void;
  onViewHistory?: () => void;
}

interface ConfettiParticle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  scale: Animated.Value;
  color: string;
}

export default function RewardSuccessModal({
  visible,
  rewardTitle,
  rewardImageUrl,
  redemptionCode,
  pointsSpent,
  newBalance,
  onClose,
  onViewHistory,
}: RewardSuccessModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [codeCopied, setCodeCopied] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const successIconScale = useRef(new Animated.Value(0)).current;
  const confettiParticles = useRef<ConfettiParticle[]>([]).current;

  const themedStyles = styles(theme);

  // Colors for confetti
  const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

  useEffect(() => {
    if (visible) {
      // Initialize confetti particles
      confettiParticles.length = 0;
      for (let i = 0; i < 50; i++) {
        confettiParticles.push({
          id: i,
          x: new Animated.Value(Math.random() * SCREEN_WIDTH),
          y: new Animated.Value(-20),
          rotation: new Animated.Value(0),
          scale: new Animated.Value(1),
          color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        });
      }

      // Animate confetti
      confettiParticles.forEach((particle) => {
        Animated.parallel([
          Animated.timing(particle.y, {
            toValue: SCREEN_WIDTH + 100,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.x, {
            toValue: particle.x._value + (Math.random() - 0.5) * 200,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.rotation, {
            toValue: Math.random() * 360,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
        ]).start();
      });

      // Animate modal entrance
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
        Animated.sequence([
          Animated.delay(200),
          Animated.spring(successIconScale, {
            toValue: 1,
            tension: 50,
            friction: 5,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      successIconScale.setValue(0);
      confettiParticles.forEach((particle) => {
        particle.y.setValue(-20);
        particle.x.setValue(Math.random() * SCREEN_WIDTH);
      });
    }
  }, [visible]);

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(redemptionCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleShare = async () => {
    // Share functionality can be implemented with expo-sharing
    // For now, just copy to clipboard
    await handleCopyCode();
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
        {/* Confetti */}
        {visible && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {confettiParticles.map((particle) => (
              <Animated.View
                key={particle.id}
                style={[
                  themedStyles.confetti,
                  {
                    backgroundColor: particle.color,
                    transform: [
                      { translateX: particle.x },
                      { translateY: particle.y },
                      { rotate: particle.rotation.interpolate({
                          inputRange: [0, 360],
                          outputRange: ['0deg', '360deg'],
                        }) },
                      { scale: particle.scale },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        )}

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
            {/* Success Icon */}
            <Animated.View
              style={[
                themedStyles.successIconContainer,
                {
                  transform: [{ scale: successIconScale }],
                },
              ]}
            >
              <View style={[themedStyles.successIconCircle, { backgroundColor: theme.colors.success + '20' }]}>
                <CheckCircle size={64} color={theme.colors.success} />
              </View>
            </Animated.View>

            {/* Title */}
            <Text style={[Typography.h2, { color: theme.colors.text, textAlign: 'center', marginTop: 20 }]}>
              {t('rewards.successTitle')}
            </Text>

            {/* Message */}
            <Text style={[Typography.body, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
              {t('rewards.successMessage')}
            </Text>

            {/* Reward Preview */}
            <View style={themedStyles.rewardPreview}>
              {rewardImageUrl ? (
                <Image
                  source={{ uri: rewardImageUrl }}
                  style={themedStyles.rewardImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[themedStyles.rewardImage, themedStyles.rewardImagePlaceholder]}>
                  <Gift size={48} color={theme.colors.primary} />
                </View>
              )}
              <Text style={[Typography.h3, { color: theme.colors.text, marginTop: 12, textAlign: 'center' }]}>
                {rewardTitle}
              </Text>
            </View>

            {/* Redemption Code Section */}
            <View style={themedStyles.codeSection}>
              <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
                {t('rewards.redemptionCode')}
              </Text>
              <View style={themedStyles.codeContainer}>
                <Text style={themedStyles.codeText}>{redemptionCode}</Text>
                <TouchableOpacity
                  style={themedStyles.copyButton}
                  onPress={handleCopyCode}
                >
                  {codeCopied ? (
                    <CheckCircle size={20} color={theme.colors.success} />
                  ) : (
                    <Copy size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
              {codeCopied && (
                <Text style={[Typography.caption, { color: theme.colors.success, marginTop: 4, textAlign: 'center' }]}>
                  {t('rewards.codeCopied')}
                </Text>
              )}
            </View>

            {/* QR Code */}
            <View style={themedStyles.qrSection}>
              <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary, marginBottom: 12, textAlign: 'center' }]}>
                {t('rewards.qrCodeDescription')}
              </Text>
              <View style={themedStyles.qrContainer}>
                <QRCode
                  value={redemptionCode}
                  size={200}
                  color={theme.colors.text}
                  backgroundColor={theme.colors.background}
                />
              </View>
            </View>

            {/* Points Info */}
            <View style={themedStyles.pointsInfo}>
              <View style={themedStyles.pointsRow}>
                <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary }]}>
                  {t('rewards.pointsSpent')}: 
                </Text>
                <Text style={[Typography.bodyMedium, { color: theme.colors.primary, marginLeft: 8 }]}>
                  -{pointsSpent.toLocaleString()} {t('rewards.points')}
                </Text>
              </View>
              <View style={themedStyles.pointsRow}>
                <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary }]}>
                  {t('rewards.currentBalance')}: 
                </Text>
                <Text style={[Typography.bodyMedium, { color: theme.colors.success, marginLeft: 8 }]}>
                  {newBalance.toLocaleString()} {t('rewards.points')}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={themedStyles.footer}>
            <TouchableOpacity
              style={[themedStyles.secondaryButton, { borderColor: theme.colors.border }]}
              onPress={onViewHistory}
            >
              <Text style={[Typography.bodyMedium, { color: theme.colors.text }]}>
                {t('rewards.viewHistory')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[themedStyles.primaryButton, { backgroundColor: theme.colors.primary }]}
              onPress={onClose}
            >
              <Text style={[Typography.bodyMedium, { color: theme.colors.textInverse }]}>
                {t('common.done')}
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
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    confetti: {
      width: 10,
      height: 10,
      position: 'absolute',
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
      padding: 24,
      alignItems: 'center',
    },
    successIconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    successIconCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rewardPreview: {
      width: '100%',
      alignItems: 'center',
      marginTop: 24,
    },
    rewardImage: {
      width: '100%',
      height: 160,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
    },
    rewardImagePlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
    codeSection: {
      width: '100%',
      marginTop: 24,
    },
    codeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      borderColor: theme.colors.primary + '30',
    },
    codeText: {
      ...Typography.h3,
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk-Bold',
      flex: 1,
      letterSpacing: 2,
    },
    copyButton: {
      padding: 8,
      marginLeft: 12,
    },
    qrSection: {
      width: '100%',
      alignItems: 'center',
      marginTop: 24,
    },
    qrContainer: {
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    pointsInfo: {
      width: '100%',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginTop: 24,
    },
    pointsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    footer: {
      flexDirection: 'row',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: 12,
    },
    secondaryButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });





















