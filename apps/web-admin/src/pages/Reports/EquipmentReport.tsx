import { Activity, AlertTriangle, CheckCircle, Dumbbell, TrendingUp, Wrench } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import EquipmentUsageChart from '../../components/charts/EquipmentUsageChart';
import AdminCard from '../../components/common/AdminCard';
import { TableLoading } from '../../components/ui/AppLoading';
import useTranslation from '../../hooks/useTranslation';
import { equipmentService } from '../../services/equipment.service';

interface EquipmentStats {
  total: number;
  available: number;
  inUse: number;
  maintenance: number;
  outOfOrder: number;
  utilizationRate: number;
  maintenanceRate: number;
}

const EquipmentReport: React.FC = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [equipmentUsageData, setEquipmentUsageData] = useState<
    | {
        status: string;
        count: number;
      }[]
    | null
  >(null);
  const [stats, setStats] = useState<EquipmentStats>({
    total: 0,
    available: 0,
    inUse: 0,
    maintenance: 0,
    outOfOrder: 0,
    utilizationRate: 0,
    maintenanceRate: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const usageResponse = await equipmentService.getEquipmentUsageData().catch((error: any) => {
          if (
            error.message?.includes('Failed to fetch') ||
            error.message?.includes('ERR_CONNECTION_REFUSED')
          ) {
            console.warn('Equipment usage endpoint not available');
            return { success: false, data: null };
          }
          return { success: false, data: null };
        });

        if (usageResponse?.success && usageResponse.data) {
          setEquipmentUsageData(usageResponse.data);

          // Calculate stats
          const total = usageResponse.data.reduce((sum: number, item: any) => sum + item.count, 0);
          const available =
            usageResponse.data.find((item: any) => item.status === 'AVAILABLE')?.count || 0;
          const inUse =
            usageResponse.data.find((item: any) => item.status === 'IN_USE')?.count || 0;
          const maintenance =
            usageResponse.data.find((item: any) => item.status === 'MAINTENANCE')?.count || 0;
          const outOfOrder =
            usageResponse.data.find((item: any) => item.status === 'OUT_OF_ORDER')?.count || 0;

          setStats({
            total,
            available,
            inUse,
            maintenance,
            outOfOrder,
            utilizationRate: total > 0 ? Math.round((inUse / total) * 100) : 0,
            maintenanceRate: total > 0 ? Math.round(((maintenance + outOfOrder) / total) * 100) : 0,
          });
        }
      } catch (error) {
        console.error('Error fetching equipment report data:', error);
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
          {t('reports.equipment.title')}
        </h1>
        <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
          {t('reports.equipment.subtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <TableLoading text={t('reports.equipment.loading')} />
      ) : (
        <>
          {/* Main Stats */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'>
            <AdminCard padding='sm' className='relative overflow-hidden group'>
              <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
              <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
              <div className='relative'>
                <div className='flex items-center gap-3'>
                  <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                    <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                    <Dumbbell className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-baseline gap-1.5 mb-0.5'>
                      <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                        {stats.total}
                      </div>
                    </div>
                    <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                      {t('reports.equipment.stats.total')}
                    </div>
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard padding='sm' className='relative overflow-hidden group'>
              <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
              <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
              <div className='relative'>
                <div className='flex items-center gap-3'>
                  <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                    <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                    <CheckCircle className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-baseline gap-1.5 mb-0.5'>
                      <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                        {stats.available}
                      </div>
                    </div>
                    <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                      {t('reports.equipment.stats.available')}
                    </div>
                    {stats.total > 0 && (
                      <div className='text-[10px] text-orange-600 dark:text-orange-400 font-inter mt-1 font-medium'>
                        {Math.round((stats.available / stats.total) * 100)}%{' '}
                        {t('reports.equipment.stats.ofTotal')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard padding='sm' className='relative overflow-hidden group'>
              <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
              <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
              <div className='relative'>
                <div className='flex items-center gap-3'>
                  <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                    <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                    <Activity className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-baseline gap-1.5 mb-0.5'>
                      <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                        {stats.inUse}
                      </div>
                    </div>
                    <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                      {t('reports.equipment.stats.inUse')}
                    </div>
                    {stats.total > 0 && (
                      <div className='text-[10px] text-orange-600 dark:text-orange-400 font-inter mt-1 font-medium'>
                        {stats.utilizationRate}% {t('reports.equipment.stats.utilizationRate')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard padding='sm' className='relative overflow-hidden group'>
              <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
              <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
              <div className='relative'>
                <div className='flex items-center gap-3'>
                  <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                    <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                    <Wrench className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-baseline gap-1.5 mb-0.5'>
                      <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                        {stats.maintenance + stats.outOfOrder}
                      </div>
                    </div>
                    <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                      {t('reports.equipment.stats.needsMaintenance')}
                    </div>
                    {stats.total > 0 && (
                      <div className='text-[10px] text-orange-600 dark:text-orange-400 font-inter mt-1 font-medium'>
                        {stats.maintenanceRate}% {t('reports.equipment.stats.ofTotal')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AdminCard>
          </div>

          {/* Secondary Stats */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
            <AdminCard
              padding='sm'
              className='relative overflow-hidden group border border-gray-200 dark:border-gray-800'
            >
              <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
              <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
              <div className='relative'>
                <div className='flex items-center justify-between mb-2'>
                  <div>
                    <p className='text-theme-xs font-medium text-gray-600 dark:text-gray-400 font-inter mb-1'>
                      {t('reports.equipment.stats.utilizationRate')}
                    </p>
                    <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white'>
                      {stats.utilizationRate}%
                    </p>
                  </div>
                  <div className='w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                    <TrendingUp className='w-5 h-5 text-orange-600 dark:text-orange-400' />
                  </div>
                </div>
                <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                  <div
                    className='bg-orange-600 dark:bg-orange-500 h-2 rounded-full transition-all duration-500'
                    style={{ width: `${stats.utilizationRate}%` }}
                  ></div>
                </div>
              </div>
            </AdminCard>

            <AdminCard
              padding='sm'
              className='relative overflow-hidden group border border-gray-200 dark:border-gray-800'
            >
              <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
              <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
              <div className='relative'>
                <div className='flex items-center justify-between mb-2'>
                  <div>
                    <p className='text-theme-xs font-medium text-gray-600 dark:text-gray-400 font-inter mb-1'>
                      {t('reports.equipment.stats.maintenanceOrBroken')}
                    </p>
                    <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white'>
                      {stats.maintenance + stats.outOfOrder}
                    </p>
                  </div>
                  <div className='w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                    <AlertTriangle className='w-5 h-5 text-orange-600 dark:text-orange-400' />
                  </div>
                </div>
                <div className='flex gap-2 text-[10px] font-inter'>
                  <span className='px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded font-medium'>
                    {t('reports.equipment.stats.maintenance')}: {stats.maintenance}
                  </span>
                  <span className='px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded font-medium'>
                    {t('reports.equipment.stats.broken')}: {stats.outOfOrder}
                  </span>
                </div>
              </div>
            </AdminCard>

            <AdminCard
              padding='sm'
              className='relative overflow-hidden group border border-gray-200 dark:border-gray-800'
            >
              <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
              <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
              <div className='relative'>
                <div className='flex items-center justify-between mb-2'>
                  <div>
                    <p className='text-theme-xs font-medium text-gray-600 dark:text-gray-400 font-inter mb-1'>
                      {t('reports.equipment.stats.availabilityRate')}
                    </p>
                    <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white'>
                      {stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0}%
                    </p>
                  </div>
                  <div className='w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                    <CheckCircle className='w-5 h-5 text-orange-600 dark:text-orange-400' />
                  </div>
                </div>
                <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                  <div
                    className='bg-orange-600 dark:bg-orange-500 h-2 rounded-full transition-all duration-500'
                    style={{
                      width: `${
                        stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </AdminCard>
          </div>

          {/* Chart */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
            <EquipmentUsageChart
              data={equipmentUsageData || undefined}
              loading={isLoading}
              height={350}
            />

            {/* Status Breakdown */}
            <AdminCard>
              <div className='mb-4'>
                <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
                  {t('reports.equipment.statusBreakdown.title')}
                </h3>
                <p className='text-sm text-gray-600 dark:text-gray-400 font-inter mt-1'>
                  {t('reports.equipment.statusBreakdown.subtitle')}
                </p>
              </div>
              {equipmentUsageData && equipmentUsageData.length > 0 ? (
                <div className='space-y-3'>
                  {equipmentUsageData.map(item => {
                    const statusColors: { [key: string]: string } = {
                      AVAILABLE:
                        'bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800',
                      IN_USE:
                        'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700',
                      MAINTENANCE:
                        'bg-orange-200 dark:bg-orange-800/40 text-orange-900 dark:text-orange-200 border-orange-400 dark:border-orange-600',
                      OUT_OF_ORDER:
                        'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
                    };

                    const statusLabels: { [key: string]: string } = {
                      AVAILABLE: t('reports.equipment.status.available'),
                      IN_USE: t('reports.equipment.status.inUse'),
                      MAINTENANCE: t('reports.equipment.status.maintenance'),
                      OUT_OF_ORDER: t('reports.equipment.status.outOfOrder'),
                    };

                    const statusIcons: { [key: string]: React.ReactNode } = {
                      AVAILABLE: <CheckCircle className='w-5 h-5' />,
                      IN_USE: <Activity className='w-5 h-5' />,
                      MAINTENANCE: <Wrench className='w-5 h-5' />,
                      OUT_OF_ORDER: <AlertTriangle className='w-5 h-5' />,
                    };

                    const percentage =
                      stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;

                    return (
                      <div
                        key={item.status}
                        className={`p-4 rounded-lg border ${
                          statusColors[item.status] ||
                          'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className='flex items-center justify-between mb-2'>
                          <div className='flex items-center gap-3'>
                            <div className='flex-shrink-0'>{statusIcons[item.status]}</div>
                            <div>
                              <p className='font-semibold font-heading text-sm'>
                                {statusLabels[item.status] || item.status}
                              </p>
                              <p className='text-xs font-inter opacity-80 mt-0.5'>
                                {percentage}% {t('reports.equipment.stats.ofTotal')}
                              </p>
                            </div>
                          </div>
                          <div className='text-right'>
                            <p className='text-2xl font-bold font-heading'>{item.count}</p>
                            <p className='text-xs font-inter opacity-80'>
                              {t('reports.equipment.stats.equipment')}
                            </p>
                          </div>
                        </div>
                        <div className='mt-3'>
                          <div className='w-full bg-white/20 dark:bg-black/20 rounded-full h-2'>
                            <div
                              className='bg-current opacity-60 h-2 rounded-full transition-all duration-500'
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className='text-center py-12 text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
                  {t('reports.equipment.statusBreakdown.noData')}
                </div>
              )}
            </AdminCard>
          </div>
        </>
      )}
    </div>
  );
};

export default EquipmentReport;
