import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { paymentService } from '@/services/billing/payment.service';
import type { MemberPaymentMethod, PaymentMethod } from '@/types/billingTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { Check, CreditCard, Edit, Plus, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<MemberPaymentMethod[]>(
    []
  );

  const loadData = async () => {
    if (!user?.id) return;

    try {
      const methodsData = await paymentService.getMemberPaymentMethods(user.id);
      setPaymentMethods(methodsData);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      Alert.alert(t('common.error'), t('subscription.payment.addFailed'));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddPaymentMethod = () => {
    // TODO: Navigate to add payment method screen
    Alert.alert(
      t('subscription.payment.addCard'),
      'Add payment method screen not implemented yet'
    );
  };

  const handleEditPaymentMethod = (method: MemberPaymentMethod) => {
    // TODO: Navigate to edit payment method screen
    Alert.alert(
      t('common.edit'),
      'Edit payment method screen not implemented yet'
    );
  };

  const handleDeletePaymentMethod = (method: MemberPaymentMethod) => {
    Alert.alert(
      t('subscription.payment.removeCard'),
      t('subscription.payment.removeConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentService.deletePaymentMethod(method.id);
              Alert.alert(
                t('common.success'),
                t('subscription.payment.removeSuccess')
              );
              loadData();
            } catch (error) {
              console.error('Error deleting payment method:', error);
              Alert.alert(
                t('common.error'),
                t('subscription.payment.removeFailed')
              );
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (method: MemberPaymentMethod) => {
    if (!user?.id) return;

    try {
      await paymentService.setDefaultPaymentMethod(user.id, method.id);
      Alert.alert(t('common.success'), t('subscription.payment.setDefault'));
      loadData();
    } catch (error) {
      console.error('Error setting default payment method:', error);
      Alert.alert(t('common.error'), t('subscription.payment.addFailed'));
    }
  };

  const getMethodIcon = (type: PaymentMethod) => {
    switch (type) {
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        return <CreditCard size={24} color={theme.colors.primary} />;
      case 'BANK_TRANSFER':
        return <CreditCard size={24} color={theme.colors.info} />;
      case 'PAYPAL':
        return <CreditCard size={24} color={theme.colors.warning} />;
      case 'APPLE_PAY':
        return <CreditCard size={24} color={theme.colors.text} />;
      case 'GOOGLE_PAY':
        return <CreditCard size={24} color={theme.colors.success} />;
      default:
        return <CreditCard size={24} color={theme.colors.primary} />;
    }
  };

  const getMethodDisplayName = (type: PaymentMethod) => {
    switch (type) {
      case 'CREDIT_CARD':
        return 'Credit Card';
      case 'DEBIT_CARD':
        return 'Debit Card';
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      case 'PAYPAL':
        return 'PayPal';
      case 'APPLE_PAY':
        return 'Apple Pay';
      case 'GOOGLE_PAY':
        return 'Google Pay';
      case 'CASH':
        return 'Cash';
      case 'CHECK':
        return 'Check';
      default:
        return type.replace('_', ' ');
    }
  };

  const formatCardNumber = (last4: string) => {
    return `**** **** **** ${last4}`;
  };

  const formatExpiryDate = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  useEffect(() => {
    loadData();
    setLoading(false);
  }, [user?.id]);

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text
            style={[
              Typography.bodyLarge,
              { color: theme.colors.textSecondary },
            ]}
          >
            Loading payment methods...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[Typography.h2, { color: theme.colors.text }]}>
          Payment Methods
        </Text>
        <Button
          title="Add Method"
          onPress={handleAddPaymentMethod}
          size="small"
          icon={<Plus size={16} color={theme.colors.surface} />}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {paymentMethods.length > 0 ? (
          paymentMethods.map((method) => (
            <View
              key={method.id}
              style={[
                styles.methodCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: method.isDefault
                    ? theme.colors.primary
                    : theme.colors.border,
                  borderWidth: method.isDefault ? 2 : 1,
                },
              ]}
            >
              {method.isDefault && (
                <View
                  style={[
                    styles.defaultBadge,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Check size={12} color={theme.colors.surface} />
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.surface },
                    ]}
                  >
                    Default
                  </Text>
                </View>
              )}

              <View style={styles.methodHeader}>
                <View style={styles.methodIcon}>
                  {getMethodIcon(method.type)}
                </View>
                <View style={styles.methodInfo}>
                  <Text style={[Typography.h4, { color: theme.colors.text }]}>
                    {getMethodDisplayName(method.type)}
                  </Text>
                  {method.type === 'CREDIT_CARD' ||
                  method.type === 'DEBIT_CARD' ? (
                    <View style={styles.cardDetails}>
                      <Text
                        style={[Typography.body, { color: theme.colors.text }]}
                      >
                        {formatCardNumber(method.details.last4)}
                      </Text>
                      <Text
                        style={[
                          Typography.caption,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {method.details.brand} • Expires{' '}
                        {formatExpiryDate(
                          method.details.expiryMonth,
                          method.details.expiryYear
                        )}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        Typography.body,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {method.details.holderName}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.methodActions}>
                {!method.isDefault && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { borderColor: theme.colors.primary },
                    ]}
                    onPress={() => handleSetDefault(method)}
                  >
                    <Check size={16} color={theme.colors.primary} />
                    <Text
                      style={[
                        Typography.caption,
                        { color: theme.colors.primary },
                      ]}
                    >
                      Set Default
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => handleEditPaymentMethod(method)}
                >
                  <Edit size={16} color={theme.colors.primary} />
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.primary },
                    ]}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { borderColor: theme.colors.error },
                  ]}
                  onPress={() => handleDeletePaymentMethod(method)}
                >
                  <Trash2 size={16} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <CreditCard size={48} color={theme.colors.textSecondary} />
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              No Payment Methods
            </Text>
            <Text
              style={[Typography.body, { color: theme.colors.textSecondary }]}
            >
              Add a payment method to manage your subscriptions
            </Text>
            <Button
              title="Add Payment Method"
              onPress={handleAddPaymentMethod}
              style={styles.addButton}
            />
          </View>
        )}

        {paymentMethods.length > 0 && (
          <View style={styles.infoContainer}>
            <Text
              style={[
                Typography.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              Your payment methods are securely stored and encrypted. You can
              add, edit, or remove them at any time.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  scrollView: {
    flex: 1,
  },
  methodCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    position: 'relative',
  },
  defaultBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  methodIcon: {
    marginRight: 12,
    marginTop: 4,
  },
  methodInfo: {
    flex: 1,
  },
  cardDetails: {
    marginTop: 4,
  },
  methodActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    gap: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  addButton: {
    marginTop: 16,
  },
  infoContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
});
