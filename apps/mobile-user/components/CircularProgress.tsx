import { useTheme } from '@/utils/theme';
import { FontFamily } from '@/utils/typography';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

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
  backgroundColor,
  progressColor,
  showPercentage = true,
  textStyle,
}) => {
  const { theme } = useTheme();
  const bgColor = backgroundColor || theme.colors.border;
  const fgColor = progressColor || theme.colors.primary;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressValue = Math.min(Math.max(progress, 0), 100);
  const strokeDashoffset =
    circumference - (progressValue / 100) * circumference;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle
          stroke={bgColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={fgColor}
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
          <Text
            style={[
              styles.progressText,
              { color: theme.colors.text },
              textStyle,
            ]}
          >
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
  },
});

export default CircularProgress;
