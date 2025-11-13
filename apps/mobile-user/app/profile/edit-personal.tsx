import { memberService, userService } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Camera,
  ChevronDown,
  Save,
  CircleUser as UserCircle,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
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
  first_name: string;
  last_name: string;
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
    first_name: '',
    last_name: '',
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
  const [pendingAvatarBase64, setPendingAvatarBase64] = useState<string | null>(
    null
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Vietnam address states
  const [provinces, setProvinces] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [showProvincePicker, setShowProvincePicker] = useState(false);
  const [showWardPicker, setShowWardPicker] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [pendingAddress, setPendingAddress] = useState<string>('');
  const [originalAddress, setOriginalAddress] = useState<string>('');

  useEffect(() => {
    loadProfile();
    loadProvinces();
  }, []);

  // Load wards when province changes
  useEffect(() => {
    if (selectedProvince) {
      loadWards(selectedProvince);
    } else {
      setWards([]);
    }
  }, [selectedProvince]);

  // Parse pending address when provinces are loaded
  useEffect(() => {
    if (pendingAddress && provinces.length > 0) {
      parseAddress(pendingAddress);
      setPendingAddress(''); // Clear pending address after parsing
    }
  }, [pendingAddress, provinces.length, wards.length]);

  // Re-parse address when wards are loaded (in case we matched province earlier)
  useEffect(() => {
    if (
      originalAddress &&
      provinces.length > 0 &&
      wards.length > 0 &&
      !selectedWard
    ) {
      parseAddress(originalAddress);
    }
  }, [provinces.length, wards.length]);

  // Load provinces from API (New structure after 1/7/2025)
  const loadProvinces = async () => {
    try {
      setLoadingAddress(true);
      // Use environment variable or fallback to public API
      const { environment } = require('@/config/environment');
      const provincesApiUrl =
        environment.PROVINCES_API_URL || 'http://tinhthanhpho.com/api/v1';
      const url = `${provincesApiUrl}/new-provinces?limit=100`;
      console.log('Loading provinces from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: any = await response.json();
      console.log(
        'Loaded provinces:',
        result.data?.length,
        'Total:',
        result.metadata?.total
      );

      // Transform data to match expected format
      const transformedData =
        result.data?.map((item: any) => ({
          code: item.code, // Use code for new provinces API
          name: item.name,
          type: item.type,
        })) || [];

      setProvinces(transformedData);
    } catch (error) {
      console.error('Error loading provinces:', error);
      Alert.alert(
        'Lỗi',
        'Không thể tải danh sách địa chỉ. Vui lòng thử lại sau.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingAddress(false);
    }
  };

  // Load wards from API (New structure after 1/7/2025)
  const loadWards = async (provinceCode: string) => {
    try {
      setLoadingAddress(true);
      // Use environment variable or fallback to public API
      const { environment } = require('@/config/environment');
      const provincesApiUrl =
        environment.PROVINCES_API_URL || 'http://tinhthanhpho.com/api/v1';
      const url = `${provincesApiUrl}/new-provinces/${provinceCode}/wards?limit=1000`;
      console.log('Loading wards from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: any = await response.json();
      console.log(
        'Loaded wards:',
        result.data?.length,
        'Total:',
        result.metadata?.total
      );

      // Transform data to match expected format
      const transformedData =
        result.data?.map((item: any) => ({
          code: item.code,
          name: item.name,
          type: item.type,
        })) || [];

      setWards(transformedData);
    } catch (error) {
      console.error('Error loading wards:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách phường/xã.');
    } finally {
      setLoadingAddress(false);
    }
  };

  // Parse address string to fill in the form fields
  const parseAddress = (address: string) => {
    if (!address) return;

    // Split by commas
    const parts = address.split(',').map((part) => part.trim());

    let foundProvince: string = '';
    let foundWard: string = '';

    // Try to match parts with provinces and wards
    for (const part of parts) {
      // Check if this part matches a province
      const matchingProvince = provinces.find((p) => p.name === part);
      if (matchingProvince) {
        foundProvince = matchingProvince.code;
        continue;
      }

      // Check if this part matches a ward
      const matchingWard = wards.find((w) => w.name === part);
      if (matchingWard) {
        foundWard = matchingWard.code;
        continue;
      }
    }

    // Set selected values
    if (foundProvince) {
      setSelectedProvince(foundProvince);
    }
    if (foundWard) {
      setSelectedWard(foundWard);
    }

    // The remaining parts should be the street address
    // Filter out known province and ward names from the parts
    const remainingParts = parts.filter((part) => {
      // Check if this part is NOT a province or ward
      const isProvince = provinces.some((p) => p.name === part);
      const isWard = wards.some((w) => w.name === part);
      return !isProvince && !isWard;
    });

    // Join the remaining parts as street address
    const streetAddr = remainingParts.join(', ').trim();
    setStreetAddress(streetAddr);
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await memberService.getMemberProfile();
      if (response.success && response.data) {
        let dob = new Date(2000, 0, 1);
        if (response.data.date_of_birth) {
          // Parse YYYY-MM-DD as local date to avoid timezone issues
          // Backend may return ISO string, so extract just the date part
          const dateStr = response.data.date_of_birth.split('T')[0]; // Extract YYYY-MM-DD
          const [year, month, day] = dateStr.split('-').map(Number);
          dob = new Date(year, month - 1, day);
        }
        setDateOfBirthValue(dob);

        // Split full_name into first_name and last_name
        const nameParts = (response.data.full_name || '').trim().split(' ');
        const last_name = nameParts.length > 1 ? nameParts.pop() : '';
        const first_name = nameParts.join(' ') || last_name;

        setFormData({
          first_name: first_name,
          last_name: last_name,
          phone: response.data.phone || '',
          email: response.data.email || '',
          date_of_birth: response.data.date_of_birth || '',
          gender: response.data.gender || 'MALE',
          address: response.data.address || '',
        });

        // Store address for later parsing
        if (response.data.address) {
          setOriginalAddress(response.data.address);
          setPendingAddress(response.data.address);
        }

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

        // Save base64 for later upload when Save is pressed
        if (asset.base64) {
          setPendingAvatarBase64(asset.base64);
        }
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), error.message || 'Failed to pick image');
    }
  };

  const uploadAvatar = async (base64Image: string): Promise<boolean> => {
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
        // Clear local URI and pending base64 to show the URL from server
        setAvatarUri(null);
        setPendingAvatarBase64(null);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      return false;
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

    if (!formData.first_name.trim()) {
      newErrors.first_name = t('profile.invalidFirstName');
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = t('profile.invalidLastName');
    }

    // Phone is optional, but if provided, must be valid
    if (
      formData.phone.trim() &&
      !/^\d{10,}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))
    ) {
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

      // Upload avatar first if there's a pending one
      if (pendingAvatarBase64) {
        const avatarUploaded = await uploadAvatar(pendingAvatarBase64);
        if (!avatarUploaded) {
          Alert.alert(t('common.error'), t('profile.failedToUpdateProfile'));
          setSaving(false);
          return;
        }
      }

      // Update Identity Service first (User)
      const identityResponse = await userService.updateProfile({
        firstName: formData.first_name,
        lastName: formData.last_name,
      });

      // Check if identity update failed
      if (!identityResponse.success) {
        console.warn(
          'Failed to update Identity Service:',
          identityResponse.message
        );
        // Continue anyway as Member Service update is more critical
      }

      // Build full address
      let fullAddress = streetAddress.trim();
      if (selectedWard) {
        const ward = wards.find((w: any) => w.code === selectedWard);
        if (ward) {
          fullAddress = `${fullAddress ? fullAddress + ', ' : ''}${
            ward.name
          }`.trim();
        }
      }
      if (selectedProvince) {
        const province = provinces.find(
          (p: any) => p.code === selectedProvince
        );
        if (province) {
          fullAddress = `${fullAddress ? fullAddress + ', ' : ''}${
            province.name
          }`.trim();
        }
      }

      // Combine first_name and last_name into full_name for Member Service
      const memberUpdateData = {
        ...formData,
        full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        address: fullAddress,
      };
      delete memberUpdateData.first_name;
      delete memberUpdateData.last_name;

      // Then save profile data to Member Service
      const response = await memberService.updateMemberProfile(
        memberUpdateData as any
      );

      if (response.success) {
        // Navigate back immediately
        router.back();
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
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
                      <UserCircle
                        size={64}
                        color={theme.colors.textSecondary}
                      />
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

            {/* Name */}
            <View style={styles.inputGroup}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                }}
              >
                {/* First Name */}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    {t('profile.firstName')} *
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: errors.first_name
                          ? theme.colors.error
                          : theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                    value={formData.first_name}
                    onChangeText={(value) => updateField('first_name', value)}
                    placeholder={t('profile.enterFirstName')}
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>

                {/* Last Name */}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    {t('profile.lastName')} *
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: errors.last_name
                          ? theme.colors.error
                          : theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                    value={formData.last_name}
                    onChangeText={(value) => updateField('last_name', value)}
                    placeholder={t('profile.enterLastName')}
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>
              </View>

              {/* Error Messages */}
              {errors.first_name && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.first_name}
                </Text>
              )}
              {errors.last_name && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.last_name}
                </Text>
              )}
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('profile.phoneNumber')}
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
                  styles.datePickerButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
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

              {/* Province */}
              <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    marginBottom: 12,
                  },
                ]}
                onPress={() => setShowProvincePicker(true)}
              >
                <Text
                  style={[
                    styles.pickerText,
                    {
                      color: selectedProvince
                        ? theme.colors.text
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {selectedProvince
                    ? provinces.find((p: any) => p.code === selectedProvince)
                        ?.name || 'Chọn tỉnh/thành phố'
                    : 'Chọn tỉnh/thành phố'}
                </Text>
                <ChevronDown size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              {/* Ward */}
              {selectedProvince && (
                <TouchableOpacity
                  style={[
                    styles.datePickerButton,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      marginBottom: 12,
                    },
                  ]}
                  onPress={() => setShowWardPicker(true)}
                  disabled={!selectedProvince}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      {
                        color: selectedWard
                          ? theme.colors.text
                          : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {selectedWard
                      ? wards.find((w: any) => w.code === selectedWard)?.name ||
                        'Chọn phường/xã'
                      : 'Chọn phường/xã'}
                  </Text>
                  <ChevronDown size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}

              {/* Street Address */}
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                value={streetAddress}
                onChangeText={setStreetAddress}
                placeholder="Số nhà, tên đường"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Province Picker Modal */}
      <Modal
        visible={showProvincePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProvincePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Chọn tỉnh/thành phố
            </Text>
            {loadingAddress ? (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : (
              <FlatList
                data={provinces}
                keyExtractor={(item) => item.code.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      {
                        backgroundColor:
                          selectedProvince === item.code
                            ? theme.colors.primary
                            : theme.colors.surface,
                      },
                    ]}
                    onPress={() => {
                      setSelectedProvince(item.code);
                      setShowProvincePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        {
                          color:
                            selectedProvince === item.code
                              ? theme.colors.textInverse
                              : theme.colors.text,
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity
              style={[
                styles.modalCloseButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setShowProvincePicker(false)}
            >
              <Text
                style={[
                  styles.modalCloseText,
                  { color: theme.colors.textInverse },
                ]}
              >
                Đóng
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ward Picker Modal */}
      <Modal
        visible={showWardPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWardPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Chọn phường/xã
            </Text>
            {loadingAddress ? (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : (
              <FlatList
                data={wards}
                keyExtractor={(item) => item.code.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      {
                        backgroundColor:
                          selectedWard === item.code
                            ? theme.colors.primary
                            : theme.colors.surface,
                      },
                    ]}
                    onPress={() => {
                      setSelectedWard(item.code);
                      setShowWardPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        {
                          color:
                            selectedWard === item.code
                              ? theme.colors.textInverse
                              : theme.colors.text,
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity
              style={[
                styles.modalCloseButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setShowWardPicker(false)}
            >
              <Text
                style={[
                  styles.modalCloseText,
                  { color: theme.colors.textInverse },
                ]}
              >
                Đóng
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    lineHeight: undefined, // Remove lineHeight for TextInput
    // @ts-ignore - Android specific props
    includeFontPadding: false, // Android: prevent extra padding
    // @ts-ignore - Android specific props
    textAlignVertical: 'center', // Android: vertical alignment
  },
  datePickerButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  pickerText: {
    ...Typography.bodyMedium,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    ...Typography.h4,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  modalItemText: {
    ...Typography.bodyMedium,
  },
  modalCloseButton: {
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    ...Typography.buttonLarge,
  },
});
