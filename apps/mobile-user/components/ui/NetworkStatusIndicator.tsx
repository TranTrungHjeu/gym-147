import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Wifi, WifiOff } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { networkManager } from '@/utils/network';

interface NetworkStatusIndicatorProps {
  showWhenConnected?: boolean;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  showWhenConnected = false,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkNetworkStatus();
    const interval = setInterval(checkNetworkStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const checkNetworkStatus = async () => {
    setIsChecking(true);
    const result = await networkManager.checkConnection();
    const wasConnected = isConnected;
    setIsConnected(result.isConnected);

    // Animate in/out based on connection status
    if (!result.isConnected && wasConnected) {
      // Show indicator when disconnected
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (result.isConnected && !wasConnected) {
      // Hide indicator when reconnected
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (showWhenConnected && result.isConnected) {
      // Show briefly when connected (optional)
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2000);
    }

    setIsChecking(false);
  };

  if (isConnected && !showWhenConnected) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isConnected
            ? theme.colors.success + '15'
            : theme.colors.error + '15',
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      {isConnected ? (
        <Wifi size={16} color={theme.colors.success} />
      ) : (
        <WifiOff size={16} color={theme.colors.error} />
      )}
      <Text
        style={[
          styles.text,
          {
            color: isConnected ? theme.colors.success : theme.colors.error,
          },
        ]}
      >
        {isConnected
          ? t('network.connected', { defaultValue: 'Đã kết nối' })
          : t('network.disconnected', { defaultValue: 'Không có kết nối' })}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 1000,
  },
  text: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
});

export default NetworkStatusIndicator;

