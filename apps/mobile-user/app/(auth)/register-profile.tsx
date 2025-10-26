import { memberService } from '@/services/member/member.service';
import { useTheme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const RegisterProfileScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Form fields
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFatPercent, setBodyFatPercent] = useState('');
  const [isManualBodyFat, setIsManualBodyFat] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [medicalConditions, setMedicalConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  const userId = params.userId as string;
  const accessToken = params.accessToken as string;
  const refreshToken = params.refreshToken as string;
  const subscriptionId = params.subscriptionId as string;
  const paymentId = params.paymentId as string;

  const fitnessGoals = [
    { key: 'loseWeight', label: t('profile.fitnessGoalOptions.loseWeight') },
    { key: 'gainMuscle', label: t('profile.fitnessGoalOptions.gainMuscle') },
    {
      key: 'increaseEndurance',
      label: t('profile.fitnessGoalOptions.increaseEndurance'),
    },
    {
      key: 'improveFlexibility',
      label: t('profile.fitnessGoalOptions.improveFlexibility'),
    },
    { key: 'maintain', label: t('profile.fitnessGoalOptions.maintain') },
  ];

  const genders: { value: 'MALE' | 'FEMALE' | 'OTHER'; label: string }[] = [
    { value: 'MALE', label: t('profile.male') },
    { value: 'FEMALE', label: t('profile.female') },
    { value: 'OTHER', label: t('profile.other') },
  ];

  const toggleGoal = (goalKey: string) => {
    if (selectedGoals.includes(goalKey)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== goalKey));
    } else {
      setSelectedGoals([...selectedGoals, goalKey]);
    }
  };

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dob: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  // Calculate BMI
  const calculateBMI = (heightCm: number, weightKg: number): number => {
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  };

  // Calculate Body Fat % using Deurenberg formula
  const calculateBodyFat = (
    bmi: number,
    age: number,
    genderValue: 'MALE' | 'FEMALE' | 'OTHER'
  ): number => {
    // Sex: Male = 1, Female = 0, Other = 0.5 (average)
    const sex = genderValue === 'MALE' ? 1 : genderValue === 'FEMALE' ? 0 : 0.5;

    let bodyFat: number;
    if (age < 15) {
      // Child formula
      bodyFat = 1.51 * bmi - 0.7 * age - 3.6 * sex + 1.4;
    } else {
      // Adult formula (Deurenberg et al., 1991)
      bodyFat = 1.2 * bmi + 0.23 * age - 10.8 * sex - 5.4;
    }

    // Clamp between 5% and 50%
    return Math.max(5, Math.min(50, bodyFat));
  };

  // Auto-calculate body fat when height, weight, age, or gender changes
  React.useEffect(() => {
    if (!isManualBodyFat && height && weight) {
      const heightNum = parseFloat(height);
      const weightNum = parseFloat(weight);

      if (heightNum > 0 && weightNum > 0) {
        const age = calculateAge(dateOfBirth);
        const bmi = calculateBMI(heightNum, weightNum);
        const bodyFat = calculateBodyFat(bmi, age, gender);
        setBodyFatPercent(bodyFat.toFixed(1));
      }
    }
  }, [height, weight, dateOfBirth, gender, isManualBodyFat]);

  // Handle manual body fat input
  const handleBodyFatChange = (value: string) => {
    setBodyFatPercent(value);
    setIsManualBodyFat(true); // Mark as manual edit
  };

  // Handle avatar picker - just select and preview, upload when saving
  const pickImage = async () => {
    try {
      // Request permission
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          t('common.error'),
          'Cần cấp quyền truy cập thư viện ảnh để chọn ảnh đại diện'
        );
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Just save locally for preview - will upload when saving profile
        setAvatarUri(asset.uri);

        // Store base64 for later upload
        if (asset.base64) {
          setAvatarUrl(asset.base64); // Temporarily store base64 in avatarUrl
          console.log('✅ Avatar selected, will upload when saving profile');
        }
      }
    } catch (error) {
      console.error('❌ Pick image error:', error);
      Alert.alert(t('common.error'), 'Không thể chọn ảnh');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      console.log('💾 Saving profile...');

      // Step 1: Save profile data first (creates member if not exists)
      const profileData = {
        date_of_birth: dateOfBirth.toISOString(),
        gender: gender as any,
        height: height ? parseFloat(height) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        body_fat_percent: bodyFatPercent
          ? parseFloat(bodyFatPercent)
          : undefined,
        fitness_goals: selectedGoals,
        medical_conditions: medicalConditions
          ? medicalConditions
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s)
          : [],
        allergies: allergies
          ? allergies
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s)
          : [],
        emergency_contact: emergencyContactName || undefined,
        emergency_phone: emergencyContactPhone || undefined,
      };

      console.log('💾 Profile data:', profileData);

      // Update member profile
      const result = await memberService.updateMemberProfile(
        profileData as any
      );

      console.log('💾 Update result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      console.log('✅ Profile saved successfully!');

      // Step 2: Upload avatar AFTER member is created (if selected)
      if (avatarUrl && avatarUrl.length > 100) {
        // avatarUrl contains base64
        console.log('📤 Uploading avatar to S3...');
        setIsUploadingAvatar(true);

        const uploadResult = await memberService.uploadAvatar(
          avatarUrl,
          'image/jpeg',
          `avatar_${userId}_${Date.now()}.jpg`
        );

        if (uploadResult.success) {
          console.log(
            '✅ Avatar uploaded:',
            uploadResult.data?.data?.avatarUrl
          );
        } else {
          console.error('❌ Avatar upload failed:', uploadResult.error);
          // Don't show alert, just log error - profile is already saved
        }

        setIsUploadingAvatar(false);
      }

      router.push({
        pathname: '/(auth)/register-complete',
        params: {
          userId,
          accessToken,
          refreshToken,
        },
      });
    } catch (error: any) {
      console.error('❌ Profile update error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack,
      });

      Alert.alert(
        t('common.error'),
        error.message ||
          error.response?.data?.message ||
          t('registration.profileUpdateFailed')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    router.push({
      pathname: '/(auth)/register-complete',
      params: {
        userId,
        accessToken,
        refreshToken,
      },
    });
  };

  const themedStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      padding: theme.spacing.lg,
      paddingBottom: 180,
    },
    header: {
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: -0.5,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.textSecondary,
    },
    form: {
      gap: theme.spacing.lg,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    avatarContainer: {
      position: 'relative',
      width: 120,
      height: 120,
      marginBottom: theme.spacing.sm,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surface,
      borderWidth: 3,
      borderColor: theme.colors.primary,
    },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      borderStyle: 'dashed',
    },
    avatarLoading: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: theme.radius.full,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarEditIcon: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: theme.colors.background,
    },
    avatarHint: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    section: {
      gap: theme.spacing.md,
    },
    sectionTitle: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.2,
      color: theme.colors.text,
    },
    inputContainer: {
      gap: theme.spacing.xs,
    },
    label: {
      fontFamily: 'Inter-Medium',
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.text,
    },
    input: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      minHeight: 48,
    },
    inputRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    inputHalf: {
      flex: 1,
    },
    datePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      minHeight: 48,
    },
    dateIcon: {
      marginRight: theme.spacing.sm,
    },
    dateText: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text,
      flex: 1,
    },
    genderOptions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    genderButton: {
      flex: 1,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 2,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
    },
    genderButtonSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}10`,
    },
    genderButtonText: {
      fontFamily: 'Inter-Bold',
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text,
    },
    genderButtonTextSelected: {
      color: theme.colors.primary,
    },
    goalsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    goalChip: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.full,
      borderWidth: 2,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    goalChipSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}10`,
    },
    goalChipText: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text,
    },
    goalChipTextSelected: {
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.primary,
    },
    footerContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
      gap: theme.spacing.sm,
    },
    saveButton: {
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    saveButtonText: {
      fontFamily: 'Inter-Bold',
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.textInverse,
    },
    skipButton: {
      padding: theme.spacing.md,
      alignItems: 'center',
    },
    skipButtonText: {
      fontFamily: 'Inter-Bold',
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.textTertiary,
    },
  });

  return (
    <View style={themedStyles.container}>
      <ScrollView contentContainerStyle={themedStyles.scrollContent}>
        <View style={themedStyles.header}>
          <TouchableOpacity
            style={themedStyles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={themedStyles.title}>
            {t('registration.personalInfo')}
          </Text>
          <Text style={themedStyles.subtitle}>
            {t('registration.personalInfoSubtitle')}
          </Text>
        </View>

        <View style={themedStyles.form}>
          {/* Avatar Upload */}
          <View style={themedStyles.avatarSection}>
            <TouchableOpacity
              style={themedStyles.avatarContainer}
              onPress={pickImage}
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={themedStyles.avatar}
                />
              ) : (
                <View style={themedStyles.avatarPlaceholder}>
                  <Ionicons
                    name="person"
                    size={48}
                    color={theme.colors.textTertiary}
                  />
                </View>
              )}
              <View style={themedStyles.avatarEditIcon}>
                <Ionicons
                  name="camera"
                  size={20}
                  color={theme.colors.textInverse}
                />
              </View>
            </TouchableOpacity>
            <Text style={themedStyles.avatarHint}>
              {avatarUri
                ? t('registration.avatarSelected')
                : t('registration.tapToUploadAvatar')}
            </Text>
          </View>

          <View style={themedStyles.section}>
            <Text style={themedStyles.sectionTitle}>
              {t('registration.basicInfo')}
            </Text>

            <View style={themedStyles.inputContainer}>
              <Text style={themedStyles.label}>
                {t('registration.dateOfBirth')}
              </Text>
              <TouchableOpacity
                style={themedStyles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={theme.colors.primary}
                  style={themedStyles.dateIcon}
                />
                <Text style={themedStyles.dateText}>
                  {formatDate(dateOfBirth)}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dateOfBirth}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1940, 0, 1)}
                />
              )}
            </View>

            <View style={themedStyles.inputContainer}>
              <Text style={themedStyles.label}>{t('registration.gender')}</Text>
              <View style={themedStyles.genderOptions}>
                {genders.map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    style={[
                      themedStyles.genderButton,
                      gender === g.value && themedStyles.genderButtonSelected,
                    ]}
                    onPress={() => setGender(g.value)}
                  >
                    <Text
                      style={[
                        themedStyles.genderButtonText,
                        gender === g.value &&
                          themedStyles.genderButtonTextSelected,
                      ]}
                    >
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={themedStyles.inputRow}>
              <View
                style={[themedStyles.inputContainer, themedStyles.inputHalf]}
              >
                <Text style={themedStyles.label}>
                  {t('registration.height')} (cm)
                </Text>
                <TextInput
                  style={themedStyles.input}
                  value={height}
                  onChangeText={setHeight}
                  placeholder=""
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>

              <View
                style={[themedStyles.inputContainer, themedStyles.inputHalf]}
              >
                <Text style={themedStyles.label}>
                  {t('registration.weight')} (kg)
                </Text>
                <TextInput
                  style={themedStyles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder=""
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={themedStyles.inputContainer}>
              <Text style={themedStyles.label}>
                {t('registration.bodyFat')} (%)
                {!isManualBodyFat && bodyFatPercent && (
                  <Text
                    style={{
                      fontFamily: 'Inter-Regular',
                      fontSize: 12,
                      color: theme.colors.textTertiary,
                      marginLeft: 8,
                    }}
                  >
                    {' '}
                    • {t('registration.autoCalculated')}
                  </Text>
                )}
              </Text>
              <TextInput
                style={themedStyles.input}
                value={bodyFatPercent}
                onChangeText={handleBodyFatChange}
                placeholder=""
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={themedStyles.section}>
            <Text style={themedStyles.sectionTitle}>
              {t('registration.fitnessGoals')}
            </Text>
            <View style={themedStyles.goalsContainer}>
              {fitnessGoals.map((goal) => (
                <TouchableOpacity
                  key={goal.key}
                  style={[
                    themedStyles.goalChip,
                    selectedGoals.includes(goal.key) &&
                      themedStyles.goalChipSelected,
                  ]}
                  onPress={() => toggleGoal(goal.key)}
                >
                  <Text
                    style={[
                      themedStyles.goalChipText,
                      selectedGoals.includes(goal.key) &&
                        themedStyles.goalChipTextSelected,
                    ]}
                  >
                    {goal.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={themedStyles.section}>
            <Text style={themedStyles.sectionTitle}>
              {t('registration.healthInfo')}
            </Text>

            <View style={themedStyles.inputContainer}>
              <Text style={themedStyles.label}>
                {t('registration.medicalConditions')}
              </Text>
              <TextInput
                style={[themedStyles.input, { minHeight: 80 }]}
                value={medicalConditions}
                onChangeText={setMedicalConditions}
                placeholder={t('registration.medicalConditionsPlaceholder')}
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={themedStyles.inputContainer}>
              <Text style={themedStyles.label}>
                {t('registration.allergies')}
              </Text>
              <TextInput
                style={themedStyles.input}
                value={allergies}
                onChangeText={setAllergies}
                placeholder={t('registration.allergiesPlaceholder')}
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          <View style={themedStyles.section}>
            <Text style={themedStyles.sectionTitle}>
              {t('registration.emergencyContact')}
            </Text>

            <View style={themedStyles.inputContainer}>
              <Text style={themedStyles.label}>
                {t('registration.contactName')}
              </Text>
              <TextInput
                style={themedStyles.input}
                value={emergencyContactName}
                onChangeText={setEmergencyContactName}
                placeholder={t('registration.contactNamePlaceholder')}
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            <View style={themedStyles.inputContainer}>
              <Text style={themedStyles.label}>
                {t('registration.contactPhone')}
              </Text>
              <TextInput
                style={themedStyles.input}
                value={emergencyContactPhone}
                onChangeText={setEmergencyContactPhone}
                placeholder="Tùy chọn"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={themedStyles.footerContainer}>
        <TouchableOpacity
          style={themedStyles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <Text style={themedStyles.saveButtonText}>
              {t('registration.saveAndContinue')}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={themedStyles.skipButton} onPress={handleSkip}>
          <Text style={themedStyles.skipButtonText}>
            {t('registration.skipForNow')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RegisterProfileScreen;
