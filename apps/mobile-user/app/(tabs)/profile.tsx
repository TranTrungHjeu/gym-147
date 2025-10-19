import ProfileSection from '@/components/ProfileSection';
import { colors } from '@/utils/colors';
import { userData } from '@/utils/mockData';
import { useTheme } from '@/utils/theme';
import { TextColors, Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  Bell,
  Gift,
  HeartPulse,
  CircleHelp as HelpCircle,
  LogOut,
  Ruler,
  Settings,
  Shield,
  Target,
  CircleUser as UserCircle,
  Weight,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const accountItems = [
    {
      id: 'settings',
      label: t('common.settings'),
      icon: <Settings size={20} color={theme.colors.primary} />,
      onPress: () => router.push('/settings/'),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell size={20} color="#3B82F6" />,
      onPress: () => console.log('Notifications pressed'),
    },
    {
      id: 'privacy',
      label: 'Privacy',
      icon: <Shield size={20} color="#3B82F6" />,
      onPress: () => console.log('Privacy pressed'),
    },
    {
      id: 'logout',
      label: 'Log Out',
      icon: <LogOut size={20} color="#EF4444" />,
      onPress: () => console.log('Log Out pressed'),
    },
  ];

  const supportItems = [
    {
      id: 'help',
      label: 'Help & Support',
      icon: <HelpCircle size={20} color="#3B82F6" />,
      onPress: () => console.log('Help pressed'),
    },
    {
      id: 'premium',
      label: 'Upgrade to Premium',
      icon: <Gift size={20} color="#F59E0B" />,
      onPress: () => console.log('Premium pressed'),
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('profile.title')}
        </Text>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.colors.gray }]}
        >
          <Settings size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            {userData.profileImage ? (
              <Image
                source={{ uri: userData.profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <UserCircle size={80} color={theme.colors.primary} />
            )}
          </View>
          <Text style={[styles.profileName, { color: theme.colors.text }]}>
            {userData.name}
          </Text>
          <Text
            style={[styles.profileEmail, { color: theme.colors.textSecondary }]}
          >
            {userData.email}
          </Text>

          <TouchableOpacity
            style={[
              styles.editProfileButton,
              { backgroundColor: theme.colors.primary + '20' },
            ]}
          >
            <Text
              style={[
                styles.editProfileButtonText,
                { color: theme.colors.primary },
              ]}
            >
              {t('profile.editProfile')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statsItem}>
            <View
              style={[
                styles.statsIconContainer,
                { backgroundColor: theme.colors.primary + '20' },
              ]}
            >
              <Target size={20} color={theme.colors.primary} />
            </View>
            <Text
              style={[styles.statsLabel, { color: theme.colors.textSecondary }]}
            >
              {t('profile.goals')}
            </Text>
            <Text style={styles.statsValue}>
              {userData.fitnessGoal === 'gain_muscle'
                ? 'Gain Muscle'
                : userData.fitnessGoal === 'lose_weight'
                ? 'Lose Weight'
                : userData.fitnessGoal === 'increase_endurance'
                ? 'Endurance'
                : userData.fitnessGoal === 'improve_flexibility'
                ? 'Flexibility'
                : 'Maintain'}
            </Text>
          </View>

          <View style={styles.statsItem}>
            <View style={styles.statsIconContainer}>
              <HeartPulse size={20} color="#3B82F6" />
            </View>
            <Text style={styles.statsLabel}>Weekly Goal</Text>
            <Text style={styles.statsValue}>
              {userData.weeklyGoal} workouts
            </Text>
          </View>

          <View style={styles.statsItem}>
            <View style={styles.statsIconContainer}>
              <Weight size={20} color="#3B82F6" />
            </View>
            <Text style={styles.statsLabel}>Weight</Text>
            <Text style={styles.statsValue}>{userData.weight} kg</Text>
          </View>

          <View style={styles.statsItem}>
            <View style={styles.statsIconContainer}>
              <Ruler size={20} color="#3B82F6" />
            </View>
            <Text style={styles.statsLabel}>Height</Text>
            <Text style={styles.statsValue}>{userData.height} cm</Text>
          </View>
        </View>

        <ProfileSection title="Account" items={accountItems} />
        <ProfileSection title="Support" items={supportItems} />

        <View style={styles.appVersion}>
          <Text style={styles.appVersionText}>GYM147 v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 12,
  },
  headerTitle: {
    ...Typography.h2,
    color: TextColors.primary,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  profileImage: {
    width: 100,
    height: 100,
  },
  profileName: {
    ...Typography.h4,
    color: TextColors.primary,
    marginBottom: 4,
  },
  profileEmail: {
    ...Typography.bodySmall,
    color: TextColors.secondary,
    marginBottom: 16,
  },
  editProfileButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary + '20', // 20% opacity
    borderRadius: 8,
  },
  editProfileButtonText: {
    ...Typography.bodySmallMedium,
    color: colors.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  statsItem: {
    width: '50%',
    padding: 12,
    alignItems: 'center',
  },
  statsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20', // 20% opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsLabel: {
    ...Typography.bodySmall,
    color: TextColors.secondary,
    marginBottom: 4,
  },
  statsValue: {
    ...Typography.h6,
    color: TextColors.primary,
  },
  appVersion: {
    alignItems: 'center',
    marginVertical: 24,
  },
  appVersionText: {
    ...Typography.bodySmall,
    color: TextColors.tertiary,
  },
});
