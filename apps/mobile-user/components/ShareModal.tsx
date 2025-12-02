import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { X, Link, Copy, Share2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  imageUrl?: string;
  shareUrl?: string;
  shareText?: string;
}

export default function ShareModal({
  visible,
  onClose,
  title,
  description,
  imageUrl,
  shareUrl,
  shareText,
}: ShareModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { showSuccess, ToastComponent } = useToast();

  const handleCopyLink = async () => {
    try {
      if (shareUrl) {
        await Clipboard.setStringAsync(shareUrl);
        showSuccess(
          t('share.linkCopied', { defaultValue: 'Link đã được sao chép' })
        );
      } else {
        showSuccess(
          t('share.textCopied', { defaultValue: 'Nội dung đã được sao chép' })
        );
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleShare = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        showSuccess(
          t('share.sharingNotAvailable', {
            defaultValue: 'Chia sẻ không khả dụng trên thiết bị này',
          })
        );
        return;
      }

      const shareContent = shareText || title;
      await Sharing.shareAsync(shareUrl || shareContent, {
        mimeType: 'text/plain',
        dialogTitle: t('share.share', { defaultValue: 'Chia sẻ' }),
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <SafeAreaView edges={['bottom']} style={styles.safeArea}>
            <View
              style={[styles.modal, { backgroundColor: theme.colors.background }]}
            >
              {/* Header */}
              <View
                style={[styles.header, { borderBottomColor: theme.colors.border }]}
              >
                <Text style={[styles.title, { color: theme.colors.text }]}>
                  {t('share.share', { defaultValue: 'Chia sẻ' })}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              {/* Preview */}
              <View style={styles.preview}>
                {imageUrl && (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.previewContent}>
                  <Text
                    style={[styles.previewTitle, { color: theme.colors.text }]}
                    numberOfLines={2}
                  >
                    {title}
                  </Text>
                  {description && (
                    <Text
                      style={[
                        styles.previewDescription,
                        { color: theme.colors.textSecondary },
                      ]}
                      numberOfLines={2}
                    >
                      {description}
                    </Text>
                  )}
                </View>
              </View>

              {/* Share Options */}
              <View style={styles.options}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    { backgroundColor: theme.colors.surface },
                  ]}
                  onPress={handleCopyLink}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: theme.colors.primary + '15' },
                    ]}
                  >
                    <Copy size={24} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.optionText, { color: theme.colors.text }]}>
                    {t('share.copyLink', { defaultValue: 'Sao chép link' })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.option,
                    { backgroundColor: theme.colors.surface },
                  ]}
                  onPress={handleShare}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: theme.colors.primary + '15' },
                    ]}
                  >
                    <Share2 size={24} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.optionText, { color: theme.colors.text }]}>
                    {t('share.shareVia', { defaultValue: 'Chia sẻ qua...' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <Button
                  title={t('common.close', { defaultValue: 'Đóng' })}
                  onPress={onClose}
                  variant="outline"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
      <ToastComponent />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    ...Typography.h3,
  },
  closeButton: {
    padding: 4,
  },
  preview: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
  },
  previewTitle: {
    ...Typography.h5,
    marginBottom: 4,
  },
  previewDescription: {
    ...Typography.bodySmall,
  },
  options: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    ...Typography.bodyMedium,
    flex: 1,
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionButton: {
    width: '100%',
  },
});

