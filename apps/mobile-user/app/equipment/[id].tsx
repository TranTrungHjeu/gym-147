import WorkoutLogger from '@/components/WorkoutLogger';
import { useAuth } from '@/contexts/AuthContext';
import {
  equipmentService,
  type Equipment,
  type EquipmentUsage,
  type StartEquipmentUsageRequest,
  type StopEquipmentUsageRequest,
} from '@/services';
import { useTheme } from '@/utils/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Activity,
  ArrowLeft,
  Flame,
  MapPin,
  Play,
  Square,
  Wrench,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EquipmentDetailScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();

  // State for data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [currentUsage, setCurrentUsage] = useState<EquipmentUsage | null>(null);
  const [recentUsage, setRecentUsage] = useState<EquipmentUsage[]>([]);

  // UI state
  const [showWorkoutLogger, setShowWorkoutLogger] = useState(false);

  // Load data on component mount
  useEffect(() => {
    if (id) {
      loadEquipmentData();
    }
  }, [id]);

  const loadEquipmentData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🏋️ Loading equipment data for ID:', id);

      if (!user?.id) {
        setError('Please login to view equipment details');
        return;
      }

      // Load equipment details
      const equipmentResponse = await equipmentService.getEquipmentById(id!);

      if (equipmentResponse.success && equipmentResponse.data) {
        console.log('✅ Equipment loaded:', equipmentResponse.data);
        setEquipment(equipmentResponse.data);

        // Load current usage for this equipment
        const currentUsageResponse = await equipmentService.getCurrentUsage(
          id!
        );
        if (currentUsageResponse.success && currentUsageResponse.data) {
          setCurrentUsage(currentUsageResponse.data[0] || null);
        }

        // Load recent usage history
        const usageResponse = await equipmentService.getMemberUsageHistory(
          user.id,
          {
            equipment_id: id,
          }
        );
        if (usageResponse.success && usageResponse.data) {
          setRecentUsage(usageResponse.data.slice(0, 5)); // Show last 5 sessions
        }
      } else {
        console.log('❌ Failed to load equipment:', equipmentResponse.error);
        setError(equipmentResponse.error || 'Failed to load equipment details');
      }
    } catch (err: any) {
      console.error('❌ Error loading equipment data:', err);
      setError(err.message || 'Failed to load equipment details');
    } finally {
      setLoading(false);
    }
  };

  const handleStartUsage = async () => {
    if (!user?.id || !equipment) {
      Alert.alert(t('common.error'), t('equipment.errors.loginRequired'));
      return;
    }

    try {
      console.log('🏋️ Starting equipment usage for:', equipment.name);

      const usageData: StartEquipmentUsageRequest = {
        equipment_id: equipment.id,
      };

      const response = await equipmentService.startEquipmentUsage(
        user.id,
        usageData
      );

      if (response.success && response.data) {
        console.log('✅ Equipment usage started:', response.data);
        setCurrentUsage(response.data);
        setShowWorkoutLogger(true);
      } else {
        Alert.alert(
          t('common.error'),
          response.error || t('equipment.errors.startUsageFailed')
        );
      }
    } catch (error: any) {
      console.error('❌ Error starting equipment usage:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('equipment.errors.startUsageFailed')
      );
    }
  };

  const handleSaveWorkout = async (saveData: StopEquipmentUsageRequest) => {
    if (!user?.id || !currentUsage) return;

    try {
      console.log('🏋️ Saving workout data:', saveData);

      const response = await equipmentService.stopEquipmentUsage(
        user.id,
        currentUsage.id,
        saveData
      );

      if (response.success) {
        console.log('✅ Workout saved successfully');
        setShowWorkoutLogger(false);
        setCurrentUsage(null);
        Alert.alert(t('common.success'), t('equipment.workoutSaved'));
        // Refresh equipment data
        await loadEquipmentData();
      } else {
        Alert.alert(
          t('common.error'),
          response.error || t('equipment.errors.saveWorkoutFailed')
        );
      }
    } catch (error: any) {
      console.error('❌ Error saving workout:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('equipment.errors.saveWorkoutFailed')
      );
    }
  };

  const handleCancelWorkout = () => {
    setShowWorkoutLogger(false);
    setCurrentUsage(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return theme.colors.success;
      case 'IN_USE':
        return theme.colors.warning;
      case 'MAINTENANCE':
        return theme.colors.error;
      case 'OUT_OF_ORDER':
        return theme.colors.error;
      case 'RESERVED':
        return theme.colors.primary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'Available';
      case 'IN_USE':
        return 'In Use';
      case 'MAINTENANCE':
        return 'Under Maintenance';
      case 'OUT_OF_ORDER':
        return 'Out of Order';
      case 'RESERVED':
        return 'Reserved';
      default:
        return status;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'CARDIO':
        return '🏃‍♂️';
      case 'STRENGTH':
        return '💪';
      case 'FREE_WEIGHTS':
        return '🏋️‍♂️';
      case 'MACHINES':
        return '⚙️';
      case 'FUNCTIONAL':
        return '🤸‍♂️';
      case 'RECOVERY':
        return '🧘‍♀️';
      case 'SPECIALIZED':
        return '🎯';
      default:
        return '🏋️';
    }
  };

  const canStartUsage = equipment?.status === 'AVAILABLE' && !currentUsage;

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading equipment details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error || !equipment) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error || 'Equipment not found'}
          </Text>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => router.back()}
          >
            <Text
              style={[
                styles.retryButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              Go Back
            </Text>
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
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Equipment Details
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Equipment Image */}
        <View style={styles.imageContainer}>
          <Text style={styles.categoryIcon}>
            {getCategoryIcon(equipment.category)}
          </Text>
        </View>

        {/* Equipment Info */}
        <View style={styles.equipmentInfo}>
          <Text style={[styles.equipmentName, { color: theme.colors.text }]}>
            {equipment.name}
          </Text>
          <Text
            style={[
              styles.equipmentCategory,
              { color: theme.colors.textSecondary },
            ]}
          >
            {equipment.category}
          </Text>
          {equipment.description && (
            <Text
              style={[
                styles.equipmentDescription,
                { color: theme.colors.text },
              ]}
            >
              {equipment.description}
            </Text>
          )}
        </View>

        {/* Status and Location */}
        <View
          style={[styles.section, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Equipment Details
          </Text>

          <View style={styles.detailRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(equipment.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusText(equipment.status)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MapPin size={20} color={theme.colors.primary} />
            <Text style={[styles.detailText, { color: theme.colors.text }]}>
              {equipment.location}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Activity size={20} color={theme.colors.primary} />
            <Text style={[styles.detailText, { color: theme.colors.text }]}>
              {equipment.usage_count} total uses
            </Text>
          </View>
        </View>

        {/* Current Usage */}
        {currentUsage && (
          <View
            style={[styles.section, { backgroundColor: theme.colors.surface }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Current Usage
            </Text>
            <View style={styles.usageInfo}>
              <Text style={[styles.usageText, { color: theme.colors.text }]}>
                Equipment is currently in use
              </Text>
              <Text
                style={[
                  styles.usageTime,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Started:{' '}
                {new Date(currentUsage.start_time).toLocaleTimeString(
                  i18n.language
                )}
              </Text>
            </View>
          </View>
        )}

        {/* Maintenance Info */}
        {equipment.next_maintenance && (
          <View
            style={[styles.section, { backgroundColor: theme.colors.surface }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Maintenance
            </Text>
            <View style={styles.maintenanceInfo}>
              <Wrench size={20} color={theme.colors.warning} />
              <Text
                style={[
                  styles.maintenanceText,
                  { color: theme.colors.warning },
                ]}
              >
                Next maintenance:{' '}
                {new Date(equipment.next_maintenance).toLocaleDateString(
                  i18n.language
                )}
              </Text>
            </View>
          </View>
        )}

        {/* Recent Usage History */}
        {recentUsage.length > 0 && (
          <View
            style={[styles.section, { backgroundColor: theme.colors.surface }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Recent Usage
            </Text>
            {recentUsage.map((usage, index) => (
              <View key={usage.id} style={styles.usageItem}>
                <View style={styles.usageHeader}>
                  <Text
                    style={[styles.usageDate, { color: theme.colors.text }]}
                  >
                    {new Date(usage.start_time).toLocaleDateString(
                      i18n.language
                    )}
                  </Text>
                  <Text
                    style={[
                      styles.usageDuration,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {usage.duration_minutes || 0} min
                  </Text>
                </View>
                {usage.calories_burned && (
                  <View style={styles.usageStats}>
                    <Flame size={14} color={theme.colors.warning} />
                    <Text
                      style={[
                        styles.usageStat,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {usage.calories_burned} calories
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actions, { borderTopColor: theme.colors.border }]}>
        {canStartUsage ? (
          <TouchableOpacity
            style={[
              styles.startButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={handleStartUsage}
          >
            <Play size={20} color={theme.colors.textInverse} />
            <Text
              style={[
                styles.startButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              Start Usage
            </Text>
          </TouchableOpacity>
        ) : equipment.status === 'IN_USE' ? (
          <TouchableOpacity
            style={[
              styles.inUseButton,
              { backgroundColor: theme.colors.warning },
            ]}
            disabled
          >
            <Square size={20} color={theme.colors.textInverse} />
            <Text
              style={[
                styles.inUseButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              In Use
            </Text>
          </TouchableOpacity>
        ) : equipment.status === 'MAINTENANCE' ? (
          <TouchableOpacity
            style={[
              styles.maintenanceButton,
              { backgroundColor: theme.colors.error },
            ]}
            disabled
          >
            <Wrench size={20} color={theme.colors.textInverse} />
            <Text
              style={[
                styles.maintenanceButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              Under Maintenance
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.unavailableButton,
              { backgroundColor: theme.colors.textSecondary },
            ]}
            disabled
          >
            <Text
              style={[
                styles.unavailableButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              {getStatusText(equipment.status)}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Workout Logger Modal */}
      {currentUsage && (
        <WorkoutLogger
          usage={currentUsage}
          onSave={handleSaveWorkout}
          onCancel={handleCancelWorkout}
          loading={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    height: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: {
    fontSize: 80,
  },
  equipmentInfo: {
    padding: 20,
  },
  equipmentName: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  equipmentCategory: {
    fontSize: 16,
    marginBottom: 8,
  },
  equipmentDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  section: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  detailText: {
    fontSize: 16,
    marginLeft: 12,
  },
  usageInfo: {
    padding: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
  },
  usageText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  usageTime: {
    fontSize: 14,
  },
  maintenanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
  },
  maintenanceText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  usageItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  usageDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  usageDuration: {
    fontSize: 14,
  },
  usageStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usageStat: {
    fontSize: 12,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  inUseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  inUseButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  maintenanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  maintenanceButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  unavailableButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 8,
  },
  unavailableButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
