import { useAuth } from '@/contexts/AuthContext';
import { equipmentService, type EquipmentUsage } from '@/services';
import { useTheme } from '@/utils/theme';
import { useRouter } from 'expo-router';
import { Activity, ArrowLeft, Clock, Flame } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type UsageTab = 'recent' | 'stats' | 'history';

export default function MyUsageScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  // State for data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageHistory, setUsageHistory] = useState<EquipmentUsage[]>([]);
  const [usageStats, setUsageStats] = useState<any>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<UsageTab>('recent');

  // Load data on component mount
  useEffect(() => {
    loadUsageData();
  }, []);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🏋️ Loading usage data...');
      console.log('👤 User:', user);

      if (!user?.id) {
        setError('Please login to view usage history');
        return;
      }

      // Load usage history and stats in parallel
      const [historyResponse, statsResponse] = await Promise.all([
        equipmentService.getMemberUsageHistory(user.id),
        equipmentService.getMemberUsageStats(user.id),
      ]);

      if (historyResponse.success && historyResponse.data) {
        console.log(
          '✅ Usage history loaded:',
          historyResponse.data.length,
          'sessions'
        );
        setUsageHistory(historyResponse.data);
      } else {
        console.log('❌ Failed to load usage history:', historyResponse.error);
        setUsageHistory([]);
      }

      if (statsResponse.success && statsResponse.data) {
        console.log('✅ Usage stats loaded:', statsResponse.data);
        setUsageStats(statsResponse.data);
      } else {
        console.log('❌ Failed to load usage stats:', statsResponse.error);
      }
    } catch (err: any) {
      console.error('❌ Error loading usage data:', err);
      setError(err.message || 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsageData();
    setRefreshing(false);
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString(i18n.language, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getRecentUsage = () => {
    return usageHistory.slice(0, 10); // Show last 10 sessions
  };

  const getUsageByDate = () => {
    const grouped: { [key: string]: EquipmentUsage[] } = {};
    usageHistory.forEach((usage) => {
      const date = new Date(usage.start_time).toLocaleDateString(i18n.language);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(usage);
    });
    return grouped;
  };

  const renderUsageItem = ({ item }: { item: EquipmentUsage }) => (
    <TouchableOpacity
      style={[styles.usageItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => router.push(`/equipment/usage/${item.id}`)}
    >
      <View style={styles.usageHeader}>
        <Text style={[styles.equipmentName, { color: theme.colors.text }]}>
          {item.equipment?.name}
        </Text>
        <Text style={[styles.usageDate, { color: theme.colors.textSecondary }]}>
          {formatDate(item.start_time)}
        </Text>
      </View>

      <View style={styles.usageDetails}>
        <View style={styles.usageDetail}>
          <Clock size={14} color={theme.colors.textSecondary} />
          <Text
            style={[
              styles.usageDetailText,
              { color: theme.colors.textSecondary },
            ]}
          >
            {formatTime(item.start_time)} -{' '}
            {item.end_time ? formatTime(item.end_time) : 'In Progress'}
          </Text>
        </View>

        {item.duration_minutes && (
          <View style={styles.usageDetail}>
            <Activity size={14} color={theme.colors.textSecondary} />
            <Text
              style={[
                styles.usageDetailText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {item.duration_minutes} minutes
            </Text>
          </View>
        )}

        {item.calories_burned && (
          <View style={styles.usageDetail}>
            <Flame size={14} color={theme.colors.warning} />
            <Text
              style={[
                styles.usageDetailText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {item.calories_burned} calories
            </Text>
          </View>
        )}

        {item.sets_completed && item.reps_per_set && (
          <View style={styles.usageDetail}>
            <Text
              style={[
                styles.usageDetailText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {item.sets_completed} sets × {item.reps_per_set} reps
            </Text>
          </View>
        )}

        {item.weight_used && (
          <View style={styles.usageDetail}>
            <Text
              style={[
                styles.usageDetailText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {item.weight_used} kg
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderStatsContent = () => {
    if (!usageStats) {
      return (
        <View style={styles.emptyContainer}>
          <Text
            style={[styles.emptyText, { color: theme.colors.textSecondary }]}
          >
            No statistics available
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.statsContent}>
        {/* Overview Stats */}
        <View
          style={[
            styles.statsSection,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Overview
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {usageStats.total_sessions || 0}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Total Sessions
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {Math.floor((usageStats.total_duration_minutes || 0) / 60)}h
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Total Time
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {usageStats.total_calories_burned || 0}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Calories Burned
              </Text>
            </View>
          </View>
        </View>

        {/* Favorite Equipment */}
        {usageStats.favorite_equipment &&
          usageStats.favorite_equipment.length > 0 && (
            <View
              style={[
                styles.statsSection,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Favorite Equipment
              </Text>
              {usageStats.favorite_equipment.map(
                (equipment: any, index: number) => (
                  <View key={index} style={styles.favoriteItem}>
                    <Text
                      style={[
                        styles.favoriteName,
                        { color: theme.colors.text },
                      ]}
                    >
                      {equipment.equipment_name}
                    </Text>
                    <Text
                      style={[
                        styles.favoriteStats,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {equipment.usage_count} uses • {equipment.total_duration}{' '}
                      min
                    </Text>
                  </View>
                )
              )}
            </View>
          )}

        {/* Usage by Category */}
        {usageStats.usage_by_category &&
          usageStats.usage_by_category.length > 0 && (
            <View
              style={[
                styles.statsSection,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Usage by Category
              </Text>
              {usageStats.usage_by_category.map(
                (category: any, index: number) => (
                  <View key={index} style={styles.categoryItem}>
                    <Text
                      style={[
                        styles.categoryName,
                        { color: theme.colors.text },
                      ]}
                    >
                      {category.category}
                    </Text>
                    <Text
                      style={[
                        styles.categoryStats,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {category.sessions} sessions • {category.duration} min •{' '}
                      {category.calories} cal
                    </Text>
                  </View>
                )
              )}
            </View>
          )}
      </ScrollView>
    );
  };

  const renderHistoryContent = () => {
    const groupedUsage = getUsageByDate();
    const dates = Object.keys(groupedUsage).sort().reverse();

    if (dates.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text
            style={[styles.emptyText, { color: theme.colors.textSecondary }]}
          >
            No usage history found
          </Text>
          <Text
            style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}
          >
            Start using equipment to see your history here
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.historyContent}>
        {dates.map((date) => (
          <View key={date} style={styles.dateGroup}>
            <Text style={[styles.dateHeader, { color: theme.colors.text }]}>
              {new Date(date).toLocaleDateString(i18n.language, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            {groupedUsage[date].map((usage) => (
              <TouchableOpacity
                key={usage.id}
                style={[
                  styles.usageItem,
                  { backgroundColor: theme.colors.surface },
                ]}
                onPress={() => router.push(`/equipment/usage/${usage.id}`)}
              >
                <View style={styles.usageHeader}>
                  <Text
                    style={[styles.equipmentName, { color: theme.colors.text }]}
                  >
                    {usage.equipment?.name}
                  </Text>
                  <Text
                    style={[
                      styles.usageTime,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {formatTime(usage.start_time)}
                  </Text>
                </View>

                <View style={styles.usageDetails}>
                  {usage.duration_minutes && (
                    <Text
                      style={[
                        styles.usageDetailText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {usage.duration_minutes} minutes
                    </Text>
                  )}
                  {usage.calories_burned && (
                    <Text
                      style={[
                        styles.usageDetailText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {usage.calories_burned} calories
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading usage data...
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
            onPress={loadUsageData}
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          My Usage
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab Navigation */}
      <View
        style={[
          styles.tabContainer,
          { borderBottomColor: theme.colors.border },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'recent' && {
                borderBottomColor: theme.colors.primary,
              },
            ]}
            onPress={() => setActiveTab('recent')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'recent' && { color: theme.colors.primary },
              ]}
            >
              Recent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'stats' && {
                borderBottomColor: theme.colors.primary,
              },
            ]}
            onPress={() => setActiveTab('stats')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'stats' && { color: theme.colors.primary },
              ]}
            >
              Statistics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'history' && {
                borderBottomColor: theme.colors.primary,
              },
            ]}
            onPress={() => setActiveTab('history')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'history' && { color: theme.colors.primary },
              ]}
            >
              History
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content */}
      {activeTab === 'recent' && (
        <FlatList
          data={getRecentUsage()}
          keyExtractor={(item) => item.id}
          renderItem={renderUsageItem}
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
                style={[
                  styles.emptyText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                No recent usage found
              </Text>
              <Text
                style={[
                  styles.emptySubtext,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Start using equipment to see your sessions here
              </Text>
            </View>
          }
        />
      )}

      {activeTab === 'stats' && renderStatsContent()}

      {activeTab === 'history' && renderHistoryContent()}
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
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  headerSpacer: {
    width: 32,
  },
  tabContainer: {
    borderBottomWidth: 1,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  usageItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  equipmentName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  usageDate: {
    fontSize: 14,
  },
  usageTime: {
    fontSize: 14,
  },
  usageDetails: {
    gap: 4,
  },
  usageDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  usageDetailText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  statsContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsSection: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  favoriteItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  favoriteName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  favoriteStats: {
    fontSize: 14,
  },
  categoryItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  categoryStats: {
    fontSize: 14,
  },
  historyContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dateGroup: {
    marginTop: 20,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
});
