import { useAuth } from '@/contexts/AuthContext';
import { LoginCredentials } from '@/types/authTypes'; // IMPROVEMENT: Import LoginCredentials
import { debugApi } from '@/utils/debug';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  CheckCircle,
  Settings,
  User,
  XCircle,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput, // IMPROVEMENT: Add TextInput for password form
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FaceLoginScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { loginWithFace, login } = useAuth(); // IMPROVEMENT: Add login for password fallback
  const cameraRef = useRef<any>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');
  const [captured, setCaptured] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false); // IMPROVEMENT: Show password form on fallback
  const [email, setEmail] = useState(''); // IMPROVEMENT: Email for password fallback
  const [password, setPassword] = useState(''); // IMPROVEMENT: Password for fallback
  const [rememberMe, setRememberMe] = useState(false); // IMPROVEMENT: Remember me for fallback
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Check if permission is permanently denied
  const isPermanentlyDenied =
    permission?.status === 'denied' && permission?.canAskAgain === false;

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Parse error to get specific error type and message
  const parseFaceLoginError = (
    error: any
  ): {
    message: string;
    suggestion?: string;
  } => {
    const errorMessage = error?.message || error?.response?.data?.message || '';

    // Check for specific error types
    if (
      errorMessage.includes('No face detected') ||
      errorMessage.includes('no face detected')
    ) {
      return {
        message: t('faceLogin.errorNoFace', {
          defaultValue:
            'Không phát hiện khuôn mặt. Vui lòng đảm bảo khuôn mặt của bạn rõ ràng và nằm trong khung.',
        }),
        suggestion: t('faceLogin.errorNoFaceSuggestion', {
          defaultValue:
            'Đảm bảo ánh sáng đủ, khuôn mặt thẳng và nằm trong khung.',
        }),
      };
    }

    if (
      errorMessage.includes('not recognized') ||
      errorMessage.includes('Face not recognized')
    ) {
      return {
        message: t('faceLogin.errorNotRecognized', {
          defaultValue:
            'Không thể nhận diện khuôn mặt. Vui lòng thử lại hoặc đăng nhập bằng mật khẩu.',
        }),
        suggestion: t('faceLogin.errorNotRecognizedSuggestion', {
          defaultValue: 'Thử lại hoặc sử dụng phương thức đăng nhập khác.',
        }),
      };
    }

    if (
      errorMessage.includes('vô hiệu hóa') ||
      errorMessage.includes('inactive') ||
      errorMessage.includes('Account is inactive')
    ) {
      return {
        message: t('faceLogin.errorAccountInactive', {
          defaultValue: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.',
        }),
      };
    }

    if (
      errorMessage.includes('khóa') ||
      errorMessage.includes('locked') ||
      errorMessage.includes('Account is locked')
    ) {
      return {
        message: t('faceLogin.errorAccountLocked', {
          defaultValue: 'Tài khoản đã bị khóa. Vui lòng thử lại sau.',
        }),
      };
    }

    if (
      errorMessage.includes('Cannot connect') ||
      errorMessage.includes('network') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT')
    ) {
      return {
        message: t('faceLogin.errorNetwork', {
          defaultValue:
            'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.',
        }),
        suggestion: t('faceLogin.errorNetworkSuggestion', {
          defaultValue: 'Kiểm tra kết nối internet và thử lại.',
        }),
      };
    }

    // Default error message
    return {
      message:
        errorMessage ||
        t('faceLogin.loginError', {
          defaultValue:
            'Không thể xác thực khuôn mặt. Vui lòng thử lại hoặc đăng nhập bằng mật khẩu.',
        }),
    };
  };

  // Check network connection before capture
  const checkNetworkBeforeCapture = async (): Promise<boolean> => {
    try {
      const isConnected = await debugApi.testConnection();
      if (!isConnected) {
        Alert.alert(
          t('faceLogin.networkErrorTitle', {
            defaultValue: 'Không có kết nối mạng',
          }),
          t('faceLogin.networkErrorMessage', {
            defaultValue:
              'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng của bạn.',
          }),
          [
            {
              text: t('common.cancel', { defaultValue: 'Hủy' }),
              style: 'cancel',
            },
            {
              text: t('faceLogin.retry', { defaultValue: 'Thử lại' }),
              onPress: async () => {
                const retryConnected = await checkNetworkBeforeCapture();
                if (retryConnected) {
                  captureAndLogin();
                }
              },
            },
          ]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Network check error:', error);
      return false;
    }
  };

  // Validate image before sending
  const validateImage = (
    base64Image: string
  ): { valid: boolean; error?: string } => {
    if (!base64Image || typeof base64Image !== 'string') {
      return {
        valid: false,
        error: t('faceLogin.errorInvalidImage', {
          defaultValue: 'Dữ liệu ảnh không hợp lệ',
        }),
      };
    }

    // Check if it's a data URI
    if (!base64Image.startsWith('data:image/')) {
      return {
        valid: false,
        error: t('faceLogin.errorInvalidImageFormat', {
          defaultValue: 'Định dạng ảnh không hợp lệ',
        }),
      };
    }

    // Check size (max 5MB)
    const sizeInMB = (base64Image.length * 3) / 4 / 1024 / 1024;
    if (sizeInMB > 5) {
      return {
        valid: false,
        error: t('faceLogin.errorImageTooLarge', {
          defaultValue: 'Kích thước ảnh quá lớn (tối đa 5MB)',
        }),
      };
    }

    return { valid: true };
  };

  // Open app settings for camera permission
  const openAppSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Failed to open app settings:', error);
      Alert.alert(
        t('faceLogin.openSettingsErrorTitle', {
          defaultValue: 'Không thể mở cài đặt',
        }),
        t('faceLogin.openSettingsErrorMessage', {
          defaultValue:
            'Vui lòng mở cài đặt thủ công và cấp quyền camera cho ứng dụng.',
        })
      );
    }
  };

  const captureAndLogin = async () => {
    if (processing || captured || !cameraRef.current) return;

    // Check network before capture
    const networkOk = await checkNetworkBeforeCapture();
    if (!networkOk) {
      return;
    }

    setProcessing(true);
    setResult(null);
    setMessage(
      t('faceLogin.capturing', {
        defaultValue: 'Đang chụp ảnh...',
      })
    );
    setCaptured(true);

    try {
      // Take picture with higher quality for better face detection
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9, // Increased from 0.8 for better face detection
        base64: true,
        skipProcessing: false, // Keep processing enabled for better image quality
        exif: false, // Disable EXIF to reduce file size
      });

      if (!photo?.base64) {
        throw new Error('Failed to capture image');
      }

      setMessage(
        t('faceLogin.processing', {
          defaultValue: 'Đang xác thực khuôn mặt...',
        })
      );

      // Use base64 directly from photo
      const imageDataUri = `data:image/jpeg;base64,${photo.base64}`;

      // Validate image before sending
      const validation = validateImage(imageDataUri);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid image');
      }

      // Log image size for debugging
      const imageSizeKB = (photo.base64.length * 3) / 4 / 1024;
      console.log('[FACE LOGIN] Image captured:', {
        hasBase64: !!photo.base64,
        base64Length: photo.base64.length,
        imageSizeKB: imageSizeKB.toFixed(2),
        uri: photo.uri,
      });

      // Login with face using AuthContext
      const loginResult = await loginWithFace(imageDataUri);

      if (loginResult && loginResult.user && loginResult.accessToken) {
        setResult('success');
        setMessage(
          t('faceLogin.loginSuccess', {
            defaultValue: 'Đăng nhập thành công!',
          })
        );

        // Check registration status and navigate accordingly
        const registrationStatus = loginResult.registrationStatus || {
          hasSubscription: false,
          hasCompletedProfile: false,
        };

        // Clear captured state after success
        setCaptured(false);

        // Auto navigate after 1.5 seconds (more reasonable timing)
        navigationTimeoutRef.current = setTimeout(() => {
          // Priority: Subscription > Member > Profile
          if (!registrationStatus.hasSubscription) {
            router.replace({
              pathname: '/(auth)/register-plan',
              params: {
                userId: loginResult.user.id,
                accessToken: loginResult.accessToken,
                refreshToken: loginResult.refreshToken || '',
              },
            });
          } else if (
            !loginResult.hasMember ||
            !registrationStatus.hasCompletedProfile
          ) {
            router.replace({
              pathname: '/(auth)/register-profile',
              params: {
                userId: loginResult.user.id,
                accessToken: loginResult.accessToken,
                refreshToken: loginResult.refreshToken || '',
                paymentVerified: 'true',
              },
            });
          } else {
            router.replace('/(tabs)');
          }
          // Clear timeout ref after navigation
          navigationTimeoutRef.current = null;
        }, 1500);
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error: any) {
      // Only log to console, don't show error toast
      // Error will be displayed in the UI via message state
      console.log('[FACE LOGIN] Error:', error?.message || 'Unknown error');

      // IMPROVEMENT: Check for biometric fallback
      if (error?.biometricFallback || error?.errorCode === 'FACE_NOT_RECOGNIZED') {
        setResult('error');
        setMessage(
          t('faceLogin.notRecognized', {
            defaultValue: 'Không nhận diện được khuôn mặt. Vui lòng đăng nhập bằng mật khẩu.',
          })
        );
        setCaptured(false);
        setProcessing(false);
        // Show password form after a short delay
        setTimeout(() => {
          setShowPasswordForm(true);
        }, 2000);
        return;
      }

      // Parse error for better UX
      const errorInfo = parseFaceLoginError(error);

      setResult('error');
      setMessage(errorInfo.message);
      setCaptured(false);
      setProcessing(false);

      // Don't throw error to avoid showing error toast at bottom
      // Error is already handled and displayed in UI
    }
  };

  const resetRecognition = () => {
    setCaptured(false);
    setProcessing(false);
    setResult(null);
    setMessage('');
  };

  // Handle back navigation during processing
  const handleBackPress = () => {
    if (processing) {
      Alert.alert(
        t('faceLogin.backPressTitle', {
          defaultValue: 'Đang xử lý',
        }),
        t('faceLogin.backPressMessage', {
          defaultValue: 'Đang xử lý đăng nhập. Bạn có chắc muốn quay lại?',
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
              // Cancel navigation timeout
              if (navigationTimeoutRef.current) {
                clearTimeout(navigationTimeoutRef.current);
                navigationTimeoutRef.current = null;
              }
              resetRecognition();
              router.back();
            },
          },
        ]
      );
      return;
    }
    router.back();
  };

  if (!permission) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        <View style={styles.permissionContainer}>
          <Text
            style={[
              Typography.bodyMedium,
              styles.permissionText,
              { color: theme.colors.text },
            ]}
          >
            {t('faceLogin.requestingPermission', {
              defaultValue: 'Đang yêu cầu quyền truy cập camera...',
            })}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            disabled={processing}
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text
            style={[
              Typography.h3,
              styles.headerTitle,
              { color: theme.colors.text },
            ]}
          >
            {t('faceLogin.title', { defaultValue: 'Đăng nhập bằng khuôn mặt' })}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.permissionContainer}>
          <User size={64} color={theme.colors.textSecondary} />
          <Text
            style={[
              Typography.bodyMedium,
              styles.permissionText,
              { color: theme.colors.text, marginTop: 16 },
            ]}
          >
            {isPermanentlyDenied
              ? t('faceLogin.permissionPermanentlyDenied', {
                  defaultValue:
                    'Quyền truy cập camera đã bị từ chối. Vui lòng cấp quyền trong Cài đặt để sử dụng tính năng đăng nhập bằng khuôn mặt.',
                })
              : t('faceLogin.permissionRequired', {
                  defaultValue:
                    'Cần quyền truy cập camera để đăng nhập bằng khuôn mặt',
                })}
          </Text>

          {!isPermanentlyDenied ? (
            <TouchableOpacity
              style={[
                styles.permissionButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={requestPermission}
            >
              <Text
                style={[
                  Typography.bodyMedium,
                  styles.permissionButtonText,
                  { color: theme.colors.textInverse },
                ]}
              >
                {t('faceLogin.grantPermission', {
                  defaultValue: 'Cấp quyền',
                })}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.permissionButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.permissionButton,
                  { backgroundColor: theme.colors.primary, marginBottom: 12 },
                ]}
                onPress={openAppSettings}
              >
                <Settings size={20} color={theme.colors.textInverse} />
                <Text
                  style={[
                    Typography.bodyMedium,
                    styles.permissionButtonText,
                    { color: theme.colors.textInverse, marginLeft: 8 },
                  ]}
                >
                  {t('faceLogin.openSettings', {
                    defaultValue: 'Mở Cài đặt',
                  })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.permissionButtonSecondary,
                  { borderColor: theme.colors.border },
                ]}
                onPress={() => router.back()}
              >
                <Text
                  style={[
                    Typography.bodyMedium,
                    styles.permissionButtonSecondaryText,
                    { color: theme.colors.text },
                  ]}
                >
                  {t('common.cancel', { defaultValue: 'Hủy' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          disabled={processing}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text
          style={[
            Typography.h3,
            styles.headerTitle,
            { color: theme.colors.text },
          ]}
        >
          {t('faceLogin.title', { defaultValue: 'Đăng nhập bằng khuôn mặt' })}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front">
          {/* Overlay */}
          <View style={styles.overlay}>
            {/* Top overlay */}
            <View
              style={[
                styles.overlaySection,
                { backgroundColor: 'rgba(0,0,0,0.5)' },
              ]}
            />

            {/* Middle section with face area */}
            <View style={styles.middleSection}>
              <View
                style={[
                  styles.overlaySection,
                  { backgroundColor: 'rgba(0,0,0,0.5)' },
                ]}
              />

              <View style={styles.faceArea}>
                <View
                  style={[
                    styles.faceFrame,
                    { borderColor: theme.colors.primary },
                  ]}
                >
                  <View
                    style={[
                      styles.corner,
                      styles.topLeft,
                      { borderColor: theme.colors.primary },
                    ]}
                  />
                  <View
                    style={[
                      styles.corner,
                      styles.topRight,
                      { borderColor: theme.colors.primary },
                    ]}
                  />
                  <View
                    style={[
                      styles.corner,
                      styles.bottomLeft,
                      { borderColor: theme.colors.primary },
                    ]}
                  />
                  <View
                    style={[
                      styles.corner,
                      styles.bottomRight,
                      { borderColor: theme.colors.primary },
                    ]}
                  />
                </View>

                {/* Face icon in center */}
                <View style={styles.faceIconContainer}>
                  <User size={48} color={theme.colors.primary} />
                </View>
              </View>

              <View
                style={[
                  styles.overlaySection,
                  { backgroundColor: 'rgba(0,0,0,0.5)' },
                ]}
              />
            </View>

            {/* Bottom overlay */}
            <View
              style={[
                styles.overlaySection,
                { backgroundColor: 'rgba(0,0,0,0.5)' },
              ]}
            />
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionsTextContainer}>
              <Text
                style={[
                  Typography.bodyMedium,
                  styles.instructionsText,
                  { color: theme.colors.textInverse },
                ]}
              >
                {t('faceLogin.loginInstructions', {
                  defaultValue:
                    'Đặt khuôn mặt của bạn trong khung để đăng nhập',
                })}
              </Text>
            </View>
          </View>
        </CameraView>
      </View>

      {/* Capture Button */}
      <View style={styles.captureContainer}>
        <TouchableOpacity
          style={[
            styles.captureButton,
            {
              backgroundColor:
                captured || processing
                  ? theme.colors.border
                  : theme.colors.primary,
            },
          ]}
          onPress={captureAndLogin}
          disabled={captured || processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <Camera size={24} color={theme.colors.textInverse} />
          )}
        </TouchableOpacity>
      </View>

      {/* Result Overlay */}
      {result && (
        <View
          style={[styles.resultOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}
        >
          <View
            style={[
              styles.resultContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            {result === 'success' ? (
              <CheckCircle size={64} color={theme.colors.success} />
            ) : (
              <XCircle size={64} color={theme.colors.error} />
            )}

            <Text
              style={[
                Typography.bodyMedium,
                styles.resultText,
                { color: theme.colors.text },
              ]}
            >
              {message}
            </Text>

            {result === 'error' && (
              <View style={styles.errorActionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.retryButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={resetRecognition}
                >
                  <Text
                    style={[
                      Typography.bodyMedium,
                      styles.retryButtonText,
                      { color: theme.colors.textInverse },
                    ]}
                  >
                    {t('faceLogin.tryAgain', { defaultValue: 'Thử lại' })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.usePasswordButton,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => {
                    resetRecognition();
                    router.back();
                  }}
                >
                  <Text
                    style={[
                      Typography.bodyMedium,
                      styles.usePasswordButtonText,
                      { color: theme.colors.text },
                    ]}
                  >
                    {t('faceLogin.usePassword', {
                      defaultValue: 'Đăng nhập bằng mật khẩu',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* IMPROVEMENT: Password Form Fallback */}
      {showPasswordForm && (
        <View
          style={[
            styles.passwordFormOverlay,
            { backgroundColor: 'rgba(0,0,0,0.9)' },
          ]}
        >
          <View
            style={[
              styles.passwordFormContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              style={[
                Typography.h3,
                styles.passwordFormTitle,
                { color: theme.colors.text },
              ]}
            >
              {t('faceLogin.passwordFallback', {
                defaultValue: 'Đăng nhập bằng mật khẩu',
              })}
            </Text>
            <Text
              style={[
                Typography.body,
                styles.passwordFormSubtitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('faceLogin.passwordFallbackMessage', {
                defaultValue:
                  'Không nhận diện được khuôn mặt. Vui lòng đăng nhập bằng email và mật khẩu.',
              })}
            </Text>

            <View style={styles.passwordFormInputContainer}>
              <TextInput
                style={[
                  styles.passwordFormInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder={t('auth.email') || 'Email'}
                placeholderTextColor={theme.colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!processing}
              />
              <TextInput
                style={[
                  styles.passwordFormInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder={t('auth.password') || 'Mật khẩu'}
                placeholderTextColor={theme.colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!processing}
              />
            </View>

            <View style={styles.passwordFormActions}>
              <TouchableOpacity
                style={[
                  styles.passwordFormButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handlePasswordLogin}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.textInverse}
                  />
                ) : (
                  <Text
                    style={[
                      Typography.bodyMedium,
                      styles.passwordFormButtonText,
                      { color: theme.colors.textInverse },
                    ]}
                  >
                    {t('auth.login') || 'Đăng nhập'}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.passwordFormButtonSecondary,
                  { borderColor: theme.colors.border },
                ]}
                onPress={() => {
                  setShowPasswordForm(false);
                  resetRecognition();
                }}
                disabled={processing}
              >
                <Text
                  style={[
                    Typography.bodyMedium,
                    styles.passwordFormButtonSecondaryText,
                    { color: theme.colors.text },
                  ]}
                >
                  {t('common.cancel') || 'Hủy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Processing Overlay */}
      {processing && !result && !showPasswordForm && (
        <View
          style={[
            styles.processingOverlay,
            { backgroundColor: 'rgba(0,0,0,0.8)' },
          ]}
        >
          <View
            style={[
              styles.processingContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text
              style={[
                Typography.bodyMedium,
                styles.processingText,
                { color: theme.colors.text },
              ]}
            >
              {message}
            </Text>
          </View>
        </View>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  overlaySection: {
    flex: 1,
  },
  middleSection: {
    flexDirection: 'row',
    height: 300,
  },
  faceArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  faceFrame: {
    width: 200,
    height: 250,
    borderWidth: 2,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 3,
  },
  topLeft: {
    top: -3,
    left: -3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: -3,
    right: -3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: -3,
    left: -3,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: -3,
    right: -3,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  faceIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsTextContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  instructionsText: {
    textAlign: 'center',
  },
  captureContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContainer: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 32,
  },
  resultText: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontWeight: '600',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContainer: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 32,
  },
  processingText: {
    textAlign: 'center',
    marginTop: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionButtonText: {
    fontWeight: '600',
  },
  permissionButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  permissionButtonSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonSecondaryText: {
    fontWeight: '600',
  },
  errorActionsContainer: {
    width: '100%',
    gap: 12,
  },
  usePasswordButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usePasswordButtonText: {
    fontWeight: '600',
  },
}) as any;
