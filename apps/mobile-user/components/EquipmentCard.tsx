import {
  Equipment,
  EquipmentStatus,
  EquipmentCategory,
} from '@/types/equipmentTypes';
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
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ImageSourcePropType,
} from 'react-native';

// Import equipment images
const equipmentImages: Record<string, ImageSourcePropType> = {
  CARDIO: require('@/assets/images/equipment/cardio.png'),
  STRENGTH: require('@/assets/images/equipment/strength.png'),
  FREE_WEIGHTS: require('@/assets/images/equipment/free-weights.png'),
  FUNCTIONAL: require('@/assets/images/equipment/functional.png'),
  STRETCHING: require('@/assets/images/equipment/stretching.png'),
  RECOVERY: require('@/assets/images/equipment/recovery.png'),
  SPECIALIZED: require('@/assets/images/equipment/specialized.png'),
};

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

  const getEquipmentImage = () => {
    const category = equipment.category;
    if (category && equipmentImages[category]) {
      return equipmentImages[category];
    }
    // Fallback to a default image or first available
    return equipmentImages.CARDIO || equipmentImages.STRENGTH;
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
      {/* Image Section */}
      <View style={styles.imageContainer}>
        <Image
          source={getEquipmentImage()}
          style={styles.equipmentImage}
          resizeMode="contain"
        />
        {/* Status Badge - Overlay on image */}
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: getStatusColor(equipment.status) + 'E6',
              position: 'absolute',
              top: 12,
              right: 12,
            },
          ]}
        >
          {getStatusIcon(equipment.status)}
          <Text
            style={[styles.statusText, { color: theme.colors.textInverse }]}
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

      {/* Content Section */}
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.name, { color: theme.colors.text }]}
              numberOfLines={2}
            >
              {equipment.name}
            </Text>
          </View>

          {equipment.brand && (
            <Text style={[styles.brand, { color: theme.colors.textSecondary }]}>
              {equipment.brand} {equipment.model}
            </Text>
          )}
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.colors.primary + '15' },
              ]}
            >
              <MapPin size={14} color={theme.colors.primary} />
            </View>
            <Text
              style={[styles.detailText, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {equipment.location}
            </Text>
          </View>

          {equipment._count && equipment._count.queue > 0 && (
            <View style={styles.detailRow}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.colors.warning + '15' },
                ]}
              >
                <Clock size={14} color={theme.colors.warning} />
              </View>
              <Text
                style={[styles.detailText, { color: theme.colors.warning }]}
              >
                {equipment._count.queue} {t('equipment.inQueue')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#F5F5F5',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  equipmentImage: {
    width: '80%',
    height: '80%',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  header: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  name: {
    ...Typography.h5,
    flex: 1,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    ...Typography.labelSmall,
    fontWeight: '600',
  },
  brand: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
  details: {
    gap: 10,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailText: {
    ...Typography.bodySmallMedium,
    flex: 1,
  },
});
