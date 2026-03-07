import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { useEffect, useState } from 'react';
import useTranslation from '../../hooks/useTranslation';
import { useTheme } from '../../context/ThemeContext';
import { scheduleService } from '../../services/schedule.service';
import { Trainer, trainerService } from '../../services/trainer.service';
import { userService } from '../../services/user.service';
import { getEChartsTheme } from '../../theme/echartsTheme';
import Button from '../ui/Button/Button';
import AdminModal from './AdminModal';
import CustomSelect from './CustomSelect';

interface ComparisonData {
  trainer: Trainer;
  stats: {
    totalClasses: number;
    totalStudents: number;
    rating: number;
    completedSessions: number;
    upcomingClasses: number;
    monthlyRevenue: number;
    achievements: number;
    goalsCompleted: number;
  };
}

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export default function ComparisonModal({ isOpen, onClose, currentUserId }: ComparisonModalProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedTrainerIds, setSelectedTrainerIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTrainers, setLoadingTrainers] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    if (isOpen) {
      fetchTrainers();
    }
  }, [isOpen]);

  const normalizeTrainer = (raw: any): Trainer => {
    const trainer = raw?.trainer || raw;
    return {
      id: trainer?.id || trainer?.user_id || '',
      user_id: trainer?.user_id || trainer?.id || '',
      full_name: trainer?.full_name || trainer?.name || trainer?.email || 'Huấn luyện viên',
      email: trainer?.email || '',
      phone: trainer?.phone || '',
      specializations: Array.isArray(trainer?.specializations) ? trainer.specializations : [],
      bio: trainer?.bio,
      experience_years: trainer?.experience_years || 0,
      hourly_rate: trainer?.hourly_rate,
      profile_photo: trainer?.profile_photo,
      status: trainer?.status,
      rating_average: trainer?.rating_average,
      total_classes: trainer?.total_classes,
      created_at: trainer?.created_at || '',
      updated_at: trainer?.updated_at || '',
    };
  };

  const normalizeStats = (raw: any) => {
    const stats = raw?.stats || raw;
    return {
      totalClasses: Number(stats?.totalClasses ?? stats?.total_classes ?? 0),
      totalStudents: Number(stats?.totalStudents ?? stats?.total_students ?? 0),
      rating: Number(stats?.rating ?? stats?.average_rating ?? 0),
      completedSessions: Number(stats?.completedSessions ?? stats?.completed_classes ?? 0),
      upcomingClasses: Number(stats?.upcomingClasses ?? stats?.upcoming_classes ?? 0),
      monthlyRevenue: Number(stats?.monthlyRevenue ?? stats?.monthly_revenue ?? 0),
      achievements: Number(stats?.achievements ?? 0),
      goalsCompleted: Number(stats?.goalsCompleted ?? stats?.goals_completed ?? 0),
    };
  };

  const resolveTrainerFromList = (userId: string): Trainer | null => {
    const found = trainers.find(t => t.user_id === userId || t.id === userId);
    return found ? normalizeTrainer(found) : null;
  };

  const fetchTrainers = async () => {
    try {
      setLoadingTrainers(true);
      const response = await trainerService.getAllTrainers();
      if (response.success) {
        // Support both response shapes: Trainer[] or { trainers: Trainer[] }
        let trainersList: Trainer[] = [];
        if (Array.isArray(response.data)) {
          trainersList = response.data;
        } else if (response.data && typeof response.data === 'object') {
          const data = response.data as any;
          trainersList = Array.isArray(data.trainers)
            ? data.trainers
            : Array.isArray(data.data?.trainers)
            ? data.data.trainers
            : [];
        }

        // Filter out current user
        const filtered = trainersList.filter(t => t.user_id !== currentUserId);
        setTrainers(filtered);
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: t('comparisonModal.errors.loadTrainersFailed'),
          duration: 3000,
        });
      }
    } finally {
      setLoadingTrainers(false);
    }
  };

  const handleCompare = async () => {
    if (selectedTrainerIds.length === 0) {
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: t('comparisonModal.errors.selectAtLeastOne'),
          duration: 3000,
        });
      }
      return;
    }

    try {
      setLoading(true);
      const data: ComparisonData[] = [];

      // Get current user stats
      try {
        const currentStats = await userService.getTrainerStats();
        const currentProfile = await userService.getProfile();
        if (currentStats.success && currentProfile.success) {
          const currentTrainer = await trainerService.getTrainerByUserId(currentUserId);
          const fallbackCurrent = resolveTrainerFromList(currentUserId);
          const profileTrainer = normalizeTrainer({
            id: currentUserId,
            user_id: currentUserId,
            full_name:
              (currentProfile as any)?.data?.user?.full_name ||
              (currentProfile as any)?.data?.user?.name ||
              'Bạn',
            email: (currentProfile as any)?.data?.user?.email || '',
          });

          data.push({
            trainer: currentTrainer.success
              ? normalizeTrainer(currentTrainer.data)
              : fallbackCurrent || profileTrainer,
            stats: normalizeStats(currentStats.data),
          });
        }
      } catch (error) {
        console.error('Error fetching current user stats:', error);
      }

      // Get selected trainers stats
      for (const userId of selectedTrainerIds) {
        try {
          const statsResponse = await scheduleService.getTrainerStatsForComparison(userId);
          const trainerResponse = await trainerService.getTrainerByUserId(userId);
          if (statsResponse.success) {
            const fallbackTrainer = resolveTrainerFromList(userId);
            data.push({
              trainer: trainerResponse.success
                ? normalizeTrainer(trainerResponse.data)
                :
                    fallbackTrainer ||
                    normalizeTrainer({
                      id: userId,
                      user_id: userId,
                      full_name: `Trainer ${userId.slice(0, 6)}`,
                    }),
              stats: normalizeStats(statsResponse.data),
            });
          }
        } catch (error) {
          console.error(`Error fetching stats for trainer ${userId}:`, error);
        }
      }

      setComparisonData(data);
    } catch (error) {
      console.error('Error comparing trainers:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: t('comparisonModal.errors.comparisonFailed'),
          duration: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const chartOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {
      data: [t('comparisonModal.chart.totalClasses'), t('comparisonModal.chart.students'), t('comparisonModal.chart.rating'), t('comparisonModal.chart.completed')],
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: comparisonData.map(item => item.trainer?.full_name || 'N/A'),
      axisLabel: {
        rotate: comparisonData.length > 3 ? 45 : 0,
        interval: 0,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: t('comparisonModal.chart.quantity'),
        position: 'left',
      },
      {
        type: 'value',
        name: 'Đánh giá',
        position: 'right',
      },
    ],
    series: [
      {
        name: t('comparisonModal.chart.totalClasses'),
        type: 'bar',
        data: comparisonData.map(item => item.stats.totalClasses),
        itemStyle: { color: '#ea580c' },
      },
      {
        name: t('comparisonModal.chart.students'),
        type: 'bar',
        data: comparisonData.map(item => item.stats.totalStudents),
        itemStyle: { color: '#fb923c' },
      },
      {
        name: 'Đánh giá',
        type: 'line',
        yAxisIndex: 1,
        data: comparisonData.map(item => item.stats.rating),
        itemStyle: { color: '#c2410c' },
        symbol: 'circle',
        symbolSize: 8,
      },
      {
        name: t('comparisonModal.chart.completed'),
        type: 'bar',
        data: comparisonData.map(item => item.stats.completedSessions),
        itemStyle: { color: '#9a3412' },
      },
    ],
    ...getEChartsTheme(theme),
  };

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title='So sánh hiệu suất' size='xl' square>
      <div className='space-y-3'>
        {/* Trainer Selection */}
        <div className='border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-none bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-800)] p-3'>
          <label className='block text-xs font-semibold font-heading text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-2'>
            {t('comparisonModal.selectTrainers')}
          </label>
          {loadingTrainers ? (
            <div className='text-center py-5'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-orange-600)] mx-auto mb-2'></div>
              <p className='text-xs text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                {t('comparisonModal.loadingTrainers')}
              </p>
            </div>
          ) : (
            <div className='max-h-40 overflow-y-auto border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-none p-1.5 bg-[var(--color-white)] dark:bg-[var(--color-gray-900)]'>
              {trainers.length === 0 ? (
                <p className='text-xs text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] text-center py-4 font-sans'>
                  {t('comparisonModal.noTrainers')}
                </p>
              ) : (
                trainers.map(trainer => (
                  <label
                    key={trainer.id}
                    className='flex items-center gap-2.5 p-2 hover:bg-[var(--color-gray-100)] dark:hover:bg-[var(--color-gray-800)] rounded-none cursor-pointer transition-colors border border-transparent hover:border-[var(--color-orange-200)] dark:hover:border-[var(--color-orange-700)]'
                  >
                    <input
                      type='checkbox'
                      checked={selectedTrainerIds.includes(trainer.user_id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedTrainerIds([...selectedTrainerIds, trainer.user_id]);
                        } else {
                          setSelectedTrainerIds(
                            selectedTrainerIds.filter(id => id !== trainer.user_id)
                          );
                        }
                      }}
                      className='w-4 h-4 text-[var(--color-orange-600)] rounded-none focus:ring-[var(--color-orange-500)]'
                    />
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)] truncate'>
                        {trainer.full_name}
                      </p>
                      {trainer.rating_average && (
                        <p className='text-xs text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                          ⭐ {trainer.rating_average.toFixed(1)} • {trainer.total_classes || 0} {t('comparisonModal.classes')}
                        </p>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {/* Time Period Selection */}
        <div className='border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-none bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-800)] p-3'>
          <label className='block text-xs font-semibold font-heading text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-2'>
            {t('comparisonModal.timePeriod')}
          </label>
          <CustomSelect
            options={[
              { value: 'month', label: t('comparisonModal.periods.month') },
              { value: 'quarter', label: t('comparisonModal.periods.quarter') },
              { value: 'year', label: t('comparisonModal.periods.year') },
            ]}
            value={timePeriod}
            onChange={value => setTimePeriod(value as 'month' | 'quarter' | 'year')}
            placeholder={t('comparisonModal.selectTimePeriod')}
            className='w-full'
          />
        </div>

        {/* Compare Button */}
        <div className='flex justify-end pt-1'>
          <Button
            variant='primary'
            size='sm'
            onClick={handleCompare}
            disabled={loading || selectedTrainerIds.length === 0}
            className='rounded-none text-xs font-heading'
          >
            {loading ? t('comparisonModal.comparing') : t('comparisonModal.compare')}
          </Button>
        </div>

        {/* Comparison Results */}
        {comparisonData.length > 0 && (
          <div className='space-y-3'>
            {/* Chart */}
            <div className='bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-800)] rounded-none p-3 border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
              <h3 className='text-sm font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-2'>
                {t('comparisonModal.chartTitle')}
              </h3>
              <ReactECharts option={chartOption} style={{ height: '320px', width: '100%' }} />
            </div>

            {/* Comparison Table */}
            <div className='bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-800)] rounded-none p-3 border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] overflow-x-auto'>
              <h3 className='text-sm font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-2'>
                {t('comparisonModal.tableTitle')}
              </h3>
              <table className='w-full text-xs'>
                <thead>
                  <tr className='border-b border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] bg-[var(--color-white)] dark:bg-[var(--color-gray-900)]'>
                    <th className='text-left py-2 px-3 font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                      {t('comparisonModal.table.trainer')}
                    </th>
                    <th className='text-right py-2 px-3 font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                      {t('comparisonModal.table.totalClasses')}
                    </th>
                    <th className='text-right py-2 px-3 font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                      {t('comparisonModal.table.students')}
                    </th>
                    <th className='text-right py-2 px-3 font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                      {t('comparisonModal.table.rating')}
                    </th>
                    <th className='text-right py-2 px-3 font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                      {t('comparisonModal.table.completed')}
                    </th>
                    <th className='text-right py-2 px-3 font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                      {t('comparisonModal.table.upcoming')}
                    </th>
                    <th className='text-right py-2 px-3 font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                      {t('comparisonModal.table.revenue')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((item, index) => (
                    <tr
                      key={item.trainer.id}
                      className={`border-b border-[var(--color-gray-100)] dark:border-[var(--color-gray-700)] hover:bg-[var(--color-gray-100)] dark:hover:bg-[var(--color-gray-900)] ${
                        index === 0
                          ? 'bg-[var(--color-orange-50)] dark:bg-[var(--color-orange-900)]/20'
                          : ''
                      }`}
                    >
                      <td className='py-2 px-3'>
                        <div>
                          <p className='text-sm font-medium font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                            {item.trainer.full_name}
                            {index === 0 && (
                              <span className='ml-1.5 text-xs text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] font-sans'>
                                ({t('comparisonModal.you')})
                              </span>
                            )}
                          </p>
                          {item.trainer.specializations &&
                            item.trainer.specializations.length > 0 && (
                              <p className='text-xs text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                                {item.trainer.specializations.slice(0, 2).join(', ')}
                              </p>
                            )}
                        </div>
                      </td>
                      <td className='text-right py-2 px-3 text-sm font-sans text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                        {formatNumber(item.stats.totalClasses)}
                      </td>
                      <td className='text-right py-2 px-3 text-sm font-sans text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                        {formatNumber(item.stats.totalStudents)}
                      </td>
                      <td className='text-right py-2 px-3 text-sm font-sans text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                        ⭐ {item.stats.rating.toFixed(1)}
                      </td>
                      <td className='text-right py-2 px-3 text-sm font-sans text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                        {formatNumber(item.stats.completedSessions)}
                      </td>
                      <td className='text-right py-2 px-3 text-sm font-sans text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                        {formatNumber(item.stats.upcomingClasses)}
                      </td>
                      <td className='text-right py-2 px-3 text-sm font-sans text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                        {formatCurrency(item.stats.monthlyRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
}
