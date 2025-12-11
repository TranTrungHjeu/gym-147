import EquipmentCard from '@/components/EquipmentCard';
import EquipmentFilterModal from '@/components/EquipmentFilterModal';
import { useAuth } from '@/contexts/AuthContext';
import { equipmentService } from '@/services/member/equipment.service';
import {
  Equipment,
  EquipmentCategory,
  EquipmentStatus,
} from '@/types/equipmentTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { AppEvents } from '@/utils/eventEmitter';
import { useRouter } from 'expo-router';
import { ArrowLeft, Filter, QrCode, Search } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function EquipmentListScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<
    EquipmentCategory | 'ALL'
  >('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<{
    category?: EquipmentCategory;
    status?: EquipmentStatus;
  }>({});

  // Categories
  const categories = ['ALL', ...Object.values(EquipmentCategory)];

  // Load equipment data
  const loadEquipment = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await equipmentService.getEquipment({
        category: filters.category,
        status: filters.status,
        limit: 100,
      });

      if (response.success && response.data) {
        setEquipment(response.data.equipment);
      } else {
        setError('Failed to load equipment');
      }
    } catch (err: any) {
      console.error('Error loading equipment:', err);
      setError(err.message || 'Failed to load equipment');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  // Subscribe to real-time updates
  useEffect(() => {
    equipmentService.initWebSocket();

    // Subscribe to general equipment updates
    const handleUpdate = () => {
      loadEquipment();
    };

    // Handle queue updates specifically
    const handleQueueUpdate = (data: any) => {
      console.log('[EQUIPMENT] Queue updated - refreshing equipment list:', data);
      if (data.equipment_id) {
        // Optimistically update queue count for the specific equipment
        setEquipment((prevEquipment) =>
          prevEquipment.map((eq) => {
            if (eq.id === data.equipment_id) {
              // Update queue count if provided, otherwise reload
              if (data.queue_length !== undefined) {
                return {
                  ...eq,
                  _count: {
                    ...eq._count,
                    queue: data.queue_length,
                  },
                };
              }
            }
            return eq;
          })
        );
        // Also reload to ensure accuracy
        loadEquipment();
      }
    };

    // Listen for updates
    equipmentService.subscribeToEquipment('all', handleUpdate);
    
    // Listen for queue-specific updates
    const socket = (equipmentService as any).socket;
    if (socket) {
      socket.on('equipment:queue:updated', handleQueueUpdate);
    }

    return () => {
      equipmentService.unsubscribeFromEquipment('all');
      if (socket) {
        socket.off('equipment:queue:updated', handleQueueUpdate);
      }
    };
  }, [loadEquipment]);

  // Optimistic update when queue:your_turn event is received
  useEffect(() => {
    const handleQueueYourTurn = (data: any) => {
      console.log('[EQUIPMENT] Queue your turn - optimistic update:', data);
      
      // Optimistically update equipment status to AVAILABLE
      if (data.equipment_id) {
        setEquipment((prevEquipment) =>
          prevEquipment.map((eq) =>
            eq.id === data.equipment_id
              ? { ...eq, status: EquipmentStatus.AVAILABLE }
              : eq
          )
        );
      }
    };

    const handleEquipmentAvailable = (data: any) => {
      console.log('[EQUIPMENT] Equipment available - optimistic update:', data);
      
      // Optimistically update equipment status to AVAILABLE
      if (data.equipment_id) {
        setEquipment((prevEquipment) =>
          prevEquipment.map((eq) =>
            eq.id === data.equipment_id
              ? { ...eq, status: EquipmentStatus.AVAILABLE }
              : eq
          )
        );
      }
    };

    // Listen to AppEvents for optimistic updates
    AppEvents.on('queue:your_turn', handleQueueYourTurn);
    AppEvents.on('equipment:available', handleEquipmentAvailable);

    return () => {
      AppEvents.off('queue:your_turn', handleQueueYourTurn);
      AppEvents.off('equipment:available', handleEquipmentAvailable);
    };
  }, []);

  // Filter equipment based on search and category
  useEffect(() => {
    let filtered = equipment;

    // Apply category filter
    if (activeCategory !== 'ALL') {
      filtered = filtered.filter((eq) => eq.category === activeCategory);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (eq) =>
          eq.name.toLowerCase().includes(query) ||
          eq.brand?.toLowerCase().includes(query) ||
          eq.location.toLowerCase().includes(query)
      );
    }

    setFilteredEquipment(filtered);
  }, [equipment, activeCategory, searchQuery]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEquipment();
    setRefreshing(false);
  };

  // Handle filter apply
  const handleApplyFilters = (newFilters: {
    category?: EquipmentCategory;
    status?: EquipmentStatus;
  }) => {
    setFilters(newFilters);
    if (newFilters.category) {
      setActiveCategory(newFilters.category);
    }
  };

  // Render category button
  const renderCategoryButton = (category: string) => {
    const isActive = activeCategory === category;
    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryButton,
          {
            backgroundColor: isActive
              ? theme.colors.primary
              : theme.colors.surface,
            borderColor: isActive ? theme.colors.primary : theme.colors.border,
          },
        ]}
        onPress={() => setActiveCategory(category as EquipmentCategory | 'ALL')}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.categoryText,
            {
              color: isActive ? theme.colors.textInverse : theme.colors.text,
              fontWeight: isActive ? '600' : '500',
            },
          ]}
        >
          {category === 'ALL'
            ? t('equipment.all')
            : t(
                `equipment.categories.${category
                  .toLowerCase()
                  .replaceAll('_', '')}`,
                category
              )}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render equipment item
  const renderEquipmentItem = ({ item }: { item: Equipment }) => (
    <EquipmentCard
      equipment={item}
      onPress={() => router.push(`/equipment/${item.id}`)}
    />
  );

  // Show loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            {t('equipment.loadingEquipment')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('equipment.title')}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => router.push('/equipment/qr-scanner')}
            activeOpacity={0.7}
          >
            <QrCode size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                marginLeft: 8,
              },
            ]}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.7}
          >
            <Filter size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Search size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={t('equipment.searchPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Equipment Count */}
      {filteredEquipment.length > 0 && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={[
              {
                ...Typography.h6,
                color: theme.colors.text,
                fontWeight: '600',
              },
            ]}
          >
            {filteredEquipment.length}{' '}
            {filteredEquipment.length === 1
              ? t('equipment.equipmentFound') || 'thiết bị'
              : t('equipment.equipmentsFound') || 'thiết bị'}
          </Text>
          {(searchQuery || activeCategory !== 'ALL') && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setActiveCategory('ALL');
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text
                style={[
                  {
                    ...Typography.bodySmall,
                    color: theme.colors.primary,
                    fontWeight: '600',
                  },
                ]}
              >
                {t('common.clear') || 'Xóa bộ lọc'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Category Tabs */}
      <View
        style={[
          styles.categoriesWrapper,
          {
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          renderItem={({ item }) => renderCategoryButton(item)}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoriesContainer}
        />
      </View>

      {/* Equipment List */}
      <FlatList
        data={filteredEquipment}
        renderItem={renderEquipmentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text
              style={[
                styles.emptyStateText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {error || t('equipment.noEquipmentFound')}
            </Text>
            {!error && (
              <Text
                style={[
                  styles.emptyStateSubtext,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('equipment.tryAdjustingFilters')}
              </Text>
            )}
          </View>
        }
      />

      {/* Filter Modal */}
      <EquipmentFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
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
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    ...Typography.h4,
    flex: 1,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyMedium,
  },
  categoriesWrapper: {
    paddingBottom: 8,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 10,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    ...Typography.bodyMedium,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    ...Typography.bodyMedium,
    marginTop: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    ...Typography.h6,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
});
