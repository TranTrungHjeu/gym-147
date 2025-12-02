import { Button } from '@/components/ui/Button';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Crown, Lock } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PremiumFeatureCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  isLocked?: boolean;
  onUpgrade?: () => void;
  featureList?: string[];
  badge?: string;
}

export default function PremiumFeatureCard({
  title,
  description,
  icon,
  isLocked = false,
  onUpgrade,
  featureList,
  badge,
}: PremiumFeatureCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: isLocked ? theme.colors.border : theme.colors.primary + '30',
          borderWidth: isLocked ? 1 : 2,
        },
      ]}
    >
      {badge && (
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: theme.colors.textInverse },
            ]}
          >
            {badge}
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.iconContainer}>
          {icon || (
            <Crown
              size={24}
              color={isLocked ? theme.colors.textSecondary : theme.colors.primary}
            />
          )}
        </View>
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {title}
            </Text>
            {isLocked && (
              <Lock size={16} color={theme.colors.textSecondary} />
            )}
          </View>
          {description && (
            <Text
              style={[
                styles.description, { color: theme.colors.textSecondary },
              ]}
            >
              {description}
            </Text>
          )}
        </View>
      </View>

      {featureList && featureList.length > 0 && (
        <View style={styles.featureList}>
          {featureList.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View
                style={[
                  styles.featureDot,
                  {
                    backgroundColor: isLocked
                      ? theme.colors.textSecondary
                      : theme.colors.primary,
                  },
                ]}
              />
              <Text
                style={[
                  styles.featureText,
                  {
                    color: isLocked
                      ? theme.colors.textSecondary
                      : theme.colors.text,
                    opacity: isLocked ? 0.6 : 1,
                  },
                ]}
              >
                {feature}
              </Text>
            </View>
          ))}
        </View>
      )}

      {isLocked && onUpgrade && (
        <View style={styles.upgradeSection}>
          <Button
            title={t('subscription.upgradeToUnlock', {
              defaultValue: 'Nâng cấp để mở khóa',
            })}
            onPress={onUpgrade}
            style={styles.upgradeButton}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    ...Typography.h5,
    flex: 1,
  },
  description: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
  featureList: {
    marginTop: 8,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  featureText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  upgradeSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  upgradeButton: {
    width: '100%',
  },
});

