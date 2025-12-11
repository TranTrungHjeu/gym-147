import { useAuth } from '@/contexts/AuthContext';
import queueService, {
  EquipmentQueueResponse,
  QueuePositionResponse,
} from '@/services/queue/queue.service';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface EquipmentQueueModalProps {
  visible: boolean;
  onClose: () => void;
  equipmentId: string;
  equipmentName: string;
}

export const EquipmentQueueModal: React.FC<EquipmentQueueModalProps> = ({
  visible,
  onClose,
  equipmentId,
  equipmentName,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [myPosition, setMyPosition] = useState<QueuePositionResponse | null>(
    null
  );
  const [queueData, setQueueData] = useState<EquipmentQueueResponse | null>(
    null
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible && equipmentId) {
      loadQueueData();
    }
  }, [visible, equipmentId]);

  const loadQueueData = async () => {
    setLoading(true);
    try {
      const [positionRes, queueRes] = await Promise.all([
        queueService.getQueuePosition(equipmentId),
        queueService.getEquipmentQueue(equipmentId),
      ]);

      if (positionRes.success && positionRes.data) {
        setMyPosition(positionRes.data);
      }

      if (queueRes.success && queueRes.data) {
        setQueueData(queueRes.data);
      }
    } catch (error) {
      console.error('Load queue data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinQueue = async () => {
    setLoading(true);
    try {
      const response = await queueService.joinQueue(equipmentId);

      if (response.success) {
        Alert.alert(
          t('common.success'),
          response.message ||
            `You are in position ${response.data?.position} for ${equipmentName}`
        );
        await loadQueueData();
      } else {
        Alert.alert(
          t('common.error'),
          response.message || 'Failed to join queue'
        );
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    Alert.alert(
      t('queue.leaveConfirm'),
      t('queue.leaveConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await queueService.leaveQueue(equipmentId);

              if (response.success) {
                Alert.alert(
                  t('common.success'),
                  response.message || 'Left queue successfully'
                );
                await loadQueueData();
              } else {
                Alert.alert(
                  t('common.error'),
                  response.message || 'Failed to leave queue'
                );
              }
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadQueueData();
    setRefreshing(false);
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes <= 0) return 'Expired';
    if (diffMinutes < 1) return '< 1 min';
    return `${diffMinutes} min`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View
            style={[
              styles.container,
              { backgroundColor: theme.colors.background },
            ]}
          >
            {/* Header */}
            <View
              style={[
                styles.header,
                { borderBottomColor: theme.colors.border },
              ]}
            >
              <View style={styles.headerLeft}>
                <Ionicons
                  name="people"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text
                  style={[styles.headerTitle, { color: theme.colors.text }]}
                >
                  {t('queue.title')}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Equipment Name */}
            <View style={styles.equipmentInfo}>
              <Text
                style={[
                  styles.equipmentName,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {equipmentName}
              </Text>
            </View>

            {loading && !refreshing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
              >
                {/* My Position Card */}
                {myPosition?.in_queue && (
                  <View
                    style={[
                      styles.myPositionCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor:
                          myPosition.status === 'NOTIFIED'
                            ? theme.colors.success
                            : theme.colors.primary,
                      },
                    ]}
                  >
                    <View style={styles.myPositionHeader}>
                      <Ionicons
                        name={
                          myPosition.status === 'NOTIFIED'
                            ? 'checkmark-circle'
                            : 'time'
                        }
                        size={32}
                        color={
                          myPosition.status === 'NOTIFIED'
                            ? theme.colors.success
                            : theme.colors.primary
                        }
                      />
                      <View style={styles.myPositionInfo}>
                        <Text
                          style={[
                            styles.myPositionLabel,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {myPosition.status === 'NOTIFIED'
                            ? t('queue.yourTurn')
                            : t('queue.yourPosition')}
                        </Text>
                        <Text
                          style={[
                            styles.myPositionValue,
                            { color: theme.colors.text },
                          ]}
                        >
                          {myPosition.status === 'NOTIFIED' ? (
                            <Text style={{ color: theme.colors.success }}>
                              {t('queue.claimNow')}
                            </Text>
                          ) : (
                            `${myPosition.position} / ${myPosition.total_in_queue}`
                          )}
                        </Text>
                        {myPosition.status === 'NOTIFIED' &&
                          myPosition.expires_at && (
                            <Text
                              style={[
                                styles.expiryText,
                                { color: theme.colors.error },
                              ]}
                            >
                              {t('queue.expiresIn')}:{' '}
                              {formatTimeRemaining(myPosition.expires_at)}
                            </Text>
                          )}
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.leaveButton,
                        { backgroundColor: theme.colors.error },
                      ]}
                      onPress={handleLeaveQueue}
                      disabled={loading}
                    >
                      <Text style={[styles.leaveButtonText, { color: '#fff' }]}>
                        {t('queue.leave')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Join Queue Button */}
                {!myPosition?.in_queue && (
                  <TouchableOpacity
                    style={[
                      styles.joinButton,
                      { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={handleJoinQueue}
                    disabled={loading}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color="#fff"
                    />
                    <Text style={[styles.joinButtonText, { color: '#fff' }]}>
                      {'Vào hàng đợi'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Queue List */}
                <View style={styles.queueSection}>
                  <View style={styles.queueHeader}>
                    <Text
                      style={[styles.queueTitle, { color: theme.colors.text }]}
                    >
                      {t('queue.peopleWaiting')}
                    </Text>
                    <View
                      style={[
                        styles.queueBadge,
                        { backgroundColor: theme.colors.surface },
                      ]}
                    >
                      <Text
                        style={[
                          styles.queueBadgeText,
                          { color: theme.colors.primary },
                        ]}
                      >
                        {queueData?.queue_length || 0}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleRefresh}
                      disabled={refreshing}
                    >
                      <Ionicons
                        name="refresh"
                        size={20}
                        color={
                          refreshing
                            ? theme.colors.textSecondary
                            : theme.colors.primary
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  {queueData && queueData.queue_length > 0 ? (
                    <View style={styles.queueList}>
                      {queueData.queue.map((entry, index) => (
                        <View
                          key={entry.id}
                          style={[
                            styles.queueItem,
                            {
                              backgroundColor: theme.colors.surface,
                              borderLeftColor:
                                entry.status === 'NOTIFIED'
                                  ? theme.colors.success
                                  : theme.colors.border,
                            },
                          ]}
                        >
                          <View style={styles.queueItemLeft}>
                            <View
                              style={[
                                styles.positionBadge,
                                { backgroundColor: theme.colors.primary },
                              ]}
                            >
                              <Text
                                style={[styles.positionText, { color: '#fff' }]}
                              >
                                {entry.position}
                              </Text>
                            </View>
                            {entry.member?.profile_photo ? (
                              <Image
                                source={{ uri: entry.member.profile_photo }}
                                style={styles.avatar}
                              />
                            ) : (
                              <View
                                style={[
                                  styles.avatarPlaceholder,
                                  { backgroundColor: theme.colors.surface },
                                ]}
                              >
                                <Ionicons
                                  name="person"
                                  size={20}
                                  color={theme.colors.textSecondary}
                                />
                              </View>
                            )}
                            <View style={styles.memberInfo}>
                              <Text
                                style={[
                                  styles.memberName,
                                  { color: theme.colors.text },
                                ]}
                              >
                                {entry.member?.full_name || 'Unknown'}
                              </Text>
                              {entry.status === 'NOTIFIED' && (
                                <Text
                                  style={[
                                    styles.statusText,
                                    { color: theme.colors.success },
                                  ]}
                                >
                                  {t('queue.notified')}
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons
                        name="people-outline"
                        size={48}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.emptyText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {t('queue.noOneWaiting')}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    ...Typography.h3,
  },
  closeButton: {
    padding: 4,
  },
  equipmentInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  equipmentName: {
    ...Typography.bodyLarge,
  },
  loadingContainer: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  content: {
    flexGrow: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  myPositionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
  },
  myPositionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  myPositionInfo: {
    flex: 1,
  },
  myPositionLabel: {
    ...Typography.bodySmall,
  },
  myPositionValue: {
    ...Typography.h2,
    marginTop: 4,
  },
  expiryText: {
    ...Typography.bodySmall,
    marginTop: 4,
    fontWeight: '600',
  },
  leaveButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  leaveButtonText: {
    ...Typography.buttonMedium,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  joinButtonText: {
    ...Typography.buttonLarge,
  },
  queueSection: {
    marginTop: 8,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  queueTitle: {
    ...Typography.h4,
    flex: 1,
  },
  queueBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  queueBadgeText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  queueList: {
    gap: 12,
  },
  queueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  queueItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  positionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  statusText: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    ...Typography.bodyMedium,
    marginTop: 12,
  },
});
