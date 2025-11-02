import { memberService } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Camera,
  Save,
  CircleUser as UserCircle,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

interface PersonalInfo {
  full_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  address: string;
}

const GENDER_OPTIONS = [
  { value: 'MALE' as const, key: 'male' },
  { value: 'FEMALE' as const, key: 'female' },
  { value: 'OTHER' as const, key: 'other' },
];

export default function EditPersonalScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<PersonalInfo>({
    full_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    gender: 'MALE',
    address: '',
  });
  const [errors, setErrors] = useState<Partial<PersonalInfo>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateOfBirthValue, setDateOfBirthValue] = useState(
    new Date(2000, 0, 1)
  );
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await memberService.getMemberProfile();
      if (response.success && response.data) {
        const dob = response.data.date_of_birth
          ? new Date(response.data.date_of_birth)
          : new Date(2000, 0, 1);
        setDateOfBirthValue(dob);
        setFormData({
          full_name: response.data.full_name || '',
          phone: response.data.phone || '',
          email: response.data.email || '',
          date_of_birth: response.data.date_of_birth || '',
          gender: response.data.gender || 'MALE',
          address: response.data.address || '',
        });
        // Load avatar
        if (response.data.profile_photo) {
          setAvatarUrl(response.data.profile_photo);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          t('registration.permissionRequired') ||
            'Permission to access camera roll is required!'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Show preview
        setAvatarUri(asset.uri);

        // Upload if base64 is available
        if (asset.base64) {
          await uploadAvatar(asset.base64);
        }
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), error.message || 'Failed to pick image');
    }
  };

  const uploadAvatar = async (base64Image: string) => {
    try {
      setIsUploadingAvatar(true);

      // Upload to backend
      const uploadResult = await memberService.uploadAvatar(
        base64Image,
        'image/jpeg',
        'avatar.jpg'
      );

      if (uploadResult.success) {
        // Update avatar URL if provided
        if (uploadResult.data?.profile_photo) {
          setAvatarUrl(uploadResult.data.profile_photo);
        }
        // Clear local URI to show the URL from server
        setAvatarUri(null);
        Alert.alert(t('common.success'), t('profile.avatarUpdated'));
      } else {
        Alert.alert(
          t('common.error'),
          uploadResult.error || t('profile.failedToUpdateProfile')
        );
        // Clear preview on error
        setAvatarUri(null);
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      Alert.alert(
        t('common.error'),
        error.message || 'Failed to upload avatar'
      );
      // Clear preview on error
      setAvatarUri(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateForBackend = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirthValue(selectedDate);
      setFormData((prev) => ({
        ...prev,
        date_of_birth: formatDateForBackend(selectedDate),
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<PersonalInfo> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = t('profile.invalidFullName');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('validation.phoneRequired');
    } else if (!/^\d{10,}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = t('profile.invalidPhone');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('validation.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('profile.invalidEmailFormat');
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
        Alert.alert(t('common.success'), t('profile.personalInfoUpdated'), [
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

  const updateField = (field: keyof PersonalInfo, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            {t('profile.loadingProfile')}
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
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('profile.editPersonal')}
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

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.form}>
          {/* Avatar Picker */}
          <View style={styles.avatarSection}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {t('profile.profilePhoto')}
            </Text>
            <View style={styles.avatarWrapper}>
              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={pickImage}
                disabled={isUploadingAvatar}
              >
                {avatarUri || avatarUrl ? (
                  <Image
                    source={{ uri: avatarUri || avatarUrl || '' }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      { backgroundColor: theme.colors.surface },
                    ]}
                  >
                    <UserCircle size={64} color={theme.colors.textSecondary} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Camera Icon Overlay */}
              <View
                style={[
                  styles.cameraIconOverlay,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                {isUploadingAvatar ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.textInverse}
                  />
                ) : (
                  <Camera size={18} color={theme.colors.textInverse} />
                )}
              </View>
            </View>
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {t('profile.fullName')} *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: errors.full_name
                    ? theme.colors.error
                    : theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              value={formData.full_name}
              onChangeText={(value) => updateField('full_name', value)}
              placeholder={t('profile.enterFullName')}
              placeholderTextColor={theme.colors.textSecondary}
            />
            {errors.full_name && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.full_name}
              </Text>
            )}
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {t('profile.phoneNumber')} *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: errors.phone
                    ? theme.colors.error
                    : theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              value={formData.phone}
              onChangeText={(value) => updateField('phone', value)}
              placeholder={t('profile.enterPhoneNumber')}
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="phone-pad"
            />
            {errors.phone && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.phone}
              </Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {t('profile.emailAddress')} *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: errors.email
                    ? theme.colors.error
                    : theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              placeholder={t('profile.enterEmail')}
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.email}
              </Text>
            )}
          </View>

          {/* Date of Birth */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {t('profile.dateOfBirth')}
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  flexDirection: 'row',
                  alignItems: 'center',
                },
              ]}
            >
              <Calendar
                size={20}
                color={theme.colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{ ...Typography.bodyMedium, color: theme.colors.text }}
              >
                {formatDate(dateOfBirthValue)}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirthValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* Gender */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {t('profile.gender')}
            </Text>
            <View style={styles.genderContainer}>
              {GENDER_OPTIONS.map((gender) => (
                <TouchableOpacity
                  key={gender.value}
                  style={[
                    styles.genderOption,
                    {
                      backgroundColor:
                        formData.gender === gender.value
                          ? theme.colors.primary
                          : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => updateField('gender', gender.value)}
                >
                  <Text
                    style={[
                      styles.genderText,
                      {
                        color:
                          formData.gender === gender.value
                            ? theme.colors.textInverse
                            : theme.colors.text,
                      },
                    ]}
                  >
                    {t(`profile.${gender.key}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {t('profile.address')}
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              value={formData.address}
              onChangeText={(value) => updateField('address', value)}
              placeholder={t('profile.enterAddress')}
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
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
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  form: {
    paddingVertical: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    ...Typography.bodyMedium,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    ...Typography.bodyMedium,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  textArea: {
    height: 90,
    paddingTop: 14,
  },
  errorText: {
    ...Typography.bodySmall,
    marginTop: 6,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  genderText: {
    ...Typography.bodyMedium,
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    width: 120,
    height: 120,
    position: 'relative',
    marginTop: 12,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
