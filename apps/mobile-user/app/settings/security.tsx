import { AlertModal } from '@/components/ui/AlertModal';
import { Button } from '@/components/ui/Button';
import { SkeletonLoader, SkeletonCard } from '@/components/ui/SkeletonLoader';
import { useToast } from '@/hooks/useToast';
import { useAnalyticsActions } from '@/hooks/useAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services';
import { userService } from '@/services/identity/user.service';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Key,
  Monitor,
  Shield,
  Smartphone,
  User,
  RefreshCw,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

type SecurityTab = 'password' | '2fa' | 'face' | 'sessions';

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { showSuccess, showError, ToastComponent } = useToast();
  const analytics = useAnalyticsActions();

  const [activeTab, setActiveTab] = useState<SecurityTab>('password');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQR, setTwoFactorQR] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSetupMode, setIsSetupMode] = useState(false); // Track if user is in setup mode

  // Sessions state
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Face encoding state
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [loadingFaceStatus, setLoadingFaceStatus] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalData, setErrorModalData] = useState<{
    title: string;
    message: string;
    suggestion?: string;
  } | null>(null);

  useEffect(() => {
    loadSecurityData();
    getCurrentSessionId();
    loadFaceEncodingStatus();
  }, []);

  const loadFaceEncodingStatus = async (showRetry = false) => {
    try {
      setLoadingFaceStatus(true);
      setFaceError(null);
      analytics.trackFeatureUsage('load_face_encoding_status');

      const response = await userService.getFaceEncodingStatus();
      if (response.success && response.data) {
        setFaceEnrolled(
          response.data.enrolled || response.data.hasFaceEncoding
        );
        if (showRetry) {
          showSuccess(
            t('faceLogin.statusUpdated', {
              defaultValue: 'Trạng thái đã được cập nhật',
            })
          );
        }
      } else {
        const errorMessage =
          response.message ||
          t('faceLogin.loadStatusError', {
            defaultValue: 'Không thể tải trạng thái đăng ký khuôn mặt',
          });
        setFaceError(errorMessage);
        setFaceEnrolled(false);

        if (showRetry) {
          analytics.trackError('load_face_status_failed', errorMessage);
          setErrorModalData({
            title: t('common.error', { defaultValue: 'Lỗi' }),
            message: errorMessage,
            suggestion: t('faceLogin.retrySuggestion', {
              defaultValue: 'Vui lòng thử lại hoặc kiểm tra kết nối mạng',
            }),
          });
          setErrorModalVisible(true);
        } else {
          showError(errorMessage);
        }
      }
    } catch (error: any) {
      const errorMessage =
        error.message ||
        t('faceLogin.loadStatusError', {
          defaultValue: 'Không thể tải trạng thái đăng ký khuôn mặt',
        });
      setFaceError(errorMessage);
      setFaceEnrolled(false);
      analytics.trackError('load_face_status_exception', errorMessage);

      if (showRetry) {
        setErrorModalData({
          title: t('common.error', { defaultValue: 'Lỗi' }),
          message: errorMessage,
          suggestion: t('faceLogin.retrySuggestion', {
            defaultValue: 'Vui lòng thử lại hoặc kiểm tra kết nối mạng',
          }),
        });
        setErrorModalVisible(true);
      } else {
        showError(errorMessage);
      }
    } finally {
      setLoadingFaceStatus(false);
    }
  };

  const getCurrentSessionId = async () => {
    try {
      const token = await authService.getStoredToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setCurrentSessionId(payload.sessionId || null);
        } catch (e) {
          console.error('Error decoding token:', e);
        }
      }
    } catch (error) {
      console.error('Error getting current session ID:', error);
    }
  };

  const loadSecurityData = async () => {
    try {
      setLoading(true);

      // Load 2FA status
      const twoFactorResponse = await authService.get2FAStatus();
      if (twoFactorResponse.success && twoFactorResponse.data) {
        setTwoFactorEnabled(twoFactorResponse.data.enabled);
        if (twoFactorResponse.data.secret && !twoFactorResponse.data.enabled) {
          setTwoFactorSecret(twoFactorResponse.data.secret);
          setTwoFactorQR(twoFactorResponse.data.qrCodeUrl || '');
        }
      } else {
        setTwoFactorEnabled(false);
      }

      // Load active sessions
      const sessionsResponse = await authService.getActiveSessions();
      if (sessionsResponse.success && sessionsResponse.data?.devices) {
        setActiveSessions(sessionsResponse.data.devices);
      } else {
        setActiveSessions([]);
      }
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSecurityData(), loadFaceEncodingStatus()]);
    setRefreshing(false);
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert(
        t('common.error'),
        t('security.password.fillAllFields', {
          defaultValue: 'Vui lòng điền đầy đủ các trường',
        })
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        t('common.error'),
        t('security.password.passwordsNotMatch', {
          defaultValue: 'Mật khẩu mới không khớp',
        })
      );
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(
        t('common.error'),
        t('security.password.passwordTooShort', {
          defaultValue: 'Mật khẩu phải có ít nhất 8 ký tự',
        })
      );
      return;
    }

    setLoading(true);
    try {
      const response = await authService.changePassword(
        oldPassword,
        newPassword
      );

      if (response.success) {
        Alert.alert(
          t('common.success'),
          t('security.password.changeSuccess', {
            defaultValue: 'Đổi mật khẩu thành công',
          })
        );
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert(
          t('common.error'),
          response.error ||
            t('security.password.changeError', {
              defaultValue: 'Không thể đổi mật khẩu',
            })
        );
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      Alert.alert(
        t('common.error'),
        error.message ||
          t('security.password.changeError', {
            defaultValue: 'Không thể đổi mật khẩu',
          })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    // Don't allow enabling if already enabled
    if (twoFactorEnabled) {
      return;
    }

    setLoading(true);
    try {
      const response = await authService.enable2FA();

      if (response.success && response.data) {
        console.log('[2FA] Enable 2FA response:', response.data);
        setTwoFactorSecret(response.data.secret || response.data.manualEntryKey || '');
        setTwoFactorQR(response.data.qrCodeUrl || '');
        setIsSetupMode(true);
        setVerificationCode(''); // Clear any previous code
        
        if (!response.data.qrCodeUrl && !response.data.secret) {
          console.warn('[2FA] Warning: Both qrCodeUrl and secret are missing from response');
          Alert.alert(
            t('common.error'),
            t('security.twoFactor.missingData', {
              defaultValue: 'Thiếu dữ liệu từ server. Vui lòng thử lại.',
            })
          );
          return;
        }
      } else {
        Alert.alert(
          t('common.error'),
          response.message ||
            t('security.twoFactor.enableError', {
              defaultValue: 'Không thể bật xác thực 2 lớp',
            })
        );
      }
    } catch (error: any) {
      console.error('Error enabling 2FA:', error);
      Alert.alert(
        t('common.error'),
        error.message ||
          t('security.twoFactor.enableError', {
            defaultValue: 'Không thể bật xác thực 2 lớp',
          })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel2FASetup = () => {
    Alert.alert(
      t('security.twoFactor.cancelTitle', {
        defaultValue: 'Hủy thiết lập 2FA?',
      }),
      t('security.twoFactor.cancelMessage', {
        defaultValue: 'Bạn có chắc muốn hủy quá trình thiết lập 2FA? Bạn sẽ phải bắt đầu lại từ đầu.',
      }),
      [
        {
          text: t('common.cancel', { defaultValue: 'Hủy' }),
          style: 'cancel',
        },
        {
          text: t('common.confirm', { defaultValue: 'Xác nhận' }),
          style: 'destructive',
          onPress: () => {
            setIsSetupMode(false);
            setTwoFactorSecret('');
            setTwoFactorQR('');
            setVerificationCode('');
          },
        },
      ]
    );
  };

  const handleVerify2FA = async () => {
    if (!verificationCode) {
      Alert.alert(
        t('common.error'),
        t('security.twoFactor.enterCode', {
          defaultValue: 'Vui lòng nhập mã xác thực',
        })
      );
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verify2FA(verificationCode);

      if (response.success) {
        setTwoFactorEnabled(true);
        setVerificationCode('');
        setTwoFactorSecret('');
        setTwoFactorQR('');
        Alert.alert(
          t('common.success'),
          t('security.twoFactor.enableSuccess', {
            defaultValue: 'Đã bật xác thực 2 lớp thành công',
          })
        );
        // Refresh 2FA status
        const statusResponse = await authService.get2FAStatus();
        if (statusResponse.success && statusResponse.data) {
          setTwoFactorEnabled(statusResponse.data.enabled);
        }
      } else {
        Alert.alert(
          t('common.error'),
          response.error ||
            t('security.twoFactor.invalidCode', {
              defaultValue: 'Mã xác thực không hợp lệ',
            })
        );
      }
    } catch (error: any) {
      console.error('Error verifying 2FA:', error);
      Alert.alert(
        t('common.error'),
        error.message ||
          t('security.twoFactor.enableError', {
            defaultValue: 'Không thể bật xác thực 2 lớp',
          })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    Alert.alert(
      t('security.twoFactor.disableTitle', {
        defaultValue: 'Tắt Xác thực 2 lớp',
      }),
      t('security.twoFactor.disableConfirm', {
        defaultValue: 'Bạn có chắc chắn muốn tắt xác thực 2 lớp?',
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('security.twoFactor.disable', { defaultValue: 'Tắt' }),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await authService.disable2FA();

              if (response.success) {
                setTwoFactorEnabled(false);
                setTwoFactorSecret('');
                setTwoFactorQR('');
                Alert.alert(
                  t('common.success'),
                  t('security.twoFactor.disableSuccess', {
                    defaultValue: 'Đã tắt xác thực 2 lớp thành công',
                  })
                );
                // Refresh 2FA status
                const statusResponse = await authService.get2FAStatus();
                if (statusResponse.success && statusResponse.data) {
                  setTwoFactorEnabled(statusResponse.data.enabled);
                }
              } else {
                Alert.alert(
                  t('common.error'),
                  response.error ||
                    t('security.twoFactor.disableError', {
                      defaultValue: 'Không thể tắt xác thực 2 lớp',
                    })
                );
              }
            } catch (error: any) {
              console.error('Error disabling 2FA:', error);
              Alert.alert(
                t('common.error'),
                error.message ||
                  t('security.twoFactor.disableError', {
                    defaultValue: 'Không thể tắt xác thực 2 lớp',
                  })
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderPasswordTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[Typography.h4, { color: theme.colors.text }]}>
          {t('security.password.title', { defaultValue: 'Đổi mật khẩu' })}
        </Text>
        <Text
          style={[
            Typography.bodySmall,
            { color: theme.colors.textSecondary, marginTop: 4 },
          ]}
        >
          {t('security.password.description', {
            defaultValue: 'Mật khẩu của bạn phải có ít nhất 8 ký tự',
          })}
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[Typography.label, { color: theme.colors.text }]}>
          {t('security.password.currentPassword', {
            defaultValue: 'Mật khẩu hiện tại',
          })}
        </Text>
        <View style={styles.passwordInputContainer}>
          <TextInput
            style={[
              styles.passwordInput,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            value={oldPassword}
            onChangeText={setOldPassword}
            secureTextEntry={!showOldPassword}
            placeholder={t('security.password.currentPasswordPlaceholder', {
              defaultValue: 'Nhập mật khẩu hiện tại',
            })}
            placeholderTextColor={theme.colors.textSecondary}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowOldPassword(!showOldPassword)}
          >
            {showOldPassword ? (
              <EyeOff size={20} color={theme.colors.textSecondary} />
            ) : (
              <Eye size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[Typography.label, { color: theme.colors.text }]}>
          {t('security.password.newPassword', { defaultValue: 'Mật khẩu mới' })}
        </Text>
        <View style={styles.passwordInputContainer}>
          <TextInput
            style={[
              styles.passwordInput,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            placeholder={t('security.password.newPasswordPlaceholder', {
              defaultValue: 'Nhập mật khẩu mới',
            })}
            placeholderTextColor={theme.colors.textSecondary}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowNewPassword(!showNewPassword)}
          >
            {showNewPassword ? (
              <EyeOff size={20} color={theme.colors.textSecondary} />
            ) : (
              <Eye size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[Typography.label, { color: theme.colors.text }]}>
          {t('security.password.confirmPassword', {
            defaultValue: 'Xác nhận mật khẩu mới',
          })}
        </Text>
        <View style={styles.passwordInputContainer}>
          <TextInput
            style={[
              styles.passwordInput,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            placeholder={t('security.password.confirmPasswordPlaceholder', {
              defaultValue: 'Xác nhận mật khẩu mới',
            })}
            placeholderTextColor={theme.colors.textSecondary}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeOff size={20} color={theme.colors.textSecondary} />
            ) : (
              <Eye size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Button
        title={t('security.password.changePassword', {
          defaultValue: 'Đổi mật khẩu',
        })}
        onPress={handleChangePassword}
        loading={loading}
        style={styles.submitButton}
      />
    </View>
  );

  const render2FATab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Shield size={24} color={theme.colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[Typography.h4, { color: theme.colors.text }]}>
              {t('security.twoFactor.title', {
                defaultValue: 'Xác thực 2 lớp',
              })}
            </Text>
            <Text
              style={[
                Typography.bodySmall,
                { color: theme.colors.textSecondary, marginTop: 4 },
              ]}
            >
              {t('security.twoFactor.description', {
                defaultValue: 'Thêm một lớp bảo mật cho tài khoản của bạn',
              })}
            </Text>
          </View>
          <Switch
            value={twoFactorEnabled}
            onValueChange={(value) => {
              if (value) {
                handleEnable2FA();
              } else {
                handleDisable2FA();
              }
            }}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.surface}
          />
        </View>
      </View>

      {twoFactorSecret && !twoFactorEnabled && (
        <View style={styles.section}>
          <Text style={[Typography.h5, { color: theme.colors.text }]}>
            {t('security.twoFactor.instructions.title', {
              defaultValue: 'Hướng dẫn thiết lập',
            })}
          </Text>
          <Text
            style={[
              Typography.bodyRegular,
              { color: theme.colors.textSecondary, marginTop: 8 },
            ]}
          >
            {t('security.twoFactor.instructions.step1', {
              defaultValue:
                '1. Tải ứng dụng xác thực (Google Authenticator, Authy, v.v.)',
            })}
          </Text>
          <Text
            style={[
              Typography.bodyRegular,
              { color: theme.colors.textSecondary, marginTop: 4 },
            ]}
          >
            {t('security.twoFactor.instructions.step2', {
              defaultValue: '2. Quét mã QR hoặc nhập mã bí mật thủ công',
            })}
          </Text>
          <Text
            style={[
              Typography.bodyRegular,
              { color: theme.colors.textSecondary, marginTop: 4 },
            ]}
          >
            {t('security.twoFactor.instructions.step3', {
              defaultValue: '3. Nhập mã 6 số từ ứng dụng bên dưới',
            })}
          </Text>

          {twoFactorQR ? (
            <View
              style={[
                styles.qrContainer,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                style={[
                  Typography.bodyMedium,
                  {
                    color: theme.colors.text,
                    marginBottom: 16,
                    textAlign: 'center',
                  },
                ]}
              >
                {t('security.twoFactor.setupDescription', {
                  defaultValue: 'Quét mã QR bằng ứng dụng xác thực',
                })}
              </Text>
              <View
                style={[
                  styles.qrCodeWrapper,
                  {
                    backgroundColor: '#FFFFFF',
                    padding: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.colors.border || '#E0E0E0',
                  },
                ]}
              >
                {twoFactorQR ? (
                  <QRCode
                    value={twoFactorQR}
                    size={200}
                    color="#000000"
                    backgroundColor="#FFFFFF"
                    logo={undefined}
                    logoSize={0}
                    quietZone={10}
                    ecl="M"
                  />
                ) : (
                  <View
                    style={{
                      width: 200,
                      height: 200,
                      backgroundColor: '#F0F0F0',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#999' }}>Loading QR code...</Text>
                  </View>
                )}
              </View>
              {twoFactorSecret && (
                <View style={styles.secretKeyContainer}>
                  <Text
                    style={[
                      Typography.bodySmall,
                      {
                        color: theme.colors.textSecondary,
                        marginTop: 16,
                        marginBottom: 8,
                      },
                    ]}
                  >
                    {t('security.twoFactor.secretKey', {
                      defaultValue: 'Mã bí mật',
                    })}
                    :
                  </Text>
                  <Text
                    style={[
                      Typography.bodySmall,
                      {
                        color: theme.colors.text,
                        fontFamily: 'SpaceGrotesk-Medium',
                        textAlign: 'center',
                      },
                    ]}
                  >
                    {twoFactorSecret}
                  </Text>
                </View>
              )}
            </View>
          ) : twoFactorSecret ? (
            <View
              style={[
                styles.qrContainer,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                style={[
                  Typography.bodySmall,
                  {
                    color: theme.colors.textSecondary,
                    marginBottom: 8,
                  },
                ]}
              >
                {t('security.twoFactor.secretKey', {
                  defaultValue: 'Mã bí mật',
                })}{' '}
                (
                {t('security.twoFactor.instructions.step2', {
                  defaultValue: 'nhập thủ công',
                })}
                ):
              </Text>
              <Text
                style={[
                  Typography.bodySmall,
                  {
                    color: theme.colors.text,
                    fontFamily: 'SpaceGrotesk-Medium',
                  },
                ]}
              >
                {twoFactorSecret}
              </Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={[Typography.label, { color: theme.colors.text }]}>
              {t('security.twoFactor.verificationCode', {
                defaultValue: 'Mã xác thực',
              })}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder={t('security.twoFactor.verificationCodePlaceholder', {
                defaultValue: 'Nhập mã 6 số',
              })}
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <Button
            title={t('security.twoFactor.verifyAndEnable', {
              defaultValue: 'Xác thực và bật',
            })}
            onPress={handleVerify2FA}
            loading={loading}
            style={styles.submitButton}
          />
        </View>
      )}

      {twoFactorEnabled && (
        <View
          style={[
            styles.statusCard,
            { backgroundColor: theme.colors.success + '15' },
          ]}
        >
          <Text
            style={[Typography.bodyMedium, { color: theme.colors.success }]}
          >
            ✓{' '}
            {t('security.twoFactor.enabled', {
              defaultValue: 'Xác thực 2 lớp đã được bật',
            })}
          </Text>
        </View>
      )}
    </View>
  );

  const renderFaceTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <User size={24} color={theme.colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[Typography.h4, { color: theme.colors.text }]}>
              {t('faceLogin.title', {
                defaultValue: 'Đăng nhập bằng khuôn mặt',
              })}
            </Text>
            <Text
              style={[
                Typography.bodySmall,
                { color: theme.colors.textSecondary, marginTop: 4 },
              ]}
            >
              {t('faceLogin.description', {
                defaultValue: 'Đăng nhập nhanh chóng và an toàn bằng khuôn mặt',
              })}
            </Text>
          </View>
        </View>
      </View>

      {loadingFaceStatus ? (
        <View style={styles.loadingContainer}>
          <SkeletonCard />
        </View>
      ) : faceError && !faceEnrolled ? (
        <View
          style={[
            styles.statusCard,
            { backgroundColor: theme.colors.error + '15' },
          ]}
        >
          <Text style={[Typography.bodyMedium, { color: theme.colors.error }]}>
            {faceError}
          </Text>
          <Button
            title={t('common.retry', { defaultValue: 'Thử lại' })}
            onPress={() => loadFaceEncodingStatus(true)}
            variant="outline"
            size="small"
            style={styles.retryButton}
          />
        </View>
      ) : (
        <>
          {faceEnrolled ? (
            <View
              style={[
                styles.statusCard,
                { backgroundColor: theme.colors.success + '15' },
              ]}
            >
              <Text
                style={[Typography.bodyMedium, { color: theme.colors.success }]}
              >
                {t('faceLogin.enrolled', {
                  defaultValue: 'Đã đăng ký khuôn mặt',
                })}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.statusCard,
                { backgroundColor: theme.colors.warning + '15' },
              ]}
            >
              <Text
                style={[Typography.bodyMedium, { color: theme.colors.warning }]}
              >
                {t('faceLogin.notEnrolled', {
                  defaultValue: 'Chưa đăng ký khuôn mặt',
                })}
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Button
              title={
                faceEnrolled
                  ? t('faceLogin.updateFace', {
                      defaultValue: 'Cập nhật khuôn mặt',
                    })
                  : t('faceLogin.enrollFace', {
                      defaultValue: 'Đăng ký khuôn mặt',
                    })
              }
              onPress={async () => {
                analytics.trackButtonClick(
                  faceEnrolled ? 'update_face' : 'enroll_face',
                  'security_settings'
                );
                router.push('/settings/face-enrollment');
              }}
              loading={loadingFaceStatus}
              style={styles.submitButton}
            />

            <Button
              title={t('common.refresh', { defaultValue: 'Làm mới' })}
              onPress={() => loadFaceEncodingStatus(true)}
              variant="outline"
              loading={loadingFaceStatus}
              style={styles.submitButton}
            />

            {faceEnrolled && (
              <Button
                title={t('faceLogin.deleteFace', {
                  defaultValue: 'Xóa khuôn mặt',
                })}
                onPress={async () => {
                  Alert.alert(
                    t('faceLogin.deleteFace', {
                      defaultValue: 'Xóa khuôn mặt',
                    }),
                    t('faceLogin.confirmDelete', {
                      defaultValue:
                        'Bạn có chắc chắn muốn xóa khuôn mặt đã đăng ký?',
                    }),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('faceLogin.delete', {
                          defaultValue: 'Xóa',
                        }),
                        style: 'destructive',
                        onPress: async () => {
                          setLoading(true);
                          try {
                            const response =
                              await userService.deleteFaceEncoding();
                            if (response.success) {
                              analytics.trackFeatureUsage(
                                'delete_face_encoding_success'
                              );
                              setFaceEnrolled(false);
                              // Reload status to ensure consistency
                              await loadFaceEncodingStatus();
                              showSuccess(
                                t('faceLogin.deleteSuccess', {
                                  defaultValue: 'Đã xóa khuôn mặt thành công',
                                })
                              );
                            } else {
                              const errorMessage =
                                response.message ||
                                t('faceLogin.deleteError', {
                                  defaultValue:
                                    'Không thể xóa khuôn mặt. Vui lòng thử lại.',
                                });
                              analytics.trackError(
                                'delete_face_encoding_failed',
                                errorMessage
                              );
                              setErrorModalData({
                                title: t('common.error', {
                                  defaultValue: 'Lỗi',
                                }),
                                message: errorMessage,
                                suggestion: t('faceLogin.retrySuggestion', {
                                  defaultValue: 'Vui lòng thử lại sau',
                                }),
                              });
                              setErrorModalVisible(true);
                            }
                          } catch (error: any) {
                            const errorMessage =
                              error.message ||
                              t('faceLogin.deleteError', {
                                defaultValue: 'Không thể xóa khuôn mặt',
                              });
                            analytics.trackError(
                              'delete_face_encoding_exception',
                              errorMessage
                            );
                            setErrorModalData({
                              title: t('common.error', { defaultValue: 'Lỗi' }),
                              message: errorMessage,
                              suggestion: t('faceLogin.retrySuggestion', {
                                defaultValue: 'Vui lòng thử lại sau',
                              }),
                            });
                            setErrorModalVisible(true);
                          } finally {
                            setLoading(false);
                          }
                        },
                      },
                    ]
                  );
                }}
                loading={loading}
                variant="outline"
                style={styles.submitButton}
              />
            )}
          </View>
        </>
      )}
    </View>
  );

  const renderSessionsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[Typography.h4, { color: theme.colors.text }]}>
          {t('security.sessions.title', { defaultValue: 'Phiên đăng nhập' })}
        </Text>
        <Text
          style={[
            Typography.bodySmall,
            { color: theme.colors.textSecondary, marginTop: 4 },
          ]}
        >
          {t('security.sessions.description', {
            defaultValue: 'Quản lý các thiết bị đang đăng nhập',
          })}
        </Text>
      </View>

      {activeSessions.length > 0 && (
        <View style={styles.section}>
          <Button
            title={t('security.sessions.logoutAll', {
              defaultValue: 'Đăng xuất tất cả phiên khác',
            })}
            onPress={() => {
              Alert.alert(
                t('security.sessions.logoutAllTitle', {
                  defaultValue: 'Đăng xuất tất cả phiên',
                }),
                t('security.sessions.logoutAllConfirm', {
                  defaultValue:
                    'Bạn có chắc chắn muốn đăng xuất tất cả phiên khác? Bạn sẽ vẫn đăng nhập trên thiết bị này.',
                }),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('security.sessions.logoutAll', {
                      defaultValue: 'Đăng xuất tất cả',
                    }),
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        setLoading(true);
                        const response = await authService.revokeAllSessions();
                        if (response.success) {
                          Alert.alert(
                            t('common.success'),
                            t('security.sessions.logoutAllSuccess', {
                              defaultValue:
                                'Đã đăng xuất tất cả phiên khác thành công',
                            })
                          );
                          // Refresh sessions list
                          await loadSecurityData();
                        } else {
                          Alert.alert(
                            t('common.error'),
                            response.message ||
                              t('security.sessions.logoutAllError', {
                                defaultValue:
                                  'Không thể đăng xuất tất cả phiên',
                              })
                          );
                        }
                      } catch (error: any) {
                        console.error('Error revoking all sessions:', error);
                        Alert.alert(
                          t('common.error'),
                          error.message ||
                            t('security.sessions.logoutAllError', {
                              defaultValue: 'Không thể đăng xuất tất cả phiên',
                            })
                        );
                      } finally {
                        setLoading(false);
                      }
                    },
                  },
                ]
              );
            }}
            loading={loading}
            variant="outline"
            style={styles.revokeAllButton}
          />
        </View>
      )}

      {activeSessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Monitor size={48} color={theme.colors.textSecondary} />
          <Text
            style={[
              Typography.bodyRegular,
              { color: theme.colors.textSecondary, marginTop: 16 },
            ]}
          >
            {t('security.sessions.noSessions', {
              defaultValue: 'Không tìm thấy phiên đăng nhập nào',
            })}
          </Text>
        </View>
      ) : (
        activeSessions.map((session, index) => {
          const isCurrentSession = session.id === currentSessionId;
          const lastActiveDate = session.last_used_at
            ? new Date(session.last_used_at)
            : null;
          const formattedLastActive = lastActiveDate
            ? lastActiveDate.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Unknown';

          return (
            <View
              key={session.id || index}
              style={[
                styles.sessionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: isCurrentSession
                    ? theme.colors.primary
                    : theme.colors.border,
                  borderWidth: isCurrentSession ? 2 : 1,
                },
              ]}
            >
              <View style={styles.sessionIcon}>
                <Smartphone size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.sessionInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    style={[
                      Typography.bodyMedium,
                      { color: theme.colors.text },
                    ]}
                  >
                    {session.device_info ||
                      session.user_agent ||
                      t('security.sessions.unknownDevice', {
                        defaultValue: 'Thiết bị không xác định',
                      })}
                  </Text>
                  {isCurrentSession && (
                    <View
                      style={[
                        styles.currentBadge,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          Typography.caption,
                          {
                            color: theme.colors.textInverse,
                            fontSize: 10,
                            fontWeight: '600',
                          },
                        ]}
                      >
                        {t('security.sessions.current', {
                          defaultValue: 'Hiện tại',
                        })}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    Typography.bodySmall,
                    { color: theme.colors.textSecondary, marginTop: 4 },
                  ]}
                >
                  {session.location ||
                    session.ip_address ||
                    t('security.sessions.unknownLocation', {
                      defaultValue: 'Vị trí không xác định',
                    })}
                </Text>
                <Text
                  style={[
                    Typography.caption,
                    { color: theme.colors.textSecondary, marginTop: 2 },
                  ]}
                >
                  {t('security.sessions.lastActive', {
                    defaultValue: 'Hoạt động lần cuối',
                  })}
                  : {formattedLastActive}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => {
                  Alert.alert(
                    t('security.sessions.logoutTitle', {
                      defaultValue: 'Đăng xuất phiên',
                    }),
                    t('security.sessions.logoutConfirm', {
                      defaultValue:
                        'Bạn có chắc chắn muốn đăng xuất phiên này?',
                    }),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('security.sessions.logout', {
                          defaultValue: 'Đăng xuất',
                        }),
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            setLoading(true);
                            const response = await authService.revokeSession(
                              session.id
                            );
                            if (response.success) {
                              Alert.alert(
                                t('common.success'),
                                t('security.sessions.logoutSuccess', {
                                  defaultValue: 'Đã đăng xuất phiên thành công',
                                })
                              );
                              // Refresh sessions list
                              await loadSecurityData();
                            } else {
                              Alert.alert(
                                t('common.error'),
                                response.message ||
                                  t('security.sessions.logoutError', {
                                    defaultValue: 'Không thể đăng xuất phiên',
                                  })
                              );
                            }
                          } catch (error: any) {
                            console.error('Error revoking session:', error);
                            Alert.alert(
                              t('common.error'),
                              error.message ||
                                t('security.sessions.logoutError', {
                                  defaultValue: 'Không thể đăng xuất phiên',
                                })
                            );
                          } finally {
                            setLoading(false);
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Text
                  style={[Typography.bodySmall, { color: theme.colors.error }]}
                >
                  {t('security.sessions.logout', { defaultValue: 'Đăng xuất' })}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: theme.colors.text, flex: 1 }]}>
          {t('security.title', { defaultValue: 'Bảo mật' })}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollContainer}
        contentContainerStyle={styles.tabContainer}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'password' && {
              borderBottomColor: theme.colors.primary,
            },
          ]}
          onPress={() => setActiveTab('password')}
        >
          <Key
            size={18}
            color={
              activeTab === 'password'
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              Typography.bodySmall,
              {
                color:
                  activeTab === 'password'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                marginLeft: 6,
                fontSize: 13,
              },
            ]}
            numberOfLines={1}
          >
            {t('security.tabs.password', { defaultValue: 'Mật khẩu' })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === '2fa' && {
              borderBottomColor: theme.colors.primary,
            },
          ]}
          onPress={() => setActiveTab('2fa')}
        >
          <Shield
            size={18}
            color={
              activeTab === '2fa'
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              Typography.bodySmall,
              {
                color:
                  activeTab === '2fa'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                marginLeft: 6,
                fontSize: 13,
              },
            ]}
            numberOfLines={1}
          >
            {t('security.tabs.twoFactor', { defaultValue: 'Xác thực 2 lớp' })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'face' && {
              borderBottomColor: theme.colors.primary,
            },
          ]}
          onPress={() => setActiveTab('face')}
        >
          <User
            size={18}
            color={
              activeTab === 'face'
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              Typography.bodySmall,
              {
                color:
                  activeTab === 'face'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                marginLeft: 6,
                fontSize: 13,
              },
            ]}
            numberOfLines={1}
          >
            {t('security.tabs.face', { defaultValue: 'Khuôn mặt' })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'sessions' && {
              borderBottomColor: theme.colors.primary,
            },
          ]}
          onPress={() => setActiveTab('sessions')}
        >
          <Monitor
            size={18}
            color={
              activeTab === 'sessions'
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              Typography.bodySmall,
              {
                color:
                  activeTab === 'sessions'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                marginLeft: 6,
                fontSize: 13,
              },
            ]}
            numberOfLines={1}
          >
            {t('security.tabs.sessions', { defaultValue: 'Phiên đăng nhập' })}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'password' && renderPasswordTab()}
        {activeTab === '2fa' && render2FATab()}
        {activeTab === 'face' && renderFaceTab()}
        {activeTab === 'sessions' && renderSessionsTab()}
      </ScrollView>

      {/* Toast Component */}
      <ToastComponent />

      {/* Error Modal */}
      <AlertModal
        visible={errorModalVisible}
        title={
          errorModalData?.title || t('common.error', { defaultValue: 'Lỗi' })
        }
        message={errorModalData?.message || ''}
        suggestion={errorModalData?.suggestion}
        type="error"
        buttonText={t('common.ok', { defaultValue: 'OK' })}
        onClose={() => setErrorModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  tabScrollContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: 'transparent',
    maxHeight: 50,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    marginTop: 8,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    paddingRight: 48,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    marginTop: 8,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    padding: 8,
  },
  submitButton: {
    marginTop: 12,
  },
  qrContainer: {
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  qrCodeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  secretKeyContainer: {
    width: '100%',
    marginTop: 8,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sessionIcon: {
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  logoutButton: {
    padding: 8,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  revokeAllButton: {
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 24,
  },
  retryButton: {
    marginTop: 12,
  },
});
