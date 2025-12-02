import { useAuth } from '@/contexts/AuthContext';
import { equipmentService } from '@/services/member/equipment.service';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle,
  Info,
  XCircle,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
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
  const [loading, setLoading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
    equipmentId?: string;
    equipmentName?: string;
    equipmentSubtitle?: string;
    showViewDetails?: boolean;
  } | null>(null);

  // Use ref to track if currently processing to prevent multiple scans
  const isProcessing = useRef(false);
  const lastScannedData = useRef<string | null>(null);
  const lastScanTime = useRef<number>(0);
  const lastResultType = useRef<'success' | 'error' | 'info'>('success');
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const apiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic cooldown periods (in milliseconds)
  const COOLDOWN_SUCCESS = 2000; // 2s after successful scan
  const COOLDOWN_ERROR = 1000; // 1s after error (allow quick retry)
  const COOLDOWN_INFO = 1500; // 1.5s after info/warning

  // Helper function to reset scan state
  const resetScanState = () => {
    setScanned(false);
    setScanning(false);
    isProcessing.current = false;
    // Don't reset lastScannedData and lastScanTime to prevent immediate re-scan
  };

  // Helper function to fully reset for new scan
  const allowNewScan = useCallback(() => {
    console.log('[RESET] Resetting scanner for new scan...');

    // Clear any pending timeouts
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
    if (apiTimeoutRef.current) {
      clearTimeout(apiTimeoutRef.current);
      apiTimeoutRef.current = null;
    }

    setScanned(false);
    setScanning(false);
    setLoading(false);
    setShowModal(false);
    isProcessing.current = false;
    lastScannedData.current = null;
    // Don't reset lastScanTime to prevent immediate re-scan

    console.log('[SUCCESS] Scanner ready for new scan');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      if (apiTimeoutRef.current) {
        clearTimeout(apiTimeoutRef.current);
      }
    };
  }, []);

  // Reset scanner when screen is focused (e.g., when navigating back)
  useFocusEffect(
    useCallback(() => {
      console.log('[NAV] QR Scanner screen focused - resetting state');
      // Reset all states when screen becomes focused
      allowNewScan();
      return () => {
        console.log('[NAV] QR Scanner screen unfocused');
      };
    }, [allowNewScan])
  );

  // Handle QR code scan
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Prevent multiple scans
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTime.current;

    // Dynamic debounce based on last result type
    const cooldownTime =
      lastResultType.current === 'error'
        ? COOLDOWN_ERROR
        : lastResultType.current === 'info'
        ? COOLDOWN_INFO
        : COOLDOWN_SUCCESS;

    if (timeSinceLastScan < cooldownTime) {
      const remaining = Math.ceil((cooldownTime - timeSinceLastScan) / 1000);
      console.log(
        `[TIMER] Cooldown: ${remaining}s remaining (${lastResultType.current})`
      );
      return;
    }

    // Prevent scanning while processing
    if (isProcessing.current) {
      console.log('[PROCESS] Already processing a scan');
      return;
    }

    if (scanned || scanning) {
      console.log('[CAMERA] Camera already scanned');
      return;
    }

    // Mark as processing
    isProcessing.current = true;
    lastScannedData.current = data;
    lastScanTime.current = now;

    console.log('[SUCCESS] QR Scan started:', data.substring(0, 20) + '...');

    setScanned(true);
    setScanning(true);
    setLoading(true);

    try {
      // Add API timeout (10 seconds)
      const apiPromise = equipmentService.validateQRCode(data);
      const timeoutPromise = new Promise((_, reject) => {
        apiTimeoutRef.current = setTimeout(() => {
          reject(new Error('Request timeout. Please try again.'));
        }, 10000);
      });

      const response = (await Promise.race([
        apiPromise,
        timeoutPromise,
      ])) as any;

      // Clear API timeout if successful
      if (apiTimeoutRef.current) {
        clearTimeout(apiTimeoutRef.current);
        apiTimeoutRef.current = null;
      }

      setLoading(false);

      console.log('[SUCCESS] QR Validation Response:', {
        success: response.success,
        data: response.data,
        message: response.message,
      });

      if (response.success && response.data) {
        const { equipment, canUse, canQueue, reason } = response.data;

        console.log('[SUCCESS] QR Scan Result:', {
          equipment: equipment?.name,
          canUse,
          canQueue,
          reason,
        });

        // Equipment is unavailable (MAINTENANCE or OUT_OF_ORDER)
        if (reason === 'MAINTENANCE' || reason === 'OUT_OF_ORDER') {
          // Haptic feedback for warning
          Vibration.vibrate([0, 100, 100, 100]);
          lastResultType.current = 'info';

          const statusKey =
            reason === 'MAINTENANCE' ? 'maintenance' : 'outoforder';

          // Build equipment subtitle with location and model info
          const equipmentSubtitle = [
            equipment.location,
            equipment.brand && equipment.model
              ? `${equipment.brand} ${equipment.model}`
              : equipment.brand || equipment.model,
          ]
            .filter(Boolean)
            .join(' • ');

          setModalData({
            type: 'warning',
            title: t(`equipment.status.${statusKey}`),
            message: t(`equipment.statusMessages.${statusKey}`),
            equipmentId: equipment.id,
            equipmentName: equipment.name,
            equipmentSubtitle,
            showViewDetails: true,
          });
          setShowModal(true);

          // Auto reset after 1.5s (info cooldown)
          navigationTimeoutRef.current = setTimeout(() => {
            console.log(
              '[TIMER] Auto-reset timeout triggered (MAINTENANCE/OUT_OF_ORDER)'
            );
            setShowModal(false);
            allowNewScan();
          }, 1500);
          return;
        }

        // Equipment is RESERVED - can only join queue
        if (reason === 'RESERVED') {
          // Single vibration for info
          Vibration.vibrate(100);
          lastResultType.current = 'info';

          const equipmentSubtitle = [
            equipment.location,
            equipment.brand && equipment.model
              ? `${equipment.brand} ${equipment.model}`
              : equipment.brand || equipment.model,
          ]
            .filter(Boolean)
            .join(' • ');

          setModalData({
            type: 'info',
            title: t('equipment.status.reserved'),
            message: t('equipment.statusMessages.reserved'),
            equipmentId: equipment.id,
            equipmentName: equipment.name,
            equipmentSubtitle,
            showViewDetails: true,
          });
          setShowModal(true);

          // Auto reset after 1.5s (info cooldown)
          navigationTimeoutRef.current = setTimeout(() => {
            console.log('[TIMER] Auto-reset timeout triggered (RESERVED)');
            setShowModal(false);
            allowNewScan();
          }, 1500);
          return;
        }

        // Equipment is AVAILABLE - navigate immediately
        if (reason === 'AVAILABLE' && canUse) {
          // Haptic feedback for success
          Vibration.vibrate(50);
          lastResultType.current = 'success';

          const equipmentSubtitle = [
            equipment.location,
            equipment.brand && equipment.model
              ? `${equipment.brand} ${equipment.model}`
              : equipment.brand || equipment.model,
          ]
            .filter(Boolean)
            .join(' • ');

          setModalData({
            type: 'success',
            title: t('equipment.status.available'),
            message: t('equipment.statusMessages.available'),
            equipmentId: equipment.id,
            equipmentName: equipment.name,
            equipmentSubtitle,
            showViewDetails: false,
          });
          setShowModal(true);

          // Auto navigate after 1 second
          navigationTimeoutRef.current = setTimeout(() => {
            console.log(
              '[TIMER] Auto-navigate timeout triggered (AVAILABLE) →',
              equipment.id
            );
            setShowModal(false);
            router.push(`/equipment/${equipment.id}`);
          }, 1000);
          return;
        }

        // Equipment is IN_USE - show queue option
        if (reason === 'IN_USE' && canQueue) {
          // Single vibration for info
          Vibration.vibrate(100);
          lastResultType.current = 'info';

          const equipmentSubtitle = [
            equipment.location,
            equipment.brand && equipment.model
              ? `${equipment.brand} ${equipment.model}`
              : equipment.brand || equipment.model,
          ]
            .filter(Boolean)
            .join(' • ');

          setModalData({
            type: 'info',
            title: t('equipment.status.inuse'),
            message: t('equipment.statusMessages.inuse'),
            equipmentId: equipment.id,
            equipmentName: equipment.name,
            equipmentSubtitle,
            showViewDetails: true,
          });
          setShowModal(true);

          // Auto reset after 1.5s (info cooldown)
          navigationTimeoutRef.current = setTimeout(() => {
            console.log('[TIMER] Auto-reset timeout triggered (IN_USE)');
            setShowModal(false);
            allowNewScan();
          }, 1500);
          return;
        }

        // Fallback: No condition matched - unexpected state
        console.warn('[WARN] Unexpected QR scan state:', {
          equipment: equipment?.name,
          canUse,
          canQueue,
          reason,
          status: equipment?.status,
        });

        // Show generic success with equipment info
        Vibration.vibrate(50);
        lastResultType.current = 'info';

        const equipmentSubtitle = [
          equipment.location,
          equipment.brand && equipment.model
            ? `${equipment.brand} ${equipment.model}`
            : equipment.brand || equipment.model,
        ]
          .filter(Boolean)
          .join(' • ');

        setModalData({
          type: 'info',
          title: t('common.info'),
          message: t('equipment.scanToStart'),
          equipmentId: equipment.id,
          equipmentName: equipment.name,
          equipmentSubtitle,
          showViewDetails: true,
        });
        setShowModal(true);

        // Auto reset after 1.5s
        navigationTimeoutRef.current = setTimeout(() => {
          console.log('[TIMER] Auto-reset timeout triggered (FALLBACK)');
          setShowModal(false);
          allowNewScan();
        }, 1500);
      } else {
        // Invalid QR code or equipment not found
        // Haptic feedback for error
        Vibration.vibrate([0, 100, 50, 100]);
        lastResultType.current = 'error';

        setLoading(false);
        setModalData({
          type: 'error',
          title: t('common.error'),
          message: t('equipment.statusMessages.notFound'),
          showViewDetails: false,
        });
        setShowModal(true);

        // Auto reset after 1s (error cooldown - faster retry)
        navigationTimeoutRef.current = setTimeout(() => {
          console.log('[TIMER] Auto-reset timeout triggered (ERROR)');
          setShowModal(false);
          allowNewScan();
        }, 1000);
      }
    } catch (error: any) {
      // Haptic feedback for error
      Vibration.vibrate([0, 100, 50, 100]);
      lastResultType.current = 'error'; // Set result type

      setLoading(false);
      console.error('[ERROR] QR Scan Error:', {
        error: error.message,
        qrData: data.substring(0, 50), // Log first 50 chars for debugging
        timestamp: new Date().toISOString(),
        stack: error.stack?.substring(0, 200), // Log stack trace
      });

      setModalData({
        type: 'error',
        title: t('common.error'),
        message: t('equipment.statusMessages.error'),
        showViewDetails: false,
      });
      setShowModal(true);

      // Auto reset after 1s (error cooldown - faster retry)
      navigationTimeoutRef.current = setTimeout(() => {
        console.log('[TIMER] Auto-reset timeout triggered (CATCH ERROR)');
        setShowModal(false);
        allowNewScan();
      }, 1000);
    } finally {
      // Always reset processing flag and clear API timeout
      isProcessing.current = false;
      if (apiTimeoutRef.current) {
        clearTimeout(apiTimeoutRef.current);
        apiTimeoutRef.current = null;
      }
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
          enableTorch={torchOn}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          {/* Torch Toggle Button */}
          <TouchableOpacity
            style={[
              styles.torchButton,
              { backgroundColor: torchOn ? '#FFD700' : 'rgba(0,0,0,0.5)' },
            ]}
            onPress={() => setTorchOn(!torchOn)}
          >
            <Zap
              size={24}
              color={torchOn ? '#000000' : '#FFFFFF'}
              fill={torchOn ? '#000000' : 'none'}
            />
          </TouchableOpacity>

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
            {loading ? (
              <>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.instructionText}>
                  {t('common.loading')}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.instructionText}>
                  {t('equipment.scanToStart')}
                </Text>
                <Text style={styles.instructionSubtext}>
                  {t('equipment.alignQRCode')}
                </Text>
              </>
            )}
          </View>
        </CameraView>
      </View>

      {/* Result Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowModal(false);
          allowNewScan();
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            {/* Icon */}
            <View
              style={[
                styles.modalIcon,
                {
                  backgroundColor:
                    modalData?.type === 'success'
                      ? '#10B981'
                      : modalData?.type === 'warning'
                      ? '#F59E0B'
                      : modalData?.type === 'info'
                      ? '#3B82F6'
                      : '#EF4444',
                },
              ]}
            >
              {modalData?.type === 'success' && (
                <CheckCircle size={48} color="#FFFFFF" />
              )}
              {modalData?.type === 'warning' && (
                <AlertCircle size={48} color="#FFFFFF" />
              )}
              {modalData?.type === 'info' && <Info size={48} color="#FFFFFF" />}
              {modalData?.type === 'error' && (
                <XCircle size={48} color="#FFFFFF" />
              )}
            </View>

            {/* Equipment Name */}
            {modalData?.equipmentName && (
              <>
                <Text
                  style={[
                    styles.modalEquipmentName,
                    { color: theme.colors.text },
                  ]}
                >
                  {modalData.equipmentName}
                </Text>
                {modalData.equipmentSubtitle && (
                  <Text
                    style={[
                      styles.modalEquipmentSubtitle,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {modalData.equipmentSubtitle}
                  </Text>
                )}
              </>
            )}

            {/* Title */}
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {modalData?.title}
            </Text>

            {/* Message */}
            <Text
              style={[
                styles.modalMessage,
                { color: theme.colors.textSecondary },
              ]}
            >
              {modalData?.message}
            </Text>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              {modalData?.showViewDetails && (
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={() => {
                    setShowModal(false);
                    if (modalData?.equipmentId) {
                      router.push(`/equipment/${modalData.equipmentId}`);
                    }
                  }}
                >
                  <Text style={styles.modalButtonText}>
                    {t('equipment.actions.viewDetails')}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  modalData?.showViewDetails
                    ? { backgroundColor: theme.colors.border }
                    : { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => {
                  setShowModal(false);
                  allowNewScan();
                }}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    modalData?.showViewDetails && { color: theme.colors.text },
                  ]}
                >
                  {modalData?.showViewDetails
                    ? t('common.cancel')
                    : t('common.ok')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    gap: 12,
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
  torchButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalEquipmentName: {
    ...Typography.h3,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalEquipmentSubtitle: {
    ...Typography.bodySmall,
    marginBottom: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  modalTitle: {
    ...Typography.h4,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalMessage: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    ...Typography.buttonMedium,
    color: '#FFFFFF',
  },
});
