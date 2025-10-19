import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Target, TrendingUp, Ruler, Weight } from 'lucide-react-native';
import AuthButton from '@/components/auth/AuthButton';
import { Typography, TextColors } from '@/utils/typography';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: 'Set Your Goals',
    description: 'Define your fitness objectives and track your progress',
    icon: <Target size={80} color={TextColors.accent} />,
  },
  {
    id: 2,
    title: 'Track Progress',
    description: 'Monitor your workouts, stats, and achievements',
    icon: <TrendingUp size={80} color={TextColors.accent} />,
  },
  {
    id: 3,
    title: 'Stay Consistent',
    description: 'Build healthy habits and reach your fitness goals',
    icon: <Weight size={80} color={TextColors.accent} />,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { updateProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    // TODO: Update user profile with onboarding completion
    try {
      await updateProfile({
        // Add any default profile data here
      });
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Onboarding completion error:', error);
    }
  };

  const currentData = ONBOARDING_STEPS[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Add your onboarding template here */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>{currentData.icon}</View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>{currentData.title}</Text>
            <Text style={styles.description}>{currentData.description}</Text>
          </View>

          <View style={styles.pagination}>
            {ONBOARDING_STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentStep && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AuthButton
          title={
            currentStep === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next'
          }
          onPress={handleNext}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000ff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  skipText: {
    ...Typography.bodyMedium,
    color: TextColors.accent,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  iconContainer: {
    marginBottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    ...Typography.h2,
    color: TextColors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    ...Typography.bodyLarge,
    color: TextColors.secondary,
    textAlign: 'center',
    lineHeight: 28,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: TextColors.accent,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
