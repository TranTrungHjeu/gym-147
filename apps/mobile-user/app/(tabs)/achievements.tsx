import AchievementCard from '@/components/AchievementCard';
import { colors } from '@/utils/colors';
import { mockAchievements } from '@/utils/mockData';
import { TextColors, Typography } from '@/utils/typography';
import {
  Calendar,
  Droplet,
  Dumbbell,
  Footprints,
  Medal,
  Sunrise,
} from 'lucide-react-native';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AchievementsScreen() {
  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'sunrise':
        return <Sunrise size={24} color={colors.primary} />;
      case 'calendar':
        return <Calendar size={24} color={colors.primary} />;
      case 'dumbbell':
        return <Dumbbell size={24} color={colors.primary} />;
      case 'drop':
        return <Droplet size={24} color={colors.primary} />;
      case 'footprints':
        return <Footprints size={24} color={colors.primary} />;
      default:
        return <Medal size={24} color={colors.primary} />;
    }
  };

  const completedAchievements = mockAchievements.filter(
    (achievement) => achievement.completed
  );
  const inProgressAchievements = mockAchievements.filter(
    (achievement) => !achievement.completed
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Achievements</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{completedAchievements.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{inProgressAchievements.length}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{mockAchievements.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed</Text>
          {completedAchievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              title={achievement.title}
              description={achievement.description}
              completed={achievement.completed}
              progress={achievement.progress}
              icon={getAchievementIcon(achievement.icon)}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>In Progress</Text>
          {inProgressAchievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              title={achievement.title}
              description={achievement.description}
              completed={achievement.completed}
              progress={achievement.progress}
              icon={getAchievementIcon(achievement.icon)}
            />
          ))}
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
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 12,
  },
  headerTitle: {
    ...Typography.h2,
    color: TextColors.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    margin: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    ...Typography.numberSmall,
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    ...Typography.bodySmallMedium,
    color: TextColors.secondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...Typography.h5,
    color: TextColors.primary,
    marginBottom: 16,
  },
});
