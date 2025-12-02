import { useTheme } from '@/utils/theme';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: 'rect' | 'circle';
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
  variant = 'rect',
}) => {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const finalBorderRadius = variant === 'circle' ? height / 2 : borderRadius;

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: finalBorderRadius,
          backgroundColor: theme.colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
};

interface SkeletonTextProps {
  lines?: number;
  width?: number | string;
  lastLineWidth?: number | string;
  style?: ViewStyle;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 1,
  width = '100%',
  lastLineWidth = '60%',
  style,
}) => {
  return (
    <View style={[styles.textContainer, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLoader
          key={index}
          width={index === lines - 1 ? lastLineWidth : width}
          height={16}
          style={index < lines - 1 ? styles.textLine : undefined}
        />
      ))}
    </View>
  );
};

interface SkeletonCardProps {
  style?: ViewStyle;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ style }) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          padding: 16,
        },
        style,
      ]}
    >
      <SkeletonLoader width={60} height={60} variant="circle" style={styles.avatar} />
      <View style={styles.cardContent}>
        <SkeletonText lines={2} width="80%" />
        <SkeletonLoader width="40%" height={12} style={styles.cardMeta} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  textContainer: {
    gap: 8,
  },
  textLine: {
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardMeta: {
    marginTop: 8,
  },
});

export default SkeletonLoader;

