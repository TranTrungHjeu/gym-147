import { EquipmentCategory, EquipmentStatus } from '@/types/equipmentTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface EquipmentFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: {
    category?: EquipmentCategory;
    status?: EquipmentStatus;
    location?: string;
  }) => void;
  initialFilters?: {
    category?: EquipmentCategory;
    status?: EquipmentStatus;
    location?: string;
  };
}

export default function EquipmentFilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
}: EquipmentFilterModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [category, setCategory] = useState<EquipmentCategory | undefined>(
    initialFilters?.category
  );
  const [status, setStatus] = useState<EquipmentStatus | undefined>(
    initialFilters?.status
  );

  const categories = Object.values(EquipmentCategory);
  const statuses = Object.values(EquipmentStatus);

  const handleApply = () => {
    onApply({ category, status });
    onClose();
  };

  const handleClear = () => {
    setCategory(undefined);
    setStatus(undefined);
    onApply({});
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[styles.modal, { backgroundColor: theme.colors.background }]}
        >
          <View
            style={[styles.header, { borderBottomColor: theme.colors.border }]}
          >
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {t('common.filter')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Category Filter */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {t('equipment.categoryLabel')}
              </Text>
              <View style={styles.chipContainer}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        category === undefined
                          ? theme.colors.primary
                          : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setCategory(undefined)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color:
                          category === undefined
                            ? '#fff'
                            : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {t('equipment.all')}
                  </Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          category === cat
                            ? theme.colors.primary
                            : theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            category === cat
                              ? '#fff'
                              : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {t(
                        `equipment.categories.${cat
                          .toLowerCase()
                          .replaceAll('_', '')}`,
                        cat
                      )}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Status Filter */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {t('equipment.statusLabel')}
              </Text>
              <View style={styles.chipContainer}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        status === undefined
                          ? theme.colors.primary
                          : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setStatus(undefined)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color:
                          status === undefined
                            ? '#fff'
                            : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {t('equipment.all')}
                  </Text>
                </TouchableOpacity>
                {statuses.map((stat) => (
                  <TouchableOpacity
                    key={stat}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          status === stat
                            ? theme.colors.primary
                            : theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => setStatus(stat)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            status === stat
                              ? '#fff'
                              : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {t(
                        `equipment.status.${stat
                          .toLowerCase()
                          .replaceAll('_', '')}`,
                        stat
                      )}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View
            style={[styles.footer, { borderTopColor: theme.colors.border }]}
          >
            <TouchableOpacity
              style={[
                styles.button,
                styles.clearButton,
                { borderColor: theme.colors.border },
              ]}
              onPress={handleClear}
            >
              <Text
                style={[styles.clearButtonText, { color: theme.colors.text }]}
              >
                {t('common.clear')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.applyButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>{t('common.apply')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    ...Typography.h5,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 0,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...Typography.h6,
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    borderWidth: 1,
  },
  clearButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  applyButton: {},
  applyButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: '#fff',
  },
});
