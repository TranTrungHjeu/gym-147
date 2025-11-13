import { GraduationCap, Shield, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import UserGrowthByRoleChart from '../../components/charts/UserGrowthByRoleChart';
import UserGrowthChart from '../../components/charts/UserGrowthChart';
import UserRoleDistributionChart from '../../components/charts/UserRoleDistributionChart';
import AdminCard from '../../components/common/AdminCard';
import { useTheme } from '../../context/ThemeContext';
import { dashboardService } from '../../services/dashboard.service';

const UsersReport: React.FC = () => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [userGrowthData, setUserGrowthData] = useState<{
    dates: string[];
    newUsers: number[];
    activeUsers?: number[];
  } | null>(null);
  const [userRoleDistributionData, setUserRoleDistributionData] = useState<{
    admins: number;
    trainers: number;
    members: number;
  } | null>(null);
  const [userGrowthByRoleData, setUserGrowthByRoleData] = useState<{
    months: string[];
    admins: number[];
    trainers: number[];
    members: number[];
  } | null>(null);
  const [userStats, setUserStats] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [growthRes, statsRes, growthByRoleRes] = await Promise.all([
          dashboardService.getUserGrowthData(),
          dashboardService.getUserStats(),
          dashboardService.getUserGrowthByRoleData(),
        ]);

        if (growthRes.success && growthRes.data) {
          setUserGrowthData(growthRes.data);
        }

        if (statsRes.success && statsRes.data) {
          setUserStats(statsRes.data);
          const roleData = {
            admins: statsRes.data.find((s: any) => s.role === 'ADMIN')?.count || 0,
            trainers: statsRes.data.find((s: any) => s.role === 'TRAINER')?.count || 0,
            members: statsRes.data.find((s: any) => s.role === 'MEMBER')?.count || 0,
          };
          setUserRoleDistributionData(roleData);
        }

        if (growthByRoleRes.success && growthByRoleRes.data) {
          setUserGrowthByRoleData(growthByRoleRes.data);
        }
      } catch (error) {
        console.error('Error fetching user report data:', error);
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
          Báo cáo Người dùng
        </h1>
        <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
          Thống kê và phân tích về người dùng hệ thống
        </p>
      </div>

      {/* Stats Cards */}
      {userStats.length > 0 && (
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          {userStats.map((stat: any) => {
            const getIcon = () => {
              switch (stat.role) {
                case 'ADMIN':
                case 'SUPER_ADMIN':
                  return Shield;
                case 'TRAINER':
                  return GraduationCap;
                case 'MEMBER':
                  return Users;
                default:
                  return Users;
              }
            };
            const Icon = getIcon();

            return (
              <AdminCard key={stat.role} padding='sm'>
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                    <Icon className='w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight mb-0.5'>
                      {stat.count || 0}
                    </div>
                    <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                      {stat.role === 'SUPER_ADMIN'
                        ? 'Super Admin'
                        : stat.role === 'ADMIN'
                        ? 'Admin'
                        : stat.role === 'TRAINER'
                        ? 'Huấn luyện viên'
                        : 'Thành viên'}
                    </div>
                  </div>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}

      {/* Charts */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
        {/* User Growth Chart */}
        <UserGrowthChart data={userGrowthData || undefined} loading={isLoading} height={350} />

        {/* User Role Distribution Chart */}
        <div className='bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-theme-md p-6'>
          <div className='mb-4'>
            <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
              Phân bổ Người dùng theo Vai trò
            </h3>
            <p className='text-sm text-gray-600 dark:text-gray-400 font-inter mt-1'>
              Biểu đồ thể hiện số lượng người dùng theo từng vai trò trong hệ thống
            </p>
          </div>
          {isLoading ? (
            <div className='text-center py-12 text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
              Đang tải...
            </div>
          ) : userRoleDistributionData ? (
            <UserRoleDistributionChart data={userRoleDistributionData} theme={theme} />
          ) : (
            <div className='text-center py-12 text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
              Chưa có dữ liệu phân bổ người dùng
            </div>
          )}
        </div>
      </div>

      {/* User Growth By Role Chart */}
      {userGrowthByRoleData && (
        <div className='bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-theme-md p-6'>
          <div className='mb-4'>
            <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
              Tăng trưởng Người dùng theo Vai trò
            </h3>
            <p className='text-sm text-gray-600 dark:text-gray-400 font-inter mt-1'>
              Biểu đồ thể hiện xu hướng tăng trưởng người dùng theo từng vai trò theo thời gian
            </p>
          </div>
          <UserGrowthByRoleChart data={userGrowthByRoleData} theme={theme} />
        </div>
      )}
    </div>
  );
};

export default UsersReport;
