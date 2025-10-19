import { BarChart3, Calendar, Star, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
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

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
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

  useEffect(() => {
    fetchTrainerStats();
  }, []);

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

  const statCards: StatCard[] = [
    {
      title: 'Tổng số lớp đã dạy',
      value: formatNumber(stats.totalClasses),
      icon: <Calendar className='w-6 h-6' />,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive',
    },
    {
      title: 'Tổng học viên',
      value: formatNumber(stats.totalStudents),
      icon: <Users className='w-6 h-6' />,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'positive',
    },
    {
      title: 'Đánh giá trung bình',
      value: stats.rating.toFixed(1),
      icon: <Star className='w-6 h-6' />,
      color: 'bg-yellow-500',
      change: '+0.2',
      changeType: 'positive',
    },
    {
      title: 'Buổi học hoàn thành',
      value: formatNumber(stats.completedSessions),
      icon: <TrendingUp className='w-6 h-6' />,
      color: 'bg-purple-500',
      change: '+15%',
      changeType: 'positive',
    },
    {
      title: 'Lớp sắp tới',
      value: formatNumber(stats.upcomingClasses),
      icon: <Calendar className='w-6 h-6' />,
      color: 'bg-orange-500',
      change: '+3',
      changeType: 'positive',
    },
    {
      title: 'Thu nhập tháng này',
      value: formatCurrency(stats.monthlyRevenue),
      icon: <BarChart3 className='w-6 h-6' />,
      color: 'bg-emerald-500',
      change: '+18%',
      changeType: 'positive',
    },
  ];

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600 dark:text-gray-400'>Đang tải thống kê...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>Thống kê cá nhân</h1>
        <p className='text-gray-600 dark:text-gray-400'>
          Theo dõi hiệu suất và thành tích giảng dạy của bạn
        </p>
      </div>

      {/* Stats Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8'>
        {statCards.map((card, index) => (
          <div
            key={index}
            className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300'
          >
            <div className='flex items-center justify-between mb-4'>
              <div className={`p-3 rounded-lg ${card.color} text-white`}>{card.icon}</div>
              {card.change && (
                <span
                  className={`text-sm font-medium px-2 py-1 rounded-full ${
                    card.changeType === 'positive'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : card.changeType === 'negative'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}
                >
                  {card.change}
                </span>
              )}
            </div>
            <h3 className='text-2xl font-bold text-gray-900 dark:text-white mb-1'>{card.value}</h3>
            <p className='text-gray-600 dark:text-gray-400 text-sm'>{card.title}</p>
          </div>
        ))}
      </div>

      {/* Additional Stats */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Achievements */}
        <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700'>
          <h3 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>Thành tích</h3>
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-gray-600 dark:text-gray-400'>Thành tích đã mở khóa</span>
              <span className='text-2xl font-bold text-purple-600'>{stats.achievements}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-gray-600 dark:text-gray-400'>Mục tiêu hoàn thành</span>
              <span className='text-2xl font-bold text-green-600'>{stats.goalsCompleted}</span>
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700'>
          <h3 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>
            Tóm tắt hiệu suất
          </h3>
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-gray-600 dark:text-gray-400'>Tỷ lệ hoàn thành lớp</span>
              <span className='text-2xl font-bold text-blue-600'>
                {stats.totalClasses > 0
                  ? ((stats.completedSessions / stats.totalClasses) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-gray-600 dark:text-gray-400'>Thu nhập trung bình/lớp</span>
              <span className='text-2xl font-bold text-emerald-600'>
                {stats.totalClasses > 0
                  ? formatCurrency(stats.monthlyRevenue / stats.totalClasses)
                  : formatCurrency(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className='mt-8 flex flex-wrap gap-4'>
        <button
          onClick={() => {
            if (window.showToast) {
              window.showToast({
                type: 'info',
                message: 'Chức năng xuất báo cáo đang được phát triển',
                duration: 3000,
              });
            }
          }}
          className='px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2'
        >
          <BarChart3 className='w-5 h-5' />
          Xuất báo cáo
        </button>
        <button
          onClick={() => {
            if (window.showToast) {
              window.showToast({
                type: 'info',
                message: 'Chức năng so sánh hiệu suất đang được phát triển',
                duration: 3000,
              });
            }
          }}
          className='px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center gap-2'
        >
          <TrendingUp className='w-5 h-5' />
          So sánh hiệu suất
        </button>
      </div>
    </div>
  );
}
