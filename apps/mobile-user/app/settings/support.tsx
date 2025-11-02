import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
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
      question: 'How do I check in to the gym?',
      answer:
        'You can check in using QR code scanning, RFID card, or face recognition. Tap the "Check In" button on the home screen and choose your preferred method.',
    },
    {
      id: '2',
      question: 'How do I update my profile information?',
      answer:
        'Go to the Profile tab and tap on "Personal", "Health", or "Goals" to edit different sections of your profile. Make sure to save your changes.',
    },
    {
      id: '3',
      question: 'How do I track my workouts?',
      answer:
        'Your workouts are automatically tracked when you check in and out of the gym. You can view your workout history in the Stats tab.',
    },
    {
      id: '4',
      question: 'How do I change my membership plan?',
      answer:
        'Contact our support team or visit the gym reception to discuss membership plan changes. You can also check available plans in the app.',
    },
    {
      id: '5',
      question: 'What if I forget my password?',
      answer:
        'On the login screen, tap "Forgot Password" and enter your email address. You will receive a password reset link via email.',
    },
    {
      id: '6',
      question: 'How do I enable notifications?',
      answer:
        'Go to Settings > Notifications to customize which notifications you want to receive. Make sure push notifications are enabled in your device settings.',
    },
    {
      id: '7',
      question: 'How do I contact customer support?',
      answer:
        'You can contact us through this support screen, call us at +1 (555) 123-4567, or email us at support@gymapp.com.',
    },
    {
      id: '8',
      question: 'How do I cancel my membership?',
      answer:
        'To cancel your membership, please contact our support team at least 30 days before your next billing cycle. We will guide you through the cancellation process.',
    },
  ];

  const contactMethods = [
    {
      id: 'phone',
      title: 'Call Us',
      description: '+1 (555) 123-4567',
      icon: <Phone size={20} color={theme.colors.primary} />,
      action: () => Linking.openURL('tel:+15551234567'),
    },
    {
      id: 'email',
      title: 'Email Us',
      description: 'support@gymapp.com',
      icon: <Mail size={20} color={theme.colors.primary} />,
      action: () => Linking.openURL('mailto:support@gymapp.com'),
    },
    {
      id: 'chat',
      title: 'Live Chat',
      description: 'Available 24/7',
      icon: <MessageCircle size={20} color={theme.colors.primary} />,
      action: () => {
        Alert.alert(t('common.info'), 'Live chat feature coming soon!');
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
          Help & Support
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact Methods */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Contact Us
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
              Submit Support Ticket
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
                Submit a Support Ticket
              </Text>

              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                  Subject *
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
                  Message *
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
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Frequently Asked Questions
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
