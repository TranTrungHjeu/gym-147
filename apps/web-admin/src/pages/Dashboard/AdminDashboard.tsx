import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { authService } from '../../services/auth.service';
import { DashboardStats, dashboardService } from '../../services/dashboard.service';
import { clearAuthData } from '../../utils/auth';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAdmins: 0,
    totalTrainers: 0,
    totalMembers: 0,
    recentRegistrations: 0,
    activeSessions: 0,
    totalEquipment: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dashboard statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const data = await dashboardService.getAdminStats();
        if (data.success) {
          setStats(data.data);
        } else {
          showToast('Không thể tải thống kê dashboard', 'error');
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        showToast('Lỗi khi tải dữ liệu dashboard', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [showToast]);

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
      // Force logout even if API fails
      clearAuthData();
      navigate('/auth');
    }
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <div className='text-center mb-12 relative'>
          <button
            onClick={handleLogout}
            className='absolute top-0 right-0 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200'
          >
            Đăng xuất
          </button>
          <h1 className='text-3xl font-bold text-gray-900 mb-4'>Admin Dashboard</h1>
          <p className='text-gray-600'>Quản lý phòng gym và nhân viên</p>
        </div>

        {/* Action Cards */}
        <div className='grid md:grid-cols-2 gap-6 max-w-3xl mx-auto'>
          {/* Dashboard Card */}
          <div
            className='bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow cursor-pointer'
            onClick={handleGoToDashboard}
          >
            <div className='text-center'>
              <div className='w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4'>
                <svg
                  className='w-6 h-6 text-blue-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                  />
                </svg>
              </div>
              <h3 className='text-lg font-semibold text-gray-900 mb-2'>Dashboard</h3>
              <p className='text-gray-600 text-sm'>Xem tổng quan phòng gym</p>
            </div>
          </div>

          {/* Create Trainer Card */}
          <div
            className='bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow cursor-pointer'
            onClick={handleCreateTrainer}
          >
            <div className='text-center'>
              <div className='w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4'>
                <svg
                  className='w-6 h-6 text-orange-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                  />
                </svg>
              </div>
              <h3 className='text-lg font-semibold text-gray-900 mb-2'>Tạo Trainer</h3>
              <p className='text-gray-600 text-sm'>Tạo tài khoản huấn luyện viên</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className='mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto'>
          <div className='bg-white rounded-lg shadow-sm p-4 border'>
            <div className='text-center'>
              <div className='text-2xl font-bold text-gray-900 mb-1'>
                {isLoading ? '...' : stats.totalTrainers}
              </div>
              <div className='text-gray-600 text-sm'>Trainer</div>
            </div>
          </div>
          <div className='bg-white rounded-lg shadow-sm p-4 border'>
            <div className='text-center'>
              <div className='text-2xl font-bold text-gray-900 mb-1'>
                {isLoading ? '...' : stats.totalMembers}
              </div>
              <div className='text-gray-600 text-sm'>Member</div>
            </div>
          </div>
          <div className='bg-white rounded-lg shadow-sm p-4 border'>
            <div className='text-center'>
              <div className='text-2xl font-bold text-gray-900 mb-1'>
                {isLoading ? '...' : stats.totalEquipment || 0}
              </div>
              <div className='text-gray-600 text-sm'>Equipment</div>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className='mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto'>
          <div className='bg-white rounded-lg shadow-sm p-4 border'>
            <div className='text-center'>
              <div className='text-2xl font-bold text-green-600 mb-1'>
                {isLoading ? '...' : stats.recentRegistrations || 0}
              </div>
              <div className='text-gray-600 text-sm'>Member mới (30 ngày)</div>
            </div>
          </div>
          <div className='bg-white rounded-lg shadow-sm p-4 border'>
            <div className='text-center'>
              <div className='text-2xl font-bold text-blue-600 mb-1'>
                {isLoading ? '...' : stats.activeSessions || 0}
              </div>
              <div className='text-gray-600 text-sm'>Phiên hoạt động (24h)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
