import { userService } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Download,
  Eye,
  Save,
  Shield,
  Trash2,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PrivacyPreferences {
  profile_visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  activity_sharing: boolean;
  data_collection: boolean;
  analytics_tracking: boolean;
  location_tracking: boolean;
  biometric_data: boolean;
}

export default function PrivacySettingsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    profile_visibility: 'FRIENDS',
    activity_sharing: true,
    data_collection: true,
    analytics_tracking: true,
    location_tracking: false,
    biometric_data: false,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await userService.getUserPreferences();
      if (response.success && response.data?.privacy) {
        setPreferences({
          profile_visibility:
            response.data.privacy.profile_visibility ?? 'FRIENDS',
          activity_sharing: response.data.privacy.activity_sharing ?? true,
          data_collection: response.data.privacy.data_collection ?? true,
          analytics_tracking: response.data.privacy.analytics_tracking ?? true,
          location_tracking: response.data.privacy.location_tracking ?? false,
          biometric_data: response.data.privacy.biometric_data ?? false,
        });
      }
    } catch (error) {
      console.error('Error loading privacy preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await userService.updateUserPreferences({
        privacy: preferences,
      });

      if (response.success) {
        Alert.alert('Success', 'Privacy preferences updated successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(
          'Error',
          response.message || 'Failed to update preferences'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update privacy preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof PrivacyPreferences, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleExportData = async () => {
    try {
      Alert.alert(
        'Export Data',
        'This will generate a download link for your personal data. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Export',
            onPress: async () => {
              const response = await userService.exportUserData();
              if (response.success) {
                Alert.alert(
                  'Export Ready',
                  'Your data export is ready. Check your email for the download link.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert(
                  'Error',
                  response.message || 'Failed to export data'
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Confirm Deletion',
              'Please enter your password to confirm account deletion:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async (password) => {
                    if (!password) {
                      Alert.alert('Error', 'Password is required');
                      return;
                    }

                    try {
                      const response = await userService.deleteAccount({
                        password,
                        reason: 'User requested account deletion',
                      });

                      if (response.success) {
                        Alert.alert(
                          'Account Deleted',
                          'Your account has been successfully deleted.',
                          [
                            {
                              text: 'OK',
                              onPress: () => router.replace('/(auth)/login'),
                            },
                          ]
                        );
                      } else {
                        Alert.alert(
                          'Error',
                          response.message || 'Failed to delete account'
                        );
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Failed to delete account');
                    }
                  },
                },
              ],
              'secure-text'
            );
          },
        },
      ]
    );
  };

  const privacySettings = [
    {
      key: 'activity_sharing' as keyof PrivacyPreferences,
      title: 'Activity Sharing',
      description: 'Share your workout activities with friends',
      icon: <Eye size={20} color={theme.colors.primary} />,
    },
    {
      key: 'data_collection' as keyof PrivacyPreferences,
      title: 'Data Collection',
      description: 'Allow collection of usage data for app improvement',
      icon: <Shield size={20} color={theme.colors.primary} />,
    },
    {
      key: 'analytics_tracking' as keyof PrivacyPreferences,
      title: 'Analytics Tracking',
      description: 'Help us improve the app with anonymous usage data',
      icon: <Shield size={20} color={theme.colors.primary} />,
    },
    {
      key: 'location_tracking' as keyof PrivacyPreferences,
      title: 'Location Tracking',
      description: 'Track location for gym check-ins and nearby features',
      icon: <Shield size={20} color={theme.colors.primary} />,
    },
    {
      key: 'biometric_data' as keyof PrivacyPreferences,
      title: 'Biometric Data',
      description: 'Store biometric data for face recognition access',
      icon: <Shield size={20} color={theme.colors.primary} />,
    },
  ];

  const visibilityOptions = [
    {
      value: 'PUBLIC',
      label: 'Public',
      description: 'Anyone can see your profile',
    },
    {
      value: 'FRIENDS',
      label: 'Friends Only',
      description: 'Only your friends can see your profile',
    },
    {
      value: 'PRIVATE',
      label: 'Private',
      description: 'Only you can see your profile',
    },
  ];

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading preferences...
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
          Privacy Settings
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
        {/* Profile Visibility */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Profile Visibility
          </Text>
          {visibilityOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.visibilityOption,
                {
                  backgroundColor:
                    preferences.profile_visibility === option.value
                      ? theme.colors.primary + '20'
                      : theme.colors.surface,
                  borderColor:
                    preferences.profile_visibility === option.value
                      ? theme.colors.primary
                      : theme.colors.border,
                },
              ]}
              onPress={() =>
                updatePreference('profile_visibility', option.value)
              }
            >
              <View style={styles.visibilityContent}>
                <Text
                  style={[
                    styles.visibilityLabel,
                    {
                      color:
                        preferences.profile_visibility === option.value
                          ? theme.colors.primary
                          : theme.colors.text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.visibilityDescription,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Privacy Controls
          </Text>
          {privacySettings.map((setting) => (
            <View
              key={setting.key}
              style={[
                styles.settingItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.settingContent}>
                <View style={styles.settingIcon}>{setting.icon}</View>
                <View style={styles.settingText}>
                  <Text
                    style={[styles.settingTitle, { color: theme.colors.text }]}
                  >
                    {setting.title}
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {setting.description}
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences[setting.key] as boolean}
                onValueChange={(value) => updatePreference(setting.key, value)}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary + '40',
                }}
                thumbColor={
                  preferences[setting.key]
                    ? theme.colors.primary
                    : theme.colors.textSecondary
                }
              />
            </View>
          ))}
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Data Management
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, { borderColor: theme.colors.border }]}
            onPress={handleExportData}
          >
            <Download size={20} color={theme.colors.primary} />
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
                Export My Data
              </Text>
              <Text
                style={[
                  styles.actionDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Download a copy of all your personal data
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderColor: theme.colors.error }]}
            onPress={handleDeleteAccount}
          >
            <Trash2 size={20} color={theme.colors.error} />
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: theme.colors.error }]}>
                Delete Account
              </Text>
              <Text
                style={[
                  styles.actionDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Permanently delete your account and all data
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
            Your Privacy Matters
          </Text>
          <Text
            style={[styles.infoText, { color: theme.colors.textSecondary }]}
          >
            We are committed to protecting your privacy. You can control how
            your data is used and shared. Some features may require certain
            permissions to function properly.
          </Text>
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
  section: {
    paddingVertical: 20,
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: 16,
  },
  visibilityOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  visibilityContent: {
    flex: 1,
  },
  visibilityLabel: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  visibilityDescription: {
    ...Typography.bodySmall,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    ...Typography.bodySmall,
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionDescription: {
    ...Typography.bodySmall,
    lineHeight: 18,
  },
  infoSection: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  infoTitle: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    ...Typography.bodySmall,
    lineHeight: 20,
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
