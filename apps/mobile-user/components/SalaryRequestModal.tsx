import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';

interface SalaryRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onRequest: () => Promise<void>;
  trainerId?: string;
}

export const SalaryRequestModal: React.FC<SalaryRequestModalProps> = ({
  visible,
  onClose,
  onRequest,
  trainerId,
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handleRequest = async () => {
    if (!trainerId) {
      Alert.alert('Error', 'Trainer ID is required');
      return;
    }

    try {
      setIsLoading(true);
      await onRequest();
      Alert.alert(
        'Thành công',
        'Yêu cầu xét lương đã được gửi đến quản trị viên. Bạn sẽ nhận được thông báo khi lương được cài đặt.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Yêu cầu xét lương</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.message}>
              Bạn chưa có thông tin lương. Vui lòng gửi yêu cầu xét lương đến quản trị viên để
              được cài đặt lương.
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Để sau</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.requestButton, isLoading && styles.buttonDisabled]}
              onPress={handleRequest}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.requestButtonText}>Gửi yêu cầu</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  message: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  requestButton: {
    backgroundColor: '#007AFF',
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

