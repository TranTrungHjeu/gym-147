import { useTheme } from '@/utils/theme';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const ClassCardSkeleton: React.FC = () => {
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
        {/* Header Row */}
        <View style={themedStyles.headerRow}>
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
        </View>

        {/* Description Skeleton */}
        <View style={themedStyles.descriptionSkeleton}>
          <Animated.View
            style={[
              themedStyles.shimmer,
              { opacity: shimmerOpacity },
              { backgroundColor: theme.colors.border },
              themedStyles.descriptionBar,
            ]}
          />
          <Animated.View
            style={[
              themedStyles.shimmer,
              { opacity: shimmerOpacity },
              { backgroundColor: theme.colors.border },
              themedStyles.descriptionBar2,
            ]}
          />
        </View>

        {/* Info Grid Skeleton */}
        <View style={themedStyles.infoGrid}>
          <View style={themedStyles.infoItem}>
            <Animated.View
              style={[
                themedStyles.shimmer,
                { opacity: shimmerOpacity },
                { backgroundColor: theme.colors.border },
                themedStyles.iconSkeleton,
              ]}
            />
            <Animated.View
              style={[
                themedStyles.shimmer,
                { opacity: shimmerOpacity },
                { backgroundColor: theme.colors.border },
                themedStyles.textSkeleton,
              ]}
            />
          </View>
          <View style={themedStyles.infoItem}>
            <Animated.View
              style={[
                themedStyles.shimmer,
                { opacity: shimmerOpacity },
                { backgroundColor: theme.colors.border },
                themedStyles.iconSkeleton,
              ]}
            />
            <Animated.View
              style={[
                themedStyles.shimmer,
                { opacity: shimmerOpacity },
                { backgroundColor: theme.colors.border },
                themedStyles.textSkeleton,
              ]}
            />
          </View>
        </View>

        {/* Button Skeleton */}
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
    imageContainer: {
      width: '100%',
      height: 200,
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
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    titleSkeleton: {
      flex: 1,
      height: 24,
      borderRadius: theme.radius.sm,
      overflow: 'hidden',
    },
    titleBar: {
      width: '70%',
      height: '100%',
    },
    badgeSkeleton: {
      width: 80,
      height: 24,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
    },
    badgeBar: {
      width: '100%',
      height: '100%',
    },
    descriptionSkeleton: {
      gap: theme.spacing.xs,
    },
    descriptionBar: {
      width: '100%',
      height: 16,
      borderRadius: theme.radius.sm,
    },
    descriptionBar2: {
      width: '80%',
      height: 16,
      borderRadius: theme.radius.sm,
    },
    infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flex: 1,
      minWidth: '45%',
    },
    iconSkeleton: {
      width: 16,
      height: 16,
      borderRadius: theme.radius.xs,
    },
    textSkeleton: {
      flex: 1,
      height: 14,
      borderRadius: theme.radius.sm,
      minWidth: 60,
    },
    buttonSkeleton: {
      height: 48,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      marginTop: theme.spacing.xs,
    },
    buttonBar: {
      width: '100%',
      height: '100%',
    },
  });

export default ClassCardSkeleton;

