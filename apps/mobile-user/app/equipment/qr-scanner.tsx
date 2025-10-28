import { useAuth } from '@/contexts/AuthContext';
import { equipmentService } from '@/services/member/equipment.service';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function QRScannerScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Handle QR code scan
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || scanning) return;

    setScanned(true);
    setScanning(true);

    try {
      // Validate QR code with backend
      const response = await equipmentService.validateQRCode(data);

      if (response.success && response.data) {
        const { equipment } = response.data;

        Alert.alert(
          t('common.success'),
          `${t('equipment.scanToStart')}: ${equipment.name}`,
          [
            {
              text: t('common.ok'),
              onPress: () => {
                // Navigate to equipment detail
                router.push(`/equipment/${equipment.id}`);
              },
            },
          ]
        );
      } else {
        Alert.alert(t('common.error'), t('equipment.invalidQR'), [
          {
            text: t('common.ok'),
            onPress: () => {
              setScanned(false);
              setScanning(false);
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error('Error validating QR code:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('equipment.invalidQR'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              setScanned(false);
              setScanning(false);
            },
          },
        ]
      );
    }
  };

  // Request camera permission if not granted
  if (!permission) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            {t('common.loading')}...
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
        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: theme.colors.border }]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t('equipment.qrScanner')}
          </Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.permissionContainer}>
          <Camera size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>
            {t('equipment.cameraPermissionRequired')}
          </Text>
          <Text
            style={[
              styles.permissionMessage,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t('equipment.cameraPermissionMessage')}
          </Text>
          <TouchableOpacity
            style={[
              styles.permissionButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>
              {t('equipment.grantPermission')}
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
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('equipment.qrScanner')}
        </Text>
        <View style={styles.backButton} />
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
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              {t('equipment.scanToStart')}
            </Text>
            <Text style={styles.instructionSubtext}>
              {t('equipment.alignQRCode')}
            </Text>
          </View>
        </CameraView>
      </View>

      {/* Rescan Button */}
      {scanned && !scanning && (
        <View style={styles.rescanContainer}>
          <TouchableOpacity
            style={[
              styles.rescanButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setScanned(false)}
          >
            <Text style={styles.rescanButtonText}>
              {t('equipment.scanAgain')}
            </Text>
          </TouchableOpacity>
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
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    ...Typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.bodyMedium,
    marginTop: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    ...Typography.h3,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionMessage: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    ...Typography.buttonMedium,
    color: '#fff',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fff',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4CAF50',
    borderWidth: 4,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: -2,
    right: -2,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  instructions: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: 16,
  },
  instructionText: {
    ...Typography.h4,
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  instructionSubtext: {
    ...Typography.bodySmall,
    color: '#e0e0e0',
    textAlign: 'center',
  },
  rescanContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  rescanButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rescanButtonText: {
    ...Typography.buttonMedium,
    color: '#fff',
  },
});
