import { accessService } from '@/services/member/access.service';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle,
  CreditCard,
  XCircle,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RFIDScannerScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const [rfidTag, setRfidTag] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');

  const handleScanRFID = async () => {
    if (!rfidTag.trim()) {
      Alert.alert(t('common.error'), t('access.rfid.scanner.enterTagRequired'));
      return;
    }

    setProcessing(true);
    setResult(null);
    setMessage(t('access.rfid.scanner.processing'));

    try {
      // First validate the RFID tag
      const validationResponse = await accessService.validateRFIDTag(
        rfidTag.trim()
      );

      if (!validationResponse.success) {
        setResult('error');
        setMessage(
          validationResponse.error || t('access.rfid.scanner.invalidTag')
        );
        return;
      }

      if (!validationResponse.data?.valid) {
        setResult('error');
        setMessage(t('access.rfid.scanner.tagNotRegistered'));
        return;
      }

      // Check in with RFID
      const checkInResponse = await accessService.checkIn({
        method: 'RFID',
        data: rfidTag.trim(),
        location: 'Main Entrance',
      });

      if (checkInResponse.success) {
        setResult('success');
        setMessage(t('access.rfid.scanner.checkInSuccess'));

        // Auto navigate back after 2 seconds
        setTimeout(() => {
          router.back();
        }, 2000);
      } else {
        setResult('error');
        setMessage(
          checkInResponse.error || t('access.rfid.scanner.checkInFailed')
        );
      }
    } catch (error) {
      console.error('RFID scan error:', error);
      setResult('error');
      setMessage(t('access.rfid.scanner.errorProcessing'));
    } finally {
      setProcessing(false);
    }
  };

  const resetScanner = () => {
    setRfidTag('');
    setProcessing(false);
    setResult(null);
    setMessage('');
  };

  const handleDemoRFID = () => {
    // Generate a demo RFID tag for testing
    const demoTag =
      'RFID' + Math.random().toString(36).substr(2, 8).toUpperCase();
    setRfidTag(demoTag);
  };

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
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('access.rfid.scanner.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* RFID Icon */}
        <View style={styles.iconContainer}>
          <View
            style={[
              styles.iconBackground,
              { backgroundColor: theme.colors.primary + '20' },
            ]}
          >
            <CreditCard size={64} color={theme.colors.primary} />
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text
            style={[styles.instructionsTitle, { color: theme.colors.text }]}
          >
            {t('access.rfid.scanner.cardScanner')}
          </Text>
          <Text
            style={[
              styles.instructionsText,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t('access.rfid.scanner.instructions')}
          </Text>
        </View>

        {/* RFID Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
            {t('access.rfid.scanner.tagNumber')}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            value={rfidTag}
            onChangeText={setRfidTag}
            placeholder={t('access.rfid.scanner.enterTagNumber')}
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!processing}
          />
        </View>

        {/* Demo Button */}
        <TouchableOpacity
          style={[styles.demoButton, { borderColor: theme.colors.primary }]}
          onPress={handleDemoRFID}
          disabled={processing}
        >
          <Text
            style={[styles.demoButtonText, { color: theme.colors.primary }]}
          >
            {t('access.rfid.scanner.useDemoTag')}
          </Text>
        </TouchableOpacity>

        {/* Scan Button */}
        <TouchableOpacity
          style={[
            styles.scanButton,
            {
              backgroundColor: rfidTag.trim()
                ? theme.colors.primary
                : theme.colors.border,
            },
          ]}
          onPress={handleScanRFID}
          disabled={!rfidTag.trim() || processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <Text
              style={[
                styles.scanButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              {t('access.rfid.scanner.scanTag')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text
            style={[styles.infoText, { color: theme.colors.textSecondary }]}
          >
            {t('access.rfid.scanner.infoMessage')}
          </Text>
        </View>
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
                  {t('access.rfid.scanner.tryAgain')}
                </Text>
              </TouchableOpacity>
            )}
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
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backButton: {
    padding: 8,
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  instructionsTitle: {
    ...Typography.h4,
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionsText: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    ...Typography.bodyMedium,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Typography.bodyMedium,
    fontSize: 16,
    letterSpacing: 1,
  },
  demoButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  demoButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  scanButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  scanButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  infoContainer: {
    alignItems: 'center',
  },
  infoText: {
    ...Typography.bodySmall,
    textAlign: 'center',
    lineHeight: 18,
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
});
