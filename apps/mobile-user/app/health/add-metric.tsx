import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Picker } from '@/components/ui/Picker';
import { TextArea } from '@/components/ui/TextArea';
import { useAuth } from '@/contexts/AuthContext';
import { healthService } from '@/services/member/health.service';
import { MetricType, type AddMetricRequest } from '@/types/healthTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function AddMetricScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
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
    { value: MetricType.WEIGHT, label: 'Weight', unit: 'kg' },
    { value: MetricType.BODY_FAT, label: 'Body Fat', unit: '%' },
    { value: MetricType.MUSCLE_MASS, label: 'Muscle Mass', unit: 'kg' },
    { value: MetricType.BMI, label: 'BMI', unit: '' },
    { value: MetricType.HEART_RATE, label: 'Heart Rate', unit: 'bpm' },
    { value: MetricType.BLOOD_PRESSURE, label: 'Blood Pressure', unit: 'mmHg' },
    {
      value: MetricType.BODY_TEMPERATURE,
      label: 'Body Temperature',
      unit: '°C',
    },
    { value: MetricType.SLEEP_HOURS, label: 'Sleep Hours', unit: 'h' },
    { value: MetricType.WATER_INTAKE, label: 'Water Intake', unit: 'L' },
    { value: MetricType.STEPS, label: 'Steps', unit: 'steps' },
    {
      value: MetricType.CALORIES_BURNED,
      label: 'Calories Burned',
      unit: 'cal',
    },
    {
      value: MetricType.CALORIES_CONSUMED,
      label: 'Calories Consumed',
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

  const handleDateChange = (date: string) => {
    setFormData((prev) => ({
      ...prev,
      recordedAt: date,
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

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    if (formData.value <= 0) {
      Alert.alert('Error', 'Please enter a valid value');
      return;
    }

    setLoading(true);
    try {
      await healthService.addHealthMetric(user.id, formData);
      Alert.alert('Success', 'Health metric added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error adding health metric:', error);
      Alert.alert('Error', 'Failed to add health metric');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[Typography.h2, { color: theme.colors.text }]}>
            Add Health Metric
          </Text>
          <Text
            style={[Typography.body, { color: theme.colors.textSecondary }]}
          >
            Record your health data
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[Typography.label, { color: theme.colors.text }]}>
              Metric Type
            </Text>
            <Picker
              selectedValue={formData.type}
              onValueChange={handleTypeChange}
              items={metricTypes.map((type) => ({
                label: type.label,
                value: type.value,
              }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[Typography.label, { color: theme.colors.text }]}>
              Value
            </Text>
            <View style={styles.valueInputContainer}>
              <Input
                value={formData.value.toString()}
                onChangeText={handleValueChange}
                placeholder="Enter value"
                keyboardType="numeric"
                style={styles.valueInput}
              />
              <Text
                style={[
                  Typography.body,
                  { color: theme.colors.textSecondary, marginLeft: 8 },
                ]}
              >
                {formData.unit}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[Typography.label, { color: theme.colors.text }]}>
              Date & Time
            </Text>
            <Input
              value={new Date(formData.recordedAt).toLocaleString()}
              placeholder="Select date and time"
              editable={false}
              onPress={() => {
                // TODO: Implement date picker
                Alert.alert('Date Picker', 'Date picker not implemented yet');
              }}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[Typography.label, { color: theme.colors.text }]}>
              Source
            </Text>
            <Picker
              selectedValue={formData.source}
              onValueChange={handleSourceChange}
              items={[
                { label: 'Manual Entry', value: 'manual' },
                { label: 'Device Sync', value: 'device' },
                { label: 'App Import', value: 'app' },
              ]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[Typography.label, { color: theme.colors.text }]}>
              Notes (Optional)
            </Text>
            <TextArea
              value={formData.notes}
              onChangeText={handleNotesChange}
              placeholder="Add any notes about this measurement..."
              numberOfLines={3}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Cancel"
            onPress={handleCancel}
            variant="outline"
            style={styles.button}
          />
          <Button
            title="Add Metric"
            onPress={handleSubmit}
            loading={loading}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
