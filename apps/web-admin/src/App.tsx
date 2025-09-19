import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Billing from './pages/Billing';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Members from './pages/Members';
import Packages from './pages/Packages';
import Schedule from './pages/Schedule';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path='/' element={<Dashboard/>} />
        <Route path='/login' element={<Login/>} />
        <Route path='/members' element={<Members/>} />
        <Route path='/packages' element={<Packages/>} />
        <Route path='/schedule' element={<Schedule/>} />
        <Route path='/billing' element={<Billing/>} />
      </Routes>
    </Layout>
  );
}