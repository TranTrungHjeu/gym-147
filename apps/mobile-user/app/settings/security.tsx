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
        setFaceEnrolled(response.data.enrolled || response.data.hasFaceEncoding);
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
    await Promise.all([
      loadSecurityData(),
      loadFaceEncodingStatus(),
    ]);
    setRefreshing(false);
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), 'New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(t('common.error'), 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.changePassword(
        oldPassword,
        newPassword
      );

      if (response.success) {
        Alert.alert(t('common.success'), 'Password changed successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert(
          t('common.error'),
          response.error || 'Failed to change password'
        );
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      Alert.alert(
        t('common.error'),
        error.message || 'Failed to change password'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    setLoading(true);
    try {
      const response = await authService.enable2FA();

      if (response.success && response.data) {
        setTwoFactorSecret(response.data.secret);
        setTwoFactorQR(response.data.qrCodeUrl);
        Alert.alert(
          'Setup 2FA',
          'Scan the QR code with your authenticator app, then enter the verification code'
        );
      } else {
        Alert.alert(
          t('common.error'),
          response.error || 'Failed to enable 2FA'
        );
      }
    } catch (error: any) {
      console.error('Error enabling 2FA:', error);
      Alert.alert(t('common.error'), error.message || 'Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode) {
      Alert.alert(t('common.error'), 'Please enter verification code');
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
        Alert.alert(t('common.success'), '2FA enabled successfully');
        // Refresh 2FA status
        const statusResponse = await authService.get2FAStatus();
        if (statusResponse.success && statusResponse.data) {
          setTwoFactorEnabled(statusResponse.data.enabled);
        }
      } else {
        Alert.alert(
          t('common.error'),
          response.error || 'Invalid verification code'
        );
      }
    } catch (error: any) {
      console.error('Error verifying 2FA:', error);
      Alert.alert(t('common.error'), error.message || 'Failed to verify 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    Alert.alert(
      'Disable 2FA',
      'Are you sure you want to disable two-factor authentication?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await authService.disable2FA();

              if (response.success) {
                setTwoFactorEnabled(false);
                setTwoFactorSecret('');
                setTwoFactorQR('');
                Alert.alert(t('common.success'), '2FA disabled successfully');
                // Refresh 2FA status
                const statusResponse = await authService.get2FAStatus();
                if (statusResponse.success && statusResponse.data) {
                  setTwoFactorEnabled(statusResponse.data.enabled);
                }
              } else {
                Alert.alert(
                  t('common.error'),
                  response.error || 'Failed to disable 2FA'
                );
              }
            } catch (error: any) {
              console.error('Error disabling 2FA:', error);
              Alert.alert(
                t('common.error'),
                error.message || 'Failed to disable 2FA'
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
          Change Password
        </Text>
        <Text
          style={[
            Typography.bodySmall,
            { color: theme.colors.textSecondary, marginTop: 4 },
          ]}
        >
          Your password must be at least 8 characters long
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[Typography.label, { color: theme.colors.text }]}>
          Current Password
        </Text>
        <View style={styles.passwordInputContainer}>
          <TextInput
            style={[
              styles.passwordInput,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
              },
            ]}
            value={oldPassword}
            onChangeText={setOldPassword}
            secureTextEntry={!showOldPassword}
            placeholder="Enter current password"
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
          New Password
        </Text>
        <View style={styles.passwordInputContainer}>
          <TextInput
            style={[
              styles.passwordInput,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
              },
            ]}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            placeholder="Enter new password"
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
          Confirm New Password
        </Text>
        <View style={styles.passwordInputContainer}>
          <TextInput
            style={[
              styles.passwordInput,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
              },
            ]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            placeholder="Confirm new password"
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
        title="Change Password"
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
              Two-Factor Authentication
            </Text>
            <Text
              style={[
                Typography.bodySmall,
                { color: theme.colors.textSecondary, marginTop: 4 },
              ]}
            >
              Add an extra layer of security to your account
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
            Setup Instructions
          </Text>
          <Text
            style={[
              Typography.bodyRegular,
              { color: theme.colors.textSecondary, marginTop: 8 },
            ]}
          >
            1. Download an authenticator app (Google Authenticator, Authy, etc.)
          </Text>
          <Text
            style={[
              Typography.bodyRegular,
              { color: theme.colors.textSecondary, marginTop: 4 },
            ]}
          >
            2. Scan the QR code or enter the secret key manually
          </Text>
          <Text
            style={[
              Typography.bodyRegular,
              { color: theme.colors.textSecondary, marginTop: 4 },
            ]}
          >
            3. Enter the 6-digit code from the app below
          </Text>

          <View
            style={[
              styles.qrContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[Typography.bodySmall, { color: theme.colors.text }]}>
              Secret Key: {twoFactorSecret}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[Typography.label, { color: theme.colors.text }]}>
              Verification Code
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="Enter 6-digit code"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <Button
            title="Verify and Enable"
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
            ✓ Two-factor authentication is enabled
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
          <Text
            style={[Typography.bodyMedium, { color: theme.colors.error }]}
          >
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
                style={[
                  Typography.bodyMedium,
                  { color: theme.colors.success },
                ]}
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
                style={[
                  Typography.bodyMedium,
                  { color: theme.colors.warning },
                ]}
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
                              analytics.trackFeatureUsage('delete_face_encoding_success');
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
                                  defaultValue: 'Không thể xóa khuôn mặt. Vui lòng thử lại.',
                                });
                              analytics.trackError('delete_face_encoding_failed', errorMessage);
                              setErrorModalData({
                                title: t('common.error', { defaultValue: 'Lỗi' }),
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
                            analytics.trackError('delete_face_encoding_exception', errorMessage);
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
          Active Sessions
        </Text>
        <Text
          style={[
            Typography.bodySmall,
            { color: theme.colors.textSecondary, marginTop: 4 },
          ]}
        >
          Manage devices that are currently logged in
        </Text>
      </View>

      {activeSessions.length > 0 && (
        <View style={styles.section}>
          <Button
            title="Logout All Other Sessions"
            onPress={() => {
              Alert.alert(
                'Logout All Sessions',
                'Are you sure you want to logout all other sessions? You will remain logged in on this device.',
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: 'Logout All',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        setLoading(true);
                        const response = await authService.revokeAllSessions();
                        if (response.success) {
                          Alert.alert(
                            t('common.success'),
                            'All other sessions logged out successfully'
                          );
                          // Refresh sessions list
                          await loadSecurityData();
                        } else {
                          Alert.alert(
                            t('common.error'),
                            response.message || 'Failed to logout all sessions'
                          );
                        }
                      } catch (error: any) {
                        console.error('Error revoking all sessions:', error);
                        Alert.alert(
                          t('common.error'),
                          error.message || 'Failed to logout all sessions'
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
            No active sessions found
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
                    {session.device_info || session.user_agent || 'Unknown Device'}
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
                        Current
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
                  {session.location || session.ip_address || 'Unknown Location'}
                </Text>
                <Text
                  style={[
                    Typography.caption,
                    { color: theme.colors.textSecondary, marginTop: 2 },
                  ]}
                >
                  Last active: {formattedLastActive}
                </Text>
              </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                Alert.alert(
                  'Logout Session',
                  'Are you sure you want to logout this session?',
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: 'Logout',
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
                              'Session logged out successfully'
                            );
                            // Refresh sessions list
                            await loadSecurityData();
                          } else {
                            Alert.alert(
                              t('common.error'),
                              response.message || 'Failed to logout session'
                            );
                          }
                        } catch (error: any) {
                          console.error('Error revoking session:', error);
                          Alert.alert(
                            t('common.error'),
                            error.message || 'Failed to logout session'
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
                Logout
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
          Security
        </Text>
      </View>

      <View style={styles.tabContainer}>
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
            size={20}
            color={
              activeTab === 'password'
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              Typography.bodyMedium,
              {
                color:
                  activeTab === 'password'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                marginLeft: 8,
              },
            ]}
          >
            Password
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
            size={20}
            color={
              activeTab === '2fa'
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              Typography.bodyMedium,
              {
                color:
                  activeTab === '2fa'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                marginLeft: 8,
              },
            ]}
          >
            2FA
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
            size={20}
            color={
              activeTab === 'face'
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              Typography.bodyMedium,
              {
                color:
                  activeTab === 'face'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                marginLeft: 8,
              },
            ]}
          >
            {t('faceLogin.title', {
              defaultValue: 'Face',
            })}
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
            size={20}
            color={
              activeTab === 'sessions'
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              Typography.bodyMedium,
              {
                color:
                  activeTab === 'sessions'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                marginLeft: 8,
              },
            ]}
          >
            Sessions
          </Text>
        </TouchableOpacity>
      </View>

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
        title={errorModalData?.title || t('common.error', { defaultValue: 'Lỗi' })}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    fontSize: 16,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    paddingRight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    fontSize: 16,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    padding: 8,
  },
  submitButton: {
    marginTop: 8,
  },
  qrContainer: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  statusCard: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
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
