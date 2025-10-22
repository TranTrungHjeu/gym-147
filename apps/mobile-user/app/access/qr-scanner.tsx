import { accessService } from '@/services/member/access.service';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react-native';
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

export default function QRScannerScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scanned || processing) return;

    setScanned(true);
    setProcessing(true);
    setResult(null);
    setMessage('Processing QR code...');

    try {
      // Validate the scanned data
      if (!data || typeof data !== 'string' || data.trim().length === 0) {
        setResult('error');
        setMessage('Invalid QR code scanned');
        return;
      }

      // First validate the QR code
      const validationResponse = await accessService.validateQRCode(
        data.trim()
      );

      if (!validationResponse.success) {
        setResult('error');
        setMessage(validationResponse.error || 'Invalid QR code');
        return;
      }

      if (!validationResponse.data?.valid) {
        setResult('error');
        setMessage('QR code is invalid or expired');
        return;
      }

      // Check in with QR code
      const checkInResponse = await accessService.checkIn({
        method: 'QR',
        data: data.trim(),
        location: 'Main Entrance',
      });

      if (checkInResponse.success) {
        setResult('success');
        setMessage('Successfully checked in!');

        // Auto navigate back after 2 seconds
        setTimeout(() => {
          router.back();
        }, 2000);
      } else {
        setResult('error');
        setMessage(checkInResponse.error || 'Failed to check in');
      }
    } catch (error: any) {
      console.error('QR scan error:', error);
      setResult('error');
      setMessage(
        error.message || 'An error occurred while processing the QR code'
      );
    } finally {
      setProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
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
            Camera permission is required to scan QR codes
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
          QR Code Scanner
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          {/* Overlay */}
          <View style={styles.overlay}>
            {/* Top overlay */}
            <View
              style={[
                styles.overlaySection,
                { backgroundColor: 'rgba(0,0,0,0.5)' },
              ]}
            />

            {/* Middle section with scanning area */}
            <View style={styles.middleSection}>
              <View
                style={[
                  styles.overlaySection,
                  { backgroundColor: 'rgba(0,0,0,0.5)' },
                ]}
              />

              <View style={styles.scanArea}>
                <View
                  style={[
                    styles.scanFrame,
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
              Position the QR code within the frame
            </Text>
          </View>
        </CameraView>
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
                onPress={resetScanner}
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
    height: 200,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
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
  instructionsContainer: {
    position: 'absolute',
    bottom: 100,
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
