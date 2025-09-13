import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Packages from './pages/Packages';
import Schedule from './pages/Schedule';
import Billing from './pages/Billing';
import Login from './pages/Login';
export default function App(){
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