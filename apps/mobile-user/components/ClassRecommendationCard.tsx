import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  Calendar,
  CalendarClock,
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ClassRecommendation } from '@/services';

interface ClassRecommendationCardProps {
  recommendation: ClassRecommendation;
  onPress?: () => void;
}

export default function ClassRecommendationCard({
  recommendation,
  onPress,
}: ClassRecommendationCardProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const getPriorityColor = () => {
    switch (recommendation.priority) {
      case 'HIGH':
        return theme.colors.error;
      case 'MEDIUM':
        return theme.colors.warning || '#FFA500';
      case 'LOW':
        return theme.colors.primary;
      default:
        return theme.colors.primary;
    }
  };

  const getIcon = (): LucideIcon => {
    switch (recommendation.type) {
      case 'CLASS_RECOMMENDATION':
        return Sparkles;
      case 'SCHEDULE_SUGGESTION':
        return CalendarClock;
      case 'CATEGORY_SUGGESTION':
        return Target;
      case 'TREND_ANALYSIS':
        return TrendingUp;
      default:
        return Lightbulb;
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    // Default action handling
    if (recommendation.action === 'VIEW_CLASS' && recommendation.data?.classId) {
      router.push(`/classes/${recommendation.data.classId}`);
    } else if (recommendation.action === 'VIEW_SCHEDULE') {
      if (recommendation.data?.scheduleId) {
        // Navigate to schedule detail or booking
        router.push(`/classes?scheduleId=${recommendation.data.scheduleId}`);
      } else if (recommendation.data?.classId) {
        // If only classId, navigate to class or filter by category
        if (recommendation.data?.classCategory) {
          router.push(`/classes?category=${recommendation.data.classCategory}`);
        } else {
          router.push(`/classes/${recommendation.data.classId}`);
        }
      }
    } else if (
      recommendation.action === 'BOOK_CLASS' &&
      recommendation.data?.scheduleId
    ) {
      // Open booking modal or navigate to booking
      router.push(`/classes?scheduleId=${recommendation.data.scheduleId}&book=true`);
    } else if (
      recommendation.action === 'BROWSE_CATEGORY' &&
      recommendation.data?.classCategory
    ) {
      // Navigate to classes with category filter
      router.push(`/classes?category=${recommendation.data.classCategory}`);
    }
  };

  const Icon = getIcon();
  const priorityColor = getPriorityColor();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderLeftColor: priorityColor,
        },
      ]}
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: priorityColor + '15' },
          ]}
        >
          <Icon size={18} color={priorityColor} />
        </View>
        <View style={styles.content}>
          <Text
            style={[styles.title, { color: theme.colors.text }]}
            numberOfLines={2}
          >
            {recommendation.title}
          </Text>
          <Text
            style={[styles.priority, { color: priorityColor }]}
            numberOfLines={1}
          >
            {recommendation.priority === 'HIGH'
              ? t('classes.recommendationPriorityHigh')
              : recommendation.priority === 'MEDIUM'
              ? t('classes.recommendationPriorityMedium')
              : t('classes.recommendationPriorityLow')}
          </Text>
        </View>
      </View>
      <Text
        style={[styles.message, { color: theme.colors.textSecondary }]}
        numberOfLines={3}
      >
        {recommendation.message}
      </Text>
      {recommendation.reasoning && (
        <Text
          style={[styles.reasoning, { color: theme.colors.textSecondary }]}
          numberOfLines={2}
        >
          {recommendation.reasoning}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 4,
  },
  priority: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  message: {
    ...Typography.bodySmall,
    lineHeight: 20,
    marginBottom: 8,
  },
  reasoning: {
    ...Typography.bodySmall,
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.8,
  },
});

