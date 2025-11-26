import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Calendar, ChevronRight, Clock, Dumbbell, Target, TrendingUp } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Difficulty } from '@/types/workoutTypes';

interface WorkoutCardProps {
  title: string;
  duration: string;
  exercises: number;
  image: string;
  onPress?: () => void;
  goal?: string;
  difficulty?: Difficulty | string;
  isActive?: boolean;
  progress?: number; // 0-100
  durationWeeks?: number;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({
  title,
  duration,
  exercises,
  image,
  onPress,
  goal,
  difficulty,
  isActive = false,
  progress,
  durationWeeks,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const getDifficultyColor = (diff?: string) => {
    switch (diff) {
      case 'BEGINNER':
        return theme.colors.success;
      case 'INTERMEDIATE':
        return theme.colors.warning;
      case 'ADVANCED':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  const getDifficultyLabel = (diff?: string) => {
    switch (diff) {
      case 'BEGINNER':
        return t('workouts.difficulty.beginner') || 'Beginner';
      case 'INTERMEDIATE':
        return t('workouts.difficulty.intermediate') || 'Intermediate';
      case 'ADVANCED':
        return t('workouts.difficulty.advanced') || 'Advanced';
      default:
        return diff || '';
    }
  };

  const getGoalLabel = (goalText?: string) => {
    if (!goalText) return '';
    const goalLower = goalText.toLowerCase();
    if (goalLower.includes('muscle') || goalLower.includes('strength')) {
      return t('workouts.goal.strength') || 'Strength';
    }
    if (goalLower.includes('weight loss') || goalLower.includes('fat')) {
      return t('workouts.goal.weightLoss') || 'Weight Loss';
    }
    if (goalLower.includes('cardio') || goalLower.includes('endurance')) {
      return t('workouts.goal.cardio') || 'Cardio';
    }
    if (goalLower.includes('flexibility')) {
      return t('workouts.goal.flexibility') || 'Flexibility';
    }
    return goalText;
  };

  const themedStyles = styles(theme);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          themedStyles.container,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
      {/* Row Layout: Image + Content */}
      <View style={themedStyles.rowLayout}>
        {/* Image - Square 120x120 */}
        <View style={themedStyles.imageContainer}>
          {image ? (
            <Image source={{ uri: image }} style={themedStyles.image} />
          ) : (
            <View
              style={[
                themedStyles.imagePlaceholder,
                { backgroundColor: theme.colors.border + '40' },
              ]}
            >
              <Dumbbell size={32} color={theme.colors.textSecondary} />
            </View>
          )}
          {isActive && (
            <View style={themedStyles.activeBadge}>
              <View
                style={[
                  themedStyles.activeIndicator,
                  { backgroundColor: theme.colors.success },
                ]}
              />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={themedStyles.content}>
          {/* Title */}
          <Text
            style={[themedStyles.title, { color: theme.colors.text }]}
            numberOfLines={2}
          >
            {title}
          </Text>

          {/* Meta Info Row */}
          <View style={themedStyles.metaRow}>
            {goal && (
              <View
                style={[
                  themedStyles.goalBadge,
                  { backgroundColor: theme.colors.primary + '15' },
                ]}
              >
                <Target size={12} color={theme.colors.primary} />
                <Text
                  style={[
                    themedStyles.goalBadgeText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {getGoalLabel(goal)}
                </Text>
              </View>
            )}
            {difficulty && (
              <View
                style={[
                  themedStyles.difficultyBadge,
                  { backgroundColor: getDifficultyColor(difficulty) + '20' },
                ]}
              >
                <Text
                  style={[
                    themedStyles.difficultyBadgeText,
                    { color: getDifficultyColor(difficulty) },
                  ]}
                >
                  {getDifficultyLabel(difficulty)}
                </Text>
              </View>
            )}
          </View>

          {/* Details Row */}
          <View style={themedStyles.detailsRow}>
            {durationWeeks && (
              <View style={themedStyles.detailItem}>
                <Calendar size={12} color={theme.colors.textSecondary} />
                <Text
                  style={[
                    themedStyles.detailText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {durationWeeks} {t('workouts.weeks') || 'weeks'}
                </Text>
              </View>
            )}
            <View style={themedStyles.detailItem}>
              <Dumbbell size={12} color={theme.colors.textSecondary} />
              <Text
                style={[
                  themedStyles.detailText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {exercises} {t('workouts.exercises') || 'exercises'}
              </Text>
            </View>
            {duration && (
              <View style={themedStyles.detailItem}>
                <Clock size={12} color={theme.colors.textSecondary} />
                <Text
                  style={[
                    themedStyles.detailText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {duration}
                </Text>
              </View>
            )}
          </View>

          {/* Progress Bar - if progress is provided */}
          {progress !== undefined && progress >= 0 && (
            <View style={themedStyles.progressContainer}>
              <View style={themedStyles.progressBar}>
                <View
                  style={[
                    themedStyles.progressFill,
                    {
                      width: `${Math.min(100, Math.max(0, progress))}%`,
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  themedStyles.progressText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {Math.round(progress)}%
              </Text>
            </View>
          )}

          {/* CTA Button */}
          <TouchableOpacity
            style={[
              themedStyles.ctaButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={onPress}
            activeOpacity={0.8}
          >
            <Text
              style={[
                themedStyles.ctaButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              {isActive
                ? t('workouts.continue') || 'Continue'
                : t('workouts.viewDetails') || 'View Details'}
            </Text>
            <ChevronRight
              size={16}
              color={theme.colors.textInverse}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
};

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      borderRadius: theme.radius.lg, // 12px
      borderWidth: 1,
      marginBottom: theme.spacing.lg,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    rowLayout: {
      flexDirection: 'row',
      padding: theme.spacing.lg, // 16px
      gap: theme.spacing.md, // 12px
    },
    imageContainer: {
      width: 120,
      height: 120,
      borderRadius: theme.radius.md, // 8px
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: theme.colors.border + '40',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imagePlaceholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeBadge: {
      position: 'absolute',
      top: theme.spacing.xs,
      right: theme.spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.textInverse + 'E6',
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      borderRadius: theme.radius.sm,
    },
    activeIndicator: {
      width: 6,
      height: 6,
      borderRadius: theme.radius.round,
    },
    content: {
      flex: 1,
      gap: theme.spacing.sm, // 8px
      justifyContent: 'space-between',
    },
    title: {
      ...Typography.h6,
      fontWeight: '700',
      marginBottom: theme.spacing.xs,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    goalBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.radius.md,
    },
    goalBadgeText: {
      ...Typography.caption,
      fontSize: 11,
      fontWeight: '600',
    },
    difficultyBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.radius.md,
    },
    difficultyBadgeText: {
      ...Typography.caption,
      fontSize: 11,
      fontWeight: '600',
    },
    detailsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    detailText: {
      ...Typography.caption,
      fontSize: 12,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    progressBar: {
      flex: 1,
      height: 4,
      borderRadius: theme.radius.xs,
      backgroundColor: theme.colors.border + '60',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: theme.radius.xs,
    },
    progressText: {
      ...Typography.caption,
      fontSize: 11,
      fontWeight: '600',
      minWidth: 36,
      textAlign: 'right',
    },
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.md, // 14px
      paddingHorizontal: theme.spacing.lg, // 20px
      borderRadius: theme.radius.lg, // 12px
      marginTop: theme.spacing.xs,
      ...theme.shadows.sm,
    },
    ctaButtonText: {
      ...Typography.buttonMedium,
      fontWeight: '600',
    },
  });

export default WorkoutCard;
