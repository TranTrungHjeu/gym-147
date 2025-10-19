import { useTheme } from '@/utils/theme';
import { FontFamily, Typography } from '@/utils/typography';
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CircularProgress from './CircularProgress';

interface ActivityCardProps {
  title: string;
  progress: number;
  metric: string;
  metricValue: string;
  progressColor?: string;
  onPress?: () => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  title,
  progress,
  metric,
  metricValue,
  progressColor,
  onPress,
}) => {
  const { theme } = useTheme();
  const defaultProgressColor = progressColor || theme.colors.primary;
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.metric, { color: theme.colors.textSecondary }]}>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>
              {metricValue}
            </Text>{' '}
            {metric}
          </Text>
        </View>
        <View style={styles.rightContent}>
          <CircularProgress
            size={60}
            strokeWidth={6}
            progress={progress}
            progressColor={defaultProgressColor}
          />
          <ChevronRight
            size={20}
            color={theme.colors.textTertiary}
            style={styles.chevron}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...Typography.h5,
    marginBottom: 4,
  },
  metric: {
    ...Typography.bodySmall,
  },
  metricValue: {
    fontFamily: FontFamily.spaceGroteskSemiBold,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: 8,
  },
});

export default ActivityCard;
