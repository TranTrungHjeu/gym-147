import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Picker } from '@/components/ui/Picker';
import { TextArea } from '@/components/ui/TextArea';
import { useAuth } from '@/contexts/AuthContext';
import { healthService } from '@/services/member/health.service';
import { MetricType, type AddMetricRequest } from '@/types/healthTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddMetricScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  // Helper function to get metric type translation
  const getMetricTypeTranslation = (type: MetricType) => {
    switch (type) {
      case MetricType.WEIGHT:
        return t('health.metricTypes.weight');
      case MetricType.HEIGHT:
        return t('health.metricTypes.height');
      case MetricType.BODY_FAT:
        return t('health.metricTypes.bodyFat');
      case MetricType.MUSCLE_MASS:
        return t('health.metricTypes.muscleMass');
      case MetricType.BMI:
        return t('health.metricTypes.bmi');
      case MetricType.BLOOD_PRESSURE:
        return t('health.metricTypes.bloodPressure');
      case MetricType.HEART_RATE:
        return t('health.metricTypes.heartRate');
      case MetricType.SLEEP_HOURS:
        return t('health.metricTypes.sleepHours');
      case MetricType.WATER_INTAKE:
        return t('health.metricTypes.waterIntake');
      case MetricType.STEPS:
        return t('health.metricTypes.steps');
      case MetricType.CALORIES_BURNED:
        return t('health.metricTypes.caloriesBurned');
      case MetricType.CALORIES_CONSUMED:
        return t('health.metricTypes.caloriesConsumed');
      case MetricType.BODY_TEMPERATURE:
        return t('health.metricTypes.bodyTemperature');
      default:
        return type;
    }
  };

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AddMetricRequest>({
    type: MetricType.WEIGHT,
    value: 0,
    unit: 'kg',
    recordedAt: new Date().toISOString(),
    notes: '',
    source: 'manual',
  });

  const metricTypes = [
    {
      value: MetricType.WEIGHT,
      label: getMetricTypeTranslation(MetricType.WEIGHT),
      unit: 'kg',
    },
    {
      value: MetricType.BODY_FAT,
      label: getMetricTypeTranslation(MetricType.BODY_FAT),
      unit: '%',
    },
    {
      value: MetricType.MUSCLE_MASS,
      label: getMetricTypeTranslation(MetricType.MUSCLE_MASS),
      unit: 'kg',
    },
    {
      value: MetricType.BMI,
      label: getMetricTypeTranslation(MetricType.BMI),
      unit: '',
    },
    {
      value: MetricType.HEART_RATE,
      label: getMetricTypeTranslation(MetricType.HEART_RATE),
      unit: 'bpm',
    },
    {
      value: MetricType.BLOOD_PRESSURE,
      label: getMetricTypeTranslation(MetricType.BLOOD_PRESSURE),
      unit: 'mmHg',
    },
    {
      value: MetricType.BODY_TEMPERATURE,
      label: getMetricTypeTranslation(MetricType.BODY_TEMPERATURE),
      unit: '°C',
    },
    {
      value: MetricType.SLEEP_HOURS,
      label: getMetricTypeTranslation(MetricType.SLEEP_HOURS),
      unit: 'h',
    },
    {
      value: MetricType.WATER_INTAKE,
      label: getMetricTypeTranslation(MetricType.WATER_INTAKE),
      unit: 'L',
    },
    {
      value: MetricType.STEPS,
      label: getMetricTypeTranslation(MetricType.STEPS),
      unit: 'steps',
    },
    {
      value: MetricType.CALORIES_BURNED,
      label: getMetricTypeTranslation(MetricType.CALORIES_BURNED),
      unit: 'cal',
    },
    {
      value: MetricType.CALORIES_CONSUMED,
      label: getMetricTypeTranslation(MetricType.CALORIES_CONSUMED),
      unit: 'cal',
    },
  ];

  const handleTypeChange = (type: MetricType) => {
    const selectedType = metricTypes.find((t) => t.value === type);
    setFormData((prev) => ({
      ...prev,
      type,
      unit: selectedType?.unit || 'kg',
    }));
  };

  const handleValueChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      value: parseFloat(value) || 0,
    }));
  };

  const handleDateChange = (date: Date) => {
    setFormData((prev) => ({
      ...prev,
      recordedAt: date.toISOString(),
    }));
  };

  const handleNotesChange = (notes: string) => {
    setFormData((prev) => ({
      ...prev,
      notes,
    }));
  };

  const handleSourceChange = (source: string) => {
    setFormData((prev) => ({
      ...prev,
      source,
    }));
  };

  // Validation rules per metric type
  const getValidationRules = (type: MetricType) => {
    switch (type) {
      case MetricType.WEIGHT:
        return { min: 20, max: 300, unit: 'kg' };
      case MetricType.HEIGHT:
        return { min: 100, max: 250, unit: 'cm' };
      case MetricType.BODY_FAT:
        return { min: 0, max: 100, unit: '%' };
      case MetricType.MUSCLE_MASS:
        return { min: 0, max: 200, unit: 'kg' };
      case MetricType.BMI:
        return { min: 10, max: 50, unit: '' };
      case MetricType.HEART_RATE:
        return { min: 30, max: 220, unit: 'bpm' };
      case MetricType.BLOOD_PRESSURE:
        return { min: 50, max: 250, unit: 'mmHg' };
      case MetricType.BODY_TEMPERATURE:
        return { min: 30, max: 45, unit: '°C' };
      case MetricType.SLEEP_HOURS:
        return { min: 0, max: 24, unit: 'h' };
      case MetricType.WATER_INTAKE:
        return { min: 0, max: 20, unit: 'L' };
      case MetricType.STEPS:
        return { min: 0, max: 100000, unit: 'steps' };
      case MetricType.CALORIES_BURNED:
      case MetricType.CALORIES_CONSUMED:
        return { min: 0, max: 10000, unit: 'cal' };
      default:
        return { min: 0, max: 1000, unit: '' };
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert(t('common.error'), t('health.userNotFound'));
      return;
    }

    if (formData.value <= 0) {
      Alert.alert(t('common.error'), t('health.pleaseEnterValidValue'));
      return;
    }

    // Validate against min/max for metric type
    const rules = getValidationRules(formData.type);
    if (formData.value < rules.min || formData.value > rules.max) {
      Alert.alert(
        t('common.error'),
        t('health.valueOutOfRange', {
          min: rules.min,
          max: rules.max,
          unit: rules.unit,
        })
      );
      return;
    }

    setLoading(true);
    try {
      await healthService.addHealthMetric(user.id, formData);
      // Success feedback with navigation
      Alert.alert(
        t('common.success'),
        t('health.addMetricSuccess'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              router.back();
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      console.error('Error adding health metric:', error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t('health.addMetricError');
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Text style={{ color: theme.colors.primary, fontSize: 24 }}>
                  ←
                </Text>
              </TouchableOpacity>
              <Text style={[Typography.h3, { color: theme.colors.text }]}>
                {t('health.addMetric', {
                  defaultValue: 'Thêm chỉ số sức khỏe',
                })}
              </Text>
            </View>
            <Text
              style={[
                Typography.bodyMedium,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('health.addMetricDescription', {
                defaultValue: 'Ghi nhận chỉ số sức khỏe của bạn',
              })}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[Typography.label, { color: theme.colors.text }]}>
                {t('health.form.metricType')}
              </Text>
              <Picker
                selectedValue={formData.type}
                onValueChange={handleTypeChange}
                items={metricTypes}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[Typography.label, { color: theme.colors.text }]}>
                {t('health.form.value')}
              </Text>
              <View style={styles.valueInputContainer}>
                <TextInput
                  style={[
                    styles.valueInput,
                    Typography.h2,
                    { color: theme.colors.text },
                  ]}
                  value={formData.value.toString()}
                  onChangeText={handleValueChange}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <Text
                  style={[
                    Typography.bodyMedium,
                    { color: theme.colors.textSecondary, marginLeft: 8 },
                  ]}
                >
                  {formData.unit}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[Typography.label, { color: theme.colors.text }]}>
                {t('health.form.date')}
              </Text>
              <DatePicker
                value={new Date(formData.recordedAt)}
                onChange={handleDateChange}
                mode="datetime"
                placeholder={t('health.form.selectDate', {
                  defaultValue: 'Select date and time',
                })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[Typography.label, { color: theme.colors.text }]}>
                {t('health.form.source')}
              </Text>
              <Picker
                selectedValue={formData.source}
                onValueChange={handleSourceChange}
                items={[
                  {
                    label: t('health.form.sourceManual', {
                      defaultValue: 'Nhập thủ công',
                    }),
                    value: 'manual',
                  },
                  {
                    label: t('health.form.sourceDevice', {
                      defaultValue: 'Đồng bộ thiết bị',
                    }),
                    value: 'device',
                  },
                  {
                    label: t('health.form.sourceApp', {
                      defaultValue: 'Nhập từ ứng dụng',
                    }),
                    value: 'app',
                  },
                ]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[Typography.label, { color: theme.colors.text }]}>
                {t('health.form.notesOptional')}
              </Text>
              <TextArea
                value={formData.notes}
                onChangeText={handleNotesChange}
                placeholder={t('health.form.notesPlaceholder')}
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title={t('common.cancel')}
              onPress={handleCancel}
              variant="outline"
              style={styles.button}
            />
            <Button
              title={t('health.addMetric')}
              onPress={handleSubmit}
              loading={loading}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  valueInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueInput: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flex: 1,
  },
});
