import { useTheme } from '@/utils/theme';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const WorkoutCardSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const themedStyles = styles(theme);

  return (
    <View style={themedStyles.container}>
      {/* Row Layout: Image + Content */}
      <View style={themedStyles.rowLayout}>
        {/* Image Skeleton */}
        <View style={themedStyles.imageContainer}>
          <Animated.View
            style={[
              themedStyles.shimmer,
              { opacity: shimmerOpacity },
              { backgroundColor: theme.colors.border },
            ]}
          />
        </View>

        {/* Content Skeleton */}
        <View style={themedStyles.content}>
          {/* Title Skeleton */}
          <View style={themedStyles.titleSkeleton}>
            <Animated.View
              style={[
                themedStyles.shimmer,
                { opacity: shimmerOpacity },
                { backgroundColor: theme.colors.border },
                themedStyles.titleBar,
              ]}
            />
          </View>

          {/* Meta Info Row */}
          <View style={themedStyles.metaRow}>
            <View style={themedStyles.badgeSkeleton}>
              <Animated.View
                style={[
                  themedStyles.shimmer,
                  { opacity: shimmerOpacity },
                  { backgroundColor: theme.colors.border },
                  themedStyles.badgeBar,
                ]}
              />
            </View>
            <View style={themedStyles.metaItem}>
              <Animated.View
                style={[
                  themedStyles.shimmer,
                  { opacity: shimmerOpacity },
                  { backgroundColor: theme.colors.border },
                  themedStyles.metaBar,
                ]}
              />
            </View>
          </View>

          {/* Progress Bar Skeleton */}
          <View style={themedStyles.progressContainer}>
            <Animated.View
              style={[
                themedStyles.shimmer,
                { opacity: shimmerOpacity },
                { backgroundColor: theme.colors.border },
                themedStyles.progressBar,
              ]}
            />
          </View>

          {/* CTA Button Skeleton */}
          <View style={themedStyles.buttonSkeleton}>
            <Animated.View
              style={[
                themedStyles.shimmer,
                { opacity: shimmerOpacity },
                { backgroundColor: theme.colors.border },
                themedStyles.buttonBar,
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      marginBottom: theme.spacing.lg,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    rowLayout: {
      flexDirection: 'row',
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    imageContainer: {
      width: 120,
      height: 120,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.border + '40',
      position: 'relative',
      overflow: 'hidden',
    },
    shimmer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    content: {
      flex: 1,
      gap: theme.spacing.sm,
      justifyContent: 'space-between',
    },
    titleSkeleton: {
      height: 20,
      borderRadius: theme.radius.sm,
      overflow: 'hidden',
    },
    titleBar: {
      width: '80%',
      height: '100%',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    badgeSkeleton: {
      width: 60,
      height: 20,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
    },
    badgeBar: {
      width: '100%',
      height: '100%',
    },
    metaItem: {
      width: 80,
      height: 16,
      borderRadius: theme.radius.sm,
      overflow: 'hidden',
    },
    metaBar: {
      width: '100%',
      height: '100%',
    },
    progressContainer: {
      height: 4,
      borderRadius: theme.radius.xs,
      backgroundColor: theme.colors.border + '40',
      overflow: 'hidden',
    },
    progressBar: {
      width: '60%',
      height: '100%',
    },
    buttonSkeleton: {
      height: 36,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      marginTop: theme.spacing.xs,
    },
    buttonBar: {
      width: '100%',
      height: '100%',
    },
  });

export default WorkoutCardSkeleton;

