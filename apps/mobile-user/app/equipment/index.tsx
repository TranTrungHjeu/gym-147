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

    // Listen for updates
    equipmentService.subscribeToEquipment('all', handleUpdate);

    return () => {
      equipmentService.unsubscribeFromEquipment('all');
    };
  }, [loadEquipment]);

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
            borderColor: theme.colors.border,
          },
        ]}
        onPress={() => setActiveCategory(category as EquipmentCategory | 'ALL')}
      >
        <Text
          style={[
            styles.categoryText,
            {
              color: isActive ? '#fff' : theme.colors.textSecondary,
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
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
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={() => router.push('/equipment/qr-scanner')}
          >
            <QrCode size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: theme.colors.surface, marginLeft: 8 },
            ]}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
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

      {/* Category Tabs */}
      <View
        style={[
          styles.categoriesWrapper,
          { backgroundColor: theme.colors.background },
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
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    ...Typography.h4,
    flex: 1,
    marginLeft: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyMedium,
  },
  categoriesWrapper: {
    paddingBottom: 4,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
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
