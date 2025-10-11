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
              </ProtectedRoute>
            }
          />
          <Route
            path='/super-admin-dashboard'
            element={
              <ProtectedRoute requiredRole='SUPER_ADMIN'>
                <RoleBasedRouter userRole='SUPER_ADMIN' />
              </ProtectedRoute>
            }
          />
          <Route
            path='/admin-dashboard'
            element={
              <ProtectedRoute requiredRole='ADMIN'>
                <RoleBasedRouter userRole='ADMIN' />
              </ProtectedRoute>
            }
          />
          <Route
            path='/trainer-dashboard'
            element={
              <ProtectedRoute requiredRole='TRAINER'>
                <RoleBasedRouter userRole='TRAINER' />
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
