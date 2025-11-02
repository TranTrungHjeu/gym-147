import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  onResend?: () => void;
  isLoading?: boolean;
  error?: string;
  resendDelay?: number; // seconds
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  onComplete,
  onResend,
  isLoading = false,
  error,
  resendDelay = 60,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const [resendTimer, setResendTimer] = useState(resendDelay);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleChange = (text: string, index: number) => {
    // Only allow numbers
    if (text && !/^\d+$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete when all digits are entered
    if (
      newOtp.every((digit) => digit !== '') &&
      newOtp.join('').length === length
    ) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (canResend && onResend) {
      setOtp(Array(length).fill(''));
      setResendTimer(resendDelay);
      setCanResend(false);
      onResend();
      inputRefs.current[0]?.focus();
    }
  };

  const themedStyles = StyleSheet.create({
    container: {
      gap: theme.spacing.md,
    },
    inputContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
    input: {
      width: 48,
      height: 56,
      borderWidth: 2,
      borderColor: error ? theme.colors.error : theme.colors.border,
      borderRadius: theme.radius.md,
      textAlign: 'center',
      ...Typography.h2,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
    },
    inputFocused: {
      borderColor: theme.colors.primary,
    },
    inputFilled: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surface,
    },
    errorText: {
      ...Typography.caption,
      color: theme.colors.error,
      textAlign: 'center',
    },
    resendContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    resendText: {
      ...Typography.bodyRegular,
      color: theme.colors.textSecondary,
    },
    resendButton: {
      ...Typography.bodyBold,
      color: canResend ? theme.colors.primary : theme.colors.textTertiary,
    },
  });

  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.inputContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              if (ref) inputRefs.current[index] = ref;
            }}
            style={[themedStyles.input, digit && themedStyles.inputFilled]}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            editable={!isLoading}
          />
        ))}
      </View>

      {error && <Text style={themedStyles.errorText}>{error}</Text>}

      {isLoading && (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      )}

      {onResend && (
        <View style={themedStyles.resendContainer}>
          <Text style={themedStyles.resendText}>
            {t('auth.didntReceiveCode')}
          </Text>
          <TouchableOpacity onPress={handleResend} disabled={!canResend}>
            <Text style={themedStyles.resendButton}>
              {canResend ? t('auth.resend') : `${resendTimer}s`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};


