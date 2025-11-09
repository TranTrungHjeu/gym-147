import { CalendarRange, CreditCard, LayoutDashboard, Package, Users2 } from 'lucide-react';
import React from 'react';
import { IconBadge } from '../../ui';

interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  description: string;
}

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    description: 'Tổng quan hệ thống',
  },
  {
    id: 'members',
    label: 'Thành viên',
    path: '/members',
    icon: Users2,
    description: 'Quản lý thành viên',
  },
  {
    id: 'packages',
    label: 'Gói tập',
    path: '/packages',
    icon: Package,
    description: 'Các gói tập luyện',
  },
  {
    id: 'schedule',
    label: 'Lịch tập',
    path: '/schedule',
    icon: CalendarRange,
    description: 'Quản lý lịch trình',
  },
  {
    id: 'billing',
    label: 'Thanh toán',
    path: '/billing',
    icon: CreditCard,
    description: 'Hệ thống thanh toán',
  },
];

const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate }) => {
  return (
    <aside className='relative flex w-80 flex-col border-r border-white/5 bg-surface-900/90 px-6 pb-8 pt-10 text-brand-50 shadow-surface'>
      <div className='absolute inset-0 -z-10 bg-grid-glow [background-size:40px_40px] opacity-10' />

      <div className='mb-10 flex flex-col gap-5'>
        <div className='flex items-center gap-3'>
          <div className='relative flex items-center justify-center'>
            <div className='absolute inset-0 rounded-2xl bg-brand-500/60 blur-xl' />
            <div className='relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-surface-800 via-surface-900 to-brand-500/70 shadow-brand'>
              <span className='font-display text-2xl tracking-wider'>SG</span>
            </div>
          </div>
          <div>
            <h2 className='font-display text-2xl font-semibold tracking-wide text-brand-50'>
              Smart Gym
            </h2>
            <p className='text-sm text-ink-300'>Management Console</p>
          </div>
        </div>

        <div className='rounded-2xl border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-xs font-medium text-ink-200'>
          Sức mạnh dữ liệu giúp phòng gym vận hành hiệu quả hơn mỗi ngày.
        </div>
      </div>

      <nav className='flex flex-1 flex-col gap-2'>
        <span className='px-2 text-xs font-semibold uppercase tracking-[0.28em] text-ink-400'>
          Điều hướng chính
        </span>

        {menuItems.map(item => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type='button'
              onClick={() => onNavigate(item.path)}
              className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all duration-300 ${
                isActive
                  ? 'border-brand-500/40 bg-brand-500/10 shadow-brand'
                  : 'border-white/5 bg-white/5 hover:border-brand-500/30 hover:bg-brand-500/5'
              }`}
            >
              <IconBadge icon={Icon} tone={isActive ? 'brand' : 'neutral'} />
              <div className='flex-1'>
                <div
                  className={`text-base font-semibold tracking-wide transition-colors duration-300 ${
                    isActive ? 'text-brand-50' : 'text-ink-200 group-hover:text-brand-50'
                  }`}
                >
                  {item.label}
                </div>
                <p className='mt-1 text-xs text-ink-400 group-hover:text-ink-200'>
                  {item.description}
                </p>
              </div>
              {isActive && <span className='h-2 w-2 rounded-full bg-brand-400 shadow-brand' />}
            </button>
          );
        })}
      </nav>

      <div className='mt-8 rounded-2xl border border-white/5 bg-white/5 p-4'>
        <div className='flex items-center gap-3'>
          <IconBadge icon={CalendarRange} tone='info' size='sm' />
          <div>
            <p className='text-sm font-semibold text-brand-50'>Mỗi ngày thông minh hơn</p>
            <p className='text-xs text-ink-400'>
              Theo dõi KPI và lịch tập ngay tại bảng điều khiển.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
