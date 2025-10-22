import { accessService } from '@/services/member/access.service';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, User, XCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FaceRecognitionScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const captureAndProcess = async () => {
    if (processing || captured) return;

    setProcessing(true);
    setResult(null);
    setMessage('Capturing face...');
    setCaptured(true);

    try {
      // In a real implementation, you would capture the image from the camera
      // For demo purposes, we'll simulate the process

      // Simulate face detection delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setMessage('Processing face recognition...');

      // Simulate face recognition processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // For demo, we'll randomly succeed or fail
      const isSuccess = Math.random() > 0.3; // 70% success rate for demo

      if (isSuccess) {
        // Simulate successful face recognition
        // In a real implementation, you would capture the image and convert to base64
        // For demo purposes, we'll use a valid base64 string format
        const mockBase64Image =
          'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

        const checkInResponse = await accessService.checkIn({
          method: 'FACE',
          data: mockBase64Image,
          location: 'Main Entrance',
        });

        if (checkInResponse.success) {
          setResult('success');
          setMessage('Face recognized! Successfully checked in.');

          // Auto navigate back after 2 seconds
          setTimeout(() => {
            router.back();
          }, 2000);
        } else {
          setResult('error');
          setMessage(checkInResponse.error || 'Failed to check in');
        }
      } else {
        setResult('error');
        setMessage(
          'Face not recognized. Please try again or use another method.'
        );
      }
    } catch (error: any) {
      console.error('Face recognition error:', error);
      setResult('error');
      setMessage(error.message || 'An error occurred during face recognition');
    } finally {
      setProcessing(false);
    }
  };

  const resetRecognition = () => {
    setCaptured(false);
    setProcessing(false);
    setResult(null);
    setMessage('');
  };

  if (!permission) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionText, { color: theme.colors.text }]}>
            Requesting camera permission...
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
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionText, { color: theme.colors.text }]}>
            Camera permission is required for face recognition
          </Text>
          <TouchableOpacity
            style={[
              styles.permissionButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={requestPermission}
          >
            <Text
              style={[
                styles.permissionButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              Grant Permission
            </Text>
          </TouchableOpacity>
        </View>
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
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textInverse }]}>
          Face Recognition
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing="front">
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
              Position your face within the frame
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
          onPress={captureAndProcess}
          disabled={captured || processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <Text
              style={[
                styles.captureButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              {captured ? 'Processing...' : 'Capture Face'}
            </Text>
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
              <TouchableOpacity
                style={[
                  styles.retryButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={resetRecognition}
              >
                <Text
                  style={[
                    styles.retryButtonText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  Try Again
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Processing Overlay */}
      {processing && (
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    minWidth: 200,
    alignItems: 'center',
  },
  captureButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
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
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    ...Typography.bodyMedium,
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
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
});
