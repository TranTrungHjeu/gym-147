import 'flatpickr/dist/flatpickr.css';
import { Route, Routes } from 'react-router-dom';
import 'swiper/swiper-bundle.css';
import RoleBasedRouter from './components/RoleBasedRouter';
import AuthGuard from './components/auth/AuthGuard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ToastContainer from './components/common/ToastContainer';
import { NavigationProvider } from './context/NavigationContext';
import { ToastProvider } from './context/ToastContext';
import AboutPage from './features/homepage/pages/AboutPage';
import ClassesPage from './features/homepage/pages/ClassesPage';
import ContactPage from './features/homepage/pages/ContactPage';
import Homepage from './features/homepage/pages/Homepage';
import ServicesPage from './features/homepage/pages/ServicesPage';
import TeamPage from './features/homepage/pages/TeamPage';
import './index.css';
import AppLayout from './layout/AppLayout';
import TrainerLayout from './layout/TrainerLayout';
import RewardAnalytics from './pages/Analytics/RewardAnalytics';
import TrainerSalaryStatistics from './pages/Analytics/TrainerSalaryStatistics';
import SalaryRequestManagement from './pages/Management/SalaryRequestManagement';
import Auth from './pages/AuthPages/Auth';
import OAuthCallback from './pages/AuthPages/OAuthCallback';
import ResetPassword from './pages/AuthPages/ResetPassword';
import Blank from './pages/Blank';
import Calendar from './pages/Calendar';
import CreateAdmin from './pages/CreateAdmin';
import CreateTrainer from './pages/CreateTrainer';
import Home from './pages/Dashboard/Home';
import RealDashboard from './pages/Dashboard/RealDashboard';
import TrainerAttendance from './pages/Dashboard/TrainerAttendance';
import TrainerBookings from './pages/Dashboard/TrainerBookings';
import TrainerCalendarSplitView from './pages/Dashboard/TrainerCalendarSplitView';
import TrainerCalendarWithFilters from './pages/Dashboard/TrainerCalendarWithFilters';
import TrainerCertifications from './pages/Dashboard/TrainerCertifications';
import TrainerClasses from './pages/Dashboard/TrainerClasses';
import TrainerFeedback from './pages/Dashboard/TrainerFeedback';
import TrainerHomePage from './pages/Dashboard/TrainerHomePage';
import TrainerPerformance from './pages/Dashboard/TrainerPerformance';
import TrainerProfile from './pages/Dashboard/TrainerProfile';
import TrainerRatings from './pages/Dashboard/TrainerRatings';
import TrainerReviews from './pages/Dashboard/TrainerReviews';
import TrainerSchedule from './pages/Dashboard/TrainerSchedule';
import TrainerSalary from './pages/Dashboard/TrainerSalary';
import TrainerStats from './pages/Dashboard/TrainerStats';
// APIKeysManagement removed - not needed
import AuditLogsManagement from './pages/Management/AuditLogsManagement';
// BackupRestoreManagement removed - not needed
import BillingManagement from './pages/Management/BillingManagement';
import RefundManagement from './pages/Management/RefundManagement';
import ChallengeManagement from './pages/Management/ChallengeManagement';
import ClassManagement from './pages/Management/ClassManagement';
// EmailTemplatesManagement removed - not needed
import EquipmentManagement from './pages/Management/EquipmentManagement';
// GuestManagement removed - not needed
import MemberManagement from './pages/Management/MemberManagement';
import NotificationManagement from './pages/Management/NotificationManagement';
// PersonalTrainingManagement removed - not needed
import RedemptionManagement from './pages/Management/RedemptionManagement';
import ReportsManagement from './pages/Management/ReportsManagement';
import RewardManagement from './pages/Management/RewardManagement';
import RoomManagement from './pages/Management/RoomManagement';
// SMSTemplatesManagement removed - not needed
import ScheduleManagement from './pages/Management/ScheduleManagement';
// ScheduledReportsManagement removed - not needed
import SettingsManagement from './pages/Management/SettingsManagement';
import TrainerManagement from './pages/Management/TrainerManagement';
import VerifyCode from './pages/Management/VerifyCode';
// WebhooksManagement removed - not needed
import NotificationsPage from './pages/Notifications';
import ChatPage from './pages/Chat';
import NotFound from './pages/OtherPage/NotFound';
import ClassesReport from './pages/Reports/ClassesReport';
import EquipmentReport from './pages/Reports/EquipmentReport';
import MembersReport from './pages/Reports/MembersReport';
import RevenueReport from './pages/Reports/RevenueReport';
import SystemReport from './pages/Reports/SystemReport';
import UsersReport from './pages/Reports/UsersReport';
import Unauthorized from './pages/Unauthorized';
import UserManagement from './pages/UserManagement';
import UserProfiles from './pages/UserProfiles';
export default function App() {
  return (
    <ToastProvider>
      <NavigationProvider>
        <ToastContainer position='top-right' maxToasts={5} />
        <Routes>
          <Route path='/' element={<Homepage />} />
          <Route path='/homepage' element={<Homepage />} />
          <Route path='/about' element={<AboutPage />} />
          <Route path='/classes' element={<ClassesPage />} />
          <Route path='/services' element={<ServicesPage />} />
          <Route path='/team' element={<TeamPage />} />
          <Route path='/contact' element={<ContactPage />} />
          <Route path='/auth/callback' element={<OAuthCallback />} />
          <Route
            path='/auth'
            element={
              <AuthGuard>
                <Auth />
              </AuthGuard>
            }
          />
          <Route path='/reset-password' element={<ResetPassword />} />
          <Route path='/unauthorized' element={<Unauthorized />} />

          {/* Role-based Dashboard Routes */}
          <Route
            path='/dashboard'
            element={
              <ProtectedRoute>
                {(() => {
                  try {
                    const user = localStorage.getItem('user');
                    const role = user ? JSON.parse(user).role : 'MEMBER';
                    // Member should not see AppLayout (sidebar/header)
                    if (role === 'MEMBER') {
                      return <RoleBasedRouter userRole='MEMBER' />;
                    }
                    return (
                      <AppLayout>
                        <RoleBasedRouter userRole={role} />
                      </AppLayout>
                    );
                  } catch {
                    return <RoleBasedRouter userRole='MEMBER' />;
                  }
                })()}
              </ProtectedRoute>
            }
          />
          <Route
            path='/super-admin-dashboard'
            element={
              <ProtectedRoute requiredRole='SUPER_ADMIN'>
                <AppLayout>
                  <RoleBasedRouter userRole='SUPER_ADMIN' />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/admin-dashboard'
            element={
              <ProtectedRoute requiredRole='ADMIN'>
                <AppLayout>
                  <RoleBasedRouter userRole='ADMIN' />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/member-dashboard'
            element={
              <ProtectedRoute requiredRole='MEMBER'>
                <RoleBasedRouter userRole='MEMBER' />
              </ProtectedRoute>
            }
          />

          {/* Real Dashboard Route */}
          <Route
            path='/real-dashboard'
            element={
              <ProtectedRoute>
                <RealDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Creation Routes */}
          <Route
            path='/create-admin'
            element={
              <ProtectedRoute requiredRole='SUPER_ADMIN'>
                <CreateAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path='/create-trainer'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <CreateTrainer />
              </ProtectedRoute>
            }
          />

          {/* Notifications Route */}
          <Route
            path='/notifications'
            element={
              <ProtectedRoute>
                <AppLayout>
                  <NotificationsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          {/* Chat Route */}
          <Route
            path='/chat'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <ChatPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          {/* Management Routes for Admin/Super Admin */}
          <Route
            path='/management/members'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <MemberManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/users'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <UserManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/equipment'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <EquipmentManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/trainers'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <TrainerManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/classes'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <ClassManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/rooms'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <RoomManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/schedules'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <ScheduleManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/billing'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <BillingManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/refunds'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <RefundManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/reports'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <ReportsManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/reports/users'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <UsersReport />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/reports/system'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <SystemReport />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/reports/revenue'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <RevenueReport />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/reports/members'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <MembersReport />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/reports/classes'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <ClassesReport />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/reports/equipment'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <EquipmentReport />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/settings'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <SettingsManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          {/* EmailTemplatesManagement, SMSTemplatesManagement, APIKeysManagement, WebhooksManagement removed - not needed */}
          <Route
            path='/management/audit-logs'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <AuditLogsManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          {/* backup-restore route removed - not needed */}
          {/* ScheduledReportsManagement removed - not needed */}
          {/* PersonalTrainingManagement, GuestManagement removed - not needed */}
          <Route
            path='/management/challenges'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <ChallengeManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/rewards'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <RewardManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/redemptions'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <RedemptionManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/analytics/rewards'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <RewardAnalytics />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/analytics/trainer-salary'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <TrainerSalaryStatistics />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/salary-requests'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <SalaryRequestManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/notifications'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN', 'TRAINER']}>
                <AppLayout>
                  <NotificationManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/verify-code'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN', 'STAFF']}>
                <AppLayout>
                  <VerifyCode />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          {/* Trainer routes with TrainerLayout */}
          <Route
            path='/trainerdashboard/homepage'
            element={
              <ProtectedRoute requiredRole={['TRAINER']}>
                <TrainerLayout>
                  <TrainerHomePage />
                </TrainerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/trainerdashboard/classes'
            element={
              <ProtectedRoute requiredRole={['TRAINER']}>
                <TrainerLayout>
                  <TrainerClasses />
                </TrainerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/trainerdashboard/certifications'
            element={
              <ProtectedRoute requiredRole={['TRAINER']}>
                <TrainerLayout>
                  <TrainerCertifications />
                </TrainerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/trainerdashboard/schedule'
            element={
              <ProtectedRoute requiredRole={['TRAINER']}>
                <TrainerLayout>
                  <TrainerSchedule />
                </TrainerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/trainerdashboard/attendance'
            element={
              <ProtectedRoute requiredRole={['TRAINER']}>
                <TrainerLayout>
                  <TrainerAttendance />
                </TrainerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/trainerdashboard/bookings'
            element={
              <ProtectedRoute requiredRole={['TRAINER']}>
                <TrainerLayout>
                  <TrainerBookings />
                </TrainerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/trainerdashboard/reviews'
            element={
              <ProtectedRoute requiredRole={['TRAINER']}>
                <TrainerLayout>
                  <TrainerReviews />
                </TrainerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/trainerdashboard/profile'
            element={
              <ProtectedRoute requiredRole={['TRAINER']}>
                <TrainerLayout>
                  <TrainerProfile />
                </TrainerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/trainerdashboard/salary'
            element={
              <ProtectedRoute requiredRole={['TRAINER']}>
                <TrainerLayout>
                  <TrainerSalary />
                </TrainerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/trainerdashboard/calendar'
            element={
              <ProtectedRoute requiredRole={['TRAINER']}>
                <TrainerLayout>
                  <TrainerCalendarSplitView />
                </TrainerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/trainerdashboard/calendar-filters'
            element={
              <ProtectedRoute requiredRole={['TRAINER']}>
                <TrainerLayout>
                  <TrainerCalendarWithFilters />
                </TrainerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/trainerdashboard/ratings'
            element={
              <ProtectedRoute requiredRole={['TRAINER']}>
                <TrainerLayout>
                  <TrainerRatings />
                </TrainerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/trainerdashboard/feedback'
            element={
              <ProtectedRoute requiredRole={['TRAINER']}>
                <TrainerLayout>
                  <TrainerFeedback />
                </TrainerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/trainerdashboard/trainer-stats'
            element={
              <ProtectedRoute requiredRole={['TRAINER']}>
                <TrainerLayout>
                  <TrainerStats />
                </TrainerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/trainerdashboard/performance'
            element={
              <ProtectedRoute requiredRole={['TRAINER']}>
                <TrainerLayout>
                  <TrainerPerformance />
                </TrainerLayout>
              </ProtectedRoute>
            }
          />

          {/* Legacy Dashboard Routes (for backward compatibility) */}
          <Route
            path='/legacy-dashboard'
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path='profile' element={<UserProfiles />} />
            <Route path='calendar' element={<Calendar />} />
            <Route path='blank' element={<Blank />} />
            {/* Legacy UI component routes removed - components not implemented */}
          </Route>

          {/* Full Dashboard Routes (with sidebar) */}
          <Route
            path='/full-dashboard'
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path='profile' element={<UserProfiles />} />
            <Route path='calendar' element={<Calendar />} />
            <Route path='blank' element={<Blank />} />
          </Route>

          {/* Fallback Route */}
          <Route path='*' element={<NotFound />} />
        </Routes>
      </NavigationProvider>
    </ToastProvider>
  );
}
