export enum MetricType {
  WEIGHT = 'WEIGHT',
  BODY_FAT = 'BODY_FAT',
  MUSCLE_MASS = 'MUSCLE_MASS',
  BMI = 'BMI',
  HEART_RATE = 'HEART_RATE',
  BLOOD_PRESSURE = 'BLOOD_PRESSURE',
  BODY_TEMPERATURE = 'BODY_TEMPERATURE',
  SLEEP_HOURS = 'SLEEP_HOURS',
  WATER_INTAKE = 'WATER_INTAKE',
  STEPS = 'STEPS',
  CALORIES_BURNED = 'CALORIES_BURNED',
  CALORIES_CONSUMED = 'CALORIES_CONSUMED',
}

export enum TrendDirection {
  UP = 'UP',
  DOWN = 'DOWN',
  STABLE = 'STABLE',
}

export interface HealthMetric {
  id: string;
  memberId: string;
  type: MetricType;
  value: number;
  unit: string;
  recordedAt: string;
  notes?: string;
  source?: string; // 'manual', 'device', 'app'
  createdAt: string;
  updatedAt: string;
}

export interface HealthTrend {
  type: MetricType;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercentage: number;
  direction: TrendDirection;
  period: string; // 'daily', 'weekly', 'monthly'
  dataPoints: HealthMetric[];
}

export interface HealthSummary {
  memberId: string;
  totalMetrics: number;
  recentMetrics: HealthMetric[];
  trends: HealthTrend[];
  lastUpdated: string;
  averageValues: Record<MetricType, number>;
  goalProgress: Record<MetricType, number>;
}

export interface MetricGoal {
  id: string;
  memberId: string;
  type: MetricType;
  targetValue: number;
  currentValue: number;
  progress: number;
  deadline?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HealthAnalytics {
  memberId: string;
  period: string;
  metrics: Record<MetricType, HealthTrend>;
  insights: string[];
  recommendations: string[];
  goalAchievements: number;
  totalGoals: number;
  averageProgress: number;
}

export interface AddMetricRequest {
  type: MetricType;
  value: number;
  unit: string;
  recordedAt: string;
  notes?: string;
  source?: string;
}

export interface UpdateMetricRequest {
  value?: number;
  unit?: string;
  recordedAt?: string;
  notes?: string;
  source?: string;
}

export interface MetricFilters {
  type?: MetricType;
  startDate?: string;
  endDate?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

export interface HealthMetricChartProps {
  data: HealthMetric[];
  type: MetricType;
  period: string;
  showTrend?: boolean;
  showGoal?: boolean;
  goalValue?: number;
}

export interface MetricCardProps {
  metric: HealthMetric;
  trend?: HealthTrend;
  goal?: MetricGoal;
  onEdit?: (metric: HealthMetric) => void;
  onDelete?: (metric: HealthMetric) => void;
}

export interface HealthTrendsProps {
  memberId: string;
  period: string;
  onMetricSelect?: (metric: HealthMetric) => void;
}

export interface AddMetricProps {
  memberId: string;
  onMetricAdded?: (metric: HealthMetric) => void;
  onCancel?: () => void;
}

export interface MetricDetailProps {
  metric: HealthMetric;
  trend?: HealthTrend;
  goal?: MetricGoal;
  onEdit?: (metric: HealthMetric) => void;
  onDelete?: (metric: HealthMetric) => void;
  onClose?: () => void;
}

export interface HealthDashboardProps {
  memberId: string;
  onMetricAdd?: () => void;
  onTrendsView?: () => void;
  onGoalsView?: () => void;
}

export interface MetricGoalProps {
  goal: MetricGoal;
  onEdit?: (goal: MetricGoal) => void;
  onDelete?: (goal: MetricGoal) => void;
  onToggle?: (goal: MetricGoal) => void;
}

export interface HealthInsightsProps {
  analytics: HealthAnalytics;
  onRecommendationClick?: (recommendation: string) => void;
}

export interface MetricComparisonProps {
  metrics: HealthMetric[];
  type: MetricType;
  period: string;
  showAverage?: boolean;
  showTrend?: boolean;
}

export interface HealthExportProps {
  memberId: string;
  startDate: string;
  endDate: string;
  format: 'csv' | 'pdf' | 'excel';
  onExport?: (data: any) => void;
}

export interface HealthReminderProps {
  type: MetricType;
  frequency: string;
  isEnabled: boolean;
  onToggle?: (enabled: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export interface HealthSyncProps {
  deviceType: string;
  isConnected: boolean;
  lastSync: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSync?: () => void;
}

export interface HealthPrivacyProps {
  memberId: string;
  shareWithTrainer: boolean;
  shareWithGym: boolean;
  shareWithFamily: boolean;
  onPrivacyChange?: (settings: any) => void;
}

export interface HealthBackupProps {
  memberId: string;
  lastBackup: string;
  backupSize: string;
  onBackup?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
}
