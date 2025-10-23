import { memberService } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Save, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface HealthInfo {
  height: number | null;
  weight: number | null;
  body_fat_percent: number | null;
  medical_conditions: string[];
  allergies: string[];
}

export default function EditHealthScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<HealthInfo>({
    height: null,
    weight: null,
    body_fat_percent: null,
    medical_conditions: [],
    allergies: [],
  });
  const [errors, setErrors] = useState<Partial<HealthInfo>>({});
  const [newCondition, setNewCondition] = useState('');
  const [newAllergy, setNewAllergy] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await memberService.getMemberProfile();
      if (response.success && response.data) {
        setFormData({
          height: response.data.height || null,
          weight: response.data.weight || null,
          body_fat_percent: response.data.body_fat_percent || null,
          medical_conditions: response.data.medical_conditions || [],
          allergies: response.data.allergies || [],
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<HealthInfo> = {};

    if (
      formData.height !== null &&
      (formData.height < 100 || formData.height > 250)
    ) {
      newErrors.height = 'Height must be between 100-250 cm';
    }

    if (
      formData.weight !== null &&
      (formData.weight < 30 || formData.weight > 300)
    ) {
      newErrors.weight = 'Weight must be between 30-300 kg';
    }

    if (
      formData.body_fat_percent !== null &&
      (formData.body_fat_percent < 0 || formData.body_fat_percent > 50)
    ) {
      newErrors.body_fat_percent = 'Body fat percentage must be between 0-50%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      const response = await memberService.updateMemberProfile(formData);

      if (response.success) {
        Alert.alert(t('common.success'), t('profile.healthInfoUpdated'), [
          { text: t('common.ok'), onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(
          t('common.error'),
          response.error || t('profile.failedToUpdateProfile')
        );
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('profile.failedToUpdateProfile'));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof HealthInfo, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const addCondition = () => {
    if (newCondition.trim()) {
      updateField('medical_conditions', [
        ...formData.medical_conditions,
        newCondition.trim(),
      ]);
      setNewCondition('');
    }
  };

  const removeCondition = (index: number) => {
    const updated = formData.medical_conditions.filter((_, i) => i !== index);
    updateField('medical_conditions', updated);
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      updateField('allergies', [...formData.allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    const updated = formData.allergies.filter((_, i) => i !== index);
    updateField('allergies', updated);
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Edit Health Info
        </Text>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <Save size={20} color={theme.colors.textInverse} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Height */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Height (cm)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: errors.height
                    ? theme.colors.error
                    : theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              value={formData.height?.toString() || ''}
              onChangeText={(value) =>
                updateField('height', value ? parseFloat(value) : null)
              }
              placeholder="Enter your height"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
            {errors.height && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.height}
              </Text>
            )}
          </View>

          {/* Weight */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Weight (kg)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: errors.weight
                    ? theme.colors.error
                    : theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              value={formData.weight?.toString() || ''}
              onChangeText={(value) =>
                updateField('weight', value ? parseFloat(value) : null)
              }
              placeholder="Enter your weight"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
            {errors.weight && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.weight}
              </Text>
            )}
          </View>

          {/* Body Fat Percentage */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Body Fat Percentage (%)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: errors.body_fat_percent
                    ? theme.colors.error
                    : theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              value={formData.body_fat_percent?.toString() || ''}
              onChangeText={(value) =>
                updateField(
                  'body_fat_percent',
                  value ? parseFloat(value) : null
                )
              }
              placeholder="Enter body fat percentage"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
            {errors.body_fat_percent && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.body_fat_percent}
              </Text>
            )}
          </View>

          {/* Medical Conditions */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Medical Conditions
            </Text>

            {/* Add new condition */}
            <View style={styles.addItemContainer}>
              <TextInput
                style={[
                  styles.addItemInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                value={newCondition}
                onChangeText={setNewCondition}
                placeholder="Add medical condition"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <TouchableOpacity
                style={[
                  styles.addButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={addCondition}
              >
                <Plus size={20} color={theme.colors.textInverse} />
              </TouchableOpacity>
            </View>

            {/* Conditions list */}
            {formData.medical_conditions.map((condition, index) => (
              <View key={index} style={styles.listItem}>
                <Text
                  style={[styles.listItemText, { color: theme.colors.text }]}
                >
                  {condition}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.removeButton,
                    { backgroundColor: theme.colors.error },
                  ]}
                  onPress={() => removeCondition(index)}
                >
                  <X size={16} color={theme.colors.textInverse} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Allergies */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Allergies
            </Text>

            {/* Add new allergy */}
            <View style={styles.addItemContainer}>
              <TextInput
                style={[
                  styles.addItemInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                value={newAllergy}
                onChangeText={setNewAllergy}
                placeholder="Add allergy"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <TouchableOpacity
                style={[
                  styles.addButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={addAllergy}
              >
                <Plus size={20} color={theme.colors.textInverse} />
              </TouchableOpacity>
            </View>

            {/* Allergies list */}
            {formData.allergies.map((allergy, index) => (
              <View key={index} style={styles.listItem}>
                <Text
                  style={[styles.listItemText, { color: theme.colors.text }]}
                >
                  {allergy}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.removeButton,
                    { backgroundColor: theme.colors.error },
                  ]}
                  onPress={() => removeAllergy(index)}
                >
                  <X size={16} color={theme.colors.textInverse} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    ...Typography.h3,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    padding: 8,
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  form: {
    paddingVertical: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    ...Typography.bodyMedium,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Typography.bodyMedium,
  },
  errorText: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
  addItemContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  addItemInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Typography.bodyMedium,
  },
  addButton: {
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderRadius: 8,
    marginBottom: 8,
  },
  listItemText: {
    ...Typography.bodyMedium,
    flex: 1,
  },
  removeButton: {
    padding: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.bodyMedium,
    marginTop: 12,
  },
});
