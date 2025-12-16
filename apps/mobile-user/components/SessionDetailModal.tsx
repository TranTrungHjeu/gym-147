import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import {
  Clock,
  CreditCard,
  Dumbbell,
  Flame,
  MapPin,
  Scale,
  Star,
  X,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface SessionDetailModalProps {
  visible: boolean;
  session: any;
  onClose: () => void;
  loading?: boolean;
}

export default function SessionDetailModal({
  visible,
  session,
  onClose,
  loading = false,
}: SessionDetailModalProps) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();

  // Handle API response structure: { session: {...}, equipmentUsage: {...}, caloriesBreakdown: {...} }
  const sessionData = session?.session || session || null;
  const equipmentUsage = session?.equipmentUsage || null;
  const caloriesBreakdown = session?.caloriesBreakdown || null;

  if (!sessionData) {
    return null;
  }

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString(i18n.language, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes || minutes <= 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getAccessMethodText = (method: string | null | undefined): string => {
    if (!method) return 'Unknown';
    try {
      const translated = t(`session.methods.${method}`);
      if (translated && translated !== `session.methods.${method}`) {
        return translated;
      }
      return method || 'Unknown';
    } catch (error) {
      return method || 'Unknown';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.colors.surface },
            theme.shadows.sm,
          ]}
        >
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t('session.title') || 'Session Details'}
          </Text>
          <TouchableOpacity
            style={[
              styles.closeButton,
              {
                backgroundColor: theme.isDark
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(0,0,0,0.05)',
              },
              theme.shadows.sm,
            ]}
            onPress={onClose}
          >
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                {t('session.loading') || 'Loading...'}
              </Text>
            </View>
          ) : (
            <>
              {/* Session Overview */}
              <View
                style={[
                  styles.section,
                  { backgroundColor: theme.colors.surface },
                  theme.shadows.md,
                ]}
              >
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  {t('session.overview') || 'Overview'}
                </Text>

                <View style={styles.infoRow}>
                  <Clock size={20} color={theme.colors.primary} />
                  <View style={styles.infoContent}>
                    <Text
                      style={[
                        styles.infoLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {t('session.entryTime') || 'Entry Time'}
                    </Text>
                    <Text
                      style={[styles.infoValue, { color: theme.colors.text }]}
                    >
                      {formatTime(sessionData.entry_time)}
                    </Text>
                  </View>
                </View>

                {sessionData.exit_time && (
                  <View style={styles.infoRow}>
                    <Clock size={20} color={theme.colors.primary} />
                    <View style={styles.infoContent}>
                      <Text
                        style={[
                          styles.infoLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {t('session.exitTime') || 'Exit Time'}
                      </Text>
                      <Text
                        style={[styles.infoValue, { color: theme.colors.text }]}
                      >
                        {formatTime(sessionData.exit_time)}
                      </Text>
                    </View>
                  </View>
                )}

                {sessionData.duration && (
                  <View style={styles.infoRow}>
                    <Clock size={20} color={theme.colors.primary} />
                    <View style={styles.infoContent}>
                      <Text
                        style={[
                          styles.infoLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {t('session.duration') || 'Duration'}
                      </Text>
                      <Text
                        style={[styles.infoValue, { color: theme.colors.text }]}
                      >
                        {formatDuration(sessionData.duration)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <CreditCard size={20} color={theme.colors.primary} />
                  <View style={styles.infoContent}>
                    <Text
                      style={[
                        styles.infoLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {t('session.entryMethod') || 'Entry Method'}
                    </Text>
                    <Text
                      style={[styles.infoValue, { color: theme.colors.text }]}
                    >
                      {getAccessMethodText(sessionData?.entry_method)}
                    </Text>
                  </View>
                </View>

                {sessionData.exit_method && (
                  <View style={styles.infoRow}>
                    <CreditCard size={20} color={theme.colors.primary} />
                    <View style={styles.infoContent}>
                      <Text
                        style={[
                          styles.infoLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {t('session.exitMethod') || 'Exit Method'}
                      </Text>
                      <Text
                        style={[styles.infoValue, { color: theme.colors.text }]}
                      >
                        {getAccessMethodText(sessionData?.exit_method)}
                      </Text>
                    </View>
                  </View>
                )}

                {sessionData.entry_gate && (
                  <View style={styles.infoRow}>
                    <MapPin size={20} color={theme.colors.primary} />
                    <View style={styles.infoContent}>
                      <Text
                        style={[
                          styles.infoLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {t('session.entryGate') || 'Entry Gate'}
                      </Text>
                      <Text
                        style={[styles.infoValue, { color: theme.colors.text }]}
                      >
                        {sessionData.entry_gate || 'N/A'}
                      </Text>
                    </View>
                  </View>
                )}

                {sessionData.exit_gate && (
                  <View style={styles.infoRow}>
                    <MapPin size={20} color={theme.colors.primary} />
                    <View style={styles.infoContent}>
                      <Text
                        style={[
                          styles.infoLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {t('session.exitGate') || 'Exit Gate'}
                      </Text>
                      <Text
                        style={[styles.infoValue, { color: theme.colors.text }]}
                      >
                        {sessionData.exit_gate || 'N/A'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Stats */}
              <View
                style={[
                  styles.section,
                  { backgroundColor: theme.colors.surface },
                  theme.shadows.md,
                ]}
              >
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  {t('session.statistics') || 'Statistics'}
                </Text>

                <View style={styles.statsGrid}>
                  <View
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: theme.colors.background,
                        borderWidth: 1,
                        borderColor: theme.isDark
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.05)',
                      },
                      theme.shadows.sm,
                    ]}
                  >
                    <Flame size={24} color="#FF6B6B" />
                    <Text
                      style={[styles.statValue, { color: theme.colors.text }]}
                    >
                      {String(sessionData?.calories_burned || 0)}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {t('session.caloriesBurned') || 'Calories Burned'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: theme.colors.background,
                        borderWidth: 1,
                        borderColor: theme.isDark
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.05)',
                      },
                      theme.shadows.sm,
                    ]}
                  >
                    <View style={styles.ratingStars}>
                      {sessionData.session_rating ? (
                        Array.from({ length: 5 }, (_, index) => (
                          <Star
                            key={index}
                            size={16}
                            color="#FFD700"
                            fill={
                              index < Math.floor(sessionData.session_rating)
                                ? '#FFD700'
                                : 'transparent'
                            }
                          />
                        ))
                      ) : (
                        <Star size={24} color="#FFD700" />
                      )}
                    </View>
                    <Text
                      style={[styles.statValue, { color: theme.colors.text }]}
                    >
                      {sessionData.session_rating
                        ? `${(sessionData.session_rating || 0).toFixed(1)}/5`
                        : 'N/A'}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {t('session.rating') || 'Rating'}
                    </Text>
                  </View>
                </View>

                {/* Calories Breakdown */}
                {caloriesBreakdown && (
                  <View
                    style={[
                      styles.breakdownContainer,
                      {
                        backgroundColor: theme.isDark
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(0,0,0,0.03)',
                        borderWidth: 1,
                        borderColor: theme.isDark
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(0,0,0,0.06)',
                      },
                      theme.shadows.sm,
                    ]}
                  >
                    <Text
                      style={[
                        styles.breakdownTitle,
                        { color: theme.colors.text },
                      ]}
                    >
                      {t('session.caloriesBreakdown') || 'Calories Breakdown'}
                    </Text>
                    <View style={styles.breakdownRow}>
                      <Text
                        style={[
                          styles.breakdownLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {`${
                          t('session.caloriesFromWorkout') || 'From Workout'
                        }:`}
                      </Text>
                      <Text
                        style={[
                          styles.breakdownValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        {`${caloriesBreakdown?.fromWorkout || 0} cal`}
                      </Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text
                        style={[
                          styles.breakdownLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {`${
                          t('session.caloriesFromEquipment') || 'From Equipment'
                        }:`}
                      </Text>
                      <Text
                        style={[
                          styles.breakdownValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        {`${caloriesBreakdown?.fromEquipment || 0} cal`}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.breakdownRow,
                        styles.breakdownTotal,
                        {
                          borderTopWidth: 1,
                          borderTopColor: theme.isDark
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.1)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.breakdownLabel,
                          styles.breakdownTotalLabel,
                          { color: theme.colors.text },
                        ]}
                      >
                        {`${t('session.total') || 'Total'}:`}
                      </Text>
                      <Text
                        style={[
                          styles.breakdownValue,
                          styles.breakdownTotalValue,
                          { color: theme.colors.primary },
                        ]}
                      >
                        {`${caloriesBreakdown?.total || 0} cal`}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Equipment Usage */}
              {equipmentUsage?.details && equipmentUsage.details.length > 0 && (
                <View
                  style={[
                    styles.section,
                    { backgroundColor: theme.colors.surface },
                    theme.shadows.md,
                  ]}
                >
                  <Text
                    style={[styles.sectionTitle, { color: theme.colors.text }]}
                  >
                    {`${t('session.equipmentUsed') || 'Equipment Used'} (${
                      equipmentUsage?.totalSessions || 0
                    } ${t('session.device') || 'devices'})`}
                  </Text>

                  {/* Equipment Usage Summary */}
                  <View
                    style={[
                      styles.equipmentSummary,
                      {
                        backgroundColor: theme.isDark
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(0,0,0,0.03)',
                        borderWidth: 1,
                        borderColor: theme.isDark
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(0,0,0,0.06)',
                      },
                      theme.shadows.sm,
                    ]}
                  >
                    <View style={styles.summaryRow}>
                      <Text
                        style={[
                          styles.summaryLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {`${t('session.totalDuration') || 'Total Duration'}:`}
                      </Text>
                      <Text
                        style={[
                          styles.summaryValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        {equipmentUsage.totalDuration
                          ? formatDuration(equipmentUsage.totalDuration)
                          : '0m'}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text
                        style={[
                          styles.summaryLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {`${t('session.totalCalories') || 'Total Calories'}:`}
                      </Text>
                      <Text
                        style={[
                          styles.summaryValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        {equipmentUsage?.totalCalories || 0} cal
                      </Text>
                    </View>
                  </View>
                  {equipmentUsage?.details?.map(
                    (equipment: any, index: number) => (
                      <View
                        key={index}
                        style={[
                          styles.equipmentItem,
                          {
                            backgroundColor: theme.isDark
                              ? 'rgba(255,255,255,0.03)'
                              : 'rgba(0,0,0,0.02)',
                          },
                        ]}
                      >
                        <View style={styles.equipmentInfo}>
                          <Text
                            style={[
                              styles.equipmentName,
                              { color: theme.colors.text },
                            ]}
                          >
                            {equipment.equipment?.name ||
                              t('common.unknownEquipment') ||
                              'Unknown Equipment'}
                          </Text>
                          <Text
                            style={[
                              styles.equipmentCategory,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {equipment.equipment?.category ||
                              t('common.unknown') ||
                              'Unknown'}
                          </Text>
                          <View style={styles.equipmentLocationRow}>
                            <MapPin
                              size={14}
                              color={theme.colors.textSecondary}
                            />
                            <Text
                              style={[
                                styles.equipmentLocation,
                                { color: theme.colors.textSecondary },
                              ]}
                            >
                              {equipment.equipment?.location ||
                                t('common.unknown') ||
                                'Unknown'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.equipmentStats}>
                          {equipment.duration !== undefined &&
                            equipment.duration !== null &&
                            equipment.duration > 0 && (
                              <View style={styles.equipmentStatRow}>
                                <Text
                                  style={[
                                    styles.equipmentStat,
                                    { color: theme.colors.text },
                                  ]}
                                >
                                  {formatDuration(equipment.duration)}
                                </Text>
                                <View style={styles.statIconContainer}>
                                  <Clock
                                    size={14}
                                    color={theme.colors.primary}
                                  />
                                </View>
                              </View>
                            )}
                          {equipment.calories_burned !== undefined &&
                            equipment.calories_burned !== null && (
                              <View style={styles.equipmentStatRow}>
                                <Text
                                  style={[
                                    styles.equipmentStat,
                                    { color: theme.colors.text },
                                  ]}
                                >
                                  {`${equipment?.calories_burned || 0} cal`}
                                </Text>
                                <View style={styles.statIconContainer}>
                                  <Flame size={14} color="#FF6B6B" />
                                </View>
                              </View>
                            )}
                          {equipment.sets_completed !== undefined &&
                            equipment.sets_completed !== null &&
                            equipment.sets_completed > 0 && (
                              <View style={styles.equipmentStatRow}>
                                <Text
                                  style={[
                                    styles.equipmentStat,
                                    { color: theme.colors.text },
                                  ]}
                                >
                                  {`${equipment.sets_completed || 0} ${
                                    t('session.sets') || 'sets'
                                  }`}
                                </Text>
                                <View style={styles.statIconContainer}>
                                  <Dumbbell size={14} color="#4ECDC4" />
                                </View>
                              </View>
                            )}
                          {equipment.weight_used !== undefined &&
                            equipment.weight_used !== null &&
                            equipment.weight_used > 0 && (
                              <View style={styles.equipmentStatRow}>
                                <Text
                                  style={[
                                    styles.equipmentStat,
                                    { color: theme.colors.text },
                                  ]}
                                >
                                  {`${equipment?.weight_used || 0}kg`}
                                </Text>
                                <View style={styles.statIconContainer}>
                                  <Scale size={14} color="#9B59B6" />
                                </View>
                              </View>
                            )}
                        </View>
                      </View>
                    )
                  )}
                </View>
              )}

              {/* Notes */}
              {sessionData.notes && (
                <View
                  style={[
                    styles.section,
                    { backgroundColor: theme.colors.surface },
                    theme.shadows.md,
                  ]}
                >
                  <Text
                    style={[styles.sectionTitle, { color: theme.colors.text }]}
                  >
                    {t('session.notes') || 'Notes'}
                  </Text>
                  <Text
                    style={[styles.notesText, { color: theme.colors.text }]}
                  >
                    {sessionData.notes || ''}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 0,
  },
  headerTitle: {
    ...Typography.h4,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    ...Typography.h5,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    ...Typography.bodySmallMedium,
    marginBottom: 4,
  },
  infoValue: {
    ...Typography.bodyMedium,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 0,
  },
  statValue: {
    ...Typography.h4,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  notesText: {
    ...Typography.bodyRegular,
    lineHeight: 20,
  },
  equipmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderBottomWidth: 0,
  },
  equipmentInfo: {
    flex: 1,
    marginRight: 12,
  },
  equipmentName: {
    ...Typography.bodyMedium,
    marginBottom: 6,
  },
  equipmentCategory: {
    ...Typography.bodySmall,
    marginBottom: 2,
  },
  equipmentLocation: {
    ...Typography.bodySmall,
    marginLeft: 4,
  },
  equipmentLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  equipmentStats: {
    alignItems: 'flex-end',
    gap: 6,
  },
  equipmentStat: {
    ...Typography.bodySmall,
    flex: 1,
    textAlign: 'left',
  },
  equipmentStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100,
    justifyContent: 'flex-end',
  },
  statIconContainer: {
    width: 20,
    alignItems: 'center',
    marginLeft: 6,
  },
  equipmentSummary: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    ...Typography.bodyMedium,
  },
  summaryValue: {
    ...Typography.bodyMedium,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overviewItem: {
    width: '48%',
    marginBottom: 16,
  },
  overviewLabel: {
    ...Typography.bodySmall,
    marginBottom: 4,
  },
  overviewValue: {
    ...Typography.bodyMedium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    ...Typography.bodyMedium,
    marginTop: 16,
  },
  breakdownContainer: {
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  breakdownTitle: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownTotal: {
    marginTop: 8,
    paddingTop: 12,
    marginBottom: 0,
  },
  breakdownLabel: {
    ...Typography.bodySmall,
  },
  breakdownTotalLabel: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  breakdownValue: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  breakdownTotalValue: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
});
