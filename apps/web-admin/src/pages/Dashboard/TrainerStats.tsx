import { motion } from 'framer-motion';
import { BarChart3, Calendar, Star, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import AdminCard from '../../components/common/AdminCard';
import ComparisonModal from '../../components/common/ComparisonModal';
import ExportButton from '../../components/common/ExportButton';
import MetricCard from '../../components/dashboard/MetricCard';
import { userService } from '../../services/user.service';

interface TrainerStats {
  totalClasses: number;
  totalStudents: number;
  rating: number;
  completedSessions: number;
  upcomingClasses: number;
  monthlyRevenue: number;
  achievements: number;
  goalsCompleted: number;
}

export default function TrainerStats() {
  const [stats, setStats] = useState<TrainerStats>({
    totalClasses: 0,
    totalStudents: 0,
    rating: 0,
    completedSessions: 0,
    upcomingClasses: 0,
    monthlyRevenue: 0,
    achievements: 0,
    goalsCompleted: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    fetchTrainerStats();
    fetchCurrentUserId();
  }, []);

  const fetchCurrentUserId = async () => {
    try {
      const profile = await userService.getProfile();
      if (profile.success) {
        setCurrentUserId(profile.data.user.id);
      }
    } catch (error) {
      console.error('Error fetching current user ID:', error);
    }
  };

  const fetchTrainerStats = async () => {
    try {
      setLoading(true);
      const response = await userService.getTrainerStats();

      if (response.success) {
        setStats(response.data);
      } else {
        throw new Error(response.message || 'Lỗi tải thống kê');
      }
    } catch (error) {
      console.error('Error fetching trainer stats:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi tải thống kê trainer',
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

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-orange-600)] mx-auto mb-4'></div>
          <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
            Đang tải thống kê...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen-full bg-gradient-to-br from-[var(--color-gray-50)] via-[var(--color-white)] to-[var(--color-gray-100)] dark:from-[var(--color-gray-900)] dark:via-[var(--color-gray-800)] dark:to-[var(--color-gray-900)]'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 h-full flex flex-col'>
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className='mb-2 flex-shrink-0'
        >
          <div className='grid grid-cols-1 lg:grid-cols-5 gap-4'>
            {/* Title Section */}
            <div className='lg:col-span-1 space-y-0.5'>
              <h1 className='text-xl lg:text-2xl font-bold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-heading'>
                Thống kê cá nhân
              </h1>
              <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] text-xs font-sans'>
                Theo dõi hiệu suất và thành tích giảng dạy của bạn
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className='mb-3'
        >
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
            <MetricCard
              icon={Calendar}
              label='Tổng số lớp đã dạy'
              value={formatNumber(stats.totalClasses)}
              iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
              iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
            />
            <MetricCard
              icon={Users}
              label='Tổng học viên'
              value={formatNumber(stats.totalStudents)}
              iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
              iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
            />
            <MetricCard
              icon={Star}
              label='Đánh giá trung bình'
              value={stats.rating.toFixed(1)}
              iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
              iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
            />
            <MetricCard
              icon={TrendingUp}
              label='Buổi học hoàn thành'
              value={formatNumber(stats.completedSessions)}
              iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
              iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
            />
            <MetricCard
              icon={Calendar}
              label='Lớp sắp tới'
              value={formatNumber(stats.upcomingClasses)}
              iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
              iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
            />
            <MetricCard
              icon={BarChart3}
              label='Thu nhập tháng này'
              value={formatCurrency(stats.monthlyRevenue)}
              iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
              iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
            />
          </div>
        </motion.div>

        {/* Additional Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className='mb-3'
        >
          {/* Performance Summary */}
          <AdminCard>
            <h3 className='text-xl font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-4 font-heading'>
              Tóm tắt hiệu suất
            </h3>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <span className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                  Tỷ lệ hoàn thành lớp
                </span>
                <span className='text-2xl font-bold text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] font-heading'>
                  {stats.totalClasses > 0
                    ? ((stats.completedSessions / stats.totalClasses) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                  Thu nhập trung bình/lớp
                </span>
                <span className='text-2xl font-bold text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] font-heading'>
                  {stats.totalClasses > 0
                    ? formatCurrency(stats.monthlyRevenue / stats.totalClasses)
                    : formatCurrency(0)}
                </span>
              </div>
            </div>
          </AdminCard>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className='flex flex-wrap gap-3'
        >
          <ExportButton
            data={[
              {
                'Tổng số lớp đã dạy': stats.totalClasses,
                'Tổng học viên': stats.totalStudents,
                'Đánh giá trung bình': stats.rating.toFixed(1),
                'Buổi học hoàn thành': stats.completedSessions,
                'Lớp sắp tới': stats.upcomingClasses,
                'Doanh thu tháng': formatCurrency(stats.monthlyRevenue),
              },
            ]}
            columns={[
              { key: 'Tổng số lớp đã dạy', label: 'Tổng số lớp đã dạy' },
              { key: 'Tổng học viên', label: 'Tổng học viên' },
              { key: 'Đánh giá trung bình', label: 'Đánh giá trung bình' },
              { key: 'Buổi học hoàn thành', label: 'Buổi học hoàn thành' },
              { key: 'Lớp sắp tới', label: 'Lớp sắp tới' },
              { key: 'Doanh thu tháng', label: 'Doanh thu tháng' },
            ]}
            filename='trainer-stats'
            title='Báo cáo thống kê Trainer'
            variant='primary'
            size='sm'
          />
          <button
            onClick={() => setIsComparisonModalOpen(true)}
            className='px-4 py-2 bg-gradient-to-r from-[var(--color-orange-600)] to-[var(--color-orange-700)] hover:from-[var(--color-orange-700)] hover:to-[var(--color-orange-800)] text-[var(--color-white)] rounded-lg transition-all duration-200 flex items-center gap-2 font-sans text-sm'
          >
            <TrendingUp className='w-4 h-4' />
            So sánh hiệu suất
          </button>
        </motion.div>
      </div>

      {/* Comparison Modal */}
      {currentUserId && (
        <ComparisonModal
          isOpen={isComparisonModalOpen}
          onClose={() => setIsComparisonModalOpen(false)}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
