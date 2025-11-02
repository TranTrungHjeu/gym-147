import { EquipmentQueueModal } from '@/components/EquipmentQueueModal';
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
  Flame,
  MapPin,
  Play,
  Settings,
  StopCircle,
  Users,
  Wrench,
  Zap,
} from 'lucide-react-native';
import React, { Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Easing,
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
  const { user, member } = useAuth();
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
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active usage state
  const [activeUsage, setActiveUsage] = useState<{
    id: string;
    start_time: string;
    equipment_id: string;
  } | null>(null);
  const [usageDuration, setUsageDuration] = useState(0); // in seconds
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  // Animation values
  const flameScale = useState(new Animated.Value(1))[0];
  const flameOpacity = useState(new Animated.Value(1))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  // Load equipment details
  const loadEquipmentDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const promises = [
        equipmentService.getEquipmentById(id),
        equipmentService.getEquipmentQueue(id),
      ];

      // Check for active usage if member is available
      if (member?.id) {
        promises.push(equipmentService.getActiveUsage(id, member.id));
      }

      const [equipmentResponse, queueResponse, activeUsageResponse] =
        await Promise.all(promises);

      if (equipmentResponse.success && equipmentResponse.data) {
        setEquipment(equipmentResponse.data.equipment);
      } else {
        setError('Failed to load equipment');
      }

      if (queueResponse.success && queueResponse.data) {
        setQueue(queueResponse.data.queue);
        // Find member's queue entry
        if (member?.id) {
          const memberEntry = queueResponse.data.queue.find(
            (entry) => entry.member_id === member.id
        );
          setUserQueueEntry(memberEntry || null);
        }
      }

      // Restore active usage if exists
      if (
        activeUsageResponse &&
        activeUsageResponse.success &&
        activeUsageResponse.data?.activeUsage
      ) {
        const usage = activeUsageResponse.data.activeUsage;
        setActiveUsage({
          id: usage.id,
          start_time: usage.start_time,
            equipment_id: id,
        });
        console.log('✅ Restored active usage session:', usage.id);
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

  // Subscribe to user-specific queue events
  // Note: Socket uses user_id (for real-time notifications), REST API uses member_id
  useEffect(() => {
    if (!user?.id) return;

    equipmentService.subscribeToUserQueue(user.id, {
      onYourTurn: (data) => {
        console.log('🔔 Queue: Your turn!', data);
        Alert.alert(
          t('equipment.queue.yourTurn', "It's Your Turn!"),
          t(
            'equipment.queue.yourTurnMessage',
            `${data.equipment_name} is now available. You have ${data.expires_in_minutes} minutes to claim it.`
          ),
          [
            {
              text: t('common.ok'),
              onPress: () => {
                // Navigate to equipment detail if not already there
                if (data.equipment_id !== id) {
                  router.push(`/equipment/${data.equipment_id}`);
                } else {
                  loadEquipmentDetails();
                }
              },
            },
          ]
        );
      },
      onEquipmentAvailable: (data) => {
        console.log('🔔 Equipment available:', data);
        if (data.equipment_id === id) {
          loadEquipmentDetails();
        }
      },
      onPositionChanged: (data) => {
        console.log('🔔 Queue position changed:', data);
        if (data.equipment_id === id) {
          loadEquipmentDetails();
        }
      },
    });

    return () => {
      if (user?.id) {
        equipmentService.unsubscribeFromUserQueue(user.id);
      }
    };
  }, [user?.id, id]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground - reload to restore active usage
        console.log('📱 App returned to foreground - reloading equipment data');
        loadEquipmentDetails();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [id]);

  // Get calories per minute based on equipment category
  const getCaloriesPerMinute = (category: string): number => {
    const calorieRates: { [key: string]: number } = {
      CARDIO: 12, // High intensity: Treadmill, Bike, Rowing
      STRENGTH: 6, // Moderate: Weights, Machines
      FREE_WEIGHTS: 7, // Slightly higher: Dumbbells, Barbells
      FUNCTIONAL: 8, // Dynamic movements: TRX, Kettlebells
      STRETCHING: 3, // Low intensity: Yoga, Stretching
      RECOVERY: 2, // Very low: Foam rolling, Massage
      SPECIALIZED: 5, // Variable: Special equipment
    };

    return calorieRates[category] || 6; // Default 6 kcal/min
  };

  // Timer and calories effect
  useEffect(() => {
    if (!activeUsage) {
      setUsageDuration(0);
      setCaloriesBurned(0);
      setShowTimeoutWarning(false);
      return;
    }

    const startTime = new Date(activeUsage.start_time).getTime();
    const MAX_DURATION = 3 * 60 * 60; // 3 hours in seconds
    const WARNING_DURATION = 2.5 * 60 * 60; // 2.5 hours - show warning

    const timer = setInterval(() => {
      const now = Date.now();
      const duration = Math.max(0, Math.floor((now - startTime) / 1000)); // seconds, ensure non-negative
      setUsageDuration(duration);

      // Calculate calories based on equipment category
      // Calculate calories based on seconds for accuracy (same as backend)
      const caloriesPerMinute = equipment?.category
        ? getCaloriesPerMinute(equipment.category)
        : 6;

      const caloriesPerSecond = caloriesPerMinute / 60;
      const exactCalories = duration * caloriesPerSecond;
      // Ensure at least 1 calorie if duration > 0 (same logic as backend)
      const calculatedCalories =
        duration > 0 ? Math.max(1, Math.round(exactCalories)) : 0;

      setCaloriesBurned(calculatedCalories);

      // Show warning when approaching timeout (2.5 hours)
      if (duration >= WARNING_DURATION && duration < MAX_DURATION) {
        if (!showTimeoutWarning) {
          setShowTimeoutWarning(true);
          const remainingMinutes = Math.floor((MAX_DURATION - duration) / 60);
          Alert.alert(
            '⏰ ' +
              t('equipment.timeoutWarning', {
                default: 'Session Timeout Warning',
              }),
            t('equipment.timeoutMessage', {
              default: `Your workout session will automatically end in ${remainingMinutes} minutes. Please end your session manually to avoid auto-stop.`,
              minutes: remainingMinutes,
            }),
            [
              {
                text: t('common.ok'),
                onPress: () => console.log('Timeout warning acknowledged'),
              },
            ]
          );
        }
      }

      // Auto-reload when timeout is reached to reflect auto-stop
      if (duration >= MAX_DURATION) {
        console.log('⏱️ Session timeout reached - reloading...');
        loadEquipmentDetails();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeUsage, equipment, showTimeoutWarning]);

  // Flame animation effect
  useEffect(() => {
    if (!activeUsage) return;

    const breathAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(flameScale, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(flameOpacity, {
            toValue: 0.7,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(flameScale, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(flameOpacity, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    breathAnimation.start();

    return () => breathAnimation.stop();
  }, [activeUsage]);

  // Pulse animation for LIVE badge
  useEffect(() => {
    if (!activeUsage) return;

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, [activeUsage]);

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
    if (!member?.id || !id) return;

    try {
      const response = await equipmentService.startEquipmentUsage(
        member.id,
        id
      );
      if (response.success && response.data) {
        // Set active usage to start timer
        setActiveUsage({
          id: response.data.usage.id,
          start_time: response.data.usage.start_time,
          equipment_id: id,
        });

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
          response.message || 'Failed to start usage'
        );
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to start usage');
    }
  };

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle end using
  const handleEndUsage = async () => {
    if (!member?.id || !activeUsage) return;

    Alert.alert(
      t('equipment.actions.endUsage'),
      t('equipment.confirmEndUsage', {
        default: 'Are you sure you want to end this workout session?',
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
      const response = await equipmentService.stopEquipmentUsage(
                member.id,
                activeUsage.id
      );
      if (response.success) {
                setActiveUsage(null);
                setUsageDuration(0);
                Alert.alert(
                  t('common.success'),
                  t('equipment.usageEnded', {
                    default: 'Workout session ended successfully',
                  })
                );
                loadEquipmentDetails();
      } else {
                Alert.alert(
                  t('common.error'),
                  response.message || 'Failed to end usage'
                );
              }
            } catch (err: any) {
              Alert.alert(
                t('common.error'),
                err.message || 'Failed to end usage'
              );
            }
          },
        },
      ]
    );
  };

  // Handle join queue
  const handleJoinQueue = () => {
    // Open queue modal to show details and join
    setShowQueueModal(true);
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
          response.message || 'Failed to leave queue'
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
    if (!member?.id || !id) return;

    try {
      const response = await equipmentService.reportIssue(id, {
        member_id: member.id,
        ...data,
      });

      if (response.success) {
        Alert.alert(t('common.success'), t('equipment.issue.reported'));
        loadEquipmentDetails();
      } else {
        Alert.alert(
          t('common.error'),
          response.message || 'Failed to report issue'
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
              <View
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              >
                <Users size={20} color={theme.colors.text} />
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  {t('equipment.queue.title')} ({queue.length})
            </Text>
          </View>
              <TouchableOpacity
                onPress={() => setShowQueueModal(true)}
                style={{ padding: 4 }}
              >
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  {t('equipment.queue.viewDetails', 'View Details')}
            </Text>
              </TouchableOpacity>
        </View>

            {queue.map((entry, index) => (
              <Fragment key={entry.id}>
          <View
                  style={[
                    styles.queueItem,
                    {
                      backgroundColor:
                        entry.member_id === member?.id
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
                style={[
                      styles.queueMemberName,
                      { color: theme.colors.text },
                ]}
              >
                    {entry.member_id === member?.id
                      ? t('profile.title')
                      : entry.member?.full_name || 'Member'}
              </Text>
            </View>
              </Fragment>
            ))}
          </View>
        )}

        {/* Active Usage Timer */}
        {activeUsage && (
          <View
            style={[
              styles.activeUsageContainer,
              {
                backgroundColor: theme.colors.primary + '08',
                borderColor: theme.colors.primary + '20',
              },
            ]}
          >
            {/* Header */}
            <View
              style={[
                styles.activeUsageHeader,
                { borderBottomColor: theme.colors.border + '40' },
              ]}
            >
              <View style={styles.activeUsageHeaderLeft}>
                <View
                  style={[
                    styles.headerIconContainer,
                    { backgroundColor: theme.colors.primary + '15' },
                  ]}
                >
                  <Zap size={18} color={theme.colors.primary} />
                </View>
              <Text
                style={[
                    styles.activeUsageTitle,
                    { color: theme.colors.primary },
                ]}
              >
                  {t('equipment.activeSession', {
                    default: 'Workout Session',
                  })}
              </Text>
            </View>
              <View
                style={[
                  styles.activeBadge,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Animated.View
                  style={[
                    styles.pulseDot,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
                <Text style={styles.activeBadgeText}>LIVE</Text>
          </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {/* Duration */}
          <View
                style={[
                  styles.statItem,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: theme.colors.primary + '12' },
                  ]}
                >
                  <Clock size={24} color={theme.colors.primary} />
                </View>
                  <Text
                    style={[
                    styles.statLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                  {t('equipment.usage.duration', { default: 'Duration' })}
                </Text>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {formatDuration(usageDuration)}
                  </Text>
                </View>

              {/* Calories with Flame Animation */}
              <View
                style={[
                  styles.statItem,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.statIconContainer,
                    styles.flameContainer,
                    {
                      transform: [{ scale: flameScale }],
                      opacity: flameOpacity,
                    },
                  ]}
                >
                  <Flame size={26} color="#FF6B35" />
                </Animated.View>
                    <Text
                      style={[
                    styles.statLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                  {t('equipment.usage.caloriesBurned', { default: 'Calories' })}
                </Text>
                <View style={styles.calorieValueContainer}>
                  <Text style={[styles.statValue, styles.calorieValue]}>
                    {caloriesBurned}
                  </Text>
                  <Text style={[styles.statUnit, styles.calorieUnit]}>
                    kcal
                    </Text>
                  </View>
              </View>
          </View>

            {/* End Session Button */}
          <TouchableOpacity
            style={[
                styles.endUsageButton,
                { backgroundColor: theme.colors.error },
              ]}
              onPress={handleEndUsage}
              activeOpacity={0.8}
            >
              <StopCircle size={22} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.endUsageButtonText}>
                {t('equipment.actions.endUsage', { default: 'End Workout' })}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {!activeUsage && equipment.status === EquipmentStatus.AVAILABLE && (
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

          {equipment.status === EquipmentStatus.IN_USE &&
            !userQueueEntry &&
            !activeUsage && (
          <TouchableOpacity
            style={[
                  styles.button,
              { backgroundColor: theme.colors.warning },
            ]}
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

      {/* Equipment Queue Modal */}
      <EquipmentQueueModal
        visible={showQueueModal}
        onClose={() => {
          setShowQueueModal(false);
          loadEquipmentDetails(); // Refresh after modal close
        }}
        equipmentId={equipment.id}
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
  activeUsageContainer: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  activeUsageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  activeUsageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeUsageTitle: {
    ...Typography.h5,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 0.5,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  activeBadgeText: {
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#FFFFFF',
    fontSize: 12,
    letterSpacing: 1.2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1.5,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  flameContainer: {
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  statLabel: {
    ...Typography.labelSmall,
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    opacity: 0.7,
  },
  statValue: {
    ...Typography.numberSmall,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 28,
    lineHeight: 32,
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    ...Typography.bodySmall,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  calorieValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  calorieValue: {
    color: '#FF6B35',
  },
  calorieUnit: {
    color: '#FF6B35',
    opacity: 0.7,
    fontSize: 12,
  },
  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  timerContent: {
    flex: 1,
  },
  timerLabel: {
    ...Typography.bodySmall,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerValue: {
    ...Typography.h2,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  endUsageButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  endUsageButtonText: {
    ...Typography.buttonLarge,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 0.8,
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
