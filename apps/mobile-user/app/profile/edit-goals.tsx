import { memberService } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { ArrowLeft, Save } from 'lucide-react-native';
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

interface GoalsInfo {
  fitness_goals: string[];
  emergency_contact: {
    name: string;
    phone: string;
    relationship: string;
  };
}

const FITNESS_GOALS_OPTIONS = [
  'WEIGHT_LOSS',
  'MUSCLE_GAIN',
  'ENDURANCE',
  'FLEXIBILITY',
  'STRENGTH',
  'CARDIO',
  'GENERAL_FITNESS',
  'SPORTS_PERFORMANCE',
  'REHABILITATION',
  'MAINTENANCE',
];

const RELATIONSHIP_OPTIONS = [
  'SPOUSE',
  'PARENT',
  'CHILD',
  'SIBLING',
  'FRIEND',
  'COLLEAGUE',
  'OTHER',
];

export default function EditGoalsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<GoalsInfo>({
    fitness_goals: [],
    emergency_contact: {
      name: '',
      phone: '',
      relationship: 'FRIEND',
    },
  });
  const [errors, setErrors] = useState<Partial<GoalsInfo>>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await memberService.getMemberProfile();
      if (response.success && response.data) {
        setFormData({
          fitness_goals: response.data.fitness_goals || [],
          emergency_contact: {
            name: response.data.emergency_contact || '',
            phone: response.data.emergency_phone || '',
            relationship: 'FRIEND',
          },
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<GoalsInfo> = {};

    if (
      formData.emergency_contact.name.trim() &&
      !formData.emergency_contact.phone.trim()
    ) {
      newErrors.emergency_contact = {
        ...newErrors.emergency_contact,
        phone: 'Phone number is required when name is provided',
      };
    }

    if (
      formData.emergency_contact.phone.trim() &&
      !/^\d{10,}$/.test(
        formData.emergency_contact.phone.replace(/[\s\-\(\)]/g, '')
      )
    ) {
      newErrors.emergency_contact = {
        ...newErrors.emergency_contact,
        phone: 'Invalid phone number',
      };
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
      const response = await memberService.updateMemberProfile({
        fitness_goals: formData.fitness_goals,
        emergency_contact: formData.emergency_contact.name,
        emergency_phone: formData.emergency_contact.phone,
      });

      if (response.success) {
        Alert.alert(
          'Success',
          'Goals and emergency contact updated successfully',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleGoal = (goal: string) => {
    const updated = formData.fitness_goals.includes(goal)
      ? formData.fitness_goals.filter((g) => g !== goal)
      : [...formData.fitness_goals, goal];

    setFormData((prev) => ({ ...prev, fitness_goals: updated }));
  };

  const updateEmergencyContact = (
    field: keyof GoalsInfo['emergency_contact'],
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      emergency_contact: { ...prev.emergency_contact, [field]: value },
    }));

    if (errors.emergency_contact?.[field]) {
      setErrors((prev) => ({
        ...prev,
        emergency_contact: { ...prev.emergency_contact, [field]: undefined },
      }));
    }
  };

  const formatGoalLabel = (goal: string) => {
    return goal
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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
          Edit Goals & Emergency
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
          {/* Fitness Goals */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Fitness Goals
            </Text>
            <Text
              style={[styles.subLabel, { color: theme.colors.textSecondary }]}
            >
              Select all that apply
            </Text>

            <View style={styles.goalsGrid}>
              {FITNESS_GOALS_OPTIONS.map((goal) => (
                <TouchableOpacity
                  key={goal}
                  style={[
                    styles.goalOption,
                    {
                      backgroundColor: formData.fitness_goals.includes(goal)
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => toggleGoal(goal)}
                >
                  <Text
                    style={[
                      styles.goalText,
                      {
                        color: formData.fitness_goals.includes(goal)
                          ? theme.colors.textInverse
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {formatGoalLabel(goal)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Emergency Contact */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Emergency Contact
            </Text>

            {/* Name */}
            <View style={styles.emergencyField}>
              <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                value={formData.emergency_contact.name}
                onChangeText={(value) => updateEmergencyContact('name', value)}
                placeholder="Emergency contact name"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            {/* Phone */}
            <View style={styles.emergencyField}>
              <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                Phone Number
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: errors.emergency_contact?.phone
                      ? theme.colors.error
                      : theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                value={formData.emergency_contact.phone}
                onChangeText={(value) => updateEmergencyContact('phone', value)}
                placeholder="Emergency contact phone"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="phone-pad"
              />
              {errors.emergency_contact?.phone && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.emergency_contact.phone}
                </Text>
              )}
            </View>

            {/* Relationship */}
            <View style={styles.emergencyField}>
              <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                Relationship
              </Text>
              <View style={styles.relationshipContainer}>
                {RELATIONSHIP_OPTIONS.map((relationship) => (
                  <TouchableOpacity
                    key={relationship}
                    style={[
                      styles.relationshipOption,
                      {
                        backgroundColor:
                          formData.emergency_contact.relationship ===
                          relationship
                            ? theme.colors.primary
                            : theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() =>
                      updateEmergencyContact('relationship', relationship)
                    }
                  >
                    <Text
                      style={[
                        styles.relationshipText,
                        {
                          color:
                            formData.emergency_contact.relationship ===
                            relationship
                              ? theme.colors.textInverse
                              : theme.colors.text,
                        },
                      ]}
                    >
                      {relationship}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
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
    marginBottom: 32,
  },
  label: {
    ...Typography.bodyMedium,
    marginBottom: 4,
    fontWeight: '600',
  },
  subLabel: {
    ...Typography.bodySmall,
    marginBottom: 16,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  goalText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  emergencyField: {
    marginBottom: 16,
  },
  fieldLabel: {
    ...Typography.bodySmall,
    marginBottom: 8,
    fontWeight: '500',
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
  relationshipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relationshipOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  relationshipText: {
    ...Typography.bodySmall,
    fontWeight: '500',
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
