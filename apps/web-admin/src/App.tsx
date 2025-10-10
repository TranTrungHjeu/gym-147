import { Route, Routes } from 'react-router-dom';
import { NavigationProvider } from './context/NavigationContext';
import Homepage from './features/homepage/pages/Homepage';
import Auth from './pages/AuthPages/Auth';
import NotFound from './pages/OtherPage/NotFound';
import UserProfiles from './pages/UserProfiles';
import Videos from './pages/UiElements/Videos';
import Images from './pages/UiElements/Images';
import Alerts from './pages/UiElements/Alerts';
import Badges from './pages/UiElements/Badges';
import Avatars from './pages/UiElements/Avatars';
import Buttons from './pages/UiElements/Buttons';
import LineChart from './pages/Charts/LineChart';
import BarChart from './pages/Charts/BarChart';
import Calendar from './pages/Calendar';
import BasicTables from './pages/Tables/BasicTables';
import FormElements from './pages/Forms/FormElements';
import Blank from './pages/Blank';
import AppLayout from './layout/AppLayout';
import Home from './pages/Dashboard/Home';
import './index.css';
import 'swiper/swiper-bundle.css';
import 'flatpickr/dist/flatpickr.css';
export default function App() {
  return (
    <NavigationProvider>
      <Routes>
        <Route path='/' element={<Homepage />} />
        <Route path='/login' element={<Auth />} />

        {/* Dashboard Routes */}
        <Route path='/dashboard' element={<AppLayout />}>
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
  );
}
