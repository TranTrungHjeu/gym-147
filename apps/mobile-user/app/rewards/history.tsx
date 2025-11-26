import { useAuth } from '@/contexts/AuthContext';
import { rewardService, type RewardRedemption } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  Gift,
  QrCode,
  X,
  XCircle,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

export default function RewardHistoryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, member } = useAuth();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedRedemption, setSelectedRedemption] = useState<RewardRedemption | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const themedStyles = styles(theme);

  useEffect(() => {
    if (member?.id) {
      loadHistory();
    }
  }, [member?.id]);

  const loadHistory = async () => {
    if (!member?.id) return;

    try {
      setLoading(true);
      const response = await rewardService.getMemberRedemptions(member.id);

      if (response.success && response.data) {
        // Sort by redeemed_at descending (newest first)
        const sorted = [...response.data].sort(
          (a, b) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime()
        );
        setRedemptions(sorted);
      }
    } catch (error) {
      console.error('Error loading redemption history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: theme.colors.warning,
      ACTIVE: theme.colors.success,
      USED: theme.colors.info,
      EXPIRED: theme.colors.textSecondary,
      CANCELLED: theme.colors.error,
      REFUNDED: theme.colors.textSecondary,
    };
    return colors[status] || theme.colors.textSecondary;
  };

  const getStatusLabel = (status: string) => {
    return t(`rewards.statusLabel.${status}` as any) || status;
  };

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleShowQR = (redemption: RewardRedemption) => {
    setSelectedRedemption(redemption);
    setShowQRModal(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'USED':
        return <CheckCircle size={18} color={getStatusColor(status)} />;
      case 'EXPIRED':
      case 'CANCELLED':
      case 'REFUNDED':
        return <XCircle size={18} color={getStatusColor(status)} />;
      default:
        return <Clock size={18} color={getStatusColor(status)} />;
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[themedStyles.container, themedStyles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={themedStyles.container}>
      {/* Header */}
      <View style={themedStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={themedStyles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: theme.colors.text, flex: 1 }]}>
          {t('rewards.history')}
        </Text>
      </View>

      <ScrollView
        style={themedStyles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {redemptions.length === 0 ? (
          <View style={themedStyles.emptyState}>
            <Gift size={64} color={theme.colors.textSecondary} />
            <Text style={[Typography.h4, { color: theme.colors.text, marginTop: 16 }]}>
              {t('rewards.noHistory')}
            </Text>
            <Text style={[Typography.body, { color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
              {t('rewards.noHistoryMessage')}
            </Text>
            <TouchableOpacity
              style={[themedStyles.exploreButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.push('/rewards')}
            >
              <Text style={[Typography.bodyMedium, { color: theme.colors.textInverse }]}>
                {t('rewards.title')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={themedStyles.list}>
            {redemptions.map((redemption) => (
              <View key={redemption.id} style={themedStyles.redemptionCard}>
                {/* Reward Info */}
                <View style={themedStyles.redemptionHeader}>
                  <View style={themedStyles.rewardInfo}>
                    {redemption.reward?.image_url ? (
                      <View style={themedStyles.rewardImageContainer}>
                        <View style={[themedStyles.rewardImage, { backgroundColor: theme.colors.surface }]}>
                          <Gift size={24} color={theme.colors.primary} />
                        </View>
                      </View>
                    ) : (
                      <View style={[themedStyles.rewardImage, { backgroundColor: theme.colors.surface }]}>
                        <Gift size={24} color={theme.colors.primary} />
                      </View>
                    )}
                    <View style={themedStyles.rewardDetails}>
                      <Text style={[Typography.bodyMedium, { color: theme.colors.text }]} numberOfLines={2}>
                        {redemption.reward?.title || t('rewards.title')}
                      </Text>
                      <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                        {redemption.points_spent.toLocaleString()} {t('rewards.points')}
                      </Text>
                    </View>
                  </View>
                  {/* Status Badge */}
                  <View
                    style={[
                      themedStyles.statusBadge,
                      { backgroundColor: getStatusColor(redemption.status) + '15' },
                    ]}
                  >
                    {getStatusIcon(redemption.status)}
                    <Text
                      style={[
                        Typography.caption,
                        { color: getStatusColor(redemption.status), marginLeft: 4 },
                      ]}
                    >
                      {getStatusLabel(redemption.status)}
                    </Text>
                  </View>
                </View>

                {/* Code (if available) */}
                {redemption.code && (
                  <View style={themedStyles.codeContainer}>
                    <View style={themedStyles.codeRow}>
                      <View style={themedStyles.codeInfo}>
                        <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary }]}>
                          {t('rewards.redemptionCode')}:
                        </Text>
                        <Text style={[Typography.bodyMedium, { color: theme.colors.text, fontFamily: 'SpaceGrotesk-Bold', marginTop: 4, letterSpacing: 1 }]}>
                          {redemption.code}
                        </Text>
                      </View>
                      <View style={themedStyles.codeActions}>
                        <TouchableOpacity
                          style={themedStyles.codeActionButton}
                          onPress={() => handleCopyCode(redemption.code!)}
                        >
                          {codeCopied ? (
                            <CheckCircle size={20} color={theme.colors.success} />
                          ) : (
                            <Copy size={20} color={theme.colors.primary} />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={themedStyles.codeActionButton}
                          onPress={() => handleShowQR(redemption)}
                        >
                          <QrCode size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {codeCopied && (
                      <Text style={[Typography.caption, { color: theme.colors.success, marginTop: 8, textAlign: 'center' }]}>
                        {t('rewards.codeCopied')}
                      </Text>
                    )}
                  </View>
                )}

                {/* Dates */}
                <View style={themedStyles.datesContainer}>
                  <View style={themedStyles.dateRow}>
                    <Calendar size={14} color={theme.colors.textSecondary} />
                    <Text style={[Typography.caption, { color: theme.colors.textSecondary, marginLeft: 6 }]}>
                      {t('rewards.redeemedAt')}: {formatDate(redemption.redeemed_at)}
                    </Text>
                  </View>
                  {redemption.used_at && (
                    <View style={[themedStyles.dateRow, { marginTop: 4 }]}>
                      <CheckCircle size={14} color={theme.colors.success} />
                      <Text style={[Typography.caption, { color: theme.colors.success, marginLeft: 6 }]}>
                        {t('rewards.usedAt')}: {formatDate(redemption.used_at)}
                      </Text>
                    </View>
                  )}
                  {redemption.expires_at && (
                    <View style={[themedStyles.dateRow, { marginTop: 4 }]}>
                      <Clock size={14} color={theme.colors.warning} />
                      <Text style={[Typography.caption, { color: theme.colors.warning, marginLeft: 6 }]}>
                        {t('rewards.expiresAt')}: {formatDate(redemption.expires_at)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Notes */}
                {redemption.notes && (
                  <View style={themedStyles.notesContainer}>
                    <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary }]}>
                      {redemption.notes}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={themedStyles.qrModalOverlay}>
          <View style={themedStyles.qrModalContainer}>
            <View style={themedStyles.qrModalHeader}>
              <Text style={[Typography.h3, { color: theme.colors.text }]}>
                {t('rewards.qrCode')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowQRModal(false)}
                style={themedStyles.qrModalCloseButton}
              >
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            {selectedRedemption?.code && (
              <>
                <View style={themedStyles.qrCodeWrapper}>
                  <QRCode
                    value={selectedRedemption.code}
                    size={250}
                    color={theme.colors.text}
                    backgroundColor={theme.colors.background}
                  />
                </View>
                <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 16, textAlign: 'center' }]}>
                  {t('rewards.qrCodeDescription')}
                </Text>
                <View style={themedStyles.qrCodeContainer}>
                  <Text style={[Typography.bodyMedium, { color: theme.colors.text, fontFamily: 'SpaceGrotesk-Bold', letterSpacing: 2 }]}>
                    {selectedRedemption.code}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[themedStyles.copyCodeButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => handleCopyCode(selectedRedemption.code!)}
                >
                  {codeCopied ? (
                    <>
                      <CheckCircle size={20} color={theme.colors.textInverse} />
                      <Text style={[Typography.bodyMedium, { color: theme.colors.textInverse, marginLeft: 8 }]}>
                        {t('rewards.codeCopied')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Copy size={20} color={theme.colors.textInverse} />
                      <Text style={[Typography.bodyMedium, { color: theme.colors.textInverse, marginLeft: 8 }]}>
                        {t('rewards.copyCode')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    backButton: {
      marginRight: 12,
    },
    scrollView: {
      flex: 1,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      minHeight: 400,
    },
    exploreButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 24,
    },
    list: {
      padding: 16,
    },
    redemptionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    redemptionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    rewardInfo: {
      flexDirection: 'row',
      flex: 1,
      marginRight: 12,
    },
    rewardImageContainer: {
      marginRight: 12,
    },
    rewardImage: {
      width: 48,
      height: 48,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rewardDetails: {
      flex: 1,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    codeContainer: {
      padding: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      marginBottom: 12,
    },
    codeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    codeInfo: {
      flex: 1,
    },
    codeActions: {
      flexDirection: 'row',
      gap: 8,
    },
    codeActionButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
    },
    datesContainer: {
      marginTop: 8,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    notesContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    qrModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    qrModalContainer: {
      width: '90%',
      maxWidth: 400,
      backgroundColor: theme.colors.background,
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
    },
    qrModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: 20,
    },
    qrModalCloseButton: {
      padding: 4,
    },
    qrCodeWrapper: {
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    qrCodeContainer: {
      marginTop: 16,
      padding: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    copyCodeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      marginTop: 20,
      width: '100%',
    },
  });

