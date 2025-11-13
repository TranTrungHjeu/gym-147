import { useTheme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
  label?: string;
  placeholder?: string;
}

export const DatePicker: React.FC<DatePickerProps> = React.memo(({
  value,
  onChange,
  minimumDate,
  maximumDate,
  mode = 'date',
  label,
  placeholder,
}) => {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;
  const dateScaleAnim = useRef(new Animated.Value(1)).current;
  const dateOpacityAnim = useRef(new Animated.Value(1)).current;

  const currentDate = useMemo(() => value || new Date(), [value]);
  const themedStyles = useMemo(() => styles(theme), [theme]);

  // Animate modal when opening/closing
  useEffect(() => {
    if (isVisible) {
      // Reset animation values
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      overlayOpacityAnim.setValue(0);
      translateYAnim.setValue(20);

      // Opening animation - smooth and professional
      Animated.parallel([
        // Overlay fade in
        Animated.timing(overlayOpacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        // Modal scale and fade in with spring
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 65,
            friction: 8,
          }),
          Animated.spring(translateYAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 8,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      // Closing animation - quick and smooth
      Animated.parallel([
        Animated.timing(overlayOpacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: 10,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [isVisible, scaleAnim, opacityAnim, overlayOpacityAnim, translateYAnim]);

  // Track previous date to only animate on actual change
  const prevDateRef = useRef(tempDate);
  const isFirstMountRef = useRef(true);

  // Reset animation values when modal opens for the first time
  useEffect(() => {
    if (isVisible) {
      if (isFirstMountRef.current) {
        dateScaleAnim.setValue(1);
        dateOpacityAnim.setValue(1);
        prevDateRef.current = tempDate;
        isFirstMountRef.current = false;
      }
    } else {
      isFirstMountRef.current = true;
    }
  }, [isVisible, tempDate, dateScaleAnim, dateOpacityAnim]);

  // Animate date display when date changes (not on initial mount)
  useEffect(() => {
    if (isVisible && !isFirstMountRef.current && prevDateRef.current.getTime() !== tempDate.getTime()) {
      dateScaleAnim.setValue(0.92);
      dateOpacityAnim.setValue(0.6);
      Animated.parallel([
        Animated.spring(dateScaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 280,
          friction: 22,
        }),
        Animated.timing(dateOpacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      prevDateRef.current = tempDate;
    }
  }, [tempDate, isVisible, dateScaleAnim, dateOpacityAnim]);

  const formatDate = useCallback((date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  const handleOpen = useCallback(() => {
    setTempDate(currentDate);
    setIsVisible(true);
  }, [currentDate]);

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setIsVisible(false);
      if (event.type === 'set' && selectedDate) {
        onChange(selectedDate);
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  }, [onChange]);

  const handleConfirm = useCallback(() => {
    onChange(tempDate);
    setIsVisible(false);
  }, [tempDate, onChange]);

  const handleCancel = useCallback(() => {
    setIsVisible(false);
    setTempDate(currentDate);
  }, [currentDate]);

  // Android: Use native picker directly
  if (Platform.OS === 'android') {
    return (
      <>
        <TouchableOpacity
          style={themedStyles.button}
          onPress={handleOpen}
          activeOpacity={0.7}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={theme.colors.primary}
            style={themedStyles.icon}
          />
          <Text style={themedStyles.buttonText}>
            {currentDate ? formatDate(currentDate) : (placeholder || 'Chọn ngày')}
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={theme.colors.textTertiary}
          />
        </TouchableOpacity>

        {isVisible && (
          <DateTimePicker
            value={currentDate}
            mode={mode}
            display="default"
            onChange={handleDateChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        )}
      </>
    );
  }

  // iOS: Use modal with picker
  return (
    <>
      <TouchableOpacity
        style={themedStyles.button}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <Ionicons
          name="calendar-outline"
          size={20}
          color={theme.colors.primary}
          style={themedStyles.icon}
        />
        <Text style={themedStyles.buttonText}>
          {currentDate ? formatDate(currentDate) : (placeholder || 'Chọn ngày')}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color={theme.colors.textTertiary}
        />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="none"
        onRequestClose={handleCancel}
      >
        <Animated.View
          style={[
            themedStyles.modalOverlay,
            {
              opacity: overlayOpacityAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleCancel}
          />
          <Animated.View
            style={[
              themedStyles.modalContent,
              {
                transform: [
                  { scale: scaleAnim },
                  { translateY: translateYAnim },
                ],
                opacity: opacityAnim,
              },
            ]}
          >
            {/* Header */}
            <View style={themedStyles.modalHeader}>
              <Text style={themedStyles.modalTitle}>Chọn ngày sinh</Text>
              <TouchableOpacity
                onPress={handleCancel}
                style={themedStyles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Date Display - In header area */}
            <View style={themedStyles.dateDisplayContainer}>
              <Animated.View
                style={[
                  themedStyles.dateDisplayWrapper,
                  {
                    transform: [{ scale: dateScaleAnim }],
                    opacity: dateOpacityAnim,
                  },
                ]}
              >
                <Text style={themedStyles.dateDisplayText} numberOfLines={1}>
                  {formatDate(tempDate)}
                </Text>
              </Animated.View>
            </View>

            {/* Main Content Area - Picker in Center */}
            <View style={themedStyles.modalBody}>
              {/* Picker - Centered in modal */}
              <View style={themedStyles.pickerContainer}>
                <DateTimePicker
                  value={tempDate}
                  mode={mode}
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  textColor={theme.colors.text}
                  style={themedStyles.picker}
                  locale="vi_VN"
                />
              </View>
            </View>

            {/* Footer Buttons */}
            <View style={themedStyles.modalFooter}>
              <TouchableOpacity
                style={themedStyles.cancelButton}
                onPress={handleCancel}
              >
                <Text style={themedStyles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={themedStyles.confirmButton}
                onPress={handleConfirm}
              >
                <Text style={themedStyles.confirmButtonText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
});

const styles = (theme: any) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      minHeight: 48,
    },
    icon: {
      marginRight: theme.spacing.sm,
    },
    buttonText: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text,
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.radius.xl,
      width: '85%',
      maxWidth: 360,
      minHeight: 500,
      maxHeight: '70%',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 10,
      overflow: 'hidden',
      flexDirection: 'column',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      minHeight: 56,
    },
    modalTitle: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 18,
      lineHeight: 24,
      color: theme.colors.text,
    },
    closeButton: {
      padding: theme.spacing.xs,
      marginRight: -theme.spacing.xs,
    },
    dateDisplayContainer: {
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      minHeight: 88,
    },
    dateDisplayWrapper: {
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    dateDisplayText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 34,
      lineHeight: 42,
      color: theme.colors.primary,
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    modalBody: {
      flex: 1,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 260,
      paddingVertical: theme.spacing.sm,
    },
    pickerContainer: {
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
    },
    picker: {
      width: '100%',
      height: 240,
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
      gap: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      minHeight: 72,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    cancelButtonText: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.text,
    },
    confirmButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    confirmButtonText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.textInverse,
    },
  });

export default DatePicker;
