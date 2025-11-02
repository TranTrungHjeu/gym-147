import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { authService } from '../../services/auth.service';
import { DashboardStats, dashboardService } from '../../services/dashboard.service';
import { scheduleService } from '../../services/schedule.service';
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
  const [isResettingRateLimit, setIsResettingRateLimit] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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

  const handleResetAllRateLimits = async () => {
    try {
      setIsResettingRateLimit(true);
      const response = await scheduleService.resetAllRateLimits();
      
      if (response.success) {
        showToast(`Đã reset ${response.data.count} rate limit(s) thành công`, 'success');
        setShowResetConfirm(false);
      } else {
        showToast('Không thể reset rate limits', 'error');
      }
    } catch (error) {
      console.error('Error resetting rate limits:', error);
      showToast('Lỗi khi reset rate limits', 'error');
    } finally {
      setIsResettingRateLimit(false);
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

        {/* Admin Actions - System Management */}
        <div className='mt-10 max-w-4xl mx-auto'>
          <div className='bg-gradient-to-br from-white to-orange-50 rounded-xl shadow-lg p-6 border border-orange-100'>
            <div className='flex items-center justify-between mb-4'>
              <div>
                <h3 className='text-xl font-bold text-gray-900 mb-1'>Quản lý Hệ thống</h3>
                <p className='text-sm text-gray-600'>Công cụ quản trị và bảo trì hệ thống</p>
              </div>
            </div>
            
            <div className='bg-white rounded-lg p-4 border border-gray-200'>
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='flex items-center gap-2 mb-1'>
                    <RotateCcw size={18} className='text-orange-600' />
                    <h4 className='text-base font-semibold text-gray-900'>Reset Rate Limits</h4>
                  </div>
                  <p className='text-sm text-gray-600 mb-3'>
                    Reset tất cả giới hạn tạo lịch dạy cho tất cả trainer (tối đa 10 lịch/ngày). 
                    Hành động này sẽ cho phép trainer tạo lịch mới ngay lập tức.
                  </p>
                  <div className='flex items-center gap-2 text-xs text-gray-500'>
                    <span className='px-2 py-1 bg-gray-100 rounded'>Admin Only</span>
                    <span className='px-2 py-1 bg-orange-100 text-orange-700 rounded'>Cần xác nhận</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isResettingRateLimit}
                  className='ml-4 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:cursor-not-allowed disabled:shadow-none transform hover:scale-105 disabled:transform-none'
                >
                  <RotateCcw size={16} className={isResettingRateLimit ? 'animate-spin' : ''} />
                  {isResettingRateLimit ? 'Đang xử lý...' : 'Reset Tất cả'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal - Professional Design */}
        {showResetConfirm && (
          <div 
            className='fixed inset-0 z-50 flex items-center justify-center p-4'
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={() => !isResettingRateLimit && setShowResetConfirm(false)}
          >
            <div 
              className='bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all'
              style={{
                animation: 'slideUp 0.3s ease-out',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header with Gradient */}
              <div className='relative bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 px-6 py-5'>
                <div className='absolute inset-0 bg-black/5'></div>
                <div className='relative flex items-center gap-4'>
                  <div className='flex-shrink-0 w-14 h-14 bg-white/25 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30'>
                    <AlertTriangle className='w-7 h-7 text-white drop-shadow-sm' strokeWidth={2.5} />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h3 className='text-xl font-bold text-white mb-1 tracking-tight'>
                      Xác nhận Reset Rate Limits
                    </h3>
                    <p className='text-sm text-orange-50/90 font-medium'>
                      Thao tác hệ thống quan trọng
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className='p-6 bg-gradient-to-b from-white to-gray-50/50'>
                <div className='space-y-4'>
                  {/* Warning Box */}
                  <div className='relative bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 rounded-xl p-5 shadow-sm'>
                    <div className='absolute top-3 left-3 w-1 h-20 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full'></div>
                    <div className='ml-4'>
                      <p className='text-sm font-semibold text-gray-900 mb-3 leading-relaxed'>
                        Bạn có chắc chắn muốn <span className='text-orange-600 font-bold'>reset tất cả rate limits</span> không?
                      </p>
                      <div className='space-y-2'>
                        <p className='text-xs font-medium text-gray-600 uppercase tracking-wide mb-2'>
                          Hành động này sẽ:
                        </p>
                        <ul className='space-y-2.5'>
                          <li className='flex items-start gap-3 text-sm text-gray-700'>
                            <div className='flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-500 mt-2'></div>
                            <span className='leading-relaxed'>Xóa toàn bộ giới hạn tạo lịch dạy cho tất cả trainer trong hệ thống</span>
                          </li>
                          <li className='flex items-start gap-3 text-sm text-gray-700'>
                            <div className='flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-500 mt-2'></div>
                            <span className='leading-relaxed'>Cho phép trainer tạo lịch mới ngay lập tức không bị giới hạn</span>
                          </li>
                          <li className='flex items-start gap-3 text-sm text-gray-700'>
                            <div className='flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 mt-2'></div>
                            <span className='leading-relaxed font-medium text-red-600'>Không thể hoàn tác sau khi reset</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Info Badge */}
                  <div className='flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200'>
                    <div className='w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse'></div>
                    <span>Thao tác này chỉ dành cho quản trị viên hệ thống</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className='px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-end gap-3'>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  disabled={isResettingRateLimit}
                  className='px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none'
                >
                  Hủy
                </button>
                <button
                  onClick={handleResetAllRateLimits}
                  disabled={isResettingRateLimit}
                  className='px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none'
                >
                  {isResettingRateLimit ? (
                    <>
                      <RotateCcw size={16} className='animate-spin' />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw size={16} />
                      <span>Xác nhận Reset</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Custom CSS Animations */}
            <style>{`
              @keyframes fadeIn {
                from {
                  opacity: 0;
                }
                to {
                  opacity: 1;
                }
              }
              
              @keyframes slideUp {
                from {
                  opacity: 0;
                  transform: translateY(20px) scale(0.95);
                }
                to {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
