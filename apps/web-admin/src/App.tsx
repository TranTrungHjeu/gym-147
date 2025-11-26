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
import Auth from './pages/AuthPages/Auth';
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
import TrainerStats from './pages/Dashboard/TrainerStats';
import FormElements from './pages/Forms/FormElements';
import APIKeysManagement from './pages/Management/APIKeysManagement';
import AuditLogsManagement from './pages/Management/AuditLogsManagement';
import BackupRestoreManagement from './pages/Management/BackupRestoreManagement';
import BillingManagement from './pages/Management/BillingManagement';
import ChallengeManagement from './pages/Management/ChallengeManagement';
import ClassManagement from './pages/Management/ClassManagement';
import EmailTemplatesManagement from './pages/Management/EmailTemplatesManagement';
import EquipmentManagement from './pages/Management/EquipmentManagement';
import GuestManagement from './pages/Management/GuestManagement';
import MemberManagement from './pages/Management/MemberManagement';
import PersonalTrainingManagement from './pages/Management/PersonalTrainingManagement';
import RedemptionManagement from './pages/Management/RedemptionManagement';
import ReportsManagement from './pages/Management/ReportsManagement';
import RewardManagement from './pages/Management/RewardManagement';
import RoomManagement from './pages/Management/RoomManagement';
import SMSTemplatesManagement from './pages/Management/SMSTemplatesManagement';
import ScheduleManagement from './pages/Management/ScheduleManagement';
import ScheduledReportsManagement from './pages/Management/ScheduledReportsManagement';
import SettingsManagement from './pages/Management/SettingsManagement';
import TrainerManagement from './pages/Management/TrainerManagement';
import NotificationManagement from './pages/Management/NotificationManagement';
import VerifyCode from './pages/Management/VerifyCode';
import WebhooksManagement from './pages/Management/WebhooksManagement';
import NotificationsPage from './pages/Notifications';
import NotFound from './pages/OtherPage/NotFound';
import ClassesReport from './pages/Reports/ClassesReport';
import EquipmentReport from './pages/Reports/EquipmentReport';
import MembersReport from './pages/Reports/MembersReport';
import RevenueReport from './pages/Reports/RevenueReport';
import SystemReport from './pages/Reports/SystemReport';
import UsersReport from './pages/Reports/UsersReport';
import BasicTables from './pages/Tables/BasicTables';
import Alerts from './pages/UiElements/Alerts';
import Avatars from './pages/UiElements/Avatars';
import Badges from './pages/UiElements/Badges';
import Buttons from './pages/UiElements/Buttons';
import Images from './pages/UiElements/Images';
import Videos from './pages/UiElements/Videos';
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
                <AppLayout>
                  <RoleBasedRouter
                    userRole={(() => {
                      try {
                        const user = localStorage.getItem('user');
                        return user ? JSON.parse(user).role : 'MEMBER';
                      } catch {
                        return 'MEMBER';
                      }
                    })()}
                  />
                </AppLayout>
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
                <AppLayout>
                  <RoleBasedRouter userRole='MEMBER' />
                </AppLayout>
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
          <Route
            path='/management/email-templates'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <EmailTemplatesManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/sms-templates'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <SMSTemplatesManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/api-keys'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <APIKeysManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/webhooks'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <WebhooksManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
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
          <Route
            path='/management/backup-restore'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <BackupRestoreManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/scheduled-reports'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <ScheduledReportsManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/personal-training'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <PersonalTrainingManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path='/management/guests'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <AppLayout>
                  <GuestManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
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
            <Route path='form-elements' element={<FormElements />} />
            <Route path='basic-tables' element={<BasicTables />} />
            <Route path='alerts' element={<Alerts />} />
            <Route path='avatars' element={<Avatars />} />
            <Route path='badge' element={<Badges />} />
            <Route path='buttons' element={<Buttons />} />
            <Route path='images' element={<Images />} />
            <Route path='videos' element={<Videos />} />
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
            <Route path='form-elements' element={<FormElements />} />
            <Route path='basic-tables' element={<BasicTables />} />
            <Route path='alerts' element={<Alerts />} />
            <Route path='avatars' element={<Avatars />} />
            <Route path='badge' element={<Badges />} />
            <Route path='buttons' element={<Buttons />} />
            <Route path='images' element={<Images />} />
            <Route path='videos' element={<Videos />} />
          </Route>

          {/* Fallback Route */}
          <Route path='*' element={<NotFound />} />
        </Routes>
      </NavigationProvider>
    </ToastProvider>
  );
}
