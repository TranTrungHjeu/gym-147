import { EquipmentQueueModal } from '@/components/EquipmentQueueModal';
import EquipmentReportModal from '@/components/EquipmentReportModal';
import { AlertModal } from '@/components/ui/AlertModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { equipmentService } from '@/services/member/equipment.service';
import { sensorService } from '@/services/sensors/sensor.service';
import queueService from '@/services/queue/queue.service';
import {
  Equipment,
  EquipmentQueue,
  EquipmentStatus,
  IssueType,
  QueueStatus,
  Severity,
} from '@/types/equipmentTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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

  // IMPROVEMENT: Equipment availability and queue analytics
  const [availabilityPrediction, setAvailabilityPrediction] = useState<{
    available: boolean;
    estimatedAvailableAt?: string;
    estimatedWaitTime?: number;
    currentUser?: any;
  } | null>(null);
  const [queueAnalytics, setQueueAnalytics] = useState<{
    averageWaitTime: number;
    averageDuration: number;
    currentQueueLength: number;
    historicalSessionsCount: number;
  } | null>(null);
  const [queuePositionPrediction, setQueuePositionPrediction] = useState<{
    estimatedWaitTime: number;
    estimatedTurnAt: string;
    confidence: number;
  } | null>(null);

  // Active usage state
  const [activeUsage, setActiveUsage] = useState<{
    id: string;
    start_time: string;
    equipment_id: string;
  } | null>(null);
  const [usageDuration, setUsageDuration] = useState(0); // in seconds
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [endingUsage, setEndingUsage] = useState(false); // Track if ending usage

  // Modal states
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonStyle?: 'default' | 'destructive';
    onConfirm: () => void;
    loading?: boolean;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    buttonText?: string;
    onCloseAction?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

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

      // IMPROVEMENT: Load equipment availability and queue analytics
      const [
        equipmentResponse,
        queueResponse,
        availabilityResponse,
        analyticsResponse,
      ] = await Promise.all([
        equipmentService.getEquipmentById(id),
        equipmentService.getEquipmentQueue(id),
        equipmentService
          .getEquipmentAvailability(id)
          .catch(() => ({ success: false, data: null })), // IMPROVEMENT: Get availability prediction
        equipmentService
          .getQueueAnalytics(id)
          .catch(() => ({ success: false, data: null })), // IMPROVEMENT: Get queue analytics
      ]);

      if (equipmentResponse.success && equipmentResponse.data) {
        setEquipment(equipmentResponse.data.equipment);
      } else {
        setError(t('equipment.errors.loadEquipmentFailed'));
      }

      if (queueResponse.success && queueResponse.data) {
        setQueue(queueResponse.data.queue);
      }

      // Check if member is in queue using getQueuePosition API (more reliable)
      if (member?.id) {
        try {
          const positionResponse = await queueService.getQueuePosition(id);
          if (positionResponse.success && positionResponse.data) {
            const positionData = positionResponse.data;
            if (positionData.in_queue && positionData.queue_id) {
              // Member is in queue - find the entry from queue list or create from position data
              let memberEntry: EquipmentQueue | null = null;
              
              // First, try to find in queue list
              if (queueResponse.success && queueResponse.data?.queue) {
                memberEntry = queueResponse.data.queue.find(
                  (entry) => entry.id === positionData.queue_id
                ) || null;
              }
              
              // If not found in list, create from position data
              if (!memberEntry && positionData.queue_id) {
                memberEntry = {
                  id: positionData.queue_id,
                  member_id: member.id,
                  equipment_id: id,
                  position: positionData.position || 0,
                  status: (positionData.status as QueueStatus) || QueueStatus.WAITING,
                  joined_at: positionData.joined_at || new Date().toISOString(),
                  notified_at: positionData.notified_at,
                  expires_at: positionData.expires_at,
                };
              }
              
              setUserQueueEntry(memberEntry);

              // IMPROVEMENT: Get queue position prediction if member is in queue
              if (memberEntry && positionData.position) {
                try {
                  const predictionResponse =
                    await equipmentService.getQueuePositionPrediction(
                      id,
                      positionData.position
                    );
                  if (predictionResponse.success && predictionResponse.data) {
                    setQueuePositionPrediction(predictionResponse.data);
                  }
                } catch (err) {
                  console.error('Error loading queue prediction:', err);
                }
              }
            } else {
              // Member is not in queue
              setUserQueueEntry(null);
            }
          } else {
            // API call failed or member not in queue
            setUserQueueEntry(null);
          }
        } catch (err) {
          console.error('Error checking queue position:', err);
          // Fallback: try to find in queue list
          if (queueResponse.success && queueResponse.data?.queue) {
            const memberEntry = queueResponse.data.queue.find(
              (entry) => entry.member_id === member.id
            );
            setUserQueueEntry(memberEntry || null);
          } else {
            setUserQueueEntry(null);
          }
        }
      }

      // IMPROVEMENT: Set availability prediction
      if (availabilityResponse.success && availabilityResponse.data) {
        setAvailabilityPrediction(availabilityResponse.data);
      }

      // IMPROVEMENT: Set availability prediction
      if (availabilityResponse.success && availabilityResponse.data) {
        setAvailabilityPrediction(availabilityResponse.data);
      }

      // IMPROVEMENT: Set queue analytics
      if (analyticsResponse.success && analyticsResponse.data) {
        const analytics = analyticsResponse.data.analytics;
        if (analytics) {
          setQueueAnalytics({
            averageWaitTime: analytics.average_wait_time_minutes || 0,
            averageDuration: analytics.average_duration_minutes || 0,
            currentQueueLength: analyticsResponse.data.current_queue_length || 0,
            historicalSessionsCount: analytics.historical_sessions_count || 0,
          });
        }
      }

      // Check for active usage if member is available
      if (member?.id) {
        const activeUsageResponse = await equipmentService.getActiveUsage(
          id,
          member.id
        );
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
          console.log('[SUCCESS] Restored active usage session:', usage.id);
        }
      }
    } catch (err: any) {
      console.error('Error loading equipment:', err);
      setError(err.message || t('equipment.errors.loadEquipmentFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadEquipmentDetails();
  }, [id]);

  // Reload when screen is focused (e.g., when user navigates back)
  useFocusEffect(
    React.useCallback(() => {
      loadEquipmentDetails();
    }, [id])
  );

  // Subscribe to user-specific queue events
  // Note: Socket uses user_id (for real-time notifications), REST API uses member_id
  useEffect(() => {
    if (!user?.id) return;

    equipmentService.subscribeToUserQueue(user.id, {
      onYourTurn: async (data) => {
        console.log('[BELL] Queue: Your turn!', data);

        // Show local notification
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: t('equipment.queue.yourTurn', "It's Your Turn!"),
              body: t(
                'equipment.queue.yourTurnMessage',
                `${data.equipment_name} is now available. You have ${data.expires_in_minutes} minutes to claim it.`
              ),
              data: {
                type: 'QUEUE_YOUR_TURN',
                equipment_id: data.equipment_id,
                equipment_name: data.equipment_name,
                queue_id: data.queue_id,
              },
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: null, // Show immediately
          });
        } catch (error) {
          console.error('Error showing local notification:', error);
        }

        // Show alert modal
        setAlertModal({
          visible: true,
          title: t('equipment.queue.yourTurn', "It's Your Turn!"),
          message: t(
            'equipment.queue.yourTurnMessage',
            `${data.equipment_name} is now available. You have ${data.expires_in_minutes} minutes to claim it.`
          ),
          type: 'info',
          buttonText: t('common.ok'),
          onCloseAction: () => {
            // Navigate to equipment detail if not already there
            if (data.equipment_id !== id) {
              router.push(`/equipment/${data.equipment_id}`);
            } else {
              loadEquipmentDetails();
            }
          },
        });
      },
      onEquipmentAvailable: (data) => {
        console.log('[BELL] Equipment available:', data);
        if (data.equipment_id === id) {
          loadEquipmentDetails();
        }
      },
      onPositionChanged: (data) => {
        console.log('[BELL] Queue position changed:', data);
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
        console.log(
          '[MOBILE] App returned to foreground - reloading equipment data'
        );
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

  // Periodic activity updates with sensor data
  useEffect(() => {
    if (!activeUsage || !member?.id) {
      // Stop sensors when no active usage
      sensorService.stopListening();
      return;
    }

    let sensorsStarted = false;
    let activityUpdateInterval: NodeJS.Timeout | null = null;

    const startPeriodicUpdates = async () => {
      // Start listening to sensors
      try {
        sensorsStarted = await sensorService.startListening(1000); // Update every 1 second
      } catch (error) {
        console.warn('[SENSORS] Failed to start sensors:', error);
      }

      // Periodic activity updates (every 1 minute)
      activityUpdateInterval = setInterval(async () => {
        try {
          const activityData: any = {};

          // Get movement data from sensors (if available)
          if (sensorsStarted) {
            try {
              const movementData = sensorService.getMovementData();
              const sensorData = sensorService.getSensorDataForAPI();

              if (movementData.hasMovement) {
                activityData.sensor_data = sensorData;
              }
            } catch (error) {
              console.warn('[SENSORS] Failed to get movement data:', error);
            }
          }

          // Send update to backend (even if no data, to mark last_activity_check)
          await equipmentService.updateActivityData(
            member.id,
            activeUsage.id,
            activityData
          );

          console.log('[ACTIVITY] Sent periodic update:', {
            has_movement: !!activityData.sensor_data,
            movement_intensity: activityData.sensor_data?.movement,
          });
        } catch (error) {
          console.error('[ERROR] Failed to send activity update:', error);
          // Don't throw error to avoid disrupting workout
        }
      }, 60000); // Every 60 seconds (1 minute)
    };

    startPeriodicUpdates();

    return () => {
      if (activityUpdateInterval) {
        clearInterval(activityUpdateInterval);
      }
      if (sensorsStarted) {
        sensorService.stopListening();
      }
    };
  }, [activeUsage, member?.id]);

  // Timer and calories effect
  useEffect(() => {
    if (!activeUsage) {
      setUsageDuration(0);
      setCaloriesBurned(0);
      setShowTimeoutWarning(false);
      return;
    }

    let isMounted = true;
    const startTime = new Date(activeUsage.start_time).getTime();
    const MAX_DURATION = 3 * 60 * 60; // 3 hours in seconds
    const WARNING_DURATION = 2.5 * 60 * 60; // 2.5 hours - show warning

    const timer = setInterval(() => {
      // Check if component is still mounted
      if (!isMounted) {
        clearInterval(timer);
        return;
      }

      const now = Date.now();
      const duration = Math.max(0, Math.floor((now - startTime) / 1000)); // seconds, ensure non-negative

      if (!isMounted) return;
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

      if (!isMounted) return;
      setCaloriesBurned(calculatedCalories);

      // Show warning when approaching timeout (2.5 hours)
      if (duration >= WARNING_DURATION && duration < MAX_DURATION) {
        if (!showTimeoutWarning && isMounted) {
          setShowTimeoutWarning(true);
          const remainingMinutes = Math.floor((MAX_DURATION - duration) / 60);
          setAlertModal({
            visible: true,
            title: t('equipment.timeoutWarning', {
              default: 'Session Timeout Warning',
            }),
            message: t('equipment.timeoutMessage', {
              default: `Your workout session will automatically end in ${remainingMinutes} minutes. Please end your session manually to avoid auto-stop.`,
              minutes: remainingMinutes,
            }),
            type: 'warning',
            buttonText: t('common.ok'),
          });
        }
      }

      // Auto-reload when timeout is reached to reflect auto-stop
      if (duration >= MAX_DURATION && isMounted) {
        console.log('[TIMER] Session timeout reached - reloading...');
        loadEquipmentDetails();
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [activeUsage?.start_time, equipment?.category, showTimeoutWarning]);

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

        setAlertModal({
          visible: true,
          title: t('common.success'),
          message:
            t('equipment.actions.startUsage') +
            ' ' +
            t('common.success').toLowerCase(),
          type: 'success',
        });
        loadEquipmentDetails();
      } else {
        setAlertModal({
          visible: true,
          title: t('common.error'),
          message: response.message || t('equipment.errors.startUsageError'),
          type: 'error',
        });
      }
    } catch (err: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: err.message || t('equipment.errors.startUsageError'),
        type: 'error',
      });
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
    // Prevent multiple calls
    if (endingUsage) {
      console.log('[PROCESS] Already ending usage, ignoring duplicate call');
      return;
    }

    if (!member?.id || !activeUsage) {
      console.error('[ERROR] Cannot end usage:', {
        hasMember: !!member,
        memberId: member?.id,
        hasActiveUsage: !!activeUsage,
        activeUsageId: activeUsage?.id,
      });
      return;
    }

    console.log('[STOP] Ending usage:', {
      memberId: member.id,
      usageId: activeUsage.id,
      equipmentId: id,
    });

    setEndingUsage(true);

    setConfirmModal({
      visible: true,
      title: t('equipment.actions.endUsage'),
      message: t('equipment.confirmEndUsage', {
        default: 'Are you sure you want to end this workout session?',
      }),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      confirmButtonStyle: 'destructive',
      loading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        try {
          console.log('📤 Calling stopEquipmentUsage:', {
            memberId: member.id,
            usageId: activeUsage.id,
            equipmentId: id,
          });

          const response = await equipmentService.stopEquipmentUsage(
            member.id,
            activeUsage.id
          );

          console.log('[DATA] Stop usage response:', {
            success: response.success,
            message: response.message,
            data: response.data,
            fullResponse: response,
          });

          // apiService.post always returns { success: true, data, message } on success
          // or throws error on failure
          if (response && response.success !== false) {
            setActiveUsage(null);
            setUsageDuration(0);
            setConfirmModal((prev) => ({ ...prev, visible: false }));
            setAlertModal({
              visible: true,
              title: t('common.success'),
              message: t('equipment.usageEnded', {
                default: 'Workout session ended successfully',
              }),
              type: 'success',
            });
            loadEquipmentDetails();
          } else {
            console.error('[ERROR] Stop usage failed:', response);
            setConfirmModal((prev) => ({ ...prev, visible: false }));
            setAlertModal({
              visible: true,
              title: t('common.error'),
              message: response?.message || t('equipment.errors.endUsageError'),
              type: 'error',
            });
          }
        } catch (err: any) {
          console.error('[ERROR] Stop usage error:', {
            message: err.message,
            status: err.status,
            errors: err.errors,
            error: err,
            response: err.response?.data,
            stack: err.stack,
          });

          const errorMessage =
            err.message ||
            err.response?.data?.message ||
            (err.status === 401 ? t('equipment.errors.unauthorized') : '') ||
            (err.status === 403
              ? t('equipment.errors.onlyOwnUsage')
              : '') ||
            (err.status === 404 ? t('equipment.errors.usageNotFound') : '') ||
            t('equipment.errors.endUsageError');

          setConfirmModal((prev) => ({ ...prev, visible: false }));
          setAlertModal({
            visible: true,
            title: t('common.error'),
            message: errorMessage,
            type: 'error',
          });
        } finally {
          setEndingUsage(false);
        }
      },
    });
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
        setAlertModal({
          visible: true,
          title: t('common.success'),
          message: t('equipment.queue.leftQueue'),
          type: 'success',
        });
        loadEquipmentDetails();
      } else {
        setAlertModal({
          visible: true,
          title: t('common.error'),
          message: response.message || t('equipment.errors.leaveQueueError'),
          type: 'error',
        });
      }
    } catch (err: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: err.message || t('equipment.errors.leaveQueueError'),
        type: 'error',
      });
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
        setAlertModal({
          visible: true,
          title: t('common.success'),
          message: t('equipment.issue.reported'),
          type: 'success',
        });
        setShowReportModal(false);
        loadEquipmentDetails();
      } else {
        setAlertModal({
          visible: true,
          title: t('common.error'),
          message: response.message || t('equipment.errors.reportIssueError'),
          type: 'error',
        });
      }
    } catch (err: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: err.message || t('equipment.errors.reportIssueError'),
        type: 'error',
      });
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
            {error || t('equipment.errors.equipmentNotFound')}
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
                  {t('equipment.maxWeight', { weight: equipment.max_weight })}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* IMPROVEMENT: Queue Analytics */}
        {queueAnalytics && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderLeftWidth: 4,
                borderLeftColor: theme.colors.primary,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              >
                <Activity size={20} color={theme.colors.primary} />
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  {t('equipment.queueAnalytics') || 'Thống kê hàng đợi'}
                </Text>
              </View>
            </View>
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsItem}>
                <Text
                  style={[
                    styles.analyticsLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('equipment.averageWaitTime') || 'Thời gian chờ TB'}
                </Text>
                <Text
                  style={[styles.analyticsValue, { color: theme.colors.text }]}
                >
                  {Math.round(queueAnalytics.averageWaitTime)}{' '}
                  {t('common.minutes') || 'phút'}
                </Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text
                  style={[
                    styles.analyticsLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('equipment.averageDuration') || 'Thời gian sử dụng TB'}
                </Text>
                <Text
                  style={[styles.analyticsValue, { color: theme.colors.text }]}
                >
                  {Math.round(queueAnalytics.averageDuration)}{' '}
                  {t('common.minutes') || 'phút'}
                </Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text
                  style={[
                    styles.analyticsLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('equipment.currentQueueLength') || 'Độ dài hàng đợi'}
                </Text>
                <Text
                  style={[styles.analyticsValue, { color: theme.colors.text }]}
                >
                  {queueAnalytics.currentQueueLength}
                </Text>
              </View>
            </View>
          </View>
        )}

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

            {queue.map((entry, index) => {
              // IMPROVEMENT: Get prediction for user's position
              const isUserEntry = entry.member_id === member?.id;
              const prediction = isUserEntry ? queuePositionPrediction : null;

              return (
                <Fragment key={entry.id}>
                  <View
                    style={[
                      styles.queueItem,
                      {
                        backgroundColor: isUserEntry
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
                        #{entry.position || index + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.queueMemberName,
                          { color: theme.colors.text },
                        ]}
                      >
                        {isUserEntry
                          ? t('profile.title')
                          : entry.member?.full_name || t('equipment.member')}
                      </Text>
                      {/* IMPROVEMENT: Show queue position prediction for user */}
                      {isUserEntry && prediction && prediction.estimatedWaitTime != null && prediction.estimatedTurnAt && (
                        <Text
                          style={[
                            styles.predictionText,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {t('equipment.estimatedWait') ||
                            'Thời gian chờ dự kiến'}
                          : {!isNaN(prediction.estimatedWaitTime) ? Math.round(prediction.estimatedWaitTime) : 0}{' '}
                          {t('common.minutes') || 'phút'} •{' '}
                          {t('equipment.yourTurnAt') || 'Lượt của bạn lúc'}:{' '}
                          {(() => {
                            try {
                              const turnAtDate = new Date(prediction.estimatedTurnAt);
                              if (!isNaN(turnAtDate.getTime())) {
                                return turnAtDate.toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                });
                              }
                              return t('common.notAvailable', 'N/A');
                            } catch (e) {
                              return t('common.notAvailable', 'N/A');
                            }
                          })()}
                        </Text>
                      )}
                    </View>
                  </View>
                </Fragment>
              );
            })}
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
                <Text style={styles.activeBadgeText}>{t('equipment.live')}</Text>
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
                {
                  backgroundColor: endingUsage
                    ? theme.colors.textSecondary
                    : theme.colors.error,
                  opacity: endingUsage ? 0.6 : 1,
                },
              ]}
              onPress={handleEndUsage}
              disabled={endingUsage}
              activeOpacity={0.8}
            >
              {endingUsage ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <StopCircle size={22} color="#FFFFFF" strokeWidth={2.5} />
              )}
              <Text style={styles.endUsageButtonText}>
                {endingUsage
                  ? t('common.processing', { default: 'Processing...' })
                  : t('equipment.actions.endUsage', { default: 'End Workout' })}
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
      {/* Confirm Modal */}
      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        confirmButtonStyle={confirmModal.confirmButtonStyle}
        loading={confirmModal.loading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => {
          setConfirmModal((prev) => ({ ...prev, visible: false }));
          setEndingUsage(false);
        }}
      />

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        buttonText={alertModal.buttonText}
        onClose={() => {
          if (alertModal.onCloseAction) {
            alertModal.onCloseAction();
          }
          setAlertModal((prev) => ({ ...prev, visible: false }));
        }}
      />

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
  // IMPROVEMENT: Styles for availability and analytics
  availabilityCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  availabilityTitle: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  availabilityInfo: {
    marginTop: 8,
    gap: 4,
  },
  availabilityText: {
    ...Typography.bodySmall,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  analyticsItem: {
    flex: 1,
    minWidth: '45%',
  },
  analyticsLabel: {
    ...Typography.bodySmall,
    marginBottom: 4,
  },
  analyticsValue: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  predictionText: {
    ...Typography.bodySmall,
    marginTop: 4,
    fontStyle: 'italic',
  },
  // IMPROVEMENT: Styles for availability and analytics
  availabilityCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  availabilityTitle: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  availabilityInfo: {
    marginTop: 8,
    gap: 4,
  },
  availabilityText: {
    ...Typography.bodySmall,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  analyticsItem: {
    flex: 1,
    minWidth: '45%',
  },
  analyticsLabel: {
    ...Typography.bodySmall,
    marginBottom: 4,
  },
  analyticsValue: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  predictionText: {
    ...Typography.bodySmall,
    marginTop: 4,
    fontStyle: 'italic',
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
