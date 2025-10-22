import { getLanguagePreference, saveLanguagePreference } from '@/locales/i18n';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Info,
  Shield,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ThemeMode = 'auto' | 'light' | 'dark';
type LanguageMode = 'auto' | 'en' | 'vi';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { theme, themeMode, setThemeMode } = useTheme();
  const router = useRouter();

  const [languageMode, setLanguageMode] = useState<LanguageMode>('auto');

  // Load language preference on mount
  React.useEffect(() => {
    const loadLanguagePreference = async () => {
      const savedLanguage = await getLanguagePreference();
      setLanguageMode(savedLanguage as LanguageMode);
    };
    loadLanguagePreference();
  }, []);

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const handleLanguageChange = async (mode: LanguageMode) => {
    setLanguageMode(mode);
    await saveLanguagePreference(mode);

    // Show restart message for language change
    Alert.alert(
      t('settings.title'),
      'Please restart the app to see language changes.',
      [{ text: t('common.ok') }]
    );
  };

  const SettingItem = ({
    icon: Icon,
    title,
    subtitle,
    onPress,
    rightElement,
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress: () => void;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingItemLeft}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.colors.primary + '20' },
          ]}
        >
          <Icon size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.settingItemText}>
          <Text style={[Typography.h6, { color: theme.colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                Typography.bodySmall,
                { color: theme.colors.textSecondary },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightElement || (
        <ChevronRight size={20} color={theme.colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  const OptionSelector = ({
    title,
    options,
    currentValue,
    onSelect,
  }: {
    title: string;
    options: { value: string; label: string; description?: string }[];
    currentValue: string;
    onSelect: (value: string) => void;
  }) => (
    <View style={styles.optionSelector}>
      <Text
        style={[Typography.h6, { color: theme.colors.text, marginBottom: 12 }]}
      >
        {title}
      </Text>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.optionItem,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => onSelect(option.value)}
        >
          <View style={styles.optionItemLeft}>
            <Text style={[Typography.bodyMedium, { color: theme.colors.text }]}>
              {option.label}
            </Text>
            {option.description && (
              <Text
                style={[
                  Typography.bodySmall,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {option.description}
              </Text>
            )}
          </View>
          {currentValue === option.value && (
            <Check size={20} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

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
        <Text style={[Typography.h3, { color: theme.colors.text }]}>
          {t('settings.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text
            style={[
              Typography.h5,
              { color: theme.colors.text, marginBottom: 16 },
            ]}
          >
            {t('settings.appearance')}
          </Text>

          <OptionSelector
            title={t('settings.theme')}
            options={[
              {
                value: 'auto',
                label: t('settings.themeAuto'),
                description: t('settings.themeDescription'),
              },
              { value: 'light', label: t('settings.themeLight') },
              { value: 'dark', label: t('settings.themeDark') },
            ]}
            currentValue={themeMode}
            onSelect={(value) => handleThemeChange(value as ThemeMode)}
          />
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <Text
            style={[
              Typography.h5,
              { color: theme.colors.text, marginBottom: 16 },
            ]}
          >
            {t('settings.language')}
          </Text>

          <OptionSelector
            title={t('settings.language')}
            options={[
              {
                value: 'auto',
                label: t('settings.languageAuto'),
                description: t('settings.languageDescription'),
              },
              { value: 'en', label: t('settings.languageEnglish') },
              { value: 'vi', label: t('settings.languageVietnamese') },
            ]}
            currentValue={languageMode}
            onSelect={(value) => handleLanguageChange(value as LanguageMode)}
          />
        </View>

        {/* Other Settings */}
        <View style={styles.section}>
          <Text
            style={[
              Typography.h5,
              { color: theme.colors.text, marginBottom: 16 },
            ]}
          >
            {t('settings.notifications')}
          </Text>

          <SettingItem
            icon={Bell}
            title={t('settings.pushNotifications')}
            subtitle="Get notified about workouts and achievements"
            onPress={() => router.push('/settings/notifications')}
          />

          <SettingItem
            icon={Bell}
            title={t('settings.workoutReminders')}
            subtitle="Daily workout reminders"
            onPress={() => router.push('/settings/notifications')}
          />
        </View>

        <View style={styles.section}>
          <Text
            style={[
              Typography.h5,
              { color: theme.colors.text, marginBottom: 16 },
            ]}
          >
            {t('settings.privacy')}
          </Text>

          <SettingItem
            icon={Shield}
            title={t('settings.dataUsage')}
            subtitle="Manage your data usage"
            onPress={() => router.push('/settings/privacy')}
          />

          <SettingItem
            icon={Shield}
            title={t('settings.privacyPolicy')}
            onPress={() => router.push('/settings/privacy')}
          />
        </View>

        <View style={styles.section}>
          <Text
            style={[
              Typography.h5,
              { color: theme.colors.text, marginBottom: 16 },
            ]}
          >
            {t('settings.about')}
          </Text>

          <SettingItem
            icon={Info}
            title={t('settings.version')}
            subtitle="Gym147 v1.0.0"
            onPress={() =>
              Alert.alert('App Version', 'Gym App v1.0.0\nBuild 2024.01.01')
            }
          />

          <SettingItem
            icon={Info}
            title={t('settings.contactSupport')}
            onPress={() => router.push('/settings/support')}
          />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerSpacer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderRadius: 12,
    marginBottom: 8,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingItemText: {
    flex: 1,
  },
  optionSelector: {
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionItemLeft: {
    flex: 1,
  },
});
