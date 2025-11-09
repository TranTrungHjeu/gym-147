import {
  Activity,
  Clock,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  Shield,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminCard from '../../components/common/AdminCard';
import RoleBadge from '../../components/common/RoleBadge';
import CompactMetricCard from '../../components/dashboard/CompactMetricCard';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import MetricCard from '../../components/dashboard/MetricCard';
import QuickActionCard from '../../components/dashboard/QuickActionCard';
import SectionHeader from '../../components/dashboard/SectionHeader';
import { useToast } from '../../hooks/useToast';
import useTranslation from '../../hooks/useTranslation';
import { authService } from '../../services/auth.service';
import { DashboardStats, dashboardService } from '../../services/dashboard.service';
import { clearAuthData } from '../../utils/auth';

interface RecentActivity {
  id: string;
  type: string;
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  timestamp: string;
  description: string;
}

const SuperAdminDashboard: React.FC = () => {
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
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dashboard statistics and recent activities
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [statsData, activitiesData] = await Promise.all([
          dashboardService.getSuperAdminStats(),
          dashboardService.getRecentActivities().catch(() => ({ success: false, data: [] })),
        ]);

        if (statsData.success) {
          console.log('📊 SuperAdmin stats data received:', statsData.data);
          const statsDataToSet = {
            totalUsers: statsData.data.totalUsers || 0,
            totalAdmins: statsData.data.totalAdmins || 0,
            totalTrainers: statsData.data.totalTrainers || 0,
            totalMembers: statsData.data.totalMembers || 0,
            recentRegistrations: statsData.data.recentRegistrations || 0,
            activeSessions: statsData.data.activeSessions || 0,
          };
          console.log('📊 Setting stats state:', statsDataToSet);
          setStats(statsDataToSet);
        } else {
          showToast(t('dashboard.superAdmin.errors.loadStatsFailed'), 'error');
        }

        if (activitiesData.success && activitiesData.data) {
          console.log('📥 Recent activities received (SuperAdmin):', activitiesData.data);
          console.log('📥 Activities count:', activitiesData.data.length);
          activitiesData.data.forEach((activity, index) => {
            console.log(`📥 Activity ${index}:`, {
              id: activity.id,
              type: activity.type,
              user: activity.user,
              avatar: activity.user?.avatar,
              description: activity.description,
            });
          });
          setRecentActivities(activitiesData.data.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        showToast(t('dashboard.superAdmin.errors.loadDataError'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [showToast]);

  const handleCreateAdmin = () => {
    navigate('/create-admin');
  };

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

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t('common.justNow');
    if (diffInSeconds < 3600)
      return t('common.minutesAgo', { count: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400)
      return t('common.hoursAgo', { count: Math.floor(diffInSeconds / 3600) });
    return t('common.daysAgo', { count: Math.floor(diffInSeconds / 86400) });
  };

  const getActivityIcon = (description: string) => {
    if (description.includes('New trainer registered:')) {
      return GraduationCap;
    }
    if (description.includes('New member registered:')) {
      return UserPlus;
    }
    if (
      description.includes('New admin registered:') ||
      description.includes('New super_admin registered:') ||
      description.includes('New super admin registered:')
    ) {
      return Shield;
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
    if (
      description.includes('New admin registered:') ||
      description.includes('New super_admin registered:') ||
      description.includes('New super admin registered:')
    ) {
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
      return `${t('dashboard.superAdmin.activity.types.newTrainerRegistered')}: ${
        userName || 'Unknown'
      }`;
    }
    if (description.includes('New member registered:')) {
      return `${t('dashboard.superAdmin.activity.types.newMemberRegistered')}: ${
        userName || 'Unknown'
      }`;
    }
    if (
      description.includes('New super_admin registered:') ||
      description.includes('New super admin registered:')
    ) {
      return `${t('dashboard.superAdmin.activity.types.newSuperAdminRegistered')}: ${
        userName || 'Unknown'
      }`;
    }
    if (description.includes('New admin registered:')) {
      return `${t('dashboard.superAdmin.activity.types.newAdminRegistered')}: ${
        userName || 'Unknown'
      }`;
    }
    if (description.startsWith('Logged in using')) {
      const parts = description.replace('Logged in using', '').trim();
      if (parts.includes(' at ')) {
        const [method, location] = parts.split(' at ');
        return `${t('dashboard.superAdmin.activity.types.loggedIn')} ${method} ${t(
          'dashboard.superAdmin.activity.types.at'
        )} ${location}`;
      }
      return `${t('dashboard.superAdmin.activity.types.loggedIn')} ${parts}`;
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
      description.includes(t('dashboard.superAdmin.activity.types.newTrainerRegistered')) ||
      description.includes(t('dashboard.superAdmin.activity.types.newMemberRegistered')) ||
      description.includes(t('dashboard.superAdmin.activity.types.newAdminRegistered')) ||
      description.includes(t('dashboard.superAdmin.activity.types.newSuperAdminRegistered'))
    ) {
      // Extract role text and remaining description
      let roleText = '';
      let remainingDesc = '';

      if (description.includes(t('dashboard.superAdmin.activity.types.newTrainerRegistered'))) {
        roleText = t('dashboard.superAdmin.activity.types.newTrainerRegistered');
        remainingDesc = description.replace(roleText, '').trim();
      } else if (
        description.includes(t('dashboard.superAdmin.activity.types.newMemberRegistered'))
      ) {
        roleText = t('dashboard.superAdmin.activity.types.newMemberRegistered');
        remainingDesc = description.replace(roleText, '').trim();
      } else if (
        description.includes(t('dashboard.superAdmin.activity.types.newSuperAdminRegistered'))
      ) {
        roleText = t('dashboard.superAdmin.activity.types.newSuperAdminRegistered');
        remainingDesc = description.replace(roleText, '').trim();
      } else if (
        description.includes(t('dashboard.superAdmin.activity.types.newAdminRegistered'))
      ) {
        roleText = t('dashboard.superAdmin.activity.types.newAdminRegistered');
        remainingDesc = description.replace(roleText, '').trim();
      }

      // Extract description part (e.g., "mới đăng ký") and userName
      // Format: "Trainer mới đăng ký: Long Phan" -> "mới đăng ký: Long Phan"
      const descParts = roleText.split(' ');
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
          title={t('dashboard.superAdmin.title')}
          subtitle={t('dashboard.superAdmin.subtitle')}
          onLogout={handleLogout}
        />

        {/* Top Primary Metrics */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'>
          <MetricCard
            icon={Users}
            label={t('dashboard.superAdmin.metrics.totalUsers')}
            value={stats.totalUsers}
            iconBgColor='bg-orange-100 dark:bg-orange-900/30'
            iconColor='text-orange-600 dark:text-orange-400'
            isLoading={isLoading}
          />
          <MetricCard
            icon={Shield}
            label={t('dashboard.superAdmin.metrics.admin')}
            value={stats.totalAdmins}
            iconBgColor='bg-gray-100 dark:bg-gray-800/50'
            iconColor='text-gray-700 dark:text-gray-300'
            isLoading={isLoading}
          />
          <MetricCard
            icon={GraduationCap}
            label={t('dashboard.superAdmin.metrics.trainer')}
            value={stats.totalTrainers}
            iconBgColor='bg-orange-100 dark:bg-orange-900/30'
            iconColor='text-orange-600 dark:text-orange-400'
            isLoading={isLoading}
          />
          <MetricCard
            icon={Users}
            label={t('dashboard.superAdmin.metrics.member')}
            value={stats.totalMembers}
            iconBgColor='bg-orange-100 dark:bg-orange-900/30'
            iconColor='text-orange-600 dark:text-orange-400'
            isLoading={isLoading}
          />
        </div>

        {/* Two-Column Layout */}
        <DashboardLayout
          leftColumn={
            <>
              {/* Quick Actions */}
              <div>
                <SectionHeader
                  icon={LayoutDashboard}
                  title={t('dashboard.superAdmin.quickActions.title')}
                  subtitle={t('dashboard.superAdmin.quickActions.subtitle')}
                />
                <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                  <QuickActionCard
                    icon={LayoutDashboard}
                    title={t('dashboard.superAdmin.quickActions.viewDashboard')}
                    description={t('dashboard.superAdmin.quickActions.viewDashboardDesc')}
                    iconBgColor='bg-orange-100 dark:bg-orange-900/30'
                    iconColor='text-orange-600 dark:text-orange-400'
                    onClick={handleGoToDashboard}
                  />
                  <QuickActionCard
                    icon={UserPlus}
                    title={t('dashboard.superAdmin.quickActions.createAdmin')}
                    description={t('dashboard.superAdmin.quickActions.createAdminDesc')}
                    iconBgColor='bg-gray-100 dark:bg-gray-800/50'
                    iconColor='text-gray-700 dark:text-gray-300'
                    onClick={handleCreateAdmin}
                  />
                  <QuickActionCard
                    icon={GraduationCap}
                    title={t('dashboard.superAdmin.quickActions.createTrainer')}
                    description={t('dashboard.superAdmin.quickActions.createTrainerDesc')}
                    iconBgColor='bg-orange-100 dark:bg-orange-900/30'
                    iconColor='text-orange-600 dark:text-orange-400'
                    onClick={handleCreateTrainer}
                  />
                </div>
              </div>

              {/* Secondary Metrics */}
              <div>
                <SectionHeader
                  icon={TrendingUp}
                  title={t('dashboard.superAdmin.activity.title')}
                  subtitle={t('dashboard.superAdmin.activity.subtitle')}
                />
                <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                  <CompactMetricCard
                    icon={TrendingUp}
                    label={t('dashboard.superAdmin.metrics.newRegistrations')}
                    value={stats.recentRegistrations || 0}
                    iconColor='text-orange-500 dark:text-orange-400'
                    valueColor='text-orange-600 dark:text-orange-400'
                    isLoading={isLoading}
                  />
                  <CompactMetricCard
                    icon={Clock}
                    label={t('dashboard.superAdmin.metrics.activeSessions')}
                    value={stats.activeSessions || 0}
                    iconColor='text-orange-500 dark:text-orange-400'
                    valueColor='text-orange-600 dark:text-orange-400'
                    isLoading={isLoading}
                  />
                </div>
              </div>
            </>
          }
          rightColumn={
            <>
              {/* Recent Activity */}
              <AdminCard padding='sm'>
                <SectionHeader
                  icon={Activity}
                  title={t('dashboard.superAdmin.activity.recentActivity')}
                  subtitle={t('dashboard.superAdmin.activity.recentActivitySubtitle')}
                />
                <div className='relative mt-4'>
                  {recentActivities.length === 0 ? (
                    <div className='text-center py-10'>
                      <div className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-800/50 mb-3'>
                        <Activity className='w-6 h-6 text-gray-400 dark:text-gray-500' />
                      </div>
                      <p className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
                        {t('dashboard.superAdmin.activity.noActivity')}
                      </p>
                    </div>
                  ) : (
                    <div className='relative pl-5'>
                      {/* Clean Timeline line */}
                      <div className='absolute left-2 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700'></div>

                      <div className='space-y-0'>
                        {recentActivities.map(activity => {
                          const ActivityIcon = getActivityIcon(activity.description);
                          const iconColor = getActivityIconColor(activity.description);
                          const userName = activity.user?.name || 'Unknown';
                          const userAvatar = activity.user?.avatar;

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
                              className='relative flex items-start gap-3 pb-4 last:pb-0 group'
                            >
                              {/* Timeline dot */}
                              <div className='absolute left-[7px] top-[22px] w-2 h-2 rounded-full bg-orange-500 dark:bg-orange-400 border-2 border-white dark:border-gray-900 z-10 transform -translate-x-1/2'></div>

                              {/* Avatar container */}
                              <div className='relative z-10 flex-shrink-0'>
                                <div className='relative w-10 h-10 rounded-full overflow-hidden border-2 border-gray-100 dark:border-gray-700 transition-all duration-200 group-hover:border-orange-300 dark:group-hover:border-orange-600 bg-gray-50 dark:bg-gray-800'>
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
                                    className={`w-full h-full rounded-full flex items-center justify-center text-white text-[10px] font-semibold font-heading ${
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
                                  className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-sm`}
                                >
                                  <ActivityIcon className={`w-2.5 h-2.5 ${iconColor}`} />
                                </div>
                              </div>

                              {/* Content */}
                              <div className='flex-1 min-w-0 pt-0.5'>
                                <div className='text-theme-xs text-gray-900 dark:text-white font-heading font-medium leading-snug mb-1 flex items-center gap-1.5 flex-wrap'>
                                  {renderActivityDescription(activity)}
                                </div>
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
            </>
          }
        />
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
