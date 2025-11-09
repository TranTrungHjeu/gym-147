import { Typography } from '@/utils/typography';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/utils/theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  visible: boolean;
  type: ToastType;
  message: string;
  onClose: () => void;
  duration?: number; // Auto close duration in ms
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  type,
  message,
  onClose,
  duration = 3000,
}) => {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in animation
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

      // Auto close after duration
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={24} color={theme.colors.success} />;
      case 'error':
        return <XCircle size={24} color={theme.colors.error} />;
      case 'warning':
        return <AlertCircle size={24} color={theme.colors.warning} />;
      case 'info':
        return <Info size={24} color={theme.colors.info} />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.success + '10';
      case 'error':
        return theme.colors.error + '10';
      case 'warning':
        return theme.colors.warning + '10';
      case 'info':
        return theme.colors.info + '10';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.success + '30';
      case 'error':
        return theme.colors.error + '30';
      case 'warning':
        return theme.colors.warning + '30';
      case 'info':
        return theme.colors.info + '30';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.toast,
            {
              backgroundColor: getBackgroundColor(),
              borderColor: getBorderColor(),
              transform: [{ translateY: slideAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.content}
            onPress={handleClose}
            activeOpacity={0.9}
          >
            <View style={styles.iconContainer}>{getIcon()}</View>
            <Text style={[styles.message, { color: theme.colors.text }]} numberOfLines={2}>
              {message}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Toast context to manage global toasts
export const ToastManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10000,
    pointerEvents: 'box-none',
  },
  toast: {
    minWidth: '80%',
    maxWidth: '90%',
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 24,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  message: {
    ...Typography.bodyMedium,
    flex: 1,
    lineHeight: 20,
  },
});

