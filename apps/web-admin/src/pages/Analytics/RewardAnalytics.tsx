import { BarChart3, CheckCircle2, Clock, DollarSign, Gift, RefreshCw, TrendingUp, Trophy, XCircle } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import AdminButton from '../../components/common/AdminButton';
import AdminCard from '../../components/common/AdminCard';
import { useToast } from '../../context/ToastContext';
import rewardService, { RewardStats } from '../../services/reward.service';
import RedemptionTrendChart from '../../components/charts/RedemptionTrendChart';
import RedemptionStatusChart from '../../components/charts/RedemptionStatusChart';
import PopularRewardsChart from '../../components/charts/PopularRewardsChart';

const RewardAnalytics: React.FC = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState<RewardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [redemptionTrendData, setRedemptionTrendData] = useState<{
    dates: string[];
    redemptions: number[];
    points_spent: number[];
  } | null>(null);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadRedemptionTrend();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await rewardService.getRewardStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error: any) {
      showToast({ message: 'Không thể tải thống kê', type: 'error' });
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRedemptionTrend = async () => {
    try {
      setTrendLoading(true);
      const response = await rewardService.getRedemptionTrend({ period: 'monthly' });
      if (response.success && response.data) {
        setRedemptionTrendData(response.data);
      }
    } catch (error: any) {
      console.error('Error loading redemption trend:', error);
      // Don't show toast for trend data - it's not critical
      setRedemptionTrendData(null);
    } finally {
      setTrendLoading(false);
    }
  };

  const statsCards = useMemo(() => {
    if (!stats) return [];

    return [
      {
        title: 'Tổng số Phần thưởng',
        value: stats.total_rewards || 0,
        icon: Gift,
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        textColor: 'text-orange-600 dark:text-orange-400',
        borderColor: 'bg-orange-100 dark:bg-orange-900/30',
      },
      {
        title: 'Đang hoạt động',
        value: stats.active_rewards || 0,
        icon: Trophy,
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        textColor: 'text-orange-600 dark:text-orange-400',
        borderColor: 'bg-orange-100 dark:bg-orange-900/30',
      },
      {
        title: 'Tổng lượt đổi',
        value: stats.total_redemptions || 0,
        icon: TrendingUp,
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        textColor: 'text-orange-600 dark:text-orange-400',
        borderColor: 'bg-orange-100 dark:bg-orange-900/30',
      },
      {
        title: 'Tổng điểm đã dùng',
        value: (stats.total_points_spent || 0).toLocaleString(),
        icon: DollarSign,
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        textColor: 'text-orange-600 dark:text-orange-400',
        borderColor: 'bg-orange-100 dark:bg-orange-900/30',
      },
    ];
  }, [stats]);

  if (loading) {
    return (
      <div className='p-6 flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4'></div>
          <p className='text-gray-500 dark:text-gray-400 font-medium'>
            Đang tải dữ liệu phân tích...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-start'>
        <div>
          <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
            Phân tích Gamification
          </h1>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
            Tổng quan hiệu quả chương trình đổi thưởng và tương tác thành viên
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <AdminButton 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              loadStats();
            }}
            icon={RefreshCw} 
            variant='outline' 
            size='sm'
            type='button'
            disabled={loading}
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </AdminButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {statsCards.map((stat, index) => (
          <AdminCard key={index} padding='sm' className='relative overflow-hidden group'>
            <div className={`absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10`}></div>
            <div className={`absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r`}></div>
            <div className='relative'>
              <div className='flex items-center gap-3'>
                <div className={`relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                  <div className={`absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300`}></div>
                  <stat.icon className={`relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110`} />
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-baseline gap-1.5 mb-0.5'>
                    <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                      {stat.value}
                    </div>
                  </div>
                  <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                    {stat.title}
                  </div>
                </div>
              </div>
            </div>
          </AdminCard>
        ))}
      </div>

      {/* Charts Section */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Redemption Trend Chart */}
        <RedemptionTrendChart
          data={redemptionTrendData || undefined}
          loading={trendLoading || loading}
          height={400}
        />

        {/* Redemption Status Chart */}
        <RedemptionStatusChart
          data={{
            active: stats?.active_redemptions || 0,
            used: stats?.used_redemptions || 0,
            expired: stats?.expired_redemptions || 0,
            refunded: stats?.refunded_redemptions || 0,
          }}
          loading={loading}
          height={400}
        />
      </div>

      {/* Popular Rewards Chart */}
      <div className='grid grid-cols-1 gap-6'>
        <PopularRewardsChart
          data={stats?.popular_rewards || []}
          loading={loading}
          height={400}
        />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Popular Rewards List */}
        <AdminCard padding='none' className='overflow-hidden'>
          <div className='p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between'>
            <h2 className='text-lg font-bold font-heading text-gray-900 dark:text-white flex items-center gap-2'>
              <Trophy className='w-5 h-5 text-yellow-500' />
              Top Phần thưởng Phổ biến
            </h2>
            <span className='text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'>
              Top 5
            </span>
          </div>
          <div className='p-6'>
            {stats?.popular_rewards && stats.popular_rewards.length > 0 ? (
              <div className='space-y-3'>
                {stats.popular_rewards.slice(0, 5).map((reward, index) => (
                  <div
                    key={reward.reward_id}
                    className='flex items-center justify-between group p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700'
                  >
                    <div className='flex items-center gap-4'>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${
                          index === 0
                            ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white ring-4 ring-yellow-100 dark:ring-yellow-900/20'
                            : index === 1
                            ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white ring-4 ring-gray-100 dark:ring-gray-800'
                            : index === 2
                            ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-white ring-4 ring-orange-100 dark:ring-orange-900/20'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className='font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors'>
                          {reward.title}
                        </p>
                        <div className='flex items-center gap-2 mt-1'>
                          <span className='text-xs font-medium px-2 py-0.5 rounded-md bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-900/30'>
                            {reward.points_cost} điểm
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className='text-xl font-bold text-gray-900 dark:text-white'>
                        {reward.redemption_count}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide'>
                        lượt đổi
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-12'>
                <BarChart3 className='w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4' />
                <p className='text-theme-xs font-heading text-gray-500 dark:text-gray-400'>
                  Chưa có dữ liệu về phần thưởng phổ biến
                </p>
              </div>
            )}
          </div>
        </AdminCard>

        {/* Redemption Overview */}
        <AdminCard padding='md' className='overflow-hidden'>
          <div className='pb-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between mb-6'>
            <h2 className='text-lg font-bold font-heading text-gray-900 dark:text-white flex items-center gap-2'>
              <TrendingUp className='w-5 h-5 text-orange-600 dark:text-orange-400' />
              Tổng quan Đổi thưởng
            </h2>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            {/* Đã sử dụng */}
            <div className='relative p-5 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10 border border-orange-200 dark:border-orange-800 hover:shadow-md transition-all duration-300 group'>
              <div className='absolute top-3 right-3 w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity'>
                <CheckCircle2 className='w-5 h-5 text-orange-600 dark:text-orange-400' />
              </div>
              <p className='text-xs text-orange-600 dark:text-orange-400 font-semibold mb-2 uppercase tracking-wide font-inter'>
                Đã sử dụng
              </p>
              <p className='text-3xl font-bold text-gray-900 dark:text-white font-heading'>
                {(stats?.used_redemptions || 0).toLocaleString('vi-VN')}
              </p>
            </div>

            {/* Đang hiệu lực */}
            <div className='relative p-5 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10 border border-orange-200 dark:border-orange-800 hover:shadow-md transition-all duration-300 group'>
              <div className='absolute top-3 right-3 w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity'>
                <Clock className='w-5 h-5 text-orange-600 dark:text-orange-400' />
              </div>
              <p className='text-xs text-orange-600 dark:text-orange-400 font-semibold mb-2 uppercase tracking-wide font-inter'>
                Đang hiệu lực
              </p>
              <p className='text-3xl font-bold text-gray-900 dark:text-white font-heading'>
                {(stats?.active_redemptions || 0).toLocaleString('vi-VN')}
              </p>
            </div>

            {/* Hết hạn */}
            <div className='relative p-5 rounded-xl bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-900/15 dark:to-orange-900/8 border border-orange-200/70 dark:border-orange-800/70 hover:shadow-md transition-all duration-300 group'>
              <div className='absolute top-3 right-3 w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity'>
                <XCircle className='w-5 h-5 text-orange-600 dark:text-orange-400' />
              </div>
              <p className='text-xs text-orange-600 dark:text-orange-400 font-semibold mb-2 uppercase tracking-wide font-inter'>
                Hết hạn
              </p>
              <p className='text-3xl font-bold text-gray-900 dark:text-white font-heading'>
                {(stats?.expired_redemptions || 0).toLocaleString('vi-VN')}
              </p>
            </div>

            {/* Hoàn trả */}
            <div className='relative p-5 rounded-xl bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-900/15 dark:to-orange-900/8 border border-orange-200/70 dark:border-orange-800/70 hover:shadow-md transition-all duration-300 group'>
              <div className='absolute top-3 right-3 w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity'>
                <RefreshCw className='w-5 h-5 text-orange-600 dark:text-orange-400' />
              </div>
              <p className='text-xs text-orange-600 dark:text-orange-400 font-semibold mb-2 uppercase tracking-wide font-inter'>
                Hoàn trả
              </p>
              <p className='text-3xl font-bold text-gray-900 dark:text-white font-heading'>
                {(stats?.refunded_redemptions || 0).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>
          <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-800'>
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center gap-2'>
                <TrendingUp className='w-4 h-4 text-orange-600 dark:text-orange-400' />
                <span className='text-sm font-semibold text-gray-700 dark:text-gray-300 font-heading'>
                  Tỷ lệ sử dụng
                </span>
              </div>
              <span className='text-lg font-bold text-orange-600 dark:text-orange-400 font-heading'>
                {stats?.total_redemptions
                  ? Math.round(((stats.used_redemptions || 0) / stats.total_redemptions) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className='relative w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner'>
              <div
                className='h-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 rounded-full shadow-lg shadow-orange-500/30 transition-all duration-500 relative overflow-hidden'
                style={{
                  width: `${
                    stats?.total_redemptions
                      ? Math.round(((stats.used_redemptions || 0) / stats.total_redemptions) * 100)
                      : 0
                  }%`,
                }}
              >
                <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer'></div>
              </div>
            </div>
            <div className='mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400'>
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
};

export default RewardAnalytics;
