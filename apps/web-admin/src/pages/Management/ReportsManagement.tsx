import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { billingService } from '../../services/billing.service';
import { dashboardService } from '../../services/dashboard.service';
import { scheduleService } from '../../services/schedule.service';
import { equipmentService } from '../../services/equipment.service';
import ExportButton, { ExportUtils } from '../../components/common/ExportButton';
import AdminCard from '../../components/common/AdminCard';
import AdminButton from '../../components/common/AdminButton';
import AdminInput from '../../components/common/AdminInput';
import { BarChart3, Download, Calendar, TrendingUp, Users, DollarSign, FileText, Filter } from 'lucide-react';
import RevenueTrendChart from '../../components/charts/RevenueTrendChart';
import MonthlyRevenueBarChart from '../../components/charts/MonthlyRevenueBarChart';
import UserGrowthChart from '../../components/charts/UserGrowthChart';
import ClassAttendanceChart from '../../components/charts/ClassAttendanceChart';
import EquipmentUsageChart from '../../components/charts/EquipmentUsageChart';

const ReportsManagement: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'revenue' | 'members' | 'classes' | 'equipment'>('revenue');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [revenueTrendData, setRevenueTrendData] = useState<any>(null);
  const [memberStats, setMemberStats] = useState<any>(null);
  const [userGrowthData, setUserGrowthData] = useState<any>(null);
  const [classAttendanceData, setClassAttendanceData] = useState<any>(null);
  const [equipmentUsageData, setEquipmentUsageData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [activeTab, dateRange]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      if (activeTab === 'revenue') {
        try {
          const [statsResponse, trendsResponse] = await Promise.all([
            billingService.getRevenueReports({
              from: dateRange.from,
              to: dateRange.to,
            }).catch((error: any) => {
              // Handle connection errors gracefully
              if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
                console.warn('Billing service not available');
                return { success: false, data: null };
              }
              throw error;
            }),
            billingService.getRevenueTrends({
              from: dateRange.from,
              to: dateRange.to,
            }).catch((error: any) => {
              if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
                console.warn('Revenue trends endpoint not available');
                return { success: false, data: null };
              }
              return { success: false, data: null };
            }),
          ]);
          
          if (statsResponse?.success) {
            setRevenueData(statsResponse.data);
          } else {
            setRevenueData(null);
          }
          
          if (trendsResponse?.success && trendsResponse.data) {
            setRevenueTrendData(trendsResponse.data);
          } else {
            setRevenueTrendData(null);
          }
        } catch (error: any) {
          console.warn('Revenue data not available:', error);
          setRevenueData(null);
          setRevenueTrendData(null);
        }
      } else if (activeTab === 'members') {
        try {
          const [statsResponse, growthResponse] = await Promise.all([
            dashboardService.getUserStats().catch((error: any) => {
              if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
                console.warn('Dashboard service not available');
                return { success: false, data: null };
              }
              return { success: false, data: null };
            }),
            dashboardService.getUserGrowthData({
              from: dateRange.from,
              to: dateRange.to,
            }).catch((error: any) => {
              if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
                console.warn('User growth endpoint not available');
                return { success: false, data: null };
              }
              return { success: false, data: null };
            }),
          ]);
          
          if (statsResponse?.success) {
            setMemberStats(statsResponse.data);
          } else {
            setMemberStats(null);
          }
          
          if (growthResponse?.success && growthResponse.data) {
            setUserGrowthData(growthResponse.data);
          } else {
            setUserGrowthData(null);
          }
        } catch (error: any) {
          console.warn('Member data not available:', error);
          setMemberStats(null);
          setUserGrowthData(null);
        }
      } else if (activeTab === 'classes') {
        try {
          const attendanceResponse = await scheduleService.getClassAttendanceData({
            from: dateRange.from,
            to: dateRange.to,
          }).catch((error: any) => {
            if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
              console.warn('Class attendance endpoint not available');
              return { success: false, data: null };
            }
            return { success: false, data: null };
          });
          
          if (attendanceResponse?.success && attendanceResponse.data) {
            setClassAttendanceData(attendanceResponse.data);
          } else {
            setClassAttendanceData(null);
          }
        } catch (error: any) {
          console.warn('Class attendance data not available:', error);
          setClassAttendanceData(null);
        }
      } else if (activeTab === 'equipment') {
        try {
          const usageResponse = await equipmentService.getEquipmentUsageData().catch((error: any) => {
            if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
              console.warn('Equipment usage endpoint not available');
              return { success: false, data: null };
            }
            return { success: false, data: null };
          });
          
          if (usageResponse?.success && usageResponse.data) {
            setEquipmentUsageData(usageResponse.data);
          } else {
            setEquipmentUsageData(null);
          }
        } catch (error: any) {
          console.warn('Equipment usage data not available:', error);
          setEquipmentUsageData(null);
        }
      }
    } catch (error: any) {
      console.warn('Error loading reports:', error);
      // Don't show error toast for connection errors or missing endpoints
      if (!error.message?.includes('not found') && 
          !error.message?.includes('404') && 
          !error.message?.includes('Failed to fetch') &&
          !error.message?.includes('ERR_CONNECTION_REFUSED')) {
        showToast(`Không thể tải dữ liệu ${activeTab}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'excel') => {
    try {
      showToast('Đang xuất báo cáo...', 'info');
      
      let exportData: any[] = [];
      let columns: Array<{ key: string; label: string }> = [];
      
      if (activeTab === 'revenue' && revenueTrendData) {
        exportData = revenueTrendData.dates?.map((date: string, index: number) => ({
          Date: date,
          Revenue: revenueTrendData.revenues?.[index] || 0,
          Transactions: revenueTrendData.transactions?.[index] || 0,
        })) || [];
        columns = [
          { key: 'Date', label: 'Ngày' },
          { key: 'Revenue', label: 'Doanh thu' },
          { key: 'Transactions', label: 'Số giao dịch' },
        ];
      } else if (activeTab === 'members' && userGrowthData) {
        exportData = userGrowthData.dates?.map((date: string, index: number) => ({
          Date: date,
          'New Users': userGrowthData.newUsers?.[index] || 0,
          'Active Users': userGrowthData.activeUsers?.[index] || 0,
        })) || [];
        columns = [
          { key: 'Date', label: 'Ngày' },
          { key: 'New Users', label: 'Người dùng mới' },
          { key: 'Active Users', label: 'Người dùng hoạt động' },
        ];
      } else if (activeTab === 'classes' && classAttendanceData) {
        // Flatten class attendance data
        exportData = classAttendanceData.classNames?.map((className: string, classIndex: number) => {
          const attendance = classAttendanceData.attendance?.[classIndex] || [];
          return {
            'Class Name': className,
            'Total Attendance': attendance.reduce((sum: number, val: number) => sum + val, 0),
            'Average Attendance': attendance.length > 0 
              ? Math.round(attendance.reduce((sum: number, val: number) => sum + val, 0) / attendance.length)
              : 0,
          };
        }) || [];
        columns = [
          { key: 'Class Name', label: 'Tên lớp' },
          { key: 'Total Attendance', label: 'Tổng tham gia' },
          { key: 'Average Attendance', label: 'Trung bình tham gia' },
        ];
      } else if (activeTab === 'equipment' && equipmentUsageData) {
        exportData = Array.isArray(equipmentUsageData) 
          ? equipmentUsageData.map((item: any) => ({
              Status: item.status,
              Count: item.count,
            }))
          : [];
        columns = [
          { key: 'Status', label: 'Trạng thái' },
          { key: 'Count', label: 'Số lượng' },
        ];
      }
      
      if (exportData.length === 0) {
        showToast('Không có dữ liệu để xuất', 'warning');
        return;
      }
      
      const filename = `report_${activeTab}_${new Date().toISOString().split('T')[0]}`;
      const title = `Báo cáo ${activeTab === 'revenue' ? 'Doanh thu' : activeTab === 'members' ? 'Thành viên' : activeTab === 'classes' ? 'Lớp học' : 'Thiết bị'}`;
      
      if (format === 'excel') {
        ExportUtils.exportToExcel({
          format: 'excel',
          filename,
          data: exportData,
          columns,
          title,
        });
        showToast(`Đã xuất báo cáo Excel`, 'success');
      } else {
        ExportUtils.exportToPDF({
          format: 'pdf',
          filename,
          data: exportData,
          columns,
          title,
        });
      }
    } catch (error: any) {
      showToast('Không thể xuất báo cáo', 'error');
      console.error('Export error:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <div className='p-6 space-y-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-3xl font-bold font-heading text-gray-900 dark:text-white'>
            Báo cáo & Phân tích
          </h1>
          <p className='text-gray-600 dark:text-gray-400 mt-1 font-inter'>
            Xem các báo cáo và thống kê hệ thống
          </p>
        </div>
        <div className='flex gap-2'>
          <AdminButton
            variant='secondary'
            icon={Download}
            onClick={() => exportReport('pdf')}
          >
            Xuất PDF
          </AdminButton>
          <AdminButton
            variant='primary'
            icon={Download}
            onClick={() => exportReport('excel')}
          >
            Xuất Excel
          </AdminButton>
        </div>
      </div>

      {/* Date Range Filter */}
      <AdminCard>
        <div className='flex gap-4 items-end'>
          <div className='flex-1'>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
              Từ ngày
            </label>
            <input
              type='date'
              value={dateRange.from}
              onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter'
            />
          </div>
          <div className='flex-1'>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
              Đến ngày
            </label>
            <input
              type='date'
              value={dateRange.to}
              onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter'
            />
          </div>
          <AdminButton
            variant='primary'
            icon={Filter}
            onClick={loadData}
          >
            Lọc
          </AdminButton>
        </div>
      </AdminCard>

      {/* Tabs */}
      <div className='border-b border-gray-200 dark:border-gray-800'>
        <nav className='-mb-px flex space-x-8'>
          {[
            { id: 'revenue', name: 'Doanh thu', icon: DollarSign },
            { id: 'members', name: 'Thành viên', icon: Users },
            { id: 'classes', name: 'Lớp học', icon: FileText },
            { id: 'equipment', name: 'Thiết bị', icon: TrendingUp },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm font-inter transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <tab.icon className='w-5 h-5' />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className='space-y-6'>
          {/* Stats Cards */}
          {revenueData && (
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <AdminCard>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-400 font-inter'>
                      Tổng doanh thu
                    </p>
                    <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white mt-2'>
                      {formatCurrency(revenueData.total_revenue || 0)}
                    </p>
                  </div>
                  <DollarSign className='w-8 h-8 text-success-500 dark:text-success-400' />
                </div>
              </AdminCard>
              <AdminCard>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-400 font-inter'>
                      Doanh thu trung bình
                    </p>
                    <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white mt-2'>
                      {formatCurrency(revenueData.average_revenue || 0)}
                    </p>
                  </div>
                  <TrendingUp className='w-8 h-8 text-blue-500 dark:text-blue-400' />
                </div>
              </AdminCard>
              <AdminCard>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-400 font-inter'>
                      Số giao dịch
                    </p>
                    <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white mt-2'>
                      {revenueData.total_transactions || 0}
                    </p>
                  </div>
                  <BarChart3 className='w-8 h-8 text-orange-500 dark:text-orange-400' />
                </div>
              </AdminCard>
            </div>
          )}

          {/* Charts */}
          {revenueTrendData ? (
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              <RevenueTrendChart
                data={revenueTrendData}
                loading={isLoading}
                height={350}
              />
              <MonthlyRevenueBarChart
                data={{
                  months: revenueTrendData.dates || [],
                  revenues: revenueTrendData.revenues || [],
                }}
                loading={isLoading}
                height={350}
              />
            </div>
          ) : (
            <AdminCard>
              <div className='text-center py-12'>
                <BarChart3 className='w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4' />
                <p className='text-gray-500 dark:text-gray-400 font-inter'>
                  Chưa có dữ liệu doanh thu
                </p>
                <p className='text-sm text-gray-400 dark:text-gray-500 mt-2 font-inter'>
                  Vui lòng đảm bảo billing service đang chạy hoặc chọn khoảng thời gian để xem báo cáo
                </p>
              </div>
            </AdminCard>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className='space-y-6'>
          {/* Stats Cards */}
          {memberStats && (
            <AdminCard>
              <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white mb-4'>
                Thống kê thành viên
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                {Array.isArray(memberStats) && memberStats.map((stat: any, index: number) => (
                  <div
                    key={index}
                    className='border border-gray-200 dark:border-gray-800 rounded-lg p-4'
                  >
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-400 font-inter'>
                      {stat.role || 'N/A'}
                    </p>
                    <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white mt-2'>
                      {stat.count || 0}
                    </p>
                  </div>
                ))}
              </div>
            </AdminCard>
          )}

          {/* Chart */}
          {userGrowthData ? (
            <UserGrowthChart
              data={userGrowthData}
              loading={isLoading}
              height={400}
            />
          ) : (
            <AdminCard>
              <div className='text-center py-12'>
                <Users className='w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4' />
                <p className='text-gray-500 dark:text-gray-400 font-inter'>
                  Chưa có dữ liệu thành viên
                </p>
                <p className='text-sm text-gray-400 dark:text-gray-500 mt-2 font-inter'>
                  Vui lòng đảm bảo dashboard service đang chạy hoặc chọn khoảng thời gian để xem báo cáo
                </p>
              </div>
            </AdminCard>
          )}
        </div>
      )}

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <div className='space-y-6'>
          {/* Stats Cards */}
          {classAttendanceData ? (
            <>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                <AdminCard>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-gray-600 dark:text-gray-400 font-inter'>
                        Tổng lớp học
                      </p>
                      <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white mt-2'>
                        {classAttendanceData?.classNames?.length || 0}
                      </p>
                    </div>
                    <FileText className='w-8 h-8 text-blue-500 dark:text-blue-400' />
                  </div>
                </AdminCard>
                <AdminCard>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-gray-600 dark:text-gray-400 font-inter'>
                        Tổng tham gia
                      </p>
                      <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white mt-2'>
                        {classAttendanceData?.attendance?.reduce((sum: number, arr: number[]) => 
                          sum + arr.reduce((a: number, b: number) => a + b, 0), 0
                        ) || 0}
                      </p>
                    </div>
                    <Users className='w-8 h-8 text-success-500 dark:text-success-400' />
                  </div>
                </AdminCard>
                <AdminCard>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-gray-600 dark:text-gray-400 font-inter'>
                        Trung bình/lớp
                      </p>
                      <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white mt-2'>
                        {classAttendanceData?.attendance?.length 
                          ? Math.round(
                              classAttendanceData.attendance.reduce((sum: number, arr: number[]) => 
                                sum + arr.reduce((a: number, b: number) => a + b, 0), 0
                              ) / classAttendanceData.attendance.length
                            )
                          : 0}
                      </p>
                    </div>
                    <TrendingUp className='w-8 h-8 text-orange-500 dark:text-orange-400' />
                  </div>
                </AdminCard>
              </div>

              {/* Chart */}
              <ClassAttendanceChart
                data={classAttendanceData}
                loading={isLoading}
                height={400}
              />
            </>
          ) : (
            <AdminCard>
              <div className='text-center py-12'>
                <FileText className='w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4' />
                <p className='text-gray-500 dark:text-gray-400 font-inter'>
                  Chưa có dữ liệu lớp học
                </p>
                <p className='text-sm text-gray-400 dark:text-gray-500 mt-2 font-inter'>
                  Vui lòng đảm bảo schedule service đang chạy hoặc chọn khoảng thời gian để xem báo cáo
                </p>
              </div>
            </AdminCard>
          )}
        </div>
      )}

      {/* Equipment Tab */}
      {activeTab === 'equipment' && (
        <div className='space-y-6'>
          {equipmentUsageData && Array.isArray(equipmentUsageData) && equipmentUsageData.length > 0 ? (
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              {/* Chart */}
              <EquipmentUsageChart
                data={equipmentUsageData}
                loading={isLoading}
                height={400}
              />

              {/* Stats Cards */}
              <div className='space-y-4'>
                {equipmentUsageData.map((item: any, index: number) => {
                  const statusColors: { [key: string]: string } = {
                    AVAILABLE: 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300',
                    IN_USE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
                    MAINTENANCE: 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300',
                    OUT_OF_ORDER: 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300',
                  };

                  const statusLabels: { [key: string]: string } = {
                    AVAILABLE: 'Sẵn sàng',
                    IN_USE: 'Đang sử dụng',
                    MAINTENANCE: 'Bảo trì',
                    OUT_OF_ORDER: 'Hỏng',
                  };

                  return (
                    <AdminCard key={index}>
                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='text-sm font-medium text-gray-600 dark:text-gray-400 font-inter'>
                            {statusLabels[item.status] || item.status}
                          </p>
                          <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white mt-2'>
                            {item.count || 0}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-inter ${statusColors[item.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'}`}>
                          {item.status}
                        </span>
                      </div>
                    </AdminCard>
                  );
                })}
              </div>
            </div>
          ) : (
            <AdminCard>
              <div className='text-center py-12'>
                <TrendingUp className='w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4' />
                <p className='text-gray-500 dark:text-gray-400 font-inter'>
                  Chưa có dữ liệu thiết bị
                </p>
                <p className='text-sm text-gray-400 dark:text-gray-500 mt-2 font-inter'>
                  Vui lòng đảm bảo equipment service đang chạy để xem báo cáo sử dụng thiết bị
                </p>
              </div>
            </AdminCard>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsManagement;
