import { Button } from '@/components/ui/Button';
import { Picker } from '@/components/ui/Picker';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/member/notification.service';
import type { NotificationPreferences } from '@/types/notificationTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  Bell,
  Clock,
  Mail,
  MessageSquare,
  Smartphone,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);

  const loadPreferences = async () => {
    if (!user?.id) return;

    try {
      const preferencesData =
        await notificationService.getNotificationPreferences(user.id);
      setPreferences(preferencesData);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      Alert.alert('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user?.id || !preferences) return;

    setSaving(true);
    try {
      await notificationService.updateNotificationPreferences(
        user.id,
        preferences
      );
      Alert.alert('Success', 'Notification preferences updated successfully');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      Alert.alert('Error', 'Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (path: string, value: any) => {
    if (!preferences) return;

    const keys = path.split('.');
    const newPreferences = { ...preferences };
    let current = newPreferences as any;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setPreferences(newPreferences);
  };

  const togglePreference = (path: string) => {
    if (!preferences) return;

    const keys = path.split('.');
    const newPreferences = { ...preferences };
    let current = newPreferences as any;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = !current[keys[keys.length - 1]];
    setPreferences(newPreferences);
  };

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return { label: `${hour}:00`, value: `${hour}:00` };
  });

  const dayOptions = [
    { label: 'Sunday', value: 0 },
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 },
  ];

  const hoursBeforeClassOptions = [
    { label: '1 hour', value: 1 },
    { label: '2 hours', value: 2 },
    { label: '4 hours', value: 4 },
    { label: '6 hours', value: 6 },
    { label: '12 hours', value: 12 },
    { label: '24 hours', value: 24 },
  ];

  const daysBeforeExpiryOptions = [
    { label: '1 day', value: 1 },
    { label: '3 days', value: 3 },
    { label: '7 days', value: 7 },
    { label: '14 days', value: 14 },
    { label: '30 days', value: 30 },
  ];

  useEffect(() => {
    loadPreferences();
  }, [user?.id]);

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text
            style={[
              Typography.bodyLarge,
              { color: theme.colors.textSecondary },
            ]}
          >
            Loading notification settings...
          </Text>
        </View>
      </View>
    );
  }

  if (!preferences) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[Typography.h3, { color: theme.colors.error }]}>
            Failed to Load Settings
          </Text>
          <Button
            title="Retry"
            onPress={loadPreferences}
            style={styles.retryButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[Typography.h2, { color: theme.colors.text }]}>
          Notification Settings
        </Text>
        <Text style={[Typography.body, { color: theme.colors.textSecondary }]}>
          Customize how and when you receive notifications
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Workout Reminders */}
        <View
          style={[styles.section, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.sectionHeader}>
            <Bell size={24} color={theme.colors.primary} />
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              Workout Reminders
            </Text>
          </View>

          <View style={styles.settingItem}>
            <Text style={[Typography.body, { color: theme.colors.text }]}>
              Enable Workout Reminders
            </Text>
            <Switch
              value={preferences.workoutReminders.enabled}
              onValueChange={() => togglePreference('workoutReminders.enabled')}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          </View>

          {preferences.workoutReminders.enabled && (
            <>
              <View style={styles.settingItem}>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  Reminder Time
                </Text>
                <Picker
                  selectedValue={preferences.workoutReminders.time}
                  onValueChange={(value) =>
                    updatePreference('workoutReminders.time', value)
                  }
                  items={timeOptions}
                />
              </View>
            </>
          )}
        </View>

        {/* Membership Alerts */}
        <View
          style={[styles.section, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.sectionHeader}>
            <Clock size={24} color={theme.colors.warning} />
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              Membership Alerts
            </Text>
          </View>

          <View style={styles.settingItem}>
            <Text style={[Typography.body, { color: theme.colors.text }]}>
              Enable Membership Alerts
            </Text>
            <Switch
              value={preferences.membershipAlerts.enabled}
              onValueChange={() => togglePreference('membershipAlerts.enabled')}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          </View>

          {preferences.membershipAlerts.enabled && (
            <>
              <View style={styles.settingItem}>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  Expiry Reminder
                </Text>
                <Switch
                  value={preferences.membershipAlerts.expiryReminder}
                  onValueChange={() =>
                    togglePreference('membershipAlerts.expiryReminder')
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={theme.colors.surface}
                />
              </View>
              <View style={styles.settingItem}>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  Days Before Expiry
                </Text>
                <Picker
                  selectedValue={preferences.membershipAlerts.daysBeforeExpiry}
                  onValueChange={(value) =>
                    updatePreference('membershipAlerts.daysBeforeExpiry', value)
                  }
                  items={daysBeforeExpiryOptions}
                />
              </View>
            </>
          )}
        </View>

        {/* Payment Alerts */}
        <View
          style={[styles.section, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.sectionHeader}>
            <Bell size={24} color={theme.colors.error} />
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              Payment Alerts
            </Text>
          </View>

          <View style={styles.settingItem}>
            <Text style={[Typography.body, { color: theme.colors.text }]}>
              Enable Payment Alerts
            </Text>
            <Switch
              value={preferences.paymentAlerts.enabled}
              onValueChange={() => togglePreference('paymentAlerts.enabled')}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          </View>

          {preferences.paymentAlerts.enabled && (
            <>
              <View style={styles.settingItem}>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  Due Reminder
                </Text>
                <Switch
                  value={preferences.paymentAlerts.dueReminder}
                  onValueChange={() =>
                    togglePreference('paymentAlerts.dueReminder')
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={theme.colors.surface}
                />
              </View>
              <View style={styles.settingItem}>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  Failed Payment Alerts
                </Text>
                <Switch
                  value={preferences.paymentAlerts.failedPayment}
                  onValueChange={() =>
                    togglePreference('paymentAlerts.failedPayment')
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={theme.colors.surface}
                />
              </View>
            </>
          )}
        </View>

        {/* Class Notifications */}
        <View
          style={[styles.section, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.sectionHeader}>
            <Bell size={24} color={theme.colors.info} />
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              Class Notifications
            </Text>
          </View>

          <View style={styles.settingItem}>
            <Text style={[Typography.body, { color: theme.colors.text }]}>
              Enable Class Notifications
            </Text>
            <Switch
              value={preferences.classNotifications.enabled}
              onValueChange={() =>
                togglePreference('classNotifications.enabled')
              }
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          </View>

          {preferences.classNotifications.enabled && (
            <>
              <View style={styles.settingItem}>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  Booking Confirmation
                </Text>
                <Switch
                  value={preferences.classNotifications.bookingConfirmation}
                  onValueChange={() =>
                    togglePreference('classNotifications.bookingConfirmation')
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={theme.colors.surface}
                />
              </View>
              <View style={styles.settingItem}>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  Class Reminder
                </Text>
                <Switch
                  value={preferences.classNotifications.reminder}
                  onValueChange={() =>
                    togglePreference('classNotifications.reminder')
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={theme.colors.surface}
                />
              </View>
              <View style={styles.settingItem}>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  Hours Before Class
                </Text>
                <Picker
                  selectedValue={
                    preferences.classNotifications.hoursBeforeClass
                  }
                  onValueChange={(value) =>
                    updatePreference(
                      'classNotifications.hoursBeforeClass',
                      value
                    )
                  }
                  items={hoursBeforeClassOptions}
                />
              </View>
            </>
          )}
        </View>

        {/* Achievement Alerts */}
        <View
          style={[styles.section, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.sectionHeader}>
            <Bell size={24} color={theme.colors.success} />
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              Achievement Alerts
            </Text>
          </View>

          <View style={styles.settingItem}>
            <Text style={[Typography.body, { color: theme.colors.text }]}>
              Enable Achievement Alerts
            </Text>
            <Switch
              value={preferences.achievementAlerts.enabled}
              onValueChange={() =>
                togglePreference('achievementAlerts.enabled')
              }
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          </View>

          {preferences.achievementAlerts.enabled && (
            <>
              <View style={styles.settingItem}>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  New Achievement
                </Text>
                <Switch
                  value={preferences.achievementAlerts.newAchievement}
                  onValueChange={() =>
                    togglePreference('achievementAlerts.newAchievement')
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={theme.colors.surface}
                />
              </View>
              <View style={styles.settingItem}>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  Progress Updates
                </Text>
                <Switch
                  value={preferences.achievementAlerts.progressUpdate}
                  onValueChange={() =>
                    togglePreference('achievementAlerts.progressUpdate')
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={theme.colors.surface}
                />
              </View>
            </>
          )}
        </View>

        {/* Notification Channels */}
        <View
          style={[styles.section, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.sectionHeader}>
            <Smartphone size={24} color={theme.colors.primary} />
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              Notification Channels
            </Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.channelItem}>
              <Bell size={20} color={theme.colors.primary} />
              <Text style={[Typography.body, { color: theme.colors.text }]}>
                In-App Notifications
              </Text>
            </View>
            <Switch
              value={preferences.channels.inApp}
              onValueChange={() => togglePreference('channels.inApp')}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.channelItem}>
              <Smartphone size={20} color={theme.colors.primary} />
              <Text style={[Typography.body, { color: theme.colors.text }]}>
                Push Notifications
              </Text>
            </View>
            <Switch
              value={preferences.channels.push}
              onValueChange={() => togglePreference('channels.push')}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.channelItem}>
              <Mail size={20} color={theme.colors.primary} />
              <Text style={[Typography.body, { color: theme.colors.text }]}>
                Email Notifications
              </Text>
            </View>
            <Switch
              value={preferences.channels.email}
              onValueChange={() => togglePreference('channels.email')}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.channelItem}>
              <MessageSquare size={20} color={theme.colors.primary} />
              <Text style={[Typography.body, { color: theme.colors.text }]}>
                SMS Notifications
              </Text>
            </View>
            <Switch
              value={preferences.channels.sms}
              onValueChange={() => togglePreference('channels.sms')}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          </View>
        </View>

        {/* Quiet Hours */}
        <View
          style={[styles.section, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.sectionHeader}>
            <Clock size={24} color={theme.colors.textSecondary} />
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              Quiet Hours
            </Text>
          </View>

          <View style={styles.settingItem}>
            <Text style={[Typography.body, { color: theme.colors.text }]}>
              Enable Quiet Hours
            </Text>
            <Switch
              value={preferences.quietHours.enabled}
              onValueChange={() => togglePreference('quietHours.enabled')}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          </View>

          {preferences.quietHours.enabled && (
            <>
              <View style={styles.settingItem}>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  Start Time
                </Text>
                <Picker
                  selectedValue={preferences.quietHours.start}
                  onValueChange={(value) =>
                    updatePreference('quietHours.start', value)
                  }
                  items={timeOptions}
                />
              </View>
              <View style={styles.settingItem}>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  End Time
                </Text>
                <Picker
                  selectedValue={preferences.quietHours.end}
                  onValueChange={(value) =>
                    updatePreference('quietHours.end', value)
                  }
                  items={timeOptions}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.surface }]}>
        <Button
          title="Save Settings"
          onPress={savePreferences}
          loading={saving}
          style={styles.saveButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  retryButton: {
    marginTop: 16,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  saveButton: {
    width: '100%',
  },
});
