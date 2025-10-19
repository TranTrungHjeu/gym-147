import ActivityCard from '@/components/ActivityCard';
import WorkoutCard from '@/components/WorkoutCard';
import { mockActivities, mockWorkouts, userData } from '@/utils/mockData';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Bell, Search } from 'lucide-react-native';
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

export default function HomeScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View>
              <Text style={[styles.greeting, { color: theme.colors.text }]}>
                {t('home.greeting', { name: userData.name.split(' ')[0] })}
              </Text>
              <Text
                style={[
                  styles.subGreeting,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('home.subGreeting')}
              </Text>
            </View>
            <View style={styles.headerRightContent}>
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  { backgroundColor: theme.colors.gray },
                ]}
              >
                <Bell size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileImageContainer}>
                <Image
                  source={{ uri: userData.profileImage }}
                  style={styles.profileImage}
                />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.searchBar,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Search size={20} color={theme.colors.textSecondary} />
            <Text
              style={[styles.searchText, { color: theme.colors.textSecondary }]}
            >
              {t('home.searchPlaceholder')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('home.dailyActivity')}
          </Text>
          <View style={styles.activityContainer}>
            {mockActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                title={activity.title}
                progress={activity.progress}
                metric={activity.metric}
                metricValue={activity.metricValue}
                progressColor={activity.progressColor}
                onPress={() =>
                  console.log(`Activity pressed: ${activity.title}`)
                }
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('home.recommendedWorkouts')}
            </Text>
            <TouchableOpacity>
              <Text
                style={[styles.seeAllText, { color: theme.colors.primary }]}
              >
                {t('home.seeAll')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.workoutsContainer}>
            {mockWorkouts.slice(0, 3).map((workout) => (
              <WorkoutCard
                key={workout.id}
                title={workout.name}
                duration={workout.duration}
                exercises={workout.exercises}
                image={workout.image}
                onPress={() => console.log(`Workout pressed: ${workout.name}`)}
              />
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
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    ...Typography.h3,
  },
  subGreeting: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
  headerRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileImage: {
    width: 40,
    height: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchText: {
    ...Typography.bodyRegular,
    marginLeft: 12,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...Typography.h5,
    marginBottom: 16,
  },
  seeAllText: {
    ...Typography.bodySmallMedium,
  },
  activityContainer: {
    marginBottom: 8,
  },
  workoutsContainer: {
    marginBottom: 24,
  },
});
