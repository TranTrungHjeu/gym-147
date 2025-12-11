import { MembershipBadge } from '@/components/MembershipBadge';
import { useAuth } from '@/contexts/AuthContext';
import { memberService } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Share2,
  Shield,
  User,
  CreditCard,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  Image,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyQRCodeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const themedStyles = styles(theme);

  const [qrValue, setQrValue] = useState('');
  const [memberProfile, setMemberProfile] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const qrCodeRef = useRef<View>(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadMemberProfile();
    generateQRCode();

    // Auto-refresh QR code every 30 seconds for security
    const interval = setInterval(() => {
      generateQRCode();
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const loadMemberProfile = async () => {
    try {
      const response = await memberService.getMemberProfile();
      if (response.success && response.data) {
        setMemberProfile(response.data);
      }
    } catch (error) {
      console.error('Error loading member profile:', error);
    }
  };

  const generateQRCode = () => {
    if (!user?.id) return;

    const timestamp = Date.now();
    // Format: GYM_MEMBER:{userId}:{timestamp}
    const qrData = `GYM_MEMBER:${user.id}:${timestamp}`;
    setQrValue(qrData);
    setRefreshKey((prev) => prev + 1);
    setLastRefreshTime(new Date());
  };

  const handleManualRefresh = () => {
    setRefreshing(true);

    // Start rotation animation
    rotateAnim.setValue(0);
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    generateQRCode();
    setTimeout(() => {
      setRefreshing(false);
      rotateAnim.setValue(0);
    }, 500);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: t('qrCode.shareMessage', {
          defaultValue: 'My Gym QR Code: {{qrValue}}',
          qrValue,
        }),
        title: t('qrCode.shareTitle', { defaultValue: 'Gym147 QR Code' }),
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
    }
  };

  const handleDownload = async () => {
    if (!qrValue) {
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        t('qrCode.notAvailable', { defaultValue: 'QR Code not available' })
      );
      return;
    }

    try {
      setDownloading(true);

      // Try to use react-native-view-shot if available
      let captureRef: any;
      let FileSystem: any;
      let Sharing: any;

      try {
        const viewShot = require('react-native-view-shot');
        captureRef = viewShot.captureRef || viewShot.default?.captureRef;
        FileSystem = require('expo-file-system').default;
        Sharing = require('expo-sharing').default;
      } catch (e) {
        // Fallback: Share QR code data as text
        await Share.share({
          message: t('qrCode.shareMessageWithInstructions', {
            defaultValue:
              'My Gym QR Code: {{qrValue}}\n\nScan this code to check in at the gym.',
            qrValue,
          }),
          title: t('qrCode.shareTitle', { defaultValue: 'Gym147 QR Code' }),
        });
        setDownloading(false);
        return;
      }

      if (!captureRef || !qrCodeRef.current) {
        // Fallback to text sharing
        await Share.share({
          message: t('qrCode.shareMessageWithInstructions', {
            defaultValue:
              'My Gym QR Code: {{qrValue}}\n\nScan this code to check in at the gym.',
            qrValue,
          }),
          title: t('qrCode.shareTitle', { defaultValue: 'Gym147 QR Code' }),
        });
        setDownloading(false);
        return;
      }

      // Capture the QR code view as an image
      const uri = await captureRef(qrCodeRef.current, {
        format: 'png',
        quality: 1.0,
      });

      // Create a filename with timestamp
      const filename = `QRCode_${user?.id || 'user'}_${Date.now()}.png`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Copy the captured image to a permanent location
      await FileSystem.copyAsync({
        from: uri,
        to: fileUri,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/png',
          dialogTitle: t('qrCode.shareDialogTitle', {
            defaultValue: 'Share QR Code',
          }),
        });
      } else {
        Alert.alert(
          t('common.success', { defaultValue: 'Success' }),
          t('qrCode.savedToDevice', {
            defaultValue: 'QR Code saved to device',
          })
        );
      }
    } catch (error: any) {
      console.error('Error downloading QR code:', error);
      // Fallback to text sharing
      try {
        await Share.share({
          message: t('qrCode.shareMessageWithInstructions', {
            defaultValue:
              'My Gym QR Code: {{qrValue}}\n\nScan this code to check in at the gym.',
            qrValue,
          }),
          title: t('qrCode.shareTitle', { defaultValue: 'Gym147 QR Code' }),
        });
      } catch (shareError) {
        Alert.alert(
          t('common.error', { defaultValue: 'Error' }),
          t('qrCode.shareError', {
            defaultValue: 'Failed to share QR code. Please try again.',
          })
        );
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        themedStyles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View style={themedStyles.header}>
        <TouchableOpacity
          style={themedStyles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: theme.colors.text, flex: 1 }]}>
          {t('qrCode.title', { defaultValue: 'My QR Code' })}
        </Text>
        <TouchableOpacity
          style={themedStyles.shareButton}
          onPress={handleShare}
        >
          <Share2 size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={themedStyles.content}>
        {/* User Info Card */}
        <View
          style={[
            themedStyles.userCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.primary + '15',
            },
          ]}
        >
          <View style={themedStyles.userCardContent}>
            <View style={themedStyles.userInfo}>
              {memberProfile?.profile_photo ? (
                <View style={themedStyles.avatarContainer}>
                  <Image
                    source={{ uri: memberProfile.profile_photo }}
                    style={themedStyles.avatar}
                  />
                  <View
                    style={[
                      themedStyles.avatarBadge,
                      { backgroundColor: theme.colors.success },
                    ]}
                  />
                </View>
              ) : (
                <View
                  style={[
                    themedStyles.avatarContainer,
                    themedStyles.avatarPlaceholder,
                    { backgroundColor: theme.colors.primary + '15' },
                  ]}
                >
                  <User size={24} color={theme.colors.primary} />
                  <View
                    style={[
                      themedStyles.avatarBadge,
                      { backgroundColor: theme.colors.success },
                    ]}
                  />
                </View>
              )}
              <View style={themedStyles.userDetails}>
                <Text
                  style={[
                    Typography.h4,
                    {
                      color: theme.colors.text,
                      fontWeight: '700',
                      marginBottom: 4,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {memberProfile?.full_name ||
                    t('common.user', { defaultValue: 'User' })}
                </Text>
                {memberProfile?.membership_number && (
                  <View style={themedStyles.membershipNumberRow}>
                    <CreditCard size={12} color={theme.colors.textSecondary} />
                    <Text
                      style={[
                        Typography.caption,
                        {
                          color: theme.colors.textSecondary,
                          marginLeft: 4,
                          fontFamily: 'JetBrainsMono-Regular',
                        },
                      ]}
                    >
                      {memberProfile.membership_number}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            {memberProfile?.membership_type && (
              <View style={themedStyles.badgeContainer}>
                <MembershipBadge
                  tier={memberProfile.membership_type}
                  size="medium"
                />
              </View>
            )}
          </View>
        </View>

        {/* QR Code */}
        <View style={themedStyles.qrContainer}>
          <View
            ref={qrCodeRef}
            style={[
              themedStyles.qrCodeWrapper,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.primary + '20',
              },
            ]}
          >
            {qrValue ? (
              <>
                <QRCode
                  key={refreshKey}
                  value={qrValue}
                  size={220}
                  color={theme.colors.text}
                  backgroundColor={theme.colors.surface}
                  logo={require('@/assets/images/logo.png')}
                  logoSize={40}
                  logoBackgroundColor={theme.colors.surface}
                  logoBorderRadius={20}
                />
                <View style={themedStyles.syncIndicator}>
                  <Shield size={12} color={theme.colors.primary} />
                  <Text
                    style={[
                      themedStyles.syncText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {t('qrCode.secure', { defaultValue: 'Secure' })}
                  </Text>
                </View>
              </>
            ) : (
              <View style={themedStyles.qrPlaceholder}>
                <Text
                  style={[
                    Typography.bodyRegular,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('qrCode.generating', {
                    defaultValue: 'Generating QR Code...',
                  })}
                </Text>
              </View>
            )}
          </View>

          <View style={themedStyles.qrInfoContainer}>
            <View style={themedStyles.qrInfoRow}>
              <CheckCircle2 size={16} color={theme.colors.success} />
              <Text
                style={[
                  Typography.bodySmall,
                  {
                    color: theme.colors.text,
                    marginLeft: 8,
                    flex: 1,
                  },
                ]}
              >
                {t('qrCode.showToStaff', {
                  defaultValue: 'Show this QR code to staff for check-in',
                })}
              </Text>
            </View>

            {lastRefreshTime && (
              <View
                style={[
                  themedStyles.refreshInfo,
                  { backgroundColor: theme.colors.primary + '10' },
                ]}
              >
                <RefreshCw size={14} color={theme.colors.primary} />
                <Text
                  style={[
                    Typography.caption,
                    {
                      color: theme.colors.primary,
                      marginLeft: 6,
                    },
                  ]}
                >
                  {t('qrCode.lastRefresh', {
                    defaultValue: 'Last refresh: {{time}}',
                    time: lastRefreshTime.toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  })}
                </Text>
              </View>
            )}

            <View style={themedStyles.autoRefreshInfo}>
              <Text
                style={[
                  Typography.caption,
                  {
                    color: theme.colors.textSecondary,
                    textAlign: 'center',
                  },
                ]}
              >
                {t('qrCode.autoRefresh', {
                  defaultValue: 'Auto-refreshes every 30 seconds for security',
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={themedStyles.actions}>
          <TouchableOpacity
            style={[
              themedStyles.actionButton,
              {
                backgroundColor: theme.colors.primary,
                flex: 1,
                opacity: refreshing ? 0.7 : 1,
              },
            ]}
            onPress={handleManualRefresh}
            disabled={refreshing}
          >
            <Animated.View
              style={{
                transform: [{ rotate: rotateInterpolate }],
              }}
            >
              <RefreshCw size={18} color={theme.colors.textInverse} />
            </Animated.View>
            <Text
              style={[
                Typography.bodyMedium,
                {
                  color: theme.colors.textInverse,
                  fontWeight: '600',
                  marginLeft: 8,
                },
              ]}
            >
              {refreshing
                ? t('qrCode.refreshing', { defaultValue: 'Refreshing...' })
                : t('qrCode.refresh', { defaultValue: 'Refresh QR Code' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              themedStyles.actionButton,
              {
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                flex: 1,
              },
            ]}
            onPress={handleDownload}
            disabled={downloading || !qrValue}
          >
            <Share2 size={18} color={theme.colors.primary} />
            <Text
              style={[
                Typography.bodyMedium,
                {
                  color: theme.colors.primary,
                  fontWeight: '600',
                  marginLeft: 8,
                },
              ]}
            >
              {downloading
                ? t('qrCode.downloading', { defaultValue: 'Downloading...' })
                : t('qrCode.download', { defaultValue: 'Download' })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Security Info Card */}
        <View
          style={[
            themedStyles.infoCard,
            {
              backgroundColor: theme.colors.primary + '08',
              borderColor: theme.colors.primary + '20',
            },
          ]}
        >
          <View style={themedStyles.infoHeader}>
            <Shield size={18} color={theme.colors.primary} />
            <Text
              style={[
                Typography.bodyMedium,
                {
                  color: theme.colors.primary,
                  marginLeft: 8,
                  fontWeight: '600',
                },
              ]}
            >
              {t('qrCode.securityInfo', {
                defaultValue: 'Security Information',
              })}
            </Text>
          </View>
          <Text
            style={[
              Typography.bodySmall,
              {
                color: theme.colors.textSecondary,
                marginTop: 8,
                lineHeight: 20,
              },
            ]}
          >
            {t('qrCode.securityDescription', {
              defaultValue:
                'This QR code automatically refreshes every 30 seconds to ensure your account security. Staff members can scan it for quick and secure check-in at the gym.',
            })}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    shareButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    userCard: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1.5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    userCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatarContainer: {
      position: 'relative',
      marginRight: 12,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 2.5,
      borderColor: theme.colors.primary + '20',
    },
    avatarPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.primary + '20',
    },
    avatarBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2.5,
      borderColor: theme.colors.surface,
    },
    userDetails: {
      flex: 1,
      minWidth: 0,
    },
    membershipNumberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    badgeContainer: {
      marginLeft: 12,
    },
    qrContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    qrCodeWrapper: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      position: 'relative',
    },
    syncIndicator: {
      position: 'absolute',
      top: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    syncText: {
      ...Typography.caption,
      fontWeight: '600',
      fontSize: 10,
    },
    qrInfoContainer: {
      width: '100%',
      marginTop: 12,
      gap: 8,
    },
    qrInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    refreshInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignSelf: 'center',
    },
    autoRefreshInfo: {
      marginTop: 4,
    },
    qrPlaceholder: {
      width: 220,
      height: 220,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    infoCard: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    infoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
