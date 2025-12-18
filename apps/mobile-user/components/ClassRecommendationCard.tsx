import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  Calendar,
  CalendarClock,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Lightbulb,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ClassRecommendation } from '@/services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64; // Account for modal padding

// Professional gym class images from Unsplash
const CLASS_IMAGES = {
  CARDIO:
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  STRENGTH:
    'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=800&q=80',
  YOGA: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
  PILATES:
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
  DANCE:
    'https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=800&q=80',
  MARTIAL_ARTS:
    'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&q=80',
  AQUA: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800&q=80',
  FUNCTIONAL:
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
  RECOVERY:
    'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=800&q=80',
  DEFAULT:
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
};

interface ClassRecommendationCardProps {
  recommendation: ClassRecommendation;
  onPress?: () => void;
}

export default function ClassRecommendationCard({
  recommendation,
  onPress,
}: ClassRecommendationCardProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const getPriorityConfig = () => {
    switch (recommendation.priority) {
      case 'HIGH':
        return {
          color: '#EF4444',
          bgColor: 'rgba(239, 68, 68, 0.9)',
          label: t('classes.recommendationPriorityHigh') || 'Ưu tiên cao',
          icon: Flame,
        };
      case 'MEDIUM':
        return {
          color: '#F59E0B',
          bgColor: 'rgba(245, 158, 11, 0.9)',
          label:
            t('classes.recommendationPriorityMedium') || 'Ưu tiên trung bình',
          icon: Zap,
        };
      case 'LOW':
        return {
          color: '#10B981',
          bgColor: 'rgba(16, 185, 129, 0.9)',
          label: t('classes.recommendationPriorityLow') || 'Gợi ý',
          icon: Star,
        };
      default:
        return {
          color: theme.colors.primary,
          bgColor: theme.colors.primary + 'E6',
          label: t('classes.recommendationPriorityLow') || 'Gợi ý',
          icon: Star,
        };
    }
  };

  const getTypeIcon = (): LucideIcon => {
    switch (recommendation.type) {
      case 'CLASS_RECOMMENDATION':
      case 'VECTOR_RECOMMENDATION':
        return Sparkles;
      case 'SCHEDULE_SUGGESTION':
        return CalendarClock;
      case 'CATEGORY_SUGGESTION':
        return Target;
      case 'TREND_ANALYSIS':
        return TrendingUp;
      default:
        return Lightbulb;
    }
  };

  const getBackgroundImage = () => {
    const category =
      recommendation.data?.classCategory?.toUpperCase() || 'DEFAULT';
    return (
      CLASS_IMAGES[category as keyof typeof CLASS_IMAGES] ||
      CLASS_IMAGES.DEFAULT
    );
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    // Default action handling
    if (
      recommendation.action === 'VIEW_CLASS' &&
      recommendation.data?.classId
    ) {
      router.push(`/classes/${recommendation.data.classId}`);
    } else if (recommendation.action === 'VIEW_SCHEDULE') {
      if (recommendation.data?.scheduleId) {
        router.push(`/classes?scheduleId=${recommendation.data.scheduleId}`);
      } else if (recommendation.data?.classId) {
        if (recommendation.data?.classCategory) {
          router.push(`/classes?category=${recommendation.data.classCategory}`);
        } else {
          router.push(`/classes/${recommendation.data.classId}`);
        }
      }
    } else if (
      recommendation.action === 'BOOK_CLASS' &&
      recommendation.data?.scheduleId
    ) {
      router.push(
        `/classes?scheduleId=${recommendation.data.scheduleId}&book=true`
      );
    } else if (
      recommendation.action === 'BROWSE_CATEGORY' &&
      recommendation.data?.classCategory
    ) {
      router.push(`/classes?category=${recommendation.data.classCategory}`);
    }
  };

  const TypeIcon = getTypeIcon();
  const priorityConfig = getPriorityConfig();
  const PriorityIcon = priorityConfig.icon;

  // Extract additional info from recommendation data
  const matchScore = recommendation.data?.similarity
    ? Math.round(recommendation.data.similarity * 100)
    : recommendation.data?.finalScore
    ? Math.round(recommendation.data.finalScore * 100)
    : null;
  const className = recommendation.data?.className || recommendation.title;
  const duration = recommendation.data?.duration;
  const difficulty = recommendation.data?.difficulty;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={styles.cardContainer}
    >
      <ImageBackground
        source={{ uri: getBackgroundImage() }}
        style={styles.imageBackground}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          locations={[0, 0.5, 1]}
          style={styles.gradient}
        >
          {/* Top Section - Priority Badge & Match Score */}
          <View style={styles.topSection}>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: priorityConfig.bgColor },
              ]}
            >
              <PriorityIcon size={12} color="#FFFFFF" />
              <Text style={styles.priorityText}>{priorityConfig.label}</Text>
            </View>
            {matchScore && (
              <View style={styles.matchBadge}>
                <Sparkles size={12} color="#FFFFFF" />
                <Text style={styles.matchText}>{matchScore}%</Text>
              </View>
            )}
          </View>

          {/* Middle Section - Icon */}
          <View style={styles.middleSection}>
            <View style={styles.typeIconContainer}>
              <TypeIcon size={28} color="#FFFFFF" />
            </View>
          </View>

          {/* Bottom Section - Content */}
          <View style={styles.bottomSection}>
            <Text style={styles.title} numberOfLines={2}>
              {className}
            </Text>

            <Text style={styles.message} numberOfLines={2}>
              {recommendation.message}
            </Text>

            {/* Meta Info */}
            <View style={styles.metaContainer}>
              {duration && (
                <View style={styles.metaItem}>
                  <Clock size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.metaText}>{duration} phút</Text>
                </View>
              )}
              {difficulty && (
                <View style={styles.metaItem}>
                  <Dumbbell size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.metaText}>{difficulty}</Text>
                </View>
              )}
              {recommendation.data?.classCategory && (
                <View style={styles.metaItem}>
                  <Target size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.metaText}>
                    {recommendation.data.classCategory}
                  </Text>
                </View>
              )}
            </View>

            {/* Action Button */}
            <View style={styles.actionContainer}>
              <View style={styles.actionButton}>
                <Text style={styles.actionText}>
                  {t('classes.viewDetails') || 'Xem chi tiết'}
                </Text>
                <ChevronRight size={16} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  imageBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    borderRadius: 16,
  },
  gradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  matchText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  middleSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  bottomSection: {
    gap: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  message: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -33,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
