import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { FontFamily } from '@/utils/typography';

interface CircularProgressProps {
  size: number;
  strokeWidth?: number;
  progress: number;
  backgroundColor?: string;
  progressColor?: string;
  showPercentage?: boolean;
  textStyle?: object;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  size,
  strokeWidth = 8,
  progress,
  backgroundColor = '#E2E8F0',
  progressColor = '#3B82F6',
  showPercentage = true,
  textStyle,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressValue = Math.min(Math.max(progress, 0), 100);
  const strokeDashoffset =
    circumference - (progressValue / 100) * circumference;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle
          stroke={backgroundColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={progressColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      {showPercentage && (
        <View style={styles.textContainer}>
          <Text style={[styles.progressText, textStyle]}>
            {Math.round(progressValue)}%
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontFamily: FontFamily.spaceGroteskBold,
    fontSize: 16,
    color: '#1F2937',
  },
});

export default CircularProgress;
