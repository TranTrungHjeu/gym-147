import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { useEffect, useState } from 'react';
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

  const fetchTrainers = async () => {
    try {
      setLoadingTrainers(true);
      const response = await trainerService.getAllTrainers();
      if (response.success) {
        // Filter out current user
        const filtered = response.data.filter(t => t.user_id !== currentUserId);
        setTrainers(filtered);
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi tải danh sách trainers',
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
          message: 'Vui lòng chọn ít nhất một trainer để so sánh',
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
          if (currentTrainer.success) {
            data.push({
              trainer: currentTrainer.data,
              stats: currentStats.data,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching current user stats:', error);
      }

      // Get selected trainers stats
      for (const userId of selectedTrainerIds) {
        try {
          const statsResponse = await scheduleService.getTrainerStatsForComparison(userId);
          const trainerResponse = await trainerService.getTrainerByUserId(userId);
          if (statsResponse.success && trainerResponse.success) {
            data.push({
              trainer: trainerResponse.data,
              stats: {
                totalClasses: statsResponse.data.total_classes || 0,
                totalStudents: statsResponse.data.total_students || 0,
                rating: statsResponse.data.average_rating || 0,
                completedSessions: statsResponse.data.completed_classes || 0,
                upcomingClasses: statsResponse.data.upcoming_classes || 0,
                monthlyRevenue: statsResponse.data.monthly_revenue || 0,
                achievements: statsResponse.data.achievements || 0,
                goalsCompleted: statsResponse.data.goals_completed || 0,
              },
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
          message: 'Lỗi khi so sánh trainers',
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
      data: ['Tổng lớp', 'Học viên', 'Đánh giá', 'Hoàn thành'],
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
      data: comparisonData.map(item => item.trainer.full_name),
      axisLabel: {
        rotate: comparisonData.length > 3 ? 45 : 0,
        interval: 0,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Số lượng',
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
        name: 'Tổng lớp',
        type: 'bar',
        data: comparisonData.map(item => item.stats.totalClasses),
        itemStyle: { color: '#3b82f6' },
      },
      {
        name: 'Học viên',
        type: 'bar',
        data: comparisonData.map(item => item.stats.totalStudents),
        itemStyle: { color: '#10b981' },
      },
      {
        name: 'Đánh giá',
        type: 'line',
        yAxisIndex: 1,
        data: comparisonData.map(item => item.stats.rating),
        itemStyle: { color: '#f59e0b' },
        symbol: 'circle',
        symbolSize: 8,
      },
      {
        name: 'Hoàn thành',
        type: 'bar',
        data: comparisonData.map(item => item.stats.completedSessions),
        itemStyle: { color: '#8b5cf6' },
      },
    ],
    ...getEChartsTheme(theme),
  };

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title='So sánh hiệu suất' size='xl'>
      <div className='space-y-4'>
        {/* Trainer Selection */}
        <div>
          <label className='block text-xs font-semibold font-heading text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-2'>
            Chọn trainers để so sánh
          </label>
          {loadingTrainers ? (
            <div className='text-center py-6'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-orange-600)] mx-auto mb-2'></div>
              <p className='text-xs text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                Đang tải danh sách trainers...
              </p>
            </div>
          ) : (
            <div className='max-h-40 overflow-y-auto border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-lg p-2 bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-800)]'>
              {trainers.length === 0 ? (
                <p className='text-xs text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] text-center py-4 font-sans'>
                  Không có trainer nào để so sánh
                </p>
              ) : (
                trainers.map(trainer => (
                  <label
                    key={trainer.id}
                    className='flex items-center gap-2.5 p-2 hover:bg-[var(--color-gray-100)] dark:hover:bg-[var(--color-gray-700)] rounded-lg cursor-pointer transition-colors'
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
                      className='w-4 h-4 text-[var(--color-orange-600)] rounded focus:ring-[var(--color-orange-500)]'
                    />
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)] truncate'>
                        {trainer.full_name}
                      </p>
                      {trainer.rating_average && (
                        <p className='text-xs text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                          ⭐ {trainer.rating_average.toFixed(1)} • {trainer.total_classes || 0} lớp
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
        <div>
          <label className='block text-xs font-semibold font-heading text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-2'>
            Khoảng thời gian
          </label>
          <CustomSelect
            options={[
              { value: 'month', label: 'Tháng này' },
              { value: 'quarter', label: 'Quý này' },
              { value: 'year', label: 'Năm nay' },
            ]}
            value={timePeriod}
            onChange={value => setTimePeriod(value as 'month' | 'quarter' | 'year')}
            placeholder='Chọn khoảng thời gian'
            className='w-full'
          />
        </div>

        {/* Compare Button */}
        <div className='flex justify-end pt-2'>
          <Button
            variant='primary'
            size='sm'
            onClick={handleCompare}
            disabled={loading || selectedTrainerIds.length === 0}
          >
            {loading ? 'Đang so sánh...' : 'So sánh'}
          </Button>
        </div>

        {/* Comparison Results */}
        {comparisonData.length > 0 && (
          <div className='space-y-4'>
            {/* Chart */}
            <div className='bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-800)] rounded-lg p-4 border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
              <h3 className='text-base font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-3'>
                Biểu đồ so sánh
              </h3>
              <ReactECharts option={chartOption} style={{ height: '350px', width: '100%' }} />
            </div>

            {/* Comparison Table */}
            <div className='bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-800)] rounded-lg p-4 border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] overflow-x-auto'>
              <h3 className='text-base font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-3'>
                Bảng so sánh chi tiết
              </h3>
              <table className='w-full text-xs'>
                <thead>
                  <tr className='border-b border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
                    <th className='text-left py-2 px-3 font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                      Trainer
                    </th>
                    <th className='text-right py-2 px-3 font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                      Tổng lớp
                    </th>
                    <th className='text-right py-2 px-3 font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                      Học viên
                    </th>
                    <th className='text-right py-2 px-3 font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                      Đánh giá
                    </th>
                    <th className='text-right py-2 px-3 font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                      Hoàn thành
                    </th>
                    <th className='text-right py-2 px-3 font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                      Sắp tới
                    </th>
                    <th className='text-right py-2 px-3 font-semibold font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                      Doanh thu
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((item, index) => (
                    <tr
                      key={item.trainer.id}
                      className={`border-b border-[var(--color-gray-100)] dark:border-[var(--color-gray-700)] ${
                        index === 0
                          ? 'bg-[var(--color-orange-50)] dark:bg-[var(--color-orange-900)]/20'
                          : ''
                      }`}
                    >
                      <td className='py-2.5 px-3'>
                        <div>
                          <p className='text-sm font-medium font-heading text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                            {item.trainer.full_name}
                            {index === 0 && (
                              <span className='ml-1.5 text-xs text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] font-sans'>
                                (Bạn)
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
                      <td className='text-right py-2.5 px-3 text-sm font-sans text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                        {formatNumber(item.stats.totalClasses)}
                      </td>
                      <td className='text-right py-2.5 px-3 text-sm font-sans text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                        {formatNumber(item.stats.totalStudents)}
                      </td>
                      <td className='text-right py-2.5 px-3 text-sm font-sans text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                        ⭐ {item.stats.rating.toFixed(1)}
                      </td>
                      <td className='text-right py-2.5 px-3 text-sm font-sans text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                        {formatNumber(item.stats.completedSessions)}
                      </td>
                      <td className='text-right py-2.5 px-3 text-sm font-sans text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
                        {formatNumber(item.stats.upcomingClasses)}
                      </td>
                      <td className='text-right py-2.5 px-3 text-sm font-sans text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>
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
