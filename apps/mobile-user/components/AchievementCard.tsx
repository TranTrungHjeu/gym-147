import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AchievementCardProps {
  title: string;
  description: string;
  completed: boolean;
  progress?: number;
  icon: React.ReactNode;
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  title,
  description,
  completed,
  progress = 0,
  icon,
}) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface },
        completed ? { borderColor: theme.colors.success } : {},
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.colors.primary + '20' },
          completed ? { backgroundColor: theme.colors.success + '20' } : {},
        ]}
      >
        {icon}
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {title}
        </Text>
        <Text
          style={[styles.description, { color: theme.colors.textSecondary }]}
        >
          {description}
        </Text>

        {!completed && progress > 0 && (
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progress}%`,
                  backgroundColor: theme.colors.primary,
                },
              ]}
            />
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        )}

        {completed && (
          <View
            style={[
              styles.completedBadge,
              { backgroundColor: theme.colors.success + '20' },
            ]}
          >
            <Text
              style={[styles.completedText, { color: theme.colors.success }]}
            >
              Completed
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    ...Typography.h6,
    marginBottom: 4,
  },
  description: {
    ...Typography.bodySmall,
    marginBottom: 8,
  },
  progressContainer: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    ...Typography.labelSmall,
    position: 'absolute',
    right: 0,
    top: 10,
  },
  completedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  completedText: {
    ...Typography.labelSmall,
  },
});

export default AchievementCard;
