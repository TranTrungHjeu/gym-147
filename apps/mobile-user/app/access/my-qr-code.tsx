import { MembershipBadge } from '@/components/MembershipBadge';
import { useAuth } from '@/contexts/AuthContext';
import { memberService } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { ArrowLeft, Share2 } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
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

  const [qrValue, setQrValue] = useState('');
  const [memberProfile, setMemberProfile] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const qrCodeRef = useRef<View>(null);

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
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My Gym QR Code: ${qrValue}`,
        title: 'Gym147 QR Code',
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
    }
  };

  const handleDownload = async () => {
    if (!qrValue) {
      Alert.alert('Error', 'QR Code not available');
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
          message: `My Gym QR Code: ${qrValue}\n\nScan this code to check in at the gym.`,
          title: 'Gym147 QR Code',
        });
        setDownloading(false);
        return;
      }

      if (!captureRef || !qrCodeRef.current) {
        // Fallback to text sharing
        await Share.share({
          message: `My Gym QR Code: ${qrValue}\n\nScan this code to check in at the gym.`,
          title: 'Gym147 QR Code',
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
          dialogTitle: 'Share QR Code',
        });
      } else {
        Alert.alert('Success', 'QR Code saved to device');
      }
    } catch (error: any) {
      console.error('Error downloading QR code:', error);
      // Fallback to text sharing
      try {
        await Share.share({
          message: `My Gym QR Code: ${qrValue}\n\nScan this code to check in at the gym.`,
          title: 'Gym147 QR Code',
        });
      } catch (shareError) {
        Alert.alert('Error', 'Failed to share QR code. Please try again.');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: theme.colors.text, flex: 1 }]}>
          My QR Code
        </Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Share2 size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* User Info Card */}
        <View
          style={[
            styles.userCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.userInfo}>
            {memberProfile?.profile_photo ? (
              <Image
                source={{ uri: memberProfile.profile_photo }}
                style={styles.avatar}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: theme.colors.primary + '20' },
                ]}
              >
                <Text style={[Typography.h2, { color: theme.colors.primary }]}>
                  {memberProfile?.full_name?.charAt(0) || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={[Typography.h3, { color: theme.colors.text }]}>
                {memberProfile?.full_name || 'User'}
              </Text>
              {memberProfile?.membership_type && (
                <View style={{ marginTop: 4 }}>
                  <MembershipBadge
                    tier={memberProfile.membership_type}
                    size="small"
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <View
            ref={qrCodeRef}
            style={[
              styles.qrCodeWrapper,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            {qrValue ? (
              <QRCode
                key={refreshKey}
                value={qrValue}
                size={250}
                color={theme.colors.text}
                backgroundColor={theme.colors.surface}
                logo={require('@/assets/images/logo.png')}
                logoSize={50}
                logoBackgroundColor={theme.colors.surface}
                logoBorderRadius={25}
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text
                  style={[
                    Typography.bodyRegular,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Generating QR Code...
                </Text>
              </View>
            )}
          </View>

          <Text
            style={[
              Typography.bodySmall,
              {
                color: theme.colors.textSecondary,
                textAlign: 'center',
                marginTop: 16,
              },
            ]}
          >
            Show this QR code to staff for check-in
          </Text>

          <Text
            style={[
              Typography.caption,
              {
                color: theme.colors.textSecondary,
                textAlign: 'center',
                marginTop: 8,
              },
            ]}
          >
            [SYNC] Auto-refreshes every 30 seconds
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.colors.primary,
                flex: 1,
              },
            ]}
            onPress={generateQRCode}
          >
            <Text
              style={[
                Typography.bodyMedium,
                { color: theme.colors.textInverse, fontWeight: '600' },
              ]}
            >
              Refresh QR Code
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor:
                  theme.colors.secondary || theme.colors.primary + '80',
                flex: 1,
              },
            ]}
            onPress={handleDownload}
            disabled={downloading || !qrValue}
          >
            <Text
              style={[
                Typography.bodyMedium,
                { color: theme.colors.textInverse, fontWeight: '600' },
              ]}
            >
              {downloading ? 'Downloading...' : 'Download QR Code'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: theme.colors.info + '15' },
          ]}
        >
          <Text style={[Typography.bodySmall, { color: theme.colors.info }]}>
            [INFO] For security, this QR code refreshes automatically every 30
            seconds. Staff can scan it for quick check-in.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    padding: 20,
  },
  userCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrCodeWrapper: {
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  qrPlaceholder: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
  },
});
