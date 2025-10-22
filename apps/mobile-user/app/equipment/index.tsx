import EquipmentCard from '@/components/EquipmentCard';
import WorkoutLogger from '@/components/WorkoutLogger';
import { useAuth } from '@/contexts/AuthContext';
import {
  equipmentService,
  type Equipment,
  type EquipmentFilters,
  type EquipmentUsage,
  type StartEquipmentUsageRequest,
  type StopEquipmentUsageRequest,
} from '@/services';
import { useTheme } from '@/utils/theme';
import { useRouter } from 'expo-router';
import { Activity, Filter, Search } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const CATEGORIES = [
  'CARDIO',
  'STRENGTH',
  'FREE_WEIGHTS',
  'MACHINES',
  'FUNCTIONAL',
  'RECOVERY',
  'SPECIALIZED',
];

export default function EquipmentScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  // State for data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [currentUsage, setCurrentUsage] = useState<EquipmentUsage | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'ALL'>(
    'ALL'
  );
  const [showFilters, setShowFilters] = useState(false);
  const [showWorkoutLogger, setShowWorkoutLogger] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadEquipment();
  }, [selectedCategory]);

  const loadEquipment = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🏋️ Loading equipment...');
      console.log('👤 User:', user);

      if (!user?.id) {
        setError('Please login to view equipment');
        return;
      }

      // Create filters
      const filters: EquipmentFilters = {
        category:
          selectedCategory !== 'ALL' ? (selectedCategory as any) : undefined,
      };

      const response = await equipmentService.getEquipment(filters);

      if (response.success && response.data) {
        console.log('✅ Equipment loaded:', response.data.length, 'items');
        setEquipment(response.data);
      } else {
        console.log('❌ Failed to load equipment:', response.error);
        setError(response.error || 'Failed to load equipment');
      }
    } catch (err: any) {
      console.error('❌ Error loading equipment:', err);
      setError(err.message || 'Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEquipment();
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // TODO: Implement search functionality
  };

  const handleCategorySelect = (category: string | 'ALL') => {
    setSelectedCategory(category);
  };

  const handleEquipmentPress = (equipment: Equipment) => {
    router.push(`/equipment/${equipment.id}`);
  };

  const handleStartUsage = async (equipment: Equipment) => {
    if (!user?.id) {
      Alert.alert('Error', 'Please login to start equipment usage');
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
          'Error',
          response.error || 'Failed to start equipment usage'
        );
      }
    } catch (error: any) {
      console.error('❌ Error starting equipment usage:', error);
      Alert.alert('Error', error.message || 'Failed to start equipment usage');
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
        Alert.alert('Success', 'Workout saved successfully!');
        // Refresh equipment list to update status
        await loadEquipment();
      } else {
        Alert.alert('Error', response.error || 'Failed to save workout');
      }
    } catch (error: any) {
      console.error('❌ Error saving workout:', error);
      Alert.alert('Error', error.message || 'Failed to save workout');
    }
  };

  const handleCancelWorkout = () => {
    setShowWorkoutLogger(false);
    setCurrentUsage(null);
  };

  const filteredEquipment = equipment.filter((item) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading equipment...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={loadEquipment}
          >
            <Text
              style={[
                styles.retryButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              Retry
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Equipment
        </Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/equipment/my-usage')}
        >
          <Activity size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Search size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search equipment..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: theme.colors.surface },
          ]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategory === 'ALL' && {
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={() => handleCategorySelect('ALL')}
        >
          <Text
            style={[
              styles.categoryText,
              selectedCategory === 'ALL' && { color: theme.colors.textInverse },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && {
                backgroundColor: theme.colors.primary,
              },
            ]}
            onPress={() => handleCategorySelect(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && {
                  color: theme.colors.textInverse,
                },
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Equipment List */}
      <FlatList
        data={filteredEquipment}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EquipmentCard
            equipment={item}
            onPress={() => handleEquipmentPress(item)}
            onStartUsage={() => handleStartUsage(item)}
            showUsageActions={true}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text
              style={[styles.emptyText, { color: theme.colors.textSecondary }]}
            >
              No equipment found
            </Text>
            <Text
              style={[
                styles.emptySubtext,
                { color: theme.colors.textSecondary },
              ]}
            >
              Try adjusting your search or filters
            </Text>
          </View>
        }
      />

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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryContainer: {
    paddingVertical: 8,
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
