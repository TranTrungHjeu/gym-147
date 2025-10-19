import 'flatpickr/dist/flatpickr.css';
import { Route, Routes } from 'react-router-dom';
import 'swiper/swiper-bundle.css';
import RoleBasedRouter from './components/RoleBasedRouter';
import AuthGuard from './components/auth/AuthGuard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { NavigationProvider } from './context/NavigationContext';
import { ToastProvider } from './context/ToastContext';
import Homepage from './features/homepage/pages/Homepage';
import './index.css';
import AppLayout from './layout/AppLayout';
import TrainerLayout from './layout/TrainerLayout';
import Auth from './pages/AuthPages/Auth';
import ResetPassword from './pages/AuthPages/ResetPassword';
import Blank from './pages/Blank';
import Calendar from './pages/Calendar';
import BarChart from './pages/Charts/BarChart';
import LineChart from './pages/Charts/LineChart';
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
import NotFound from './pages/OtherPage/NotFound';
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
        <Routes>
          <Route path='/' element={<Homepage />} />
          <Route path='/homepage' element={<Homepage />} />
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
          <Route
            path='/user-management'
            element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN']}>
                <UserManagement />
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
            <Route path='line-chart' element={<LineChart />} />
            <Route path='bar-chart' element={<BarChart />} />
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
            <Route path='line-chart' element={<LineChart />} />
            <Route path='bar-chart' element={<BarChart />} />
          </Route>

          {/* Fallback Route */}
          <Route path='*' element={<NotFound />} />
        </Routes>
      </NavigationProvider>
    </ToastProvider>
  );
}
