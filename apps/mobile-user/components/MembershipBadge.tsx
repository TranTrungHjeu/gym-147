import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

// Import SVG files as components
import BasicSvg from '@/assets/tier-memberships/basic.svg';
import PremiumSvg from '@/assets/tier-memberships/premium.svg';
import StudentSvg from '@/assets/tier-memberships/student.svg';
import VipSvg from '@/assets/tier-memberships/vip.svg';

interface MembershipBadgeProps {
  tier: 'BASIC' | 'PREMIUM' | 'VIP' | 'STUDENT';
  size?: 'small' | 'medium' | 'large';
}

export const MembershipBadge: React.FC<MembershipBadgeProps> = ({
  tier,
  size = 'medium',
}) => {
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sparkleAnim2 = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const tierConfig = {
    VIP: {
      SvgIcon: VipSvg,
      hasEffect: true,
      glowColor: '#FFD700',
    },
    PREMIUM: {
      SvgIcon: PremiumSvg,
      hasEffect: true,
      glowColor: '#C0C0C0',
    },
    STUDENT: {
      SvgIcon: StudentSvg,
      hasEffect: false,
      glowColor: '#000000',
    },
    BASIC: {
      SvgIcon: BasicSvg,
      hasEffect: false,
      glowColor: '#000000',
    },
  };

  const sizeMap = {
    small: 32,
    medium: 44,
    large: 56,
  };

  const config = tierConfig[tier];
  const iconSize = sizeMap[size];

  useEffect(() => {
    if (config.hasEffect) {
      // Sparkle rotation animation
      Animated.loop(
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();

      // Second sparkle rotation (opposite direction)
      Animated.loop(
        Animated.timing(sparkleAnim2, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        })
      ).start();

      // Shimmer effect
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [config.hasEffect]);

  const sparkleRotation = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sparkleRotation2 = sparkleAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const sparkleOpacity = sparkleAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0.2, 1, 0.3, 1, 0.2],
  });

  const sparkleOpacity2 = sparkleAnim2.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0.8, 0.2, 1, 0.2, 0.8],
  });

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.1, 0.6, 0.1],
  });

  if (!config.hasEffect) {
    return (
      <View style={styles.container}>
        {React.createElement(config.SvgIcon, {
          width: iconSize,
          height: iconSize,
        })}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.outerGlow,
          {
            width: iconSize + 24,
            height: iconSize + 24,
            opacity: shimmerOpacity,
            borderColor: config.glowColor,
          },
        ]}
      />

      {/* Animated glow effect */}
      <Animated.View
        style={[
          styles.glowContainer,
          {
            width: iconSize + 12,
            height: iconSize + 12,
            opacity: sparkleOpacity,
            transform: [{ rotate: sparkleRotation }],
          },
        ]}
      >
        <View
          style={[
            styles.glow,
            {
              backgroundColor: config.glowColor,
              shadowColor: config.glowColor,
            },
          ]}
        />
      </Animated.View>

      {/* Main icon with pulse */}
      <Animated.View
        style={{
          transform: [{ scale: pulseAnim }],
        }}
      >
        {React.createElement(config.SvgIcon, {
          width: iconSize,
          height: iconSize,
        })}
      </Animated.View>

      {/* First set of sparkle stars */}
      <Animated.View
        style={[
          styles.sparkleContainer,
          {
            width: iconSize + 16,
            height: iconSize + 16,
            opacity: sparkleOpacity,
            transform: [{ rotate: sparkleRotation }],
          },
        ]}
      >
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.sparkle,
              {
                backgroundColor: config.glowColor,
                width: 5,
                height: 5,
                borderRadius: 2.5,
                top: index === 0 || index === 2 ? 0 : undefined,
                bottom: index === 1 || index === 3 ? 0 : undefined,
                left: index === 0 || index === 1 ? 0 : undefined,
                right: index === 2 || index === 3 ? 0 : undefined,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Second set of sparkle stars (offset) */}
      <Animated.View
        style={[
          styles.sparkleContainer,
          {
            width: iconSize + 20,
            height: iconSize + 20,
            opacity: sparkleOpacity2,
            transform: [{ rotate: sparkleRotation2 }],
          },
        ]}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
          <View
            key={`sparkle2-${index}`}
            style={[
              styles.sparkle,
              {
                backgroundColor: config.glowColor,
                width: 3,
                height: 3,
                borderRadius: 1.5,
                top:
                  index === 0
                    ? 0
                    : index === 4
                    ? undefined
                    : index < 4
                    ? '15%'
                    : '85%',
                bottom: index === 4 ? 0 : undefined,
                left:
                  index === 2
                    ? 0
                    : index < 2 || index === 7
                    ? '15%'
                    : index === 6
                    ? undefined
                    : '85%',
                right: index === 6 ? 0 : undefined,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Floating sparkles */}
      <Animated.View
        style={[
          styles.floatingSparkle,
          {
            top: -8,
            right: -8,
            opacity: sparkleOpacity,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.sparkle,
            {
              backgroundColor: config.glowColor,
              width: 6,
              height: 6,
              borderRadius: 3,
            },
          ]}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.floatingSparkle,
          {
            bottom: -6,
            left: -6,
            opacity: sparkleOpacity2,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.sparkle,
            {
              backgroundColor: config.glowColor,
              width: 5,
              height: 5,
              borderRadius: 2.5,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  outerGlow: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    opacity: 0.3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 6,
  },
  sparkleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingSparkle: {
    position: 'absolute',
  },
});
