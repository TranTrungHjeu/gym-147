import { WorkoutType, ActivityData, Achievement, StatItem, WorkoutHistory } from '../types/dataTypes';

export const mockWorkouts: WorkoutType[] = [
  {
    id: '1',
    name: 'Full Body Strength',
    description: 'Complete body workout with emphasis on strength building',
    image: 'https://images.pexels.com/photos/1229356/pexels-photo-1229356.jpeg?auto=compress&cs=tinysrgb&w=800',
    exercises: 8,
    duration: '45 min',
  },
  {
    id: '2',
    name: 'HIIT Cardio',
    description: 'High intensity interval training to burn calories',
    image: 'https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=800',
    exercises: 12,
    duration: '30 min',
  },
  {
    id: '3',
    name: 'Upper Body Focus',
    description: 'Target your arms, chest, and shoulders',
    image: 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=800',
    exercises: 7,
    duration: '40 min',
  },
  {
    id: '4',
    name: 'Core & Abs',
    description: 'Strengthen your core with this targeted workout',
    image: 'https://images.pexels.com/photos/4608146/pexels-photo-4608146.jpeg?auto=compress&cs=tinysrgb&w=800',
    exercises: 6,
    duration: '25 min',
  },
];

export const mockActivities: ActivityData[] = [
  {
    id: '1',
    title: 'Daily Steps',
    progress: 75,
    metric: 'steps',
    metricValue: '7,500',
    progressColor: '#3B82F6',
  },
  {
    id: '2',
    title: 'Water Intake',
    progress: 60,
    metric: 'glasses',
    metricValue: '6',
    progressColor: '#0EA5E9',
  },
  {
    id: '3',
    title: 'Calories Burned',
    progress: 45,
    metric: 'kcal',
    metricValue: '450',
    progressColor: '#F97316',
  },
  {
    id: '4',
    title: 'Active Minutes',
    progress: 80,
    metric: 'minutes',
    metricValue: '48',
    progressColor: '#10B981',
  },
];

export const mockAchievements: Achievement[] = [
  {
    id: '1',
    title: 'Early Bird',
    description: 'Complete 5 workouts before 8 AM',
    completed: true,
    progress: 100,
    icon: 'sunrise',
  },
  {
    id: '2',
    title: 'Consistency King',
    description: 'Work out 7 days in a row',
    completed: false,
    progress: 71,
    icon: 'calendar',
  },
  {
    id: '3',
    title: 'Strength Master',
    description: 'Complete 20 strength workouts',
    completed: false,
    progress: 45,
    icon: 'dumbbell',
  },
  {
    id: '4',
    title: 'Hydration Hero',
    description: 'Drink 8 glasses of water for 10 days',
    completed: true,
    progress: 100,
    icon: 'drop',
  },
  {
    id: '5',
    title: 'Distance Crusher',
    description: 'Walk 100,000 steps in a week',
    completed: false,
    progress: 62,
    icon: 'footprints',
  },
];

export const mockStats: StatItem[] = [
  {
    title: 'Workouts',
    value: '24',
    subtitle: 'This month',
    icon: 'activity-square',
    color: '#3B82F6',
  },
  {
    title: 'Calories',
    value: '14,280',
    subtitle: 'Burned',
    icon: 'flame',
    color: '#F97316',
  },
  {
    title: 'Hours',
    value: '18.5',
    subtitle: 'Active time',
    icon: 'clock',
    color: '#10B981',
  },
  {
    title: 'Streak',
    value: '6',
    subtitle: 'Days',
    icon: 'zap',
    color: '#EAB308',
  },
];

export const mockWorkoutHistory: WorkoutHistory[] = [
  {
    id: '1',
    date: '2025-05-15',
    workoutType: 'Full Body Strength',
    duration: 48,
    exercises: 8,
    calories: 320,
  },
  {
    id: '2',
    date: '2025-05-14',
    workoutType: 'HIIT Cardio',
    duration: 32,
    exercises: 12,
    calories: 380,
  },
  {
    id: '3',
    date: '2025-05-12',
    workoutType: 'Upper Body Focus',
    duration: 42,
    exercises: 7,
    calories: 280,
  },
  {
    id: '4',
    date: '2025-05-10',
    workoutType: 'Core & Abs',
    duration: 28,
    exercises: 6,
    calories: 220,
  },
  {
    id: '5',
    date: '2025-05-09',
    workoutType: 'Full Body Strength',
    duration: 45,
    exercises: 8,
    calories: 310,
  },
];

export const userData = {
  id: '123456',
  name: 'Alex Johnson',
  email: 'alex.johnson@example.com',
  profileImage: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=800',
  height: 175, // in cm
  weight: 72, // in kg
  age: 32,
  fitnessGoal: 'gain_muscle',
  weeklyGoal: 4, // workouts per week
};