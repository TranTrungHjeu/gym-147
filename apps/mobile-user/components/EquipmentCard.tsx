import {
  EquipmentCardProps,
  EquipmentCategory,
  EquipmentStatus,
} from '@/types/equipmentTypes';
import { useTheme } from '@/utils/theme';
import { Activity, MapPin, Play, Square, Wrench } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function EquipmentCard({
  equipment,
  onPress,
  onStartUsage,
  showUsageActions = true,
}: EquipmentCardProps) {
  const { theme } = useTheme();

  const getStatusColor = (status: EquipmentStatus) => {
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

  const getStatusText = (status: EquipmentStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return 'Available';
      case 'IN_USE':
        return 'In Use';
      case 'MAINTENANCE':
        return 'Maintenance';
      case 'OUT_OF_ORDER':
        return 'Out of Order';
      case 'RESERVED':
        return 'Reserved';
      default:
        return status;
    }
  };

  const getCategoryIcon = (category: EquipmentCategory) => {
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

  const getCategoryColor = (category: EquipmentCategory) => {
    switch (category) {
      case 'CARDIO':
        return '#FF6B6B';
      case 'STRENGTH':
        return '#4ECDC4';
      case 'FREE_WEIGHTS':
        return '#45B7D1';
      case 'MACHINES':
        return '#96CEB4';
      case 'FUNCTIONAL':
        return '#FFEAA7';
      case 'RECOVERY':
        return '#DDA0DD';
      case 'SPECIALIZED':
        return '#98D8C8';
      default:
        return theme.colors.primary;
    }
  };

  const canStartUsage = equipment.status === 'AVAILABLE' && showUsageActions;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header with equipment image and status */}
      <View style={styles.header}>
        <View style={styles.imageContainer}>
          <Text style={styles.categoryIcon}>
            {getCategoryIcon(equipment.category)}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor(equipment.status) },
            ]}
          />
          <Text style={[styles.statusText, { color: theme.colors.text }]}>
            {getStatusText(equipment.status)}
          </Text>
        </View>
      </View>

      {/* Equipment Info */}
      <View style={styles.content}>
        <View style={styles.equipmentHeader}>
          <Text style={[styles.equipmentName, { color: theme.colors.text }]}>
            {equipment.name}
          </Text>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: getCategoryColor(equipment.category) },
            ]}
          >
            <Text style={styles.categoryText}>{equipment.category}</Text>
          </View>
        </View>

        {equipment.description && (
          <Text
            style={[
              styles.equipmentDescription,
              { color: theme.colors.textSecondary },
            ]}
            numberOfLines={2}
          >
            {equipment.description}
          </Text>
        )}

        {/* Equipment Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <MapPin size={16} color={theme.colors.textSecondary} />
            <Text
              style={[styles.detailText, { color: theme.colors.textSecondary }]}
            >
              {equipment.location}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Activity size={16} color={theme.colors.textSecondary} />
            <Text
              style={[styles.detailText, { color: theme.colors.textSecondary }]}
            >
              {equipment.usage_count} uses
            </Text>
          </View>
        </View>

        {/* Maintenance Info */}
        {equipment.next_maintenance && (
          <View style={styles.maintenanceContainer}>
            <Wrench size={14} color={theme.colors.warning} />
            <Text
              style={[styles.maintenanceText, { color: theme.colors.warning }]}
            >
              Maintenance due:{' '}
              {new Date(equipment.next_maintenance).toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* Usage Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {equipment.usage_count}
            </Text>
            <Text
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              Total Uses
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {equipment.status === 'IN_USE' ? '1' : '0'}
            </Text>
            <Text
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              Current Users
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {showUsageActions && (
        <View style={styles.actions}>
          {canStartUsage ? (
            <TouchableOpacity
              style={[
                styles.startButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={onStartUsage}
            >
              <Play size={16} color={theme.colors.textInverse} />
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
              <Square size={16} color={theme.colors.textInverse} />
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
              <Wrench size={16} color={theme.colors.textInverse} />
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
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: {
    fontSize: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  equipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  equipmentName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  equipmentDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  detailsContainer: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
  },
  maintenanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 6,
  },
  maintenanceText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inUseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  inUseButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  maintenanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  maintenanceButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  unavailableButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  unavailableButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
