import { accessService } from '@/services/member/access.service';
import { equipmentService } from '@/services/member/equipment.service';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { Clock, Flame, LogOut, Zap } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ActiveGymSessionCardProps {
  memberId: string; // Changed from userId to memberId - must be Member.id
}

export default function ActiveGymSessionCard({
  memberId,
}: ActiveGymSessionCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totalCalories, setTotalCalories] = useState(0);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSession();
    const interval = setInterval(loadSession, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [memberId]);

  // Refresh calories every 10 seconds when session is active
  useEffect(() => {
    if (session) {
      const caloriesInterval = setInterval(() => {
        loadEquipmentUsageCalories(session);
      }, 10000); // Refresh calories every 10s
      return () => clearInterval(caloriesInterval);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      // Update duration every second
      const interval = setInterval(() => {
        const entryTime = new Date(session.entry_time).getTime();
        const now = Date.now();
        const durationMinutes = Math.floor((now - entryTime) / (1000 * 60));
        setDuration(durationMinutes);
      }, 1000);

      // Pulse animation for LIVE badge
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Glow animation for card
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();

      // Border animation (running border effect)
      Animated.loop(
        Animated.timing(borderAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        })
      ).start();

      return () => {
        clearInterval(interval);
        pulseAnim.stopAnimation();
        glowAnim.stopAnimation();
        borderAnim.stopAnimation();
      };
    }
  }, [session]);

  const loadSession = async () => {
    try {
      const response = await accessService.getCurrentAccess(memberId);
      if (response.success && response.data?.session) {
        const sessionData = response.data.session;
        setSession(sessionData);
        
        // Load equipment usage for this session to calculate total calories
        await loadEquipmentUsageCalories(sessionData);
      } else {
        setSession(null);
        setTotalCalories(0);
      }
    } catch (error) {
      console.error('Failed to load gym session:', error);
      setSession(null);
      setTotalCalories(0);
    } finally {
      setLoading(false);
    }
  };

  const loadEquipmentUsageCalories = async (sessionData: any) => {
    try {
      if (!sessionData?.entry_time) {
        setTotalCalories(0);
        return;
      }

      // Get equipment usage from session start time to now
      const sessionStartTime = new Date(sessionData.entry_time);
      const now = new Date();

      // Fetch equipment usage for this member during the session
      const usageResponse = await equipmentService.getMemberEquipmentUsage(
        memberId,
        {
          start_date: sessionStartTime.toISOString(),
          end_date: now.toISOString(),
        }
      );

      if (usageResponse.success && usageResponse.data?.usage) {
        // Calculate total calories from all equipment usage
        const total = usageResponse.data.usage.reduce(
          (sum: number, usage: any) => {
            // Include both completed usage (with end_time) and active usage (without end_time)
            if (usage.calories_burned) {
              return sum + usage.calories_burned;
            }
            return sum;
          },
          0
        );
        setTotalCalories(total);
        console.log('🔥 Total calories from equipment usage:', total);
      } else {
        setTotalCalories(0);
      }
    } catch (error) {
      console.error('Failed to load equipment usage calories:', error);
      setTotalCalories(0);
    }
  };

  const handleCheckOut = () => {
    router.push('/access/qr-scanner');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading || !session) {
    return null;
  }

  // Animated glow color
  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.primary + '20', theme.colors.primary + '40'],
  });

  // Animated border rotation (simulated with gradient)
  const borderRotation = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.primary,
          shadowColor: glowColor,
        },
      ]}
    >
      {/* Animated border glow */}
      <Animated.View
        style={[
          styles.glowBorder,
          {
            backgroundColor: glowColor,
            opacity: glowAnim,
          },
        ]}
      />

      {/* Header with LIVE badge */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Zap size={20} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('home.activeSession', 'Active Gym Session')}
          </Text>
        </View>

        {/* Animated LIVE badge */}
        <View style={[styles.liveBadge, { backgroundColor: '#FF3B30' }]}>
          <Animated.View
            style={[
              styles.liveDot,
              {
                backgroundColor: '#FFF',
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Session Info */}
      <View style={styles.content}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Clock size={18} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('session.duration', 'Duration')}
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {formatDuration(duration)}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Flame size={18} color="#FF6B35" />
            <View style={styles.infoTextContainer}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('session.caloriesBurned', 'Calories')}
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {totalCalories || 0} kcal
              </Text>
            </View>
          </View>
        </View>

        {/* Check Out Button */}
        <TouchableOpacity
          style={[
            styles.checkOutButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={handleCheckOut}
          activeOpacity={0.8}
        >
          <LogOut size={18} color="#FFF" />
          <Text style={styles.checkOutButtonText}>
            {t('access.checkOut', 'Check Out')}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  glowBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 18,
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...Typography.h6,
    fontWeight: '700',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    ...Typography.caption,
    color: '#FFF',
    fontWeight: '800',
    letterSpacing: 1,
  },
  content: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    ...Typography.caption,
    marginBottom: 2,
  },
  infoValue: {
    ...Typography.h6,
    fontWeight: '700',
  },
  checkOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  checkOutButtonText: {
    ...Typography.bodyMedium,
    color: '#FFF',
    fontWeight: '700',
  },
});
