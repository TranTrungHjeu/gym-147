import EquipmentReportModal from '@/components/EquipmentReportModal';
import { useAuth } from '@/contexts/AuthContext';
import { equipmentService } from '@/services/member/equipment.service';
import {
  Equipment,
  EquipmentQueue,
  EquipmentStatus,
  IssueType,
  Severity,
} from '@/types/equipmentTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Clock,
  MapPin,
  Play,
  Settings,
  Users,
  Wrench,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function EquipmentDetailScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [queue, setQueue] = useState<EquipmentQueue[]>([]);
  const [userQueueEntry, setUserQueueEntry] = useState<EquipmentQueue | null>(
    null
  );
  const [showReportModal, setShowReportModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load equipment details
  const loadEquipmentDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const [equipmentResponse, queueResponse] = await Promise.all([
        equipmentService.getEquipmentById(id),
        equipmentService.getEquipmentQueue(id),
      ]);

      if (equipmentResponse.success && equipmentResponse.data) {
        setEquipment(equipmentResponse.data.equipment);
      } else {
        setError('Failed to load equipment');
      }

      if (queueResponse.success && queueResponse.data) {
        setQueue(queueResponse.data.queue);
        // Find user's queue entry
        const userEntry = queueResponse.data.queue.find(
          (entry) => entry.member_id === user?.id
        );
        setUserQueueEntry(userEntry || null);
      }
    } catch (err: any) {
      console.error('Error loading equipment:', err);
      setError(err.message || 'Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadEquipmentDetails();
  }, [id]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!id) return;

    equipmentService.initWebSocket();
    equipmentService.subscribeToEquipment(id, () => {
      loadEquipmentDetails();
    });

    return () => {
      equipmentService.unsubscribeFromEquipment(id);
    };
  }, [id]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEquipmentDetails();
    setRefreshing(false);
  };

  // Handle start using
  const handleStartUsing = async () => {
    if (!user?.id || !id) return;

    try {
      const response = await equipmentService.startEquipmentUsage(user.id, id);
      if (response.success) {
        Alert.alert(
          t('common.success'),
          t('equipment.actions.startUsage') +
            ' ' +
            t('common.success').toLowerCase()
        );
        loadEquipmentDetails();
      } else {
        Alert.alert(
          t('common.error'),
          response.error || 'Failed to start usage'
        );
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to start usage');
    }
  };

  // Handle join queue
  const handleJoinQueue = async () => {
    if (!user?.id || !id) return;

    try {
      const response = await equipmentService.joinQueue(id, user.id);
      if (response.success) {
        Alert.alert(t('common.success'), t('equipment.queue.joinedQueue'));
        loadEquipmentDetails();
      } else {
        Alert.alert(
          t('common.error'),
          response.error || 'Failed to join queue'
        );
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to join queue');
    }
  };

  // Handle leave queue
  const handleLeaveQueue = async () => {
    if (!userQueueEntry) return;

    try {
      const response = await equipmentService.leaveQueue(userQueueEntry.id);
      if (response.success) {
        Alert.alert(t('common.success'), t('equipment.queue.leftQueue'));
        loadEquipmentDetails();
      } else {
        Alert.alert(
          t('common.error'),
          response.error || 'Failed to leave queue'
        );
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to leave queue');
    }
  };

  // Handle report issue
  const handleReportIssue = async (data: {
    issue_type: IssueType;
    description: string;
    severity: Severity;
    images?: string[];
  }) => {
    if (!user?.id || !id) return;

    try {
      const response = await equipmentService.reportIssue(id, {
        member_id: user.id,
        ...data,
      });

      if (response.success) {
        Alert.alert(t('common.success'), t('equipment.issue.reported'));
        loadEquipmentDetails();
      } else {
        Alert.alert(
          t('common.error'),
          response.error || 'Failed to report issue'
        );
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to report issue');
    }
  };

  // Get status icon
  const getStatusIcon = (status: EquipmentStatus) => {
    const color = getStatusColor(status);
    switch (status) {
      case EquipmentStatus.AVAILABLE:
        return <Activity size={24} color={color} />;
      case EquipmentStatus.IN_USE:
        return <Clock size={24} color={color} />;
      case EquipmentStatus.MAINTENANCE:
        return <Settings size={24} color={color} />;
      case EquipmentStatus.OUT_OF_ORDER:
        return <AlertCircle size={24} color={color} />;
      default:
        return <Wrench size={24} color={color} />;
    }
  };

  // Get status color
  const getStatusColor = (status: EquipmentStatus) => {
    switch (status) {
      case EquipmentStatus.AVAILABLE:
        return theme.colors.success;
      case EquipmentStatus.IN_USE:
        return theme.colors.warning;
      case EquipmentStatus.MAINTENANCE:
        return theme.colors.secondary;
      case EquipmentStatus.OUT_OF_ORDER:
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            {t('common.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !equipment) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error || 'Equipment not found'}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={loadEquipmentDetails}
          >
            <Text style={styles.buttonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('equipment.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Equipment Info Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.equipmentHeader}>
            <View style={styles.equipmentInfo}>
              <Text
                style={[styles.equipmentName, { color: theme.colors.text }]}
              >
                {equipment.name}
              </Text>
              {equipment.brand && (
                <Text
                  style={[
                    styles.equipmentBrand,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {equipment.brand} {equipment.model}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(equipment.status) + '20' },
              ]}
            >
              {getStatusIcon(equipment.status)}
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(equipment.status) },
                ]}
              >
                {t(
                  `equipment.status.${equipment.status
                    .toLowerCase()
                    .replaceAll('_', '')}`,
                  equipment.status
                )}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <MapPin size={16} color={theme.colors.textSecondary} />
              <Text
                style={[
                  styles.detailLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {equipment.location}
              </Text>
            </View>

            {equipment.max_weight && (
              <View style={styles.detailItem}>
                <Wrench size={16} color={theme.colors.textSecondary} />
                <Text
                  style={[
                    styles.detailLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Max: {equipment.max_weight}kg
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Queue Section */}
        {queue.length > 0 && (
          <View
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.sectionHeader}>
              <Users size={20} color={theme.colors.text} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {t('equipment.queue.title')} ({queue.length})
              </Text>
            </View>

            {queue.map((entry, index) => (
              <View
                key={entry.id}
                style={[
                  styles.queueItem,
                  {
                    backgroundColor:
                      entry.member_id === user?.id
                        ? theme.colors.primary + '10'
                        : 'transparent',
                  },
                ]}
              >
                <View style={styles.queuePosition}>
                  <Text
                    style={[
                      styles.positionNumber,
                      { color: theme.colors.primary },
                    ]}
                  >
                    #{index + 1}
                  </Text>
                </View>
                <Text
                  style={[styles.queueMemberName, { color: theme.colors.text }]}
                >
                  {entry.member_id === user?.id
                    ? t('profile.title')
                    : entry.member?.full_name || 'Member'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {equipment.status === EquipmentStatus.AVAILABLE && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              onPress={handleStartUsing}
            >
              <Play size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {t('equipment.actions.startUsage')}
              </Text>
            </TouchableOpacity>
          )}

          {equipment.status === EquipmentStatus.IN_USE && !userQueueEntry && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.warning }]}
              onPress={handleJoinQueue}
            >
              <Clock size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {t('equipment.queue.joinQueue')}
              </Text>
            </TouchableOpacity>
          )}

          {userQueueEntry && (
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: theme.colors.error,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={handleLeaveQueue}
            >
              <Text style={styles.buttonText}>
                {t('equipment.queue.leaveQueue')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              styles.outlineButton,
              { borderColor: theme.colors.border },
            ]}
            onPress={() => setShowReportModal(true)}
          >
            <AlertCircle size={20} color={theme.colors.error} />
            <Text
              style={[styles.outlineButtonText, { color: theme.colors.error }]}
            >
              {t('equipment.issue.reportIssue')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Report Issue Modal */}
      <EquipmentReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportIssue}
        equipmentName={equipment.name}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    ...Typography.h5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  equipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  equipmentInfo: {
    flex: 1,
  },
  equipmentName: {
    ...Typography.h4,
    marginBottom: 4,
  },
  equipmentBrand: {
    ...Typography.bodyMedium,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  detailsGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    ...Typography.bodyMedium,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.h6,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  queuePosition: {
    width: 32,
    marginRight: 12,
  },
  positionNumber: {
    ...Typography.h6,
  },
  queueMemberName: {
    ...Typography.bodyMedium,
    flex: 1,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: '#fff',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  outlineButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.bodyMedium,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    marginBottom: 16,
  },
});
