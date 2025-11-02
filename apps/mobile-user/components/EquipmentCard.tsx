import { Equipment, EquipmentStatus } from '@/types/equipmentTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import {
  Activity,
  AlertCircle,
  Clock,
  MapPin,
  Settings,
  Wrench,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface EquipmentCardProps {
  equipment: Equipment;
  onPress: () => void;
  showActions?: boolean;
}

export default function EquipmentCard({
  equipment,
  onPress,
  showActions = true,
}: EquipmentCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

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

  const getStatusIcon = (status: EquipmentStatus) => {
    switch (status) {
      case EquipmentStatus.AVAILABLE:
        return <Activity size={16} color={getStatusColor(status)} />;
      case EquipmentStatus.IN_USE:
        return <Clock size={16} color={getStatusColor(status)} />;
      case EquipmentStatus.MAINTENANCE:
        return <Settings size={16} color={getStatusColor(status)} />;
      case EquipmentStatus.OUT_OF_ORDER:
        return <AlertCircle size={16} color={getStatusColor(status)} />;
      default:
        return <Wrench size={16} color={getStatusColor(status)} />;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: theme.colors.text }]}>
            {equipment.name}
          </Text>
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

        {equipment.brand && (
          <Text style={[styles.brand, { color: theme.colors.textSecondary }]}>
            {equipment.brand} {equipment.model}
          </Text>
        )}
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <MapPin size={14} color={theme.colors.textSecondary} />
          <Text
            style={[styles.detailText, { color: theme.colors.textSecondary }]}
          >
            {equipment.location}
          </Text>
        </View>

        {equipment._count && equipment._count.queue > 0 && (
          <View style={styles.detailRow}>
            <Clock size={14} color={theme.colors.warning} />
            <Text style={[styles.detailText, { color: theme.colors.warning }]}>
              {equipment._count.queue} {t('equipment.inQueue')}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    ...Typography.h6,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  brand: {
    ...Typography.bodySmall,
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    ...Typography.bodySmall,
  },
});
