import type { MetricCardProps } from '@/types/healthTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import {
  Edit3,
  Minus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  trend,
  goal,
  onEdit,
  onDelete,
}) => {
  const { theme } = useTheme();

  const getMetricDisplayName = (metricType: string) => {
    const names: Record<string, string> = {
      WEIGHT: 'Weight',
      BODY_FAT: 'Body Fat',
      MUSCLE_MASS: 'Muscle Mass',
      BMI: 'BMI',
      HEART_RATE: 'Heart Rate',
      BLOOD_PRESSURE: 'Blood Pressure',
      BODY_TEMPERATURE: 'Body Temperature',
      SLEEP_HOURS: 'Sleep Hours',
      WATER_INTAKE: 'Water Intake',
      STEPS: 'Steps',
      CALORIES_BURNED: 'Calories Burned',
      CALORIES_CONSUMED: 'Calories Consumed',
    };
    return names[metricType] || metricType;
  };

  const getMetricUnit = (metricType: string) => {
    const units: Record<string, string> = {
      WEIGHT: 'kg',
      BODY_FAT: '%',
      MUSCLE_MASS: 'kg',
      BMI: '',
      HEART_RATE: 'bpm',
      BLOOD_PRESSURE: 'mmHg',
      BODY_TEMPERATURE: '°C',
      SLEEP_HOURS: 'h',
      WATER_INTAKE: 'L',
      STEPS: 'steps',
      CALORIES_BURNED: 'cal',
      CALORIES_CONSUMED: 'cal',
    };
    return units[metricType] || '';
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'UP':
        return <TrendingUp size={16} color={theme.colors.success} />;
      case 'DOWN':
        return <TrendingDown size={16} color={theme.colors.error} />;
      default:
        return <Minus size={16} color={theme.colors.textSecondary} />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'UP':
        return theme.colors.success;
      case 'DOWN':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(metric);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Metric',
      'Are you sure you want to delete this metric?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDelete) {
              onDelete(metric);
            }
          },
        },
      ]
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[Typography.h4, { color: theme.colors.text }]}>
            {getMetricDisplayName(metric.type)}
          </Text>
          <Text
            style={[Typography.caption, { color: theme.colors.textSecondary }]}
          >
            {formatDate(metric.recordedAt)}
          </Text>
        </View>
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity onPress={handleEdit} style={styles.actionButton}>
              <Edit3 size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.actionButton}
            >
              <Trash2 size={16} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.valueContainer}>
        <Text style={[Typography.h2, { color: theme.colors.text }]}>
          {metric.value.toFixed(1)}
        </Text>
        <Text style={[Typography.body, { color: theme.colors.textSecondary }]}>
          {getMetricUnit(metric.type)}
        </Text>
      </View>

      {trend && (
        <View style={styles.trendContainer}>
          <View style={styles.trendItem}>
            {getTrendIcon(trend.direction)}
            <Text
              style={[
                Typography.caption,
                { color: getTrendColor(trend.direction), marginLeft: 4 },
              ]}
            >
              {trend.changePercentage > 0 ? '+' : ''}
              {trend.changePercentage.toFixed(1)}%
            </Text>
          </View>
          <Text
            style={[Typography.caption, { color: theme.colors.textSecondary }]}
          >
            vs {trend.period} ago
          </Text>
        </View>
      )}

      {goal && (
        <View style={styles.goalContainer}>
          <View style={styles.goalHeader}>
            <Text
              style={[
                Typography.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              Goal Progress
            </Text>
            <Text style={[Typography.caption, { color: theme.colors.primary }]}>
              {goal.progress.toFixed(1)}%
            </Text>
          </View>
          <View
            style={[
              styles.progressBar,
              { backgroundColor: theme.colors.border },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(goal.progress, 100)}%`,
                  backgroundColor:
                    goal.progress >= 100
                      ? theme.colors.success
                      : theme.colors.primary,
                },
              ]}
            />
          </View>
          <Text
            style={[Typography.caption, { color: theme.colors.textSecondary }]}
          >
            Target: {goal.targetValue} {getMetricUnit(metric.type)}
          </Text>
        </View>
      )}

      {metric.notes && (
        <View style={styles.notesContainer}>
          <Text
            style={[Typography.caption, { color: theme.colors.textSecondary }]}
          >
            {metric.notes}
          </Text>
        </View>
      )}

      {metric.source && (
        <View style={styles.sourceContainer}>
          <Text
            style={[Typography.caption, { color: theme.colors.textSecondary }]}
          >
            Source: {metric.source}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 4,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  trendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalContainer: {
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  notesContainer: {
    marginBottom: 12,
  },
  sourceContainer: {
    alignItems: 'flex-end',
  },
});
