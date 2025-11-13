import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { equipmentService } from '../../services/equipment.service';
import EquipmentUsageChart from '../../components/charts/EquipmentUsageChart';
import AdminCard from '../../components/common/AdminCard';
import { Dumbbell, Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, Users, Wrench } from 'lucide-react';
import { TableLoading } from '../../components/ui/AppLoading';

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
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [equipmentUsageData, setEquipmentUsageData] = useState<{
    status: string;
    count: number;
  }[] | null>(null);
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
          if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
            console.warn('Equipment usage endpoint not available');
            return { success: false, data: null };
          }
          return { success: false, data: null };
        });

        if (usageResponse?.success && usageResponse.data) {
          setEquipmentUsageData(usageResponse.data);
          
          // Calculate stats
          const total = usageResponse.data.reduce((sum: number, item: any) => sum + item.count, 0);
          const available = usageResponse.data.find((item: any) => item.status === 'AVAILABLE')?.count || 0;
          const inUse = usageResponse.data.find((item: any) => item.status === 'IN_USE')?.count || 0;
          const maintenance = usageResponse.data.find((item: any) => item.status === 'MAINTENANCE')?.count || 0;
          const outOfOrder = usageResponse.data.find((item: any) => item.status === 'OUT_OF_ORDER')?.count || 0;
          
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
          Báo cáo Thiết bị
        </h1>
        <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
          Thống kê và phân tích về tình trạng và sử dụng thiết bị
        </p>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <TableLoading text='Đang tải dữ liệu thiết bị...' />
      ) : (
        <>
          {/* Main Stats */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'>
            <AdminCard padding='sm' className='relative overflow-hidden group'>
              <div className='absolute -top-px -right-px w-12 h-12 bg-blue-100 dark:bg-blue-900/30 opacity-5 rounded-bl-3xl'></div>
              <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-blue-100 dark:bg-blue-900/30 opacity-20 rounded-r'></div>
              <div className='relative'>
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                    <Dumbbell className='w-[18px] h-[18px] text-blue-600 dark:text-blue-400' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight mb-0.5'>
                      {stats.total}
                    </div>
                    <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                      Tổng thiết bị
                    </div>
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard padding='sm' className='relative overflow-hidden group'>
              <div className='absolute -top-px -right-px w-12 h-12 bg-success-100 dark:bg-success-900/30 opacity-5 rounded-bl-3xl'></div>
              <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-success-100 dark:bg-success-900/30 opacity-20 rounded-r'></div>
              <div className='relative'>
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                    <CheckCircle className='w-[18px] h-[18px] text-success-600 dark:text-success-400' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight mb-0.5'>
                      {stats.available}
                    </div>
                    <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                      Sẵn sàng
                    </div>
                    {stats.total > 0 && (
                      <div className='text-[10px] text-success-600 dark:text-success-400 font-inter mt-1'>
                        {Math.round((stats.available / stats.total) * 100)}% tổng số
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard padding='sm' className='relative overflow-hidden group'>
              <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl'></div>
              <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
              <div className='relative'>
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                    <Activity className='w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight mb-0.5'>
                      {stats.inUse}
                    </div>
                    <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                      Đang sử dụng
                    </div>
                    {stats.total > 0 && (
                      <div className='text-[10px] text-orange-600 dark:text-orange-400 font-inter mt-1'>
                        {stats.utilizationRate}% tỷ lệ sử dụng
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard padding='sm' className='relative overflow-hidden group'>
              <div className='absolute -top-px -right-px w-12 h-12 bg-warning-100 dark:bg-warning-900/30 opacity-5 rounded-bl-3xl'></div>
              <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-warning-100 dark:bg-warning-900/30 opacity-20 rounded-r'></div>
              <div className='relative'>
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 bg-warning-100 dark:bg-warning-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                    <Wrench className='w-[18px] h-[18px] text-warning-600 dark:text-warning-400' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight mb-0.5'>
                      {stats.maintenance + stats.outOfOrder}
                    </div>
                    <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                      Cần bảo trì
                    </div>
                    {stats.total > 0 && (
                      <div className='text-[10px] text-warning-600 dark:text-warning-400 font-inter mt-1'>
                        {stats.maintenanceRate}% tổng số
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AdminCard>
          </div>

          {/* Secondary Stats */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
            <AdminCard padding='sm' className='border border-gray-200 dark:border-gray-800'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-theme-xs font-medium text-gray-600 dark:text-gray-400 font-inter mb-1'>
                    Tỷ lệ sử dụng
                  </p>
                  <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white'>
                    {stats.utilizationRate}%
                  </p>
                </div>
                <div className='w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center'>
                  <TrendingUp className='w-6 h-6 text-orange-600 dark:text-orange-400' />
                </div>
              </div>
              <div className='mt-3'>
                <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                  <div
                    className='bg-orange-600 dark:bg-orange-500 h-2 rounded-full transition-all duration-500'
                    style={{ width: `${stats.utilizationRate}%` }}
                  ></div>
                </div>
              </div>
            </AdminCard>

            <AdminCard padding='sm' className='border border-gray-200 dark:border-gray-800'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-theme-xs font-medium text-gray-600 dark:text-gray-400 font-inter mb-1'>
                    Bảo trì / Hỏng
                  </p>
                  <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white'>
                    {stats.maintenance + stats.outOfOrder}
                  </p>
                </div>
                <div className='w-12 h-12 bg-warning-100 dark:bg-warning-900/30 rounded-lg flex items-center justify-center'>
                  <AlertTriangle className='w-6 h-6 text-warning-600 dark:text-warning-400' />
                </div>
              </div>
              <div className='mt-3 flex gap-2 text-[10px] font-inter'>
                <span className='text-warning-600 dark:text-warning-400'>
                  Bảo trì: {stats.maintenance}
                </span>
                <span className='text-error-600 dark:text-error-400'>
                  Hỏng: {stats.outOfOrder}
                </span>
              </div>
            </AdminCard>

            <AdminCard padding='sm' className='border border-gray-200 dark:border-gray-800'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-theme-xs font-medium text-gray-600 dark:text-gray-400 font-inter mb-1'>
                    Tỷ lệ khả dụng
                  </p>
                  <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white'>
                    {stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0}%
                  </p>
                </div>
                <div className='w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center'>
                  <CheckCircle className='w-6 h-6 text-success-600 dark:text-success-400' />
                </div>
              </div>
              <div className='mt-3'>
                <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                  <div
                    className='bg-success-600 dark:bg-success-500 h-2 rounded-full transition-all duration-500'
                    style={{ width: `${stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0}%` }}
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
              height={400}
            />

            {/* Status Breakdown */}
            <AdminCard>
              <div className='mb-4'>
                <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
                  Phân bổ Trạng thái
                </h3>
                <p className='text-sm text-gray-600 dark:text-gray-400 font-inter mt-1'>
                  Chi tiết số lượng thiết bị theo từng trạng thái
                </p>
              </div>
              {equipmentUsageData && equipmentUsageData.length > 0 ? (
                <div className='space-y-3'>
                  {equipmentUsageData.map((item, index) => {
                    const statusColors: { [key: string]: string } = {
                      AVAILABLE: 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800',
                      IN_USE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                      MAINTENANCE: 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300 border-warning-200 dark:border-warning-800',
                      OUT_OF_ORDER: 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300 border-error-200 dark:border-error-800',
                    };

                    const statusLabels: { [key: string]: string } = {
                      AVAILABLE: 'Sẵn sàng',
                      IN_USE: 'Đang sử dụng',
                      MAINTENANCE: 'Bảo trì',
                      OUT_OF_ORDER: 'Hỏng',
                    };

                    const statusIcons: { [key: string]: React.ReactNode } = {
                      AVAILABLE: <CheckCircle className='w-5 h-5' />,
                      IN_USE: <Activity className='w-5 h-5' />,
                      MAINTENANCE: <Wrench className='w-5 h-5' />,
                      OUT_OF_ORDER: <AlertTriangle className='w-5 h-5' />,
                    };

                    const percentage = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;

                    return (
                      <div
                        key={item.status}
                        className={`p-4 rounded-lg border ${statusColors[item.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
                      >
                        <div className='flex items-center justify-between mb-2'>
                          <div className='flex items-center gap-3'>
                            <div className='flex-shrink-0'>
                              {statusIcons[item.status]}
                            </div>
                            <div>
                              <p className='font-semibold font-heading text-sm'>
                                {statusLabels[item.status] || item.status}
                              </p>
                              <p className='text-xs font-inter opacity-80 mt-0.5'>
                                {percentage}% tổng số
                              </p>
                            </div>
                          </div>
                          <div className='text-right'>
                            <p className='text-2xl font-bold font-heading'>
                              {item.count}
                            </p>
                            <p className='text-xs font-inter opacity-80'>
                              thiết bị
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
                  Chưa có dữ liệu phân bổ trạng thái
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
