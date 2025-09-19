import React from 'react';
import { Link, NavLink } from 'react-router-dom';
const linkCls = ({isActive}:{isActive:boolean}) => 'px-3 py-2 rounded ' + (isActive ? 'bg-black text-white' : 'bg-gray-200 text-black');
export default function Layout({children}:{children:React.ReactNode}){
  return (
    <div style={{display:'grid', gridTemplateRows:'auto 1fr', minHeight:'100vh'}}>
      <header style={{display:'flex', gap:12, alignItems:'center', padding:12, borderBottom:'1px solid #eee'}}>
        <Link to='/' style={{fontWeight:700}}>Gym 147 Admin</Link>
        <nav style={{display:'flex', gap:8}}>
          <NavLink to='/' end className={linkCls}>Dashboard</NavLink>
          <NavLink to='/members' className={linkCls}>Members</NavLink>
          <NavLink to='/packages' className={linkCls}>Packages</NavLink>
          <NavLink to='/schedule' className={linkCls}>Schedule</NavLink>
          <NavLink to='/billing' className={linkCls}>Billing</NavLink>
        </nav>
      </header>
      <main style={{padding:16}}>{children}</main>
    </div>
  );
}