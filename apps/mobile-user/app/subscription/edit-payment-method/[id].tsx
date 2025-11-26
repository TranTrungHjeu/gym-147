import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { paymentService } from '@/services/billing/payment.service';
import type { MemberPaymentMethod } from '@/types/billingTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditPaymentMethodScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<MemberPaymentMethod | null>(null);

  // Form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');

  useEffect(() => {
    loadPaymentMethod();
  }, [id]);

  const loadPaymentMethod = async () => {
    if (!user?.id || !id) return;

    try {
      setLoading(true);
      const methods = await paymentService.getMemberPaymentMethods(user.id);
      const method = methods.find((m) => m.id === id);
      
      if (method) {
        setPaymentMethod(method);
        if (method.type === 'CREDIT_CARD' || method.type === 'DEBIT_CARD') {
          setCardNumber(`**** **** **** ${method.details.last4}`);
          setExpiryDate(
            `${method.details.expiryMonth.toString().padStart(2, '0')}/${method.details.expiryYear.toString().slice(-2)}`
          );
          setCardHolderName(method.details.holderName || '');
        }
      } else {
        Alert.alert(t('common.error'), t('subscription.payment.methodNotFound'));
        router.back();
      }
    } catch (error) {
      console.error('Error loading payment method:', error);
      Alert.alert(t('common.error'), t('subscription.payment.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id || !paymentMethod) return;

    if (!cardHolderName) {
      Alert.alert(t('common.error'), t('subscription.payment.fillAllFields'));
      return;
    }

    setSaving(true);
    try {
      // In a real app, you would update the payment method via API
      // For now, we'll simulate updating
      await paymentService.updatePaymentMethod(paymentMethod.id, {
        details: {
          ...paymentMethod.details,
          holderName: cardHolderName,
        },
      });

      Alert.alert(t('common.success'), t('subscription.payment.updateSuccess'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error updating payment method:', error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t('subscription.payment.updateFailed');
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <Text
            style={[
              Typography.bodyLarge,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t('common.loading')}...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!paymentMethod) {
    return null;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <ArrowLeft size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text
                style={[Typography.h2, { color: theme.colors.text, flex: 1 }]}
              >
                {t('subscription.payment.editMethod')}
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[Typography.label, { color: theme.colors.text }]}>
                {t('subscription.payment.cardHolderName')}
              </Text>
              <Input
                value={cardHolderName}
                onChangeText={setCardHolderName}
                placeholder="John Doe"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[Typography.label, { color: theme.colors.text }]}>
                {t('subscription.payment.cardNumber')}
              </Text>
              <Input
                value={cardNumber}
                editable={false}
                placeholder="**** **** **** 1234"
                style={{ opacity: 0.6 }}
              />
              <Text
                style={[
                  Typography.caption,
                  { color: theme.colors.textSecondary, marginTop: 4 },
                ]}
              >
                {t('subscription.payment.cardNumberCannotChange')}
              </Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[Typography.label, { color: theme.colors.text }]}>
                  {t('subscription.payment.expiryDate')}
                </Text>
                <Input
                  value={expiryDate}
                  editable={false}
                  placeholder="MM/YY"
                  style={{ opacity: 0.6 }}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[Typography.label, { color: theme.colors.text }]}>
                  {t('subscription.payment.cvc')}
                </Text>
                <Input
                  value="***"
                  editable={false}
                  placeholder="***"
                  style={{ opacity: 0.6 }}
                />
              </View>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title={t('common.cancel')}
              onPress={() => router.back()}
              variant="outline"
              style={styles.button}
            />
            <Button
              title={t('common.save')}
              onPress={handleSubmit}
              loading={saving}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flex: 1,
  },
});
