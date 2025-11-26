import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { paymentService } from '@/services/billing/payment.service';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useState } from 'react';
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

export default function AddPaymentMethodScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');

  const handleSubmit = async () => {
    if (!user?.id) return;

    if (!cardNumber || !expiryDate || !cvc || !cardHolderName) {
      Alert.alert(t('common.error'), t('subscription.payment.fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      // In a real app, you would tokenize the card here using Stripe/etc.
      // For this demo, we'll simulate adding a card
      await paymentService.createPaymentMethod(user.id, {
        type: 'CREDIT_CARD',
        details: {
          last4: cardNumber.slice(-4),
          brand: 'Visa', // Simulated
          expiryMonth: parseInt(expiryDate.split('/')[0]),
          expiryYear: parseInt(expiryDate.split('/')[1]),
          holderName: cardHolderName,
        },
        isDefault: false,
      });

      Alert.alert(t('common.success'), t('subscription.payment.addSuccess'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error adding payment method:', error);
      Alert.alert(t('common.error'), t('subscription.payment.addFailed'));
    } finally {
      setLoading(false);
    }
  };

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
                {t('subscription.payment.addMethod')}
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
                onChangeText={setCardNumber}
                placeholder="0000 0000 0000 0000"
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[Typography.label, { color: theme.colors.text }]}>
                  {t('subscription.payment.expiryDate')}
                </Text>
                <Input
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  placeholder="MM/YY"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[Typography.label, { color: theme.colors.text }]}>
                  {t('subscription.payment.cvc')}
                </Text>
                <Input
                  value={cvc}
                  onChangeText={setCvc}
                  placeholder="123"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
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
              loading={loading}
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
