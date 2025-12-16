import { OTPInput } from '@/components/OTPInput';
import { userService } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Mail, Phone, Shield, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface EmailPhoneOTPModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userEmail?: string;
  userPhone?: string;
  newEmail?: string;
  newPhone?: string;
  firstName?: string;
  lastName?: string;
}

export default function EmailPhoneOTPModal({
  visible,
  onClose,
  onSuccess,
  userEmail,
  userPhone,
  newEmail,
  newPhone,
  firstName,
  lastName,
}: EmailPhoneOTPModalProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [verificationMethod, setVerificationMethod] = useState<
    'EMAIL' | 'PHONE'
  >('EMAIL');
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSuccessLoading, setOtpSuccessLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Determine what's changing
  const emailChanging = newEmail && newEmail !== userEmail;
  const phoneChanging = newPhone && newPhone !== userPhone;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setCurrentStep(1);
      setVerificationMethod('EMAIL');
      setOtp('');
      setOtpVerified(false);
      setOtpError('');
      setOtpLoading(false);
      setOtpSuccessLoading(false);
      setOtpCooldown(0);
    }
  }, [visible]);

  // Focus OTP input when step changes to 2
  const otpInputRef = React.useRef<any>(null);
  useEffect(() => {
    if (visible && currentStep === 2) {
      // Delay to ensure OTPInput is rendered
      const focusTimeout = setTimeout(() => {
        // Trigger focus on first input of OTPInput
        // This will be handled by OTPInput's autoFocus prop
      }, 500);
      return () => clearTimeout(focusTimeout);
    }
  }, [visible, currentStep]);

  // Cooldown timer effect
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => {
        setOtpCooldown(otpCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  // Set default verification method
  useEffect(() => {
    if (visible && currentStep === 1) {
      if (emailChanging && userEmail) {
        setVerificationMethod('EMAIL');
      } else if (phoneChanging && userPhone) {
        setVerificationMethod('PHONE');
      } else if (userEmail && !userPhone) {
        setVerificationMethod('EMAIL');
      } else if (userPhone && !userEmail) {
        setVerificationMethod('PHONE');
      }
    }
  }, [
    visible,
    currentStep,
    userEmail,
    userPhone,
    emailChanging,
    phoneChanging,
  ]);

  const handleSendOTP = async () => {
    if (otpLoading || otpCooldown > 0) {
      return;
    }

    if (!verificationMethod) {
      return;
    }

    if (verificationMethod === 'EMAIL' && !userEmail) {
      Alert.alert(t('common.error'), 'Email hiện tại không tồn tại');
      return;
    }

    if (verificationMethod === 'PHONE' && !userPhone) {
      Alert.alert(t('common.error'), 'Số điện thoại hiện tại không tồn tại');
      return;
    }

    try {
      setOtpLoading(true);
      setOtpError('');
      const response = await userService.sendOTPForEmailPhoneChange(
        verificationMethod,
        newEmail,
        newPhone
      );

      if (response.success) {
        setCurrentStep(2);
        const retryAfter = response.data?.retryAfter || 60;
        setOtpCooldown(retryAfter);
      } else {
        setOtpError(response.message || 'Không thể gửi OTP');
        if (response.data?.retryAfter) {
          setOtpCooldown(response.data.retryAfter);
        }
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Không thể gửi OTP';
      setOtpError(errorMessage);
      if (
        error.response?.status === 429 &&
        error.response?.data?.data?.retryAfter
      ) {
        setOtpCooldown(error.response.data.data.retryAfter);
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async (otpValue: string) => {
    try {
      setOtpSuccessLoading(true);
      setOtpError('');
      setOtp(otpValue);

      const response = await userService.updateEmailPhoneWithOTP({
        verificationMethod,
        otp: otpValue,
        newEmail,
        newPhone,
        firstName,
        lastName,
      });

      if (response.success) {
        setOtpVerified(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 500);
      } else {
        setOtpError(response.message || 'Mã OTP không đúng');
        setOtpVerified(false);
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Mã OTP không đúng';
      setOtpError(errorMessage);
      setOtpVerified(false);
    } finally {
      setOtpSuccessLoading(false);
    }
  };

  const handleResendOTP = async () => {
    await handleSendOTP();
  };

  if (!visible) return null;

  const identifier =
    verificationMethod === 'EMAIL' ? userEmail || '' : userPhone || '';

  const maskedIdentifier =
    verificationMethod === 'EMAIL'
      ? identifier.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      : identifier.replace(/(\d{2})(\d+)(\d{2})/, '$1***$3');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.background },
            ]}
          >
            {/* Header */}
            <View
              style={[
                styles.header,
                { borderBottomColor: theme.colors.border },
              ]}
            >
              <View style={styles.headerLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: theme.colors.primary + '15' },
                  ]}
                >
                  <Shield size={24} color={theme.colors.primary} />
                </View>
                <Text
                  style={[styles.headerTitle, { color: theme.colors.text }]}
                >
                  {currentStep === 1 ? 'Xác thực danh tính' : 'Nhập mã OTP'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.content}>
                {currentStep === 1 ? (
                  <>
                    <Text
                      style={[
                        styles.description,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Để thay đổi {emailChanging ? 'email' : 'số điện thoại'},
                      bạn cần xác thực qua{' '}
                      {verificationMethod === 'EMAIL'
                        ? 'email'
                        : 'số điện thoại'}{' '}
                      hiện tại.
                    </Text>

                    {/* Verification Method Selection */}
                    {(emailChanging && phoneChanging) ||
                    (userEmail && userPhone) ? (
                      <View style={styles.methodContainer}>
                        <TouchableOpacity
                          style={[
                            styles.methodOption,
                            {
                              backgroundColor:
                                verificationMethod === 'EMAIL'
                                  ? theme.colors.primary
                                  : theme.colors.surface,
                              borderColor:
                                verificationMethod === 'EMAIL'
                                  ? theme.colors.primary
                                  : theme.colors.border,
                            },
                          ]}
                          onPress={() => setVerificationMethod('EMAIL')}
                          disabled={!userEmail}
                        >
                          <Mail
                            size={20}
                            color={
                              verificationMethod === 'EMAIL'
                                ? theme.colors.textInverse
                                : theme.colors.textSecondary
                            }
                          />
                          <Text
                            style={[
                              styles.methodText,
                              {
                                color:
                                  verificationMethod === 'EMAIL'
                                    ? theme.colors.textInverse
                                    : theme.colors.text,
                              },
                            ]}
                          >
                            Email
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.methodOption,
                            {
                              backgroundColor:
                                verificationMethod === 'PHONE'
                                  ? theme.colors.primary
                                  : theme.colors.surface,
                              borderColor:
                                verificationMethod === 'PHONE'
                                  ? theme.colors.primary
                                  : theme.colors.border,
                            },
                          ]}
                          onPress={() => setVerificationMethod('PHONE')}
                          disabled={!userPhone}
                        >
                          <Phone
                            size={20}
                            color={
                              verificationMethod === 'PHONE'
                                ? theme.colors.textInverse
                                : theme.colors.textSecondary
                            }
                          />
                          <Text
                            style={[
                              styles.methodText,
                              {
                                color:
                                  verificationMethod === 'PHONE'
                                    ? theme.colors.textInverse
                                    : theme.colors.text,
                              },
                            ]}
                          >
                            Số điện thoại
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}

                    {/* Send OTP Button */}
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        {
                          backgroundColor:
                            otpLoading || otpCooldown > 0
                              ? theme.colors.surface
                              : theme.colors.primary,
                        },
                      ]}
                      onPress={handleSendOTP}
                      disabled={otpLoading || otpCooldown > 0}
                    >
                      {otpLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.textInverse}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.sendButtonText,
                            {
                              color:
                                otpLoading || otpCooldown > 0
                                  ? theme.colors.textSecondary
                                  : theme.colors.textInverse,
                            },
                          ]}
                        >
                          {otpCooldown > 0
                            ? `Gửi lại sau ${otpCooldown}s`
                            : 'Gửi mã OTP'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {otpError && (
                      <Text
                        style={[
                          styles.errorText,
                          { color: theme.colors.error },
                        ]}
                      >
                        {otpError}
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text
                      style={[
                        styles.description,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Mã OTP đã được gửi đến{' '}
                      {verificationMethod === 'EMAIL'
                        ? 'email'
                        : 'số điện thoại'}{' '}
                      <Text style={{ fontWeight: '600' }}>
                        {maskedIdentifier}
                      </Text>
                    </Text>

                    <OTPInput
                      key={`otp-input-${currentStep}`}
                      length={6}
                      onComplete={handleVerifyOTP}
                      onResend={handleResendOTP}
                      isLoading={otpSuccessLoading}
                      error={otpError}
                      resendDelay={otpCooldown}
                      autoFocus={true}
                      disabled={otpSuccessLoading || otpVerified}
                    />

                    {otpError && (
                      <Text
                        style={[
                          styles.errorText,
                          { color: theme.colors.error },
                        ]}
                      >
                        {otpError}
                      </Text>
                    )}

                    {otpVerified && (
                      <Text
                        style={[
                          styles.successText,
                          { color: theme.colors.success },
                        ]}
                      >
                        Xác thực thành công!
                      </Text>
                    )}

                    <TouchableOpacity
                      style={styles.resendButton}
                      onPress={handleResendOTP}
                      disabled={otpCooldown > 0 || otpSuccessLoading}
                    >
                      <Text
                        style={[
                          styles.resendText,
                          {
                            color:
                              otpCooldown > 0
                                ? theme.colors.textSecondary
                                : theme.colors.primary,
                          },
                        ]}
                      >
                        {otpCooldown > 0
                          ? `Gửi lại sau ${otpCooldown}s`
                          : 'Gửi lại mã OTP'}
                      </Text>
                    </TouchableOpacity>

                    {otpSuccessLoading && (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.primary}
                        />
                        <Text
                          style={[
                            styles.loadingText,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          Đang xác thực...
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardAvoidingView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 400,
    maxHeight: '100%',
  },
  scrollView: {
    maxHeight: 500,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  description: {
    ...Typography.bodyMedium,
    marginBottom: 24,
    lineHeight: 22,
  },
  methodContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  methodOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  methodText: {
    ...Typography.bodyMedium,
    fontWeight: '500',
  },
  sendButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sendButtonText: {
    ...Typography.buttonLarge,
  },
  errorText: {
    ...Typography.bodySmall,
    marginTop: 8,
    textAlign: 'center',
  },
  successText: {
    ...Typography.bodyMedium,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  resendText: {
    ...Typography.bodyMedium,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  loadingText: {
    ...Typography.bodySmall,
  },
});
