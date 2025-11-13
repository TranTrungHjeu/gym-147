import {
  Activity,
  AlertTriangle,
  Clock,
  DollarSign,
  Dumbbell,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  RotateCcw,
  TrendingUp,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminButton from '../../components/common/AdminButton';
import AdminCard from '../../components/common/AdminCard';
import RoleBadge from '../../components/common/RoleBadge';
import CompactMetricCard from '../../components/dashboard/CompactMetricCard';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import MetricCard from '../../components/dashboard/MetricCard';
import QuickActionCard from '../../components/dashboard/QuickActionCard';
import RecentBookings from '../../components/dashboard/RecentBookings';
import RecentPayments from '../../components/dashboard/RecentPayments';
import SectionHeader from '../../components/dashboard/SectionHeader';
import ClassAttendanceChart from '../../components/charts/ClassAttendanceChart';
import EquipmentUsageChart from '../../components/charts/EquipmentUsageChart';
import RevenueTrendChart from '../../components/charts/RevenueTrendChart';
import UserGrowthChart from '../../components/charts/UserGrowthChart';
import { useToast } from '../../hooks/useToast';
import useTranslation from '../../hooks/useTranslation';
import { authService } from '../../services/auth.service';
import { billingService } from '../../services/billing.service';
import { DashboardStats, dashboardService } from '../../services/dashboard.service';
import { equipmentService } from '../../services/equipment.service';
import { scheduleService } from '../../services/schedule.service';
import { formatRelativeTime } from '../../utils/dateTime';
import { clearAuthData } from '../../utils/auth';

interface RecentActivity {
  id: string;
  type: string;
  user: {
    name: string;
    role: string;
  };
  timestamp: string;
  description: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAdmins: 0,
    totalTrainers: 0,
    totalMembers: 0,
    recentRegistrations: 0,
    activeSessions: 0,
    totalEquipment: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResettingRateLimit, setIsResettingRateLimit] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Revenue data
  const [revenueData, setRevenueData] = useState<{ dates: string[]; revenues: number[]; transactions?: number[] } | null>(null);
  const [billingStats, setBillingStats] = useState<any>(null);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(false);
  
  // Member growth data
  const [memberGrowthData, setMemberGrowthData] = useState<{ dates: string[]; newUsers: number[]; activeUsers?: number[] } | null>(null);
  const [isLoadingMemberGrowth, setIsLoadingMemberGrowth] = useState(false);
  
  // Equipment utilization data
  const [equipmentUsageData, setEquipmentUsageData] = useState<{ status: string; count: number }[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  
  // Class attendance data
  const [classAttendanceData, setClassAttendanceData] = useState<{ classNames: string[]; attendance: number[][]; dates?: string[] } | null>(null);
  const [isLoadingClassAttendance, setIsLoadingClassAttendance] = useState(false);

  // Fetch dashboard statistics and recent activities
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [statsData, activitiesData] = await Promise.all([
          dashboardService.getAdminStats(),
          dashboardService.getRecentActivities().catch(() => ({ success: false, data: [] })),
        ]);

        if (statsData.success) {
          console.log('📊 Admin stats data received:', statsData.data);
          const statsDataToSet = {
            totalUsers: 0,
            totalAdmins: 0,
            totalTrainers: statsData.data.totalTrainers || 0,
            totalMembers: statsData.data.totalMembers || 0,
            recentRegistrations: statsData.data.recentRegistrations || 0,
            activeSessions: statsData.data.activeSessions || 0,
            totalEquipment: statsData.data.totalEquipment || 0,
          };
          console.log('📊 Setting stats state:', statsDataToSet);
          setStats(statsDataToSet);
        } else {
          showToast(t('dashboard.admin.errors.loadStatsFailed'), 'error');
        }

        if (activitiesData.success && activitiesData.data) {
          console.log('📥 Recent activities received:', activitiesData.data);
          console.log('📥 Activities count:', activitiesData.data.length);
          activitiesData.data.forEach((activity, index) => {
            console.log(`📥 Activity ${index}:`, {
              id: activity.id,
              type: activity.type,
              user: activity.user,
              userAvatar: activity.user?.avatar,
              rootAvatar: (activity as any).avatar, // Check if avatar exists at root
              description: activity.description,
              fullActivity: activity, // Full activity object for debugging
            });
          });
          setRecentActivities(activitiesData.data.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        showToast(t('dashboard.admin.errors.loadDataError'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [showToast]);

  const handleCreateTrainer = () => {
    navigate('/create-trainer');
  };

  const handleGoToDashboard = () => {
    navigate('/legacy-dashboard');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthData();
      navigate('/auth');
    }
  };

  const handleResetAllRateLimits = async () => {
    try {
      setIsResettingRateLimit(true);
      const response = await scheduleService.resetAllRateLimits();

      if (response.success) {
        showToast(
          t('dashboard.admin.system.resetSuccess', { count: response.data.count }),
          'success'
        );
        setShowResetConfirm(false);
      } else {
        showToast(t('dashboard.admin.system.resetError'), 'error');
      }
    } catch (error) {
      console.error('Error resetting rate limits:', error);
      showToast(t('dashboard.admin.system.resetErrorGeneric'), 'error');
    } finally {
      setIsResettingRateLimit(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    // Use Vietnam timezone utility
    return formatRelativeTime(timestamp);
  };
  
  // Fetch revenue data
  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setIsLoadingRevenue(true);
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const fromDate = lastMonth.toISOString().split('T')[0];
        const toDate = now.toISOString().split('T')[0];
        
        const [trendsResponse, statsResponse] = await Promise.all([
          billingService.getRevenueTrends({ from: fromDate, to: toDate }).catch(() => ({
            success: false,
            data: { dates: [], revenues: [], transactions: [] },
          })),
          billingService.getStats().catch(() => ({
            success: false,
            data: null,
          })),
        ]);
        
        if (trendsResponse.success && trendsResponse.data) {
          setRevenueData(trendsResponse.data);
        }
        
        if (statsResponse.success && statsResponse.data) {
          setBillingStats(statsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching revenue data:', error);
      } finally {
        setIsLoadingRevenue(false);
      }
    };
    
    fetchRevenueData();
  }, []);
  
  // Fetch member growth data
  useEffect(() => {
    const fetchMemberGrowthData = async () => {
      try {
        setIsLoadingMemberGrowth(true);
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const fromDate = lastMonth.toISOString().split('T')[0];
        const toDate = now.toISOString().split('T')[0];
        
        const response = await dashboardService.getUserGrowthData({ from: fromDate, to: toDate }).catch(() => ({
          success: false,
          data: { dates: [], newUsers: [], activeUsers: [] },
        }));
        
        if (response.success && response.data) {
          setMemberGrowthData(response.data);
        }
      } catch (error) {
        console.error('Error fetching member growth data:', error);
      } finally {
        setIsLoadingMemberGrowth(false);
      }
    };
    
    fetchMemberGrowthData();
  }, []);
  
  // Fetch equipment utilization data
  useEffect(() => {
    const fetchEquipmentData = async () => {
      try {
        setIsLoadingEquipment(true);
        const response = await equipmentService.getEquipmentUsageData().catch(() => ({
          success: false,
          data: [],
        }));
        
        if (response.success && response.data) {
          setEquipmentUsageData(response.data);
        }
      } catch (error) {
        console.error('Error fetching equipment data:', error);
      } finally {
        setIsLoadingEquipment(false);
      }
    };
    
    fetchEquipmentData();
  }, []);
  
  // Fetch class attendance data
  useEffect(() => {
    const fetchClassAttendanceData = async () => {
      try {
        setIsLoadingClassAttendance(true);
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const fromDate = lastMonth.toISOString().split('T')[0];
        const toDate = now.toISOString().split('T')[0];
        
        const response = await scheduleService.getClassAttendanceData({ from: fromDate, to: toDate }).catch(() => ({
          success: false,
          data: { classNames: [], attendance: [], dates: [] },
        }));
        
        if (response.success && response.data) {
          setClassAttendanceData(response.data);
        }
      } catch (error) {
        console.error('Error fetching class attendance data:', error);
      } finally {
        setIsLoadingClassAttendance(false);
      }
    };
    
    fetchClassAttendanceData();
  }, []);

  const getActivityIcon = (description: string) => {
    if (description.includes('New trainer registered:')) {
      return GraduationCap;
    }
    if (description.includes('New member registered:')) {
      return UserPlus;
    }
    if (description.includes('New admin registered:')) {
      return User;
    }
    if (description.startsWith('Logged in using')) {
      return LogIn;
    }
    return Activity;
  };

  const getActivityIconColor = (description: string) => {
    if (
      description.includes('New trainer registered:') ||
      description.includes('New member registered:')
    ) {
      return 'text-orange-500 dark:text-orange-400';
    }
    if (description.includes('New admin registered:')) {
      return 'text-gray-500 dark:text-gray-400';
    }
    if (description.startsWith('Logged in using')) {
      return 'text-blue-500 dark:text-blue-400';
    }
    return 'text-gray-400 dark:text-gray-500';
  };

  const formatActivityDescription = (activity: any) => {
    const description = activity.description || '';
    const userName = activity.user?.name || '';

    // Parse activity description and translate
    if (description.includes('New trainer registered:')) {
      return `${t('dashboard.admin.activity.types.newTrainerRegistered')}: ${
        userName || 'Unknown'
      }`;
    }
    if (description.includes('New member registered:')) {
      return `${t('dashboard.admin.activity.types.newMemberRegistered')}: ${userName || 'Unknown'}`;
    }
    if (description.includes('New admin registered:')) {
      return `${t('dashboard.admin.activity.types.newAdminRegistered')}: ${userName || 'Unknown'}`;
    }
    if (description.startsWith('Logged in using')) {
      const parts = description.replace('Logged in using', '').trim();
      if (parts.includes(' at ')) {
        const [method, location] = parts.split(' at ');
        return `${t('dashboard.admin.activity.types.loggedIn')} ${method} ${t(
          'dashboard.admin.activity.types.at'
        )} ${location}`;
      }
      return `${t('dashboard.admin.activity.types.loggedIn')} ${parts}`;
    }
    // Fallback to original description if pattern doesn't match
    return description;
  };

  const renderActivityDescription = (activity: any) => {
    const description = formatActivityDescription(activity);
    const role = activity.user?.role;
    const userName = activity.user?.name || 'Unknown';

    // For registration activities, replace only role text with badge, keep description text
    if (
      description.includes(t('dashboard.admin.activity.types.newTrainerRegistered')) ||
      description.includes(t('dashboard.admin.activity.types.newMemberRegistered')) ||
      description.includes(t('dashboard.admin.activity.types.newAdminRegistered'))
    ) {
      // Extract role text and remaining description
      let roleText = '';
      let remainingDesc = '';

      if (description.includes(t('dashboard.admin.activity.types.newTrainerRegistered'))) {
        roleText = t('dashboard.admin.activity.types.newTrainerRegistered');
        // Extract "mới đăng ký" or equivalent from translation
        remainingDesc = description.replace(roleText, '').trim();
      } else if (description.includes(t('dashboard.admin.activity.types.newMemberRegistered'))) {
        roleText = t('dashboard.admin.activity.types.newMemberRegistered');
        remainingDesc = description.replace(roleText, '').trim();
      } else if (description.includes(t('dashboard.admin.activity.types.newAdminRegistered'))) {
        roleText = t('dashboard.admin.activity.types.newAdminRegistered');
        remainingDesc = description.replace(roleText, '').trim();
      }

      // Extract description part (e.g., "mới đăng ký") and userName
      // Format: "Trainer mới đăng ký: Long Phan" -> "mới đăng ký: Long Phan"
      // We need to extract just the description part without the role
      const descParts = roleText.split(' ');
      const roleWord = descParts[0]; // "Trainer", "Member", "Admin"
      const descText = descParts.slice(1).join(' '); // "mới đăng ký"

      // Extract userName from remainingDesc (which should be ": userName")
      const userNameText = remainingDesc.replace(':', '').trim() || userName;

      return (
        <>
          {role && <RoleBadge role={role} size='sm' variant='dashboard' />}
          <span className='ml-1.5'>{descText}</span>
          <span className='ml-1.5 text-gray-500 dark:text-gray-400'>:</span>
          <span className='ml-1.5 font-semibold text-gray-900 dark:text-white tracking-wide'>
            {userNameText}
          </span>
        </>
      );
    }

    // For other activities, just show description
    return <span>{description}</span>;
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='p-3 space-y-3'>
        {/* Header */}
        <DashboardHeader
          title={t('dashboard.admin.title')}
          subtitle={t('dashboard.admin.subtitle')}
          onLogout={handleLogout}
        />

        {/* Top Primary Metrics */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
          <MetricCard
            icon={GraduationCap}
            label={t('dashboard.admin.metrics.trainer')}
            value={stats.totalTrainers}
            iconBgColor='bg-orange-100 dark:bg-orange-900/30'
            iconColor='text-orange-600 dark:text-orange-400'
            isLoading={isLoading}
          />
          <MetricCard
            icon={Users}
            label={t('dashboard.admin.metrics.member')}
            value={stats.totalMembers}
            iconBgColor='bg-orange-100 dark:bg-orange-900/30'
            iconColor='text-orange-600 dark:text-orange-400'
            isLoading={isLoading}
          />
          <MetricCard
            icon={Dumbbell}
            label={t('dashboard.admin.metrics.equipment')}
            value={stats.totalEquipment || 0}
            iconBgColor='bg-orange-100 dark:bg-orange-900/30'
            iconColor='text-orange-600 dark:text-orange-400'
            isLoading={isLoading}
          />
          <MetricCard
            icon={DollarSign}
            label='Doanh thu tháng'
            value={billingStats?.monthly_revenue ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(billingStats.monthly_revenue) : '0₫'}
            iconBgColor='bg-green-100 dark:bg-green-900/30'
            iconColor='text-green-600 dark:text-green-400'
            isLoading={isLoadingRevenue}
          />
        </div>

        {/* Main Content Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-3'>
          {/* Left Column - Main Actions */}
          <div className='lg:col-span-8 space-y-4'>
            {/* Quick Actions Section */}
            <div className='space-y-2'>
              <SectionHeader
                icon={LayoutDashboard}
                title={t('dashboard.admin.quickActions.title')}
                subtitle={t('dashboard.admin.quickActions.subtitle')}
              />
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                <QuickActionCard
                  icon={LayoutDashboard}
                  title={t('dashboard.admin.quickActions.viewDashboard')}
                  description={t('dashboard.admin.quickActions.viewDashboardDesc')}
                  iconBgColor='bg-orange-100 dark:bg-orange-900/30'
                  iconColor='text-orange-600 dark:text-orange-400'
                  onClick={handleGoToDashboard}
                />
                <QuickActionCard
                  icon={GraduationCap}
                  title={t('dashboard.admin.quickActions.createTrainer')}
                  description={t('dashboard.admin.quickActions.createTrainerDesc')}
                  iconBgColor='bg-orange-100 dark:bg-orange-900/30'
                  iconColor='text-orange-600 dark:text-orange-400'
                  onClick={handleCreateTrainer}
                />
              </div>
            </div>

            {/* Revenue Charts Section */}
            <div className='space-y-2'>
              <SectionHeader
                icon={DollarSign}
                title='Doanh thu & Thống kê'
                subtitle='Biểu đồ doanh thu và thống kê tài chính'
              />
              <RevenueTrendChart
                data={revenueData || undefined}
                loading={isLoadingRevenue}
                height={300}
              />
            </div>

            {/* Member Growth Charts Section */}
            <div className='space-y-2'>
              <SectionHeader
                icon={TrendingUp}
                title='Tăng trưởng Thành viên'
                subtitle='Biểu đồ tăng trưởng thành viên theo thời gian'
              />
              <UserGrowthChart
                data={memberGrowthData || undefined}
                loading={isLoadingMemberGrowth}
                height={300}
              />
            </div>

            {/* Equipment & Class Statistics */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
              <div className='space-y-2'>
                <SectionHeader
                  icon={Dumbbell}
                  title='Sử dụng Thiết bị'
                  subtitle='Thống kê trạng thái thiết bị'
                />
                <EquipmentUsageChart
                  data={equipmentUsageData}
                  loading={isLoadingEquipment}
                  height={300}
                />
              </div>
              <div className='space-y-2'>
                <SectionHeader
                  icon={GraduationCap}
                  title='Tham gia Lớp học'
                  subtitle='Thống kê tham gia các lớp học'
                />
                <ClassAttendanceChart
                  data={classAttendanceData || undefined}
                  loading={isLoadingClassAttendance}
                  height={300}
                />
              </div>
            </div>

            {/* Activity Metrics Section */}
            <div className='space-y-2'>
              <SectionHeader
                icon={TrendingUp}
                title={t('dashboard.admin.activity.title')}
                subtitle={t('dashboard.admin.activity.subtitle')}
              />
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                <CompactMetricCard
                  icon={TrendingUp}
                  label={t('dashboard.admin.metrics.newMembers')}
                  value={stats.recentRegistrations || 0}
                  iconColor='text-orange-500 dark:text-orange-400'
                  valueColor='text-orange-600 dark:text-orange-400'
                  isLoading={isLoading}
                />
                <CompactMetricCard
                  icon={Clock}
                  label={t('dashboard.admin.metrics.activeSessions')}
                  value={stats.activeSessions || 0}
                  iconColor='text-orange-500 dark:text-orange-400'
                  valueColor='text-orange-600 dark:text-orange-400'
                  isLoading={isLoading}
                />
              </div>
            </div>

            {/* System Management Section */}
            <div className='space-y-2'>
              <SectionHeader
                icon={RotateCcw}
                title={t('dashboard.admin.system.title')}
                subtitle={t('dashboard.admin.system.subtitle')}
              />
              <AdminCard
                padding='sm'
                className='border-orange-200 dark:border-orange-800/80 bg-orange-50/30 dark:bg-orange-900/5 group'
              >
                <div className='flex items-center justify-between gap-3'>
                  <div className='flex items-center gap-2.5 flex-1 min-w-0'>
                    <div className='w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:rotate-180 group-hover:scale-110'>
                      <RotateCcw className='w-4.5 h-4.5 text-orange-600 dark:text-orange-400' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white leading-tight mb-0.5'>
                        {t('dashboard.admin.system.resetRateLimits')}
                      </h3>
                      <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter line-clamp-1 leading-tight'>
                        {t('dashboard.admin.system.resetRateLimitsDesc')}
                      </p>
                    </div>
                  </div>
                  <AdminButton
                    variant='primary'
                    size='sm'
                    icon={RotateCcw}
                    onClick={() => setShowResetConfirm(true)}
                    disabled={isResettingRateLimit}
                    isLoading={isResettingRateLimit}
                  >
                    {t('common.reset')}
                  </AdminButton>
                </div>
              </AdminCard>
            </div>
          </div>

          {/* Right Column - Recent Activity Sidebar */}
          <div className='lg:col-span-4 space-y-3'>
            <AdminCard padding='sm' className='sticky top-4'>
              <SectionHeader
                icon={Activity}
                title={t('dashboard.admin.activity.recentActivity')}
                subtitle={t('dashboard.admin.activity.recentActivitySubtitle')}
              />
              <div className='relative'>
                {recentActivities.length === 0 ? (
                  <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter text-center py-8'>
                    {t('dashboard.admin.activity.noActivity')}
                  </p>
                ) : (
                  <div className='relative pl-6'>
                    {/* Timeline line */}
                    <div className='absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700/50'></div>

                    <div className='space-y-0'>
                      {recentActivities.map((activity, index) => {
                        const ActivityIcon = getActivityIcon(activity.description);
                        const iconColor = getActivityIconColor(activity.description);
                        const userName = activity.user?.name || 'Unknown';
                        const userAvatar = activity.user?.avatar;

                        // Debug logging
                        console.log(`🎨 Frontend Activity ${index}:`, {
                          activityId: activity.id,
                          activityType: activity.type,
                          userRole: activity.user?.role,
                          userName: userName,
                          userAvatar: userAvatar,
                          fullUser: activity.user,
                        });

                        const userInitials =
                          userName
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2) || 'U';

                        return (
                          <div
                            key={activity.id}
                            className='relative flex items-start gap-3 pb-3 last:pb-0 group'
                          >
                            {/* Avatar container */}
                            <div className='relative z-10 flex-shrink-0'>
                              <div className='relative w-9 h-9 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 transition-all duration-200 group-hover:scale-110 group-hover:border-orange-300 dark:group-hover:border-orange-600 group-hover:shadow-md bg-gray-100 dark:bg-gray-800'>
                                {userAvatar ? (
                                  <img
                                    src={userAvatar}
                                    alt={userName}
                                    className='w-full h-full object-cover'
                                    onError={e => {
                                      e.currentTarget.style.display = 'none';
                                      const fallback = e.currentTarget
                                        .nextElementSibling as HTMLElement;
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div
                                  className={`w-full h-full rounded-full flex items-center justify-center text-white text-[11px] font-semibold ${
                                    userAvatar ? 'hidden' : 'flex'
                                  }`}
                                  style={{
                                    backgroundColor: userAvatar ? 'transparent' : '#fb6514',
                                  }}
                                >
                                  {userInitials}
                                </div>
                              </div>
                              {/* Activity type badge */}
                              <div
                                className={`absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm`}
                              >
                                <ActivityIcon className={`w-2.5 h-2.5 ${iconColor}`} />
                              </div>
                            </div>

                            {/* Content */}
                            <div className='flex-1 min-w-0 pt-0.5'>
                              <p className='text-theme-xs text-gray-900 dark:text-white font-inter font-medium leading-snug mb-1 group-hover:text-gray-950 dark:group-hover:text-white transition-colors flex items-center gap-1.5 flex-wrap'>
                                {renderActivityDescription(activity)}
                              </p>
                              <div className='flex items-center gap-1.5'>
                                <Clock className='w-3 h-3 text-gray-400 dark:text-gray-500' />
                                <p className='text-[11px] text-gray-500 dark:text-gray-400 font-inter leading-tight'>
                                  {formatTimeAgo(activity.timestamp)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </AdminCard>
            
            {/* Recent Bookings */}
            <RecentBookings limit={5} />
            
            {/* Recent Payments */}
            <RecentPayments limit={5} />
          </div>
        </div>

        {/* Confirmation Modal */}
        {showResetConfirm && (
          <div
            className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'
            onClick={() => !isResettingRateLimit && setShowResetConfirm(false)}
          >
            <AdminCard className='max-w-lg w-full' onClick={e => e.stopPropagation()} padding='md'>
              <div className='space-y-4'>
                {/* Modal Header */}
                <div className='flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-800'>
                  <div className='w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                    <AlertTriangle className='w-5 h-5 text-orange-600 dark:text-orange-400' />
                  </div>
                  <div>
                    <h3 className='text-lg font-bold font-heading text-gray-900 dark:text-white'>
                      {t('dashboard.admin.system.confirmReset')}
                    </h3>
                    <p className='text-xs text-gray-600 dark:text-gray-400 font-inter'>
                      {t('dashboard.admin.system.confirmResetSubtitle')}
                    </p>
                  </div>
                </div>

                {/* Modal Body */}
                <div className='space-y-3'>
                  <div className='bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3'>
                    <p className='text-sm font-semibold text-gray-900 dark:text-white mb-2 font-inter'>
                      {t('dashboard.admin.system.confirmResetMessage')}{' '}
                      <span className='text-orange-600 dark:text-orange-400 font-bold'>
                        {t('dashboard.admin.system.resetAllRateLimits')}
                      </span>{' '}
                      {t('dashboard.admin.system.confirmResetQuestion')}
                    </p>
                    <ul className='space-y-1.5'>
                      <li className='flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 font-inter'>
                        <div className='flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5'></div>
                        <span>{t('dashboard.admin.system.resetEffects.removeLimits')}</span>
                      </li>
                      <li className='flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 font-inter'>
                        <div className='flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5'></div>
                        <span>{t('dashboard.admin.system.resetEffects.allowImmediate')}</span>
                      </li>
                      <li className='flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 font-inter'>
                        <div className='flex-shrink-0 w-1.5 h-1.5 rounded-full bg-error-500 mt-1.5'></div>
                        <span className='font-medium text-error-600 dark:text-error-400'>
                          {t('dashboard.admin.system.resetEffects.cannotUndo')}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className='flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800'>
                  <AdminButton
                    variant='outline'
                    size='sm'
                    onClick={() => setShowResetConfirm(false)}
                    disabled={isResettingRateLimit}
                  >
                    {t('common.cancel')}
                  </AdminButton>
                  <AdminButton
                    variant='danger'
                    size='sm'
                    icon={RotateCcw}
                    onClick={handleResetAllRateLimits}
                    disabled={isResettingRateLimit}
                    isLoading={isResettingRateLimit}
                  >
                    {t('common.confirm')}
                  </AdminButton>
                </div>
              </div>
            </AdminCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
