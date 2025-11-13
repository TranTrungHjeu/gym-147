import { useTheme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';

interface NumberPickerProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export const NumberPicker: React.FC<NumberPickerProps> = React.memo(({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = '',
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const animateValueChange = useCallback(() => {
    // Cancel any ongoing animations
    scaleAnim.stopAnimation();
    opacityAnim.stopAnimation();

    // Reset animations to start position
    scaleAnim.setValue(0.88);
    opacityAnim.setValue(0.7);

    // Animate to full scale and opacity with smoother spring effect
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 280,
        friction: 22,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const handleIncrement = useCallback(() => {
    const newValue = Math.min(value + step, max);
    if (newValue !== value) {
      animateValueChange();
      onValueChange(newValue);
    }
  }, [value, step, max, animateValueChange, onValueChange]);

  const handleDecrement = useCallback(() => {
    const newValue = Math.max(value - step, min);
    if (newValue !== value) {
      animateValueChange();
      onValueChange(newValue);
    }
  }, [value, step, min, animateValueChange, onValueChange]);

  const themedStyles = useMemo(() => styles(theme), [theme]);
  
  const isMax = useMemo(() => value >= max, [value, max]);
  const isMin = useMemo(() => value <= min, [value, min]);

  const buttonUpColor = useMemo(
    () => (isMax ? theme.colors.textTertiary : theme.colors.primary),
    [isMax, theme.colors.textTertiary, theme.colors.primary]
  );
  
  const buttonDownColor = useMemo(
    () => (isMin ? theme.colors.textTertiary : theme.colors.primary),
    [isMin, theme.colors.textTertiary, theme.colors.primary]
  );

  return (
    <View style={themedStyles.container}>
      <TouchableOpacity
        style={themedStyles.button}
        onPress={handleIncrement}
        disabled={isMax}
        activeOpacity={0.7}
      >
        <Ionicons
          name="chevron-up"
          size={16}
          color={buttonUpColor}
        />
      </TouchableOpacity>

      <Animated.View
        style={[
          themedStyles.valueContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Text style={themedStyles.valueText}>
          {value}
          {suffix}
        </Text>
      </Animated.View>

      <TouchableOpacity
        style={themedStyles.button}
        onPress={handleDecrement}
        disabled={isMin}
        activeOpacity={0.7}
      >
        <Ionicons
          name="chevron-down"
          size={16}
          color={buttonDownColor}
        />
      </TouchableOpacity>
    </View>
  );
});

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 50, // Fixed width to contain all elements
      paddingVertical: 2,
    },
    button: {
      width: 20,
      height: 18,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 1,
    },
    valueContainer: {
      width: 50, // Fixed width to prevent layout shift when number changes
      height: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 1,
    },
    valueText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 20,
      lineHeight: 24,
      color: theme.colors.primary,
      textAlign: 'center',
      width: 50, // Fixed width to prevent text width change
    },
  });

export default NumberPicker;

