import { MembershipBadge } from '@/components/MembershipBadge';
import { useAuth } from '@/contexts/AuthContext';
import { memberService } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { ArrowLeft, Share2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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

  const handleDownload = () => {
    Alert.alert('Download QR Code', 'QR Code download feature coming soon!', [
      { text: t('common.ok') },
    ]);
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
            🔄 Auto-refreshes every 30 seconds
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
        </View>

        {/* Info Card */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: theme.colors.info + '15' },
          ]}
        >
          <Text style={[Typography.bodySmall, { color: theme.colors.info }]}>
            ℹ️ For security, this QR code refreshes automatically every 30
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
