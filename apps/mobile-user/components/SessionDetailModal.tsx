import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import {
  Clock,
  CreditCard,
  Dumbbell,
  Flame,
  MapPin,
  X,
} from 'lucide-react-native';
import React from 'react';
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

  // Handle API response structure: { session: {...}, equipmentUsage: {...} }
  const sessionData = session?.session || session;
  const equipmentUsage = session?.equipmentUsage;

  if (!sessionData) return null;

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getAccessMethodText = (method: string) => {
    const methods = {
      RFID: 'Thẻ RFID',
      QR_CODE: 'Mã QR',
      FACE_RECOGNITION: 'Nhận diện khuôn mặt',
      MANUAL: 'Thủ công',
      MOBILE_APP: 'Ứng dụng di động',
    };
    return methods[method as keyof typeof methods] || method;
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
          style={[styles.header, { borderBottomColor: theme.colors.border }]}
        >
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Chi tiết phiên tập
          </Text>
          <TouchableOpacity
            style={[
              styles.closeButton,
              { backgroundColor: theme.colors.surface },
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
                Đang tải chi tiết phiên tập...
              </Text>
            </View>
          ) : (
            <>
              {/* Session Overview */}
              <View
                style={[
                  styles.section,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Thông tin chung
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
                      Thời gian vào
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
                        Thời gian ra
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
                        Thời gian tập
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
                      Phương thức vào
                    </Text>
                    <Text
                      style={[styles.infoValue, { color: theme.colors.text }]}
                    >
                      {getAccessMethodText(sessionData.entry_method)}
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
                        Phương thức ra
                      </Text>
                      <Text
                        style={[styles.infoValue, { color: theme.colors.text }]}
                      >
                        {getAccessMethodText(sessionData.exit_method)}
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
                        Cổng vào
                      </Text>
                      <Text
                        style={[styles.infoValue, { color: theme.colors.text }]}
                      >
                        {sessionData.entry_gate}
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
                        Cổng ra
                      </Text>
                      <Text
                        style={[styles.infoValue, { color: theme.colors.text }]}
                      >
                        {sessionData.exit_gate}
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
                ]}
              >
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Thống kê
                </Text>

                <View style={styles.statsGrid}>
                  <View
                    style={[
                      styles.statCard,
                      { backgroundColor: theme.colors.background },
                    ]}
                  >
                    <Flame size={24} color="#FF6B6B" />
                    <Text
                      style={[styles.statValue, { color: theme.colors.text }]}
                    >
                      {sessionData.calories_burned || 0}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Calo tiêu hao
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statCard,
                      { backgroundColor: theme.colors.background },
                    ]}
                  >
                    <Dumbbell size={24} color="#4ECDC4" />
                    <Text
                      style={[styles.statValue, { color: theme.colors.text }]}
                    >
                      {sessionData.session_rating || 'N/A'}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Đánh giá
                    </Text>
                  </View>
                </View>
              </View>

              {/* Equipment Usage */}
              {equipmentUsage?.details && equipmentUsage.details.length > 0 && (
                <View
                  style={[
                    styles.section,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <Text
                    style={[styles.sectionTitle, { color: theme.colors.text }]}
                  >
                    Thiết bị đã sử dụng ({equipmentUsage.totalSessions} thiết
                    bị)
                  </Text>

                  {/* Equipment Usage Summary */}
                  <View style={styles.equipmentSummary}>
                    <View style={styles.summaryRow}>
                      <Text
                        style={[
                          styles.summaryLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        Tổng thời gian:
                      </Text>
                      <Text
                        style={[
                          styles.summaryValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        {formatDuration(equipmentUsage.totalDuration)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text
                        style={[
                          styles.summaryLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        Tổng calories:
                      </Text>
                      <Text
                        style={[
                          styles.summaryValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        {equipmentUsage.totalCalories} cal
                      </Text>
                    </View>
                  </View>
                  {equipmentUsage.details.map(
                    (equipment: any, index: number) => (
                      <View key={index} style={styles.equipmentItem}>
                        <View style={styles.equipmentInfo}>
                          <Text
                            style={[
                              styles.equipmentName,
                              { color: theme.colors.text },
                            ]}
                          >
                            {equipment.equipment?.name ||
                              'Thiết bị không xác định'}
                          </Text>
                          <Text
                            style={[
                              styles.equipmentCategory,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {equipment.equipment?.category || 'Không xác định'}
                          </Text>
                          <Text
                            style={[
                              styles.equipmentLocation,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            📍{' '}
                            {equipment.equipment?.location || 'Không xác định'}
                          </Text>
                        </View>
                        <View style={styles.equipmentStats}>
                          {equipment.duration && (
                            <Text
                              style={[
                                styles.equipmentStat,
                                { color: theme.colors.text },
                              ]}
                            >
                              ⏱️ {formatDuration(equipment.duration)}
                            </Text>
                          )}
                          {equipment.calories_burned && (
                            <Text
                              style={[
                                styles.equipmentStat,
                                { color: theme.colors.text },
                              ]}
                            >
                              🔥 {equipment.calories_burned} cal
                            </Text>
                          )}
                          {equipment.sets_completed && (
                            <Text
                              style={[
                                styles.equipmentStat,
                                { color: theme.colors.text },
                              ]}
                            >
                              💪 {equipment.sets_completed} sets
                            </Text>
                          )}
                          {equipment.weight_used && (
                            <Text
                              style={[
                                styles.equipmentStat,
                                { color: theme.colors.text },
                              ]}
                            >
                              🏋️ {equipment.weight_used}kg
                            </Text>
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
                  ]}
                >
                  <Text
                    style={[styles.sectionTitle, { color: theme.colors.text }]}
                  >
                    Ghi chú
                  </Text>
                  <Text
                    style={[styles.notesText, { color: theme.colors.text }]}
                  >
                    {sessionData.notes}
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...Typography.h4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    ...Typography.h5,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    ...Typography.bodySmall,
    marginBottom: 2,
  },
  infoValue: {
    ...Typography.bodyMedium,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
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
  notesText: {
    ...Typography.bodyRegular,
    lineHeight: 20,
  },
  equipmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  equipmentInfo: {
    flex: 1,
    marginRight: 12,
  },
  equipmentName: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 4,
  },
  equipmentCategory: {
    ...Typography.bodySmall,
    marginBottom: 2,
  },
  equipmentLocation: {
    ...Typography.bodySmall,
  },
  equipmentStats: {
    alignItems: 'flex-end',
  },
  equipmentStat: {
    ...Typography.bodySmall,
    marginBottom: 2,
  },
  equipmentSummary: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    ...Typography.bodyMedium,
    fontWeight: '500',
  },
  summaryValue: {
    ...Typography.bodyMedium,
    fontWeight: '600',
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
    fontWeight: '500',
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
});
