import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { ClassCategory, Difficulty, ScheduleFilters, Trainer } from '@/types/classTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AdvancedFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: ScheduleFilters) => void;
  initialFilters?: ScheduleFilters;
  trainers?: Trainer[];
}

const CATEGORIES = Object.values(ClassCategory);
const DIFFICULTIES = Object.values(Difficulty);

export default function AdvancedFiltersModal({
  visible,
  onClose,
  onApply,
  initialFilters,
  trainers = [],
}: AdvancedFiltersModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [dateFrom, setDateFrom] = useState<Date | null>(
    initialFilters?.date_from ? new Date(initialFilters.date_from) : null
  );
  const [dateTo, setDateTo] = useState<Date | null>(
    initialFilters?.date_to ? new Date(initialFilters.date_to) : null
  );
  const [selectedCategories, setSelectedCategories] = useState<ClassCategory[]>(
    initialFilters?.class_category ? [initialFilters.class_category] : []
  );
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | undefined>(
    initialFilters?.trainer_id
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | undefined>(
    initialFilters?.difficulty
  );
  const [availableOnly, setAvailableOnly] = useState<boolean>(
    initialFilters?.available_only || false
  );

  useEffect(() => {
    if (visible && initialFilters) {
      setDateFrom(initialFilters.date_from ? new Date(initialFilters.date_from) : null);
      setDateTo(initialFilters.date_to ? new Date(initialFilters.date_to) : null);
      setSelectedCategories(initialFilters.class_category ? [initialFilters.class_category] : []);
      setSelectedTrainerId(initialFilters.trainer_id);
      setSelectedDifficulty(initialFilters.difficulty);
      setAvailableOnly(initialFilters.available_only || false);
    }
  }, [visible, initialFilters]);

  const handleCategoryToggle = (category: ClassCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleApply = () => {
    const filters: ScheduleFilters = {};
    
    if (dateFrom) {
      filters.date_from = dateFrom.toISOString().split('T')[0];
    }
    if (dateTo) {
      filters.date_to = dateTo.toISOString().split('T')[0];
    }
    if (selectedCategories.length === 1) {
      filters.class_category = selectedCategories[0];
    }
    if (selectedTrainerId) {
      filters.trainer_id = selectedTrainerId;
    }
    if (selectedDifficulty) {
      filters.difficulty = selectedDifficulty;
    }
    if (availableOnly) {
      filters.available_only = true;
    }

    onApply(filters);
    onClose();
  };

  const handleClear = () => {
    setDateFrom(null);
    setDateTo(null);
    setSelectedCategories([]);
    setSelectedTrainerId(undefined);
    setSelectedDifficulty(undefined);
    setAvailableOnly(false);
    onApply({});
    onClose();
  };

  const getCategoryTranslation = (category: ClassCategory) => {
    return t(`classes.categories.${category.toLowerCase()}`, category);
  };

  const getDifficultyTranslation = (difficulty: Difficulty) => {
    return t(`classes.difficulty.${difficulty.toLowerCase()}`, difficulty);
  };

  const hasActiveFilters = () => {
    return !!(
      dateFrom ||
      dateTo ||
      selectedCategories.length > 0 ||
      selectedTrainerId ||
      selectedDifficulty ||
      availableOnly
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View
            style={[styles.modal, { backgroundColor: theme.colors.background }]}
          >
            {/* Header */}
            <View
              style={[styles.header, { borderBottomColor: theme.colors.border }]}
            >
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {t('classes.advancedFilters', { defaultValue: 'Advanced Filters' })}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Date Range */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  {t('classes.dateRange', { defaultValue: 'Date Range' })}
                </Text>
                <View style={styles.dateRow}>
                  <View style={styles.dateInput}>
                    <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>
                      {t('classes.from', { defaultValue: 'From' })}
                    </Text>
                    <DatePicker
                      value={dateFrom}
                      onChange={setDateFrom}
                      placeholder={t('classes.selectDate', { defaultValue: 'Select date' })}
                    />
                  </View>
                  <View style={styles.dateInput}>
                    <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>
                      {t('classes.to', { defaultValue: 'To' })}
                    </Text>
                    <DatePicker
                      value={dateTo}
                      onChange={setDateTo}
                      placeholder={t('classes.selectDate', { defaultValue: 'Select date' })}
                    />
                  </View>
                </View>
              </View>

              {/* Categories */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  {t('classes.categories', { defaultValue: 'Categories' })}
                </Text>
                <View style={styles.chipContainer}>
                  {CATEGORIES.map((category) => {
                    const isSelected = selectedCategories.includes(category);
                    return (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.surface,
                            borderColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.border,
                          },
                        ]}
                        onPress={() => handleCategoryToggle(category)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: isSelected
                                ? theme.colors.textInverse
                                : theme.colors.text,
                            },
                          ]}
                        >
                          {getCategoryTranslation(category)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Difficulty */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  {t('classes.difficulty', { defaultValue: 'Difficulty' })}
                </Text>
                <View style={styles.chipContainer}>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          selectedDifficulty === undefined
                            ? theme.colors.primary
                            : theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedDifficulty(undefined)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            selectedDifficulty === undefined
                              ? theme.colors.textInverse
                              : theme.colors.text,
                        },
                      ]}
                    >
                      {t('common.all', { defaultValue: 'All' })}
                    </Text>
                  </TouchableOpacity>
                  {DIFFICULTIES.map((difficulty) => {
                    const isSelected = selectedDifficulty === difficulty;
                    return (
                      <TouchableOpacity
                        key={difficulty}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.surface,
                            borderColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.border,
                          },
                        ]}
                        onPress={() => setSelectedDifficulty(difficulty)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: isSelected
                                ? theme.colors.textInverse
                                : theme.colors.text,
                            },
                          ]}
                        >
                          {getDifficultyTranslation(difficulty)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Trainer */}
              {trainers.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {t('classes.trainer', { defaultValue: 'Trainer' })}
                  </Text>
                  <View style={styles.chipContainer}>
                    <TouchableOpacity
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            selectedTrainerId === undefined
                              ? theme.colors.primary
                              : theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => setSelectedTrainerId(undefined)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color:
                              selectedTrainerId === undefined
                                ? theme.colors.textInverse
                                : theme.colors.text,
                          },
                        ]}
                      >
                        {t('common.all', { defaultValue: 'All' })}
                      </Text>
                    </TouchableOpacity>
                    {trainers.map((trainer) => {
                      const isSelected = selectedTrainerId === trainer.id;
                      return (
                        <TouchableOpacity
                          key={trainer.id}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSelected
                                ? theme.colors.primary
                                : theme.colors.surface,
                              borderColor: isSelected
                                ? theme.colors.primary
                                : theme.colors.border,
                            },
                          ]}
                          onPress={() => setSelectedTrainerId(trainer.id)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              {
                                color: isSelected
                                  ? theme.colors.textInverse
                                  : theme.colors.text,
                              },
                            ]}
                          >
                            {trainer.full_name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Available Only */}
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setAvailableOnly(!availableOnly)}
                >
                  <Text style={[styles.switchLabel, { color: theme.colors.text }]}>
                    {t('classes.availableOnly', { defaultValue: 'Available only' })}
                  </Text>
                  <View
                    style={[
                      styles.switch,
                      {
                        backgroundColor: availableOnly
                          ? theme.colors.primary
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        {
                          backgroundColor: theme.colors.surface,
                          transform: [{ translateX: availableOnly ? 20 : 0 }],
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
              <Button
                title={t('common.clear', { defaultValue: 'Clear' })}
                onPress={handleClear}
                variant="outline"
                style={styles.footerButton}
                disabled={!hasActiveFilters()}
              />
              <Button
                title={t('common.apply', { defaultValue: 'Apply' })}
                onPress={handleApply}
                style={styles.footerButton}
              />
            </View>
          </View>
        </SafeAreaView>
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
  safeArea: {
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    ...Typography.h3,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    ...Typography.h5,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  dateLabel: {
    ...Typography.label,
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.bodyMedium,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    ...Typography.bodyMedium,
    flex: 1,
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    padding: 2,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
  },
});

