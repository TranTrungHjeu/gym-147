import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface SupportTicket {
  subject: string;
  message: string;
  category: string;
}

export default function SupportScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [ticket, setTicket] = useState<SupportTicket>({
    subject: '',
    message: '',
    category: 'general',
  });
  const [submitting, setSubmitting] = useState(false);

  const faqItems: FAQItem[] = [
    {
      id: '1',
      question: t('settings.support.faq.checkIn.question', {
        defaultValue: 'Làm thế nào để check-in tại phòng gym?',
      }),
      answer: t('settings.support.faq.checkIn.answer', {
        defaultValue:
          'Bạn có thể check-in bằng cách quét mã QR, thẻ RFID hoặc nhận diện khuôn mặt. Nhấn nút "Check In" trên màn hình chính và chọn phương thức bạn muốn.',
      }),
    },
    {
      id: '2',
      question: t('settings.support.faq.updateProfile.question', {
        defaultValue: 'Làm thế nào để cập nhật thông tin hồ sơ?',
      }),
      answer: t('settings.support.faq.updateProfile.answer', {
        defaultValue:
          'Vào tab Hồ sơ và nhấn vào "Cá nhân", "Sức khỏe" hoặc "Mục tiêu" để chỉnh sửa các phần khác nhau của hồ sơ. Nhớ lưu các thay đổi của bạn.',
      }),
    },
    {
      id: '3',
      question: t('settings.support.faq.trackWorkouts.question', {
        defaultValue: 'Làm thế nào để theo dõi bài tập?',
      }),
      answer: t('settings.support.faq.trackWorkouts.answer', {
        defaultValue:
          'Bài tập của bạn được tự động theo dõi khi bạn check-in và check-out tại phòng gym. Bạn có thể xem lịch sử bài tập trong tab Thống kê.',
      }),
    },
    {
      id: '4',
      question: t('settings.support.faq.changeMembership.question', {
        defaultValue: 'Làm thế nào để thay đổi gói thành viên?',
      }),
      answer: t('settings.support.faq.changeMembership.answer', {
        defaultValue:
          'Liên hệ đội hỗ trợ của chúng tôi hoặc đến quầy lễ tân phòng gym để thảo luận về việc thay đổi gói thành viên. Bạn cũng có thể xem các gói có sẵn trong ứng dụng.',
      }),
    },
    {
      id: '5',
      question: t('settings.support.faq.forgotPassword.question', {
        defaultValue: 'Nếu tôi quên mật khẩu thì sao?',
      }),
      answer: t('settings.support.faq.forgotPassword.answer', {
        defaultValue:
          'Trên màn hình đăng nhập, nhấn "Quên mật khẩu" và nhập địa chỉ email của bạn. Bạn sẽ nhận được liên kết đặt lại mật khẩu qua email.',
      }),
    },
    {
      id: '6',
      question: t('settings.support.faq.enableNotifications.question', {
        defaultValue: 'Làm thế nào để bật thông báo?',
      }),
      answer: t('settings.support.faq.enableNotifications.answer', {
        defaultValue:
          'Vào Cài đặt > Thông báo để tùy chỉnh thông báo bạn muốn nhận. Đảm bảo thông báo đẩy được bật trong cài đặt thiết bị của bạn.',
      }),
    },
    {
      id: '7',
      question: t('settings.support.faq.contactSupport.question', {
        defaultValue: 'Làm thế nào để liên hệ hỗ trợ khách hàng?',
      }),
      answer: t('settings.support.faq.contactSupport.answer', {
        defaultValue:
          'Bạn có thể liên hệ chúng tôi qua màn hình hỗ trợ này, gọi cho chúng tôi hoặc gửi email cho chúng tôi.',
      }),
    },
    {
      id: '8',
      question: t('settings.support.faq.cancelMembership.question', {
        defaultValue: 'Làm thế nào để hủy thành viên?',
      }),
      answer: t('settings.support.faq.cancelMembership.answer', {
        defaultValue:
          'Để hủy thành viên, vui lòng liên hệ đội hỗ trợ của chúng tôi ít nhất 30 ngày trước chu kỳ thanh toán tiếp theo. Chúng tôi sẽ hướng dẫn bạn qua quy trình hủy.',
      }),
    },
  ];

  const contactMethods = [
    {
      id: 'phone',
      title: t('settings.support.callUs', {
        defaultValue: 'Gọi cho chúng tôi',
      }),
      description: t('settings.support.phoneNumber', {
        defaultValue: '+84 123 456 789',
      }),
      icon: <Phone size={20} color={theme.colors.primary} />,
      action: () => Linking.openURL('tel:+84123456789'),
    },
    {
      id: 'email',
      title: t('settings.support.emailUs', {
        defaultValue: 'Gửi email cho chúng tôi',
      }),
      description: t('settings.support.emailAddress', {
        defaultValue: 'support@gym147.com',
      }),
      icon: <Mail size={20} color={theme.colors.primary} />,
      action: () => Linking.openURL('mailto:support@gym147.com'),
    },
    {
      id: 'chat',
      title: t('settings.support.liveChat', {
        defaultValue: 'Trò chuyện trực tiếp',
      }),
      description: t('settings.support.available247', {
        defaultValue: 'Có sẵn 24/7',
      }),
      icon: <MessageCircle size={20} color={theme.colors.primary} />,
      action: () => {
        if (user?.id) {
          router.push('/settings/chat');
        } else {
          Alert.alert(
            t('common.error'),
            t('settings.support.loginRequired', {
              defaultValue:
                'Vui lòng đăng nhập để sử dụng trò chuyện trực tiếp',
            })
          );
        }
      },
    },
  ];

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleSubmitTicket = async () => {
    if (!ticket.subject.trim() || !ticket.message.trim()) {
      Alert.alert(t('common.error'), t('workouts.fillAllFields'));
      return;
    }

    try {
      setSubmitting(true);

      // In a real app, you would submit this to your backend API
      // For now, we'll simulate the submission
      await new Promise((resolve) => setTimeout(resolve, 2000));

      Alert.alert(t('common.success'), t('settings.supportMessageSent'), [
        {
          text: t('common.ok'),
          onPress: () => {
            setShowContactForm(false);
            setTicket({ subject: '', message: '', category: 'general' });
          },
        },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.supportMessageFailed'));
    } finally {
      setSubmitting(false);
    }
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
          {t('settings.support.title', {
            defaultValue: 'Trợ giúp & Hỗ trợ',
          })}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact Methods */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('settings.support.contactUs', {
              defaultValue: 'Liên hệ chúng tôi',
            })}
          </Text>
          {contactMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.contactMethod,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={method.action}
            >
              <View style={styles.contactIcon}>{method.icon}</View>
              <View style={styles.contactContent}>
                <Text
                  style={[styles.contactTitle, { color: theme.colors.text }]}
                >
                  {method.title}
                </Text>
                <Text
                  style={[
                    styles.contactDescription,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {method.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Form */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.contactFormButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setShowContactForm(!showContactForm)}
          >
            <HelpCircle size={20} color={theme.colors.textInverse} />
            <Text
              style={[
                styles.contactFormButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              {t('settings.support.submitTicket', {
                defaultValue: 'Gửi yêu cầu hỗ trợ',
              })}
            </Text>
          </TouchableOpacity>

          {showContactForm && (
            <View
              style={[
                styles.contactForm,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text style={[styles.formTitle, { color: theme.colors.text }]}>
                {t('settings.support.submitTicketTitle', {
                  defaultValue: 'Gửi yêu cầu hỗ trợ',
                })}
              </Text>

              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                  {t('settings.support.subject', {
                    defaultValue: 'Chủ đề',
                  })}{' '}
                  *
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  value={ticket.subject}
                  onChangeText={(text) =>
                    setTicket((prev) => ({ ...prev, subject: text }))
                  }
                  placeholder={t('settings.subjectPlaceholder')}
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                  {t('settings.support.message', {
                    defaultValue: 'Tin nhắn',
                  })}{' '}
                  *
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  value={ticket.message}
                  onChangeText={(text) =>
                    setTicket((prev) => ({ ...prev, message: text }))
                  }
                  placeholder={t('settings.detailedMessagePlaceholder')}
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: submitting
                      ? theme.colors.border
                      : theme.colors.primary,
                  },
                ]}
                onPress={handleSubmitTicket}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.submitButtonText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  {submitting
                    ? t('settings.support.submitting', {
                        defaultValue: 'Đang gửi...',
                      })
                    : t('settings.support.submitTicket', {
                        defaultValue: 'Gửi yêu cầu',
                      })}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('settings.support.faq.title', {
              defaultValue: 'Câu hỏi thường gặp',
            })}
          </Text>
          {faqItems.map((item) => (
            <View
              key={item.id}
              style={[
                styles.faqItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleFAQ(item.id)}
              >
                <Text
                  style={[styles.faqQuestionText, { color: theme.colors.text }]}
                >
                  {item.question}
                </Text>
                {expandedFAQ === item.id ? (
                  <ChevronUp size={20} color={theme.colors.primary} />
                ) : (
                  <ChevronDown size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>

              {expandedFAQ === item.id && (
                <View style={styles.faqAnswer}>
                  <Text
                    style={[
                      styles.faqAnswerText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {item.answer}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
  },
  section: {
    paddingVertical: 20,
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: 16,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  contactIcon: {
    marginRight: 12,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactDescription: {
    ...Typography.bodySmall,
  },
  contactFormButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  contactFormButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  contactForm: {
    padding: 20,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  formTitle: {
    ...Typography.h4,
    marginBottom: 20,
    textAlign: 'center',
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    ...Typography.bodyMedium,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    height: 100,
    ...Typography.bodyMedium,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  faqItem: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  faqQuestionText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  faqAnswerText: {
    ...Typography.bodySmall,
    lineHeight: 20,
  },
});
