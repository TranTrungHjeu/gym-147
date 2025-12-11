import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { dashboardService } from '../../services/dashboard.service';
import SystemActivityChart from '../../components/charts/SystemActivityChart';
import AdminCard from '../../components/common/AdminCard';
import useTranslation from '../../hooks/useTranslation';
import { Activity, TrendingUp, Clock, Users } from 'lucide-react';

const SystemReport: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [systemActivityData, setSystemActivityData] = useState<{
    dates: string[];
    activities: number[];
  } | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSessions: 0,
    recentRegistrations: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [activityRes, statsRes] = await Promise.all([
          dashboardService.getSystemActivityData({ period: '30d' }),
          dashboardService.getSuperAdminStats(),
        ]);

        console.log('System Activity Response:', activityRes);

        if (activityRes.success && activityRes.data) {
          console.log('System Activity Data:', activityRes.data);
          setSystemActivityData(activityRes.data);
        } else {
          console.warn('System Activity Data not available:', activityRes);
          // Set empty data structure to ensure chart renders
          setSystemActivityData({
            dates: [],
            activities: [],
          });
        }

        if (statsRes.success && statsRes.data) {
          setStats({
            totalUsers: statsRes.data.totalUsers || 0,
            activeSessions: statsRes.data.activeSessions || 0,
            recentRegistrations: statsRes.data.recentRegistrations || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching system report data:', error);
        // Set empty data structure on error
        setSystemActivityData({
          dates: [],
          activities: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className='p-3 space-y-3'>
      {/* Header */}
      <div>
        <h1 className='text-xl sm:text-2xl font-bold font-heading text-gray-900 dark:text-white'>
          {t('reports.system.title')}
        </h1>
        <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
          {t('reports.system.subtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
        <AdminCard padding='sm'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
              <Users className='w-[18px] h-[18px] text-blue-600 dark:text-blue-400' />
            </div>
            <div className='flex-1 min-w-0'>
              <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight mb-0.5'>
                {stats.totalUsers}
              </div>
              <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                {t('reports.system.stats.totalUsers')}
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
              <Activity className='w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
            </div>
            <div className='flex-1 min-w-0'>
              <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight mb-0.5'>
                {stats.activeSessions}
              </div>
              <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                {t('reports.system.stats.activeSessions')}
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
              <TrendingUp className='w-[18px] h-[18px] text-green-600 dark:text-green-400' />
            </div>
            <div className='flex-1 min-w-0'>
              <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight mb-0.5'>
                {stats.recentRegistrations}
              </div>
              <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                {t('reports.system.stats.recentRegistrations')}
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* System Activity Chart */}
      <AdminCard>
        <div className='mb-4'>
          <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
            {t('reports.system.systemActivity.title')}
          </h3>
          <p className='text-sm text-gray-600 dark:text-gray-400 font-inter mt-1'>
            {t('reports.system.systemActivity.subtitle')}
          </p>
        </div>
        {isLoading ? (
          <div className='text-center py-12 text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
            {t('reports.system.systemActivity.loading')}
          </div>
        ) : (
          <SystemActivityChart
            data={systemActivityData || { dates: [], activities: [] }}
            theme={theme}
            loading={isLoading}
          />
        )}
      </AdminCard>
    </div>
  );
};

export default SystemReport;
