import { Button } from './Button';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatePicker } from './DatePicker';

// Inline DateRangePicker Props (existing)
interface InlineDateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
}

// Modal DateRangePicker Props (new)
interface ModalDateRangePickerProps {
  visible: boolean;
  onClose: () => void;
  onApply: (startDate: Date, endDate: Date) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
  minimumDate?: Date;
  maximumDate?: Date;
}

type DateRangePickerProps = InlineDateRangePickerProps | ModalDateRangePickerProps;

// Type guard to check if props are for modal
const isModalProps = (props: DateRangePickerProps): props is ModalDateRangePickerProps => {
  return 'visible' in props;
};

export const DateRangePicker: React.FC<DateRangePickerProps> = (props) => {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();

  // Modal mode
  if (isModalProps(props)) {
    const {
      visible,
      onClose,
      onApply,
      initialStartDate,
      initialEndDate,
      minimumDate,
      maximumDate,
    } = props;

    const [startDate, setStartDate] = useState(initialStartDate || new Date());
    const [endDate, setEndDate] = useState(initialEndDate || new Date());
    const [pickingStartDate, setPickingStartDate] = useState(true);
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
      if (visible) {
        setStartDate(initialStartDate || new Date());
        setEndDate(initialEndDate || new Date());
        setPickingStartDate(true);
      }
    }, [visible, initialStartDate, initialEndDate]);

    const handleDateChange = useCallback(
      (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
          setShowPicker(false);
          if (event.type === 'set' && selectedDate) {
            if (pickingStartDate) {
              setStartDate(selectedDate);
              if (selectedDate > endDate) {
                setEndDate(selectedDate);
              }
            } else {
              setEndDate(selectedDate);
              if (selectedDate < startDate) {
                setStartDate(selectedDate);
              }
            }
          }
        } else {
          if (selectedDate) {
            if (pickingStartDate) {
              setStartDate(selectedDate);
            } else {
              setEndDate(selectedDate);
            }
          }
        }
      },
      [pickingStartDate, startDate, endDate]
    );

    const handleApply = () => {
      onApply(startDate, endDate);
      onClose();
    };

    const handleClear = () => {
      const today = new Date();
      setStartDate(today);
      setEndDate(today);
      onApply(today, today);
      onClose();
    };

    const formatDisplayDate = (date: Date) => {
      return date.toLocaleDateString(i18n.language, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    };

    const themedStyles = useMemo(() => modalStyles(theme), [theme]);

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={themedStyles.overlay}>
          <SafeAreaView style={themedStyles.safeArea} edges={['bottom']}>
            <View style={themedStyles.modalContent}>
              <View style={themedStyles.header}>
                <Text style={[themedStyles.title, { color: theme.colors.text }]}>
                  {t('dateRangePicker.title', { defaultValue: 'Chọn khoảng ngày' })}
                </Text>
                <TouchableOpacity onPress={onClose} style={themedStyles.closeButton}>
                  <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <View style={themedStyles.dateSelectionContainer}>
                <TouchableOpacity
                  style={[
                    themedStyles.dateInput,
                    pickingStartDate && themedStyles.dateInputActive,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => {
                    setPickingStartDate(true);
                    setShowPicker(true);
                  }}
                >
                  <Calendar size={20} color={theme.colors.textSecondary} />
                  <Text
                    style={[themedStyles.dateInputText, { color: theme.colors.text }]}
                  >
                    {formatDisplayDate(startDate)}
                  </Text>
                </TouchableOpacity>

                <Text style={[themedStyles.arrowText, { color: theme.colors.textSecondary }]}>
                  →
                </Text>

                <TouchableOpacity
                  style={[
                    themedStyles.dateInput,
                    !pickingStartDate && themedStyles.dateInputActive,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => {
                    setPickingStartDate(false);
                    setShowPicker(true);
                  }}
                >
                  <Calendar size={20} color={theme.colors.textSecondary} />
                  <Text
                    style={[themedStyles.dateInputText, { color: theme.colors.text }]}
                  >
                    {formatDisplayDate(endDate)}
                  </Text>
                </TouchableOpacity>
              </View>

              {(Platform.OS === 'ios' || showPicker) && (
                <View style={themedStyles.pickerContainer}>
                  <DateTimePicker
                    value={pickingStartDate ? startDate : endDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={pickingStartDate ? minimumDate : startDate}
                    maximumDate={pickingStartDate ? endDate : maximumDate}
                    textColor={theme.colors.text}
                    style={Platform.OS === 'ios' ? themedStyles.picker : undefined}
                    locale={i18n.language}
                  />
                </View>
              )}

              <View style={themedStyles.footer}>
                <TouchableOpacity
                  style={[
                    themedStyles.clearButton,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={handleClear}
                >
                  <Text
                    style={[
                      themedStyles.clearButtonText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t('common.clear', { defaultValue: 'Xóa' })}
                  </Text>
                </TouchableOpacity>
                <Button
                  title={t('common.apply', { defaultValue: 'Áp dụng' })}
                  onPress={handleApply}
                  style={themedStyles.applyButton}
                  fullWidth={false}
                />
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    );
  }

  // Inline mode (existing)
  const {
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    minimumDate,
    maximumDate,
    placeholder,
  } = props as InlineDateRangePickerProps;

  const handleClear = () => {
    onStartDateChange(null);
    onEndDateChange(null);
  };

  const hasRange = startDate && endDate;

  return (
    <View style={styles.container}>
      <View style={styles.dateRow}>
        <View style={styles.dateInput}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            {t('common.from', { defaultValue: 'Từ' })}
          </Text>
          <DatePicker
            value={startDate || new Date()}
            onChange={(date) => onStartDateChange(date)}
            minimumDate={minimumDate}
            maximumDate={endDate || maximumDate}
            placeholder={t('common.selectDate', { defaultValue: 'Chọn ngày bắt đầu' })}
          />
        </View>

        <View style={styles.separator}>
          <Ionicons
            name="arrow-forward"
            size={20}
            color={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.dateInput}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            {t('common.to', { defaultValue: 'Đến' })}
          </Text>
          <DatePicker
            value={endDate || new Date()}
            onChange={(date) => onEndDateChange(date)}
            minimumDate={startDate || minimumDate}
            maximumDate={maximumDate}
            placeholder={t('common.selectDate', { defaultValue: 'Chọn ngày kết thúc' })}
          />
        </View>
      </View>

      {hasRange && (
        <TouchableOpacity
          style={[styles.clearButton, { borderColor: theme.colors.border }]}
          onPress={handleClear}
        >
          <Ionicons name="close-circle" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.clearText, { color: theme.colors.textSecondary }]}>
            {t('common.clear', { defaultValue: 'Xóa' })}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  label: {
    ...Typography.label,
    marginBottom: 8,
  },
  separator: {
    paddingBottom: 8,
    justifyContent: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
  },
  clearText: {
    ...Typography.bodySmall,
  },
});

const modalStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    safeArea: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      maxHeight: '85%',
      width: '100%',
      paddingBottom: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      ...Typography.h3,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    dateSelectionContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    dateInput: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      backgroundColor: theme.colors.surface,
    },
    dateInputActive: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
    },
    dateInputText: {
      ...Typography.bodyMedium,
      marginLeft: theme.spacing.sm,
      flex: 1,
    },
    arrowText: {
      ...Typography.h4,
      marginHorizontal: theme.spacing.sm,
    },
    pickerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      minHeight: 200,
    },
    picker: {
      width: '100%',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    clearButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearButtonText: {
      ...Typography.buttonMedium,
    },
    applyButton: {
      flex: 1,
    },
  });

