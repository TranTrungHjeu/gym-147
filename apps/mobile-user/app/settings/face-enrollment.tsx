import { AlertModal } from '@/components/ui/AlertModal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useAnalyticsActions } from '@/hooks/useAnalytics';
import { userService } from '@/services/identity/user.service';
import { debugApi } from '@/utils/debug';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle,
  Settings,
  User,
  XCircle,
  Camera,
  RotateCcw,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FaceEnrollmentScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const cameraRef = useRef<any>(null);
  const { showSuccess, showError, ToastComponent } = useToast();
  const analytics = useAnalyticsActions();

  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');
  const [captured, setCaptured] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(
    null
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalData, setErrorModalData] = useState<{
    title: string;
    message: string;
    suggestion?: string;
  } | null>(null);
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

  // Track screen view
  useEffect(() => {
    analytics.trackScreenView('face_enrollment');
  }, []);

  // Open app settings for camera permission
  const openAppSettings = async () => {
    try {
      analytics.trackButtonClick('open_settings', 'face_enrollment');
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      analytics.trackError('open_settings_failed', String(error));
      setErrorModalData({
        title: t('faceLogin.openSettingsErrorTitle', {
          defaultValue: 'Không thể mở cài đặt',
        }),
        message: t('faceLogin.openSettingsErrorMessage', {
          defaultValue:
            'Vui lòng mở cài đặt thủ công và cấp quyền camera cho ứng dụng.',
        }),
      });
      setErrorModalVisible(true);
    }
  };

  const captureImage = async () => {
    if (processing || captured || !cameraRef.current) return;

    try {
      analytics.trackButtonClick('capture_image', 'face_enrollment');
      setProcessing(true);
      setResult(null);
      setMessage(
        t('faceLogin.capturing', {
          defaultValue: 'Đang chụp ảnh...',
        })
      );

      // Take picture
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: false,
      });

      if (!photo) {
        throw new Error('Failed to capture image: photo is null');
      }

      if (!photo.uri) {
        throw new Error('Failed to capture image: photo.uri is missing');
      }

      // Store both URI and base64 if available
      setCapturedImageUri(photo.uri);
      if (photo.base64) {
        // Store base64 directly to avoid reading from file later
        setCapturedImageBase64(photo.base64);
      }

      setCaptured(true);
      setPreviewMode(true);
      setProcessing(false);
      setMessage('');
      analytics.trackFeatureUsage('face_capture_success');
    } catch (error: any) {
      analytics.trackError(
        'face_capture_failed',
        error.message || 'Unknown error'
      );
      setProcessing(false);
      setResult('error');
      const errorInfo = parseFaceEnrollmentError(error);
      setMessage(errorInfo.message);

      // Show error modal with suggestion if available
      if (errorInfo.suggestion) {
        setErrorModalData({
          title: t('faceLogin.captureError', {
            defaultValue: 'Không thể chụp ảnh',
          }),
          message: errorInfo.message,
          suggestion: errorInfo.suggestion,
        });
        setErrorModalVisible(true);
      } else {
        showError(errorInfo.message);
      }
    }
  };

  // Parse error to get specific error type and message
  const parseFaceEnrollmentError = (
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
        t('faceLogin.enrollError', {
          defaultValue: 'Không thể đăng ký khuôn mặt. Vui lòng thử lại.',
        }),
    };
  };

  // Check network connection before enroll
  const checkNetworkBeforeEnroll = async (): Promise<boolean> => {
    try {
      const isConnected = await debugApi.testConnection();
      if (!isConnected) {
        analytics.trackError('network_check_failed', 'No network connection');
        setErrorModalData({
          title: t('faceLogin.networkErrorTitle', {
            defaultValue: 'Không có kết nối mạng',
          }),
          message: t('faceLogin.networkErrorMessage', {
            defaultValue:
              'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng của bạn.',
          }),
          suggestion: t('faceLogin.errorNetworkSuggestion', {
            defaultValue: 'Kiểm tra kết nối internet và thử lại.',
          }),
        });
        setErrorModalVisible(true);
        return false;
      }
      return true;
    } catch (error) {
      analytics.trackError('network_check_error', String(error));
      setErrorModalData({
        title: t('faceLogin.networkErrorTitle', {
          defaultValue: 'Lỗi kiểm tra mạng',
        }),
        message: t('faceLogin.networkErrorMessage', {
          defaultValue: 'Không thể kiểm tra kết nối mạng.',
        }),
      });
      setErrorModalVisible(true);
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

  const confirmAndEnroll = async () => {
    if (!capturedImageUri || processing) return;

    // Check network before enroll
    const networkOk = await checkNetworkBeforeEnroll();
    if (!networkOk) {
      return;
    }

    try {
      setProcessing(true);
      setMessage(
        t('faceLogin.processingEnrollment', {
          defaultValue: 'Đang xử lý và lưu trữ khuôn mặt...',
        })
      );

      // Use base64 if already captured, otherwise read from file
      let base64Image: string;

      if (capturedImageBase64) {
        // Use base64 that was captured directly
        base64Image = capturedImageBase64;
      } else if (capturedImageUri) {
        // Fallback: read from file
        try {
          base64Image = await FileSystem.readAsStringAsync(capturedImageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        } catch (fileError: any) {
          throw new Error(
            `Failed to read image file: ${
              fileError?.message || 'Unknown error'
            }`
          );
        }
      } else {
        throw new Error('No image data available');
      }

      const imageDataUri = `data:image/jpeg;base64,${base64Image}`;

      // Validate image before sending
      const validation = validateImage(imageDataUri);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid image');
      }

      // Enroll face encoding
      const enrollResponse = await userService.enrollFaceEncoding(imageDataUri);

      if (enrollResponse.success) {
        analytics.trackFeatureUsage('face_enrollment_success');
        setResult('success');
        setMessage(
          t('faceLogin.enrollSuccess', {
            defaultValue: 'Đăng ký khuôn mặt thành công!',
          })
        );
        showSuccess(
          t('faceLogin.enrollSuccess', {
            defaultValue: 'Đăng ký khuôn mặt thành công!',
          })
        );

        // Auto navigate back after 2 seconds with cleanup
        navigationTimeoutRef.current = setTimeout(() => {
          router.back();
          navigationTimeoutRef.current = null;
        }, 2000);
      } else {
        // Parse error for better UX
        const errorInfo = parseFaceEnrollmentError(enrollResponse);
        analytics.trackError('face_enrollment_failed', errorInfo.message);

        setResult('error');
        setMessage(errorInfo.message);
        setPreviewMode(false);
        setCaptured(false);
        setCapturedImageUri(null);
        setCapturedImageBase64(null);

        // Show error modal with suggestion
        if (errorInfo.suggestion) {
          setErrorModalData({
            title: t('faceLogin.enrollError', {
              defaultValue: 'Đăng ký thất bại',
            }),
            message: errorInfo.message,
            suggestion: errorInfo.suggestion,
          });
          setErrorModalVisible(true);
        } else {
          showError(errorInfo.message);
        }
      }
    } catch (error: any) {
      const errorInfo = parseFaceEnrollmentError(error);
      analytics.trackError('face_enrollment_exception', errorInfo.message);

      setResult('error');
      setMessage(errorInfo.message);
      setPreviewMode(false);
      setCaptured(false);
      setCapturedImageUri(null);
      setCapturedImageBase64(null);

      // Show error modal with suggestion
      if (errorInfo.suggestion) {
        setErrorModalData({
          title: t('faceLogin.enrollError', {
            defaultValue: 'Đăng ký thất bại',
          }),
          message: errorInfo.message,
          suggestion: errorInfo.suggestion,
        });
        setErrorModalVisible(true);
      } else {
        showError(errorInfo.message);
      }
    } finally {
      setProcessing(false);
    }
  };

  const retakePhoto = () => {
    setPreviewMode(false);
    setCaptured(false);
    setCapturedImageUri(null);
    setCapturedImageBase64(null);
    setResult(null);
    setMessage('');
  };

  const resetRecognition = () => {
    // Cancel navigation timeout if exists
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }

    setCaptured(false);
    setProcessing(false);
    setResult(null);
    setMessage('');
    setPreviewMode(false);
    setCapturedImageUri(null);
    setCapturedImageBase64(null);
  };

  // Handle back navigation during processing
  const handleBackPress = () => {
    if (processing) {
      analytics.trackButtonClick('back_during_processing', 'face_enrollment');
      setErrorModalData({
        title: t('faceLogin.backPressTitle', {
          defaultValue: 'Đang xử lý',
        }),
        message: t('faceLogin.backPressMessage', {
          defaultValue:
            'Đang xử lý đăng ký khuôn mặt. Bạn có chắc muốn quay lại?',
        }),
      });
      setErrorModalVisible(true);
      return;
    }
    router.back();
  };

  const handleConfirmBack = () => {
    // Cancel navigation timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
    resetRecognition();
    router.back();
  };

  if (!permission) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionText, { color: theme.colors.text }]}>
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
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            disabled={processing}
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t('faceLogin.title', { defaultValue: 'Đăng ký khuôn mặt' })}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.permissionContainer}>
          <User size={64} color={theme.colors.textSecondary} />
          <Text
            style={[
              styles.permissionText,
              { color: theme.colors.text },
              { marginTop: 16 },
            ]}
          >
            {isPermanentlyDenied
              ? t('faceLogin.permissionPermanentlyDenied', {
                  defaultValue:
                    'Quyền truy cập camera đã bị từ chối. Vui lòng cấp quyền trong Cài đặt để sử dụng tính năng đăng ký khuôn mặt.',
                })
              : t('faceLogin.permissionRequired', {
                  defaultValue:
                    'Cần quyền truy cập camera để đăng ký khuôn mặt',
                })}
          </Text>

          {!isPermanentlyDenied ? (
            <Button
              title={t('faceLogin.grantPermission', {
                defaultValue: 'Cấp quyền',
              })}
              onPress={requestPermission}
              fullWidth
              style={styles.permissionButton}
            />
          ) : (
            <View style={styles.permissionButtonsContainer}>
              <Button
                title={t('faceLogin.openSettings', {
                  defaultValue: 'Mở Cài đặt',
                })}
                onPress={openAppSettings}
                fullWidth
                style={styles.permissionButton}
              />
              <Button
                title={t('common.cancel', { defaultValue: 'Hủy' })}
                onPress={() => router.back()}
                variant="outline"
                fullWidth
                style={styles.permissionButtonSecondary}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Preview mode
  if (previewMode && capturedImageUri) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={processing ? handleBackPress : retakePhoto}
            disabled={processing && !result}
          >
            <RotateCcw size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t('faceLogin.preview', { defaultValue: 'Xem trước' })}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.previewContainer}>
          <Image
            source={{ uri: capturedImageUri }}
            style={styles.previewImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.actionContainer}>
          <Button
            title={t('faceLogin.retake', { defaultValue: 'Chụp lại' })}
            onPress={retakePhoto}
            variant="outline"
            disabled={processing}
            style={styles.actionButton}
          />

          <Button
            title={t('faceLogin.confirm', { defaultValue: 'Xác nhận' })}
            onPress={confirmAndEnroll}
            loading={processing}
            disabled={processing}
            style={styles.actionButton}
          />
        </View>

        {processing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.processingText, { color: theme.colors.text }]}>
              {message}
            </Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('faceLogin.title', { defaultValue: 'Đăng ký khuôn mặt' })}
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
            <Text
              style={[
                styles.instructionsText,
                { color: theme.colors.textInverse },
              ]}
            >
              {t('faceLogin.captureInstructions', {
                defaultValue:
                  'Đặt khuôn mặt của bạn trong khung và đảm bảo ánh sáng đủ',
              })}
            </Text>
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
          onPress={captureImage}
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

            <Text style={[styles.resultText, { color: theme.colors.text }]}>
              {message}
            </Text>

            {result === 'error' && (
              <Button
                title={t('faceLogin.tryAgain', { defaultValue: 'Thử lại' })}
                onPress={resetRecognition}
                style={styles.retryButton}
              />
            )}
          </View>
        </View>
      )}

      {/* Processing Overlay */}
      {processing && !result && (
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
            <Text style={[styles.processingText, { color: theme.colors.text }]}>
              {message}
            </Text>
          </View>
        </View>
      )}

      {/* Toast Component */}
      <ToastComponent />

      {/* Error Modal with Suggestions */}
      <AlertModal
        visible={errorModalVisible}
        title={
          errorModalData?.title || t('common.error', { defaultValue: 'Lỗi' })
        }
        message={errorModalData?.message || ''}
        suggestion={errorModalData?.suggestion}
        type="error"
        buttonText={
          errorModalData?.title ===
          t('faceLogin.backPressTitle', { defaultValue: 'Đang xử lý' })
            ? t('common.confirm', { defaultValue: 'Xác nhận' })
            : t('common.ok', { defaultValue: 'OK' })
        }
        showCancel={
          errorModalData?.title ===
          t('faceLogin.backPressTitle', { defaultValue: 'Đang xử lý' })
        }
        onClose={() => {
          setErrorModalVisible(false);
        }}
        onConfirm={() => {
          if (
            errorModalData?.title ===
            t('faceLogin.backPressTitle', { defaultValue: 'Đang xử lý' })
          ) {
            handleConfirmBack();
          }
        }}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerTitle: {
    ...Typography.h3,
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
  instructionsText: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
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
    ...Typography.bodyMedium,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    marginTop: 16,
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
    ...Typography.bodyMedium,
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
    ...Typography.bodyMedium,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    marginTop: 16,
  },
  permissionButtonsContainer: {
    width: '100%',
    gap: 12,
    marginTop: 16,
  },
  permissionButtonSecondary: {
    marginTop: 0,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
  },
  previewImage: {
    width: '100%',
    height: '80%',
    borderRadius: 16,
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
