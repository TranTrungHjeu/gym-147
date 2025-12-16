import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import useTranslation from '../../hooks/useTranslation';
import { billingService } from '../../services/billing.service';
import { dashboardService } from '../../services/dashboard.service';
import { scheduleService } from '../../services/schedule.service';
import { equipmentService } from '../../services/equipment.service';
import ExportButton, { ExportUtils } from '../../components/common/ExportButton';
import AdminCard from '../../components/common/AdminCard';
import AdminButton from '../../components/common/AdminButton';
import AdminInput from '../../components/common/AdminInput';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  Filter,
  Search,
  RefreshCw,
} from 'lucide-react';
import { TableLoading } from '../../components/ui/AppLoading';
import RevenueTrendChart from '../../components/charts/RevenueTrendChart';
import MonthlyRevenueBarChart from '../../components/charts/MonthlyRevenueBarChart';
import NetRevenueChart from '../../components/charts/NetRevenueChart';
import UserGrowthChart from '../../components/charts/UserGrowthChart';
import ClassAttendanceChart from '../../components/charts/ClassAttendanceChart';
import EquipmentUsageChart from '../../components/charts/EquipmentUsageChart';

const ReportsManagement: React.FC = () => {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'revenue' | 'members' | 'classes' | 'equipment'>(
    'revenue'
  );

  // Check URL params for tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['revenue', 'members', 'classes', 'equipment'].includes(tabParam)) {
      setActiveTab(tabParam as 'revenue' | 'members' | 'classes' | 'equipment');
    }
  }, []);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [revenueTrendData, setRevenueTrendData] = useState<any>(null);
  const [memberStats, setMemberStats] = useState<any>(null);
  const [userGrowthData, setUserGrowthData] = useState<any>(null);
  const [classAttendanceData, setClassAttendanceData] = useState<any>(null);
  const [equipmentUsageData, setEquipmentUsageData] = useState<any>(null);
  const [netRevenueData, setNetRevenueData] = useState<{
    totalRevenue: number;
    trainerSalaries: number;
    approvedRefunds: number;
    netRevenue: number;
    monthlyBreakdown: Array<{
      month: string;
      year: number;
      revenue: number;
      salaries: number;
      refunds: number;
      net: number;
    }>;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab, dateRange]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      if (activeTab === 'revenue') {
        try {
          // Prepare date range - use default 30 days if not specified
          let fromDate = dateRange.from;
          let toDate = dateRange.to;

          // If no date range specified, use last 30 days
          if (!fromDate || !toDate) {
            const today = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(today.getDate() - 30);
            fromDate = thirtyDaysAgo.toISOString().split('T')[0];
            toDate = today.toISOString().split('T')[0];
          }

          const [statsResponse, trendsResponse] = await Promise.all([
            billingService
              .getRevenueReports({
                from: fromDate,
                to: toDate,
              })
              .catch((error: any) => {
                // Handle connection errors gracefully
                if (
                  error.message?.includes('Failed to fetch') ||
                  error.message?.includes('ERR_CONNECTION_REFUSED')
                ) {
                  console.warn('Billing service not available');
                  return { success: false, data: null };
                }
                throw error;
              }),
            billingService
              .getRevenueTrends({
                from: fromDate,
                to: toDate,
              })
              .catch((error: any) => {
                if (
                  error.message?.includes('Failed to fetch') ||
                  error.message?.includes('ERR_CONNECTION_REFUSED')
                ) {
                  console.warn('Revenue trends endpoint not available');
                  return { success: false, data: null };
                }
                return { success: false, data: null };
              }),
          ]);

          if (statsResponse?.success && statsResponse.data) {
            setRevenueData(statsResponse.data);
          } else {
            setRevenueData(null);
          }

          if (trendsResponse?.success && trendsResponse.data) {
            setRevenueTrendData(trendsResponse.data);
          } else {
            setRevenueTrendData(null);
          }

          // Load net revenue data (revenue - salaries - refunds)
          try {
            // Calculate month range from date range
            const fromDateObj = new Date(fromDate);
            const toDateObj = new Date(toDate);

            // Get all months in the range
            const months: Array<{ month: number; year: number }> = [];
            const current = new Date(fromDateObj.getFullYear(), fromDateObj.getMonth(), 1);
            const end = new Date(toDateObj.getFullYear(), toDateObj.getMonth(), 1);

            while (current <= end) {
              months.push({
                month: current.getMonth() + 1,
                year: current.getFullYear(),
              });
              current.setMonth(current.getMonth() + 1);
            }

            // Get trainer salaries for all months in range
            const salaryPromises = months.map(({ month, year }) =>
              scheduleService.getAllTrainersSalaryStatistics(month, year).catch(() => ({
                success: false,
                data: null,
              }))
            );

            // Get all refunds (APPROVED and PROCESSED) for display
            // Note: Refunds are displayed but NOT subtracted from net revenue
            const refundsResponse = await billingService
              .getAllRefunds({
                all: true, // Admin view: get all refunds
                limit: 1000,
              })
              .catch(() => ({
                success: false,
                data: { refunds: [], totalAmount: 0 },
              }));

            const salaryResponses = await Promise.all(salaryPromises);

            // Calculate total salaries
            let totalSalaries = 0;
            const monthlyBreakdown: Array<{
              month: string;
              year: number;
              revenue: number;
              salaries: number;
              refunds: number;
              net: number;
            }> = [];

            // Calculate revenue per month from trends data
            const revenuePerMonth: { [key: string]: number } = {};
            if (
              trendsResponse?.success &&
              trendsResponse.data?.dates &&
              trendsResponse.data?.revenues
            ) {
              trendsResponse.data.dates.forEach((date: string, index: number) => {
                const dateObj = new Date(date);
                const monthKey = `${dateObj.getFullYear()}-${String(
                  dateObj.getMonth() + 1
                ).padStart(2, '0')}`;
                if (!revenuePerMonth[monthKey]) {
                  revenuePerMonth[monthKey] = 0;
                }
                revenuePerMonth[monthKey] += trendsResponse.data.revenues[index] || 0;
              });
            }

            // Process salary responses
            salaryResponses.forEach((response: any, index: number) => {
              if (response?.success && response.data?.statistics) {
                const monthData = months[index];
                const monthSalary = response.data.statistics.reduce(
                  (sum: number, stat: any) => sum + (stat.salary || 0),
                  0
                );
                totalSalaries += monthSalary;

                // Get revenue for this month
                const monthKey = `${monthData.year}-${String(monthData.month).padStart(2, '0')}`;
                const monthRevenue = revenuePerMonth[monthKey] || 0;

                // Get refunds for this month (only PROCESSED status)
                const monthRefunds = refundsResponse.data?.refunds
                  ? refundsResponse.data.refunds
                      .filter((refund: any) => {
                        // Only count PROCESSED refunds
                        if (refund.status !== 'PROCESSED') {
                          return false;
                        }
                        // Filter by date (use processed_at if available, otherwise created_at)
                        const refundDate = new Date(refund.processed_at || refund.created_at);
                        const fromDateObj = new Date(fromDate);
                        const toDateObj = new Date(toDate);
                        toDateObj.setHours(23, 59, 59, 999);
                        if (refundDate < fromDateObj || refundDate > toDateObj) {
                          return false;
                        }
                        // Check if it's in this month
                        return (
                          refundDate.getFullYear() === monthData.year &&
                          refundDate.getMonth() + 1 === monthData.month
                        );
                      })
                      .reduce((sum: number, refund: any) => sum + (Number(refund.amount) || 0), 0)
                  : 0;

                monthlyBreakdown.push({
                  month: new Date(monthData.year, monthData.month - 1).toLocaleString('vi-VN', {
                    month: 'long',
                  }),
                  year: monthData.year,
                  revenue: monthRevenue,
                  salaries: monthSalary,
                  refunds: monthRefunds,
                  net: monthRevenue - monthSalary, // Không trừ hoàn tiền
                });
              }
            });

            // Calculate total refunds (only PROCESSED) for display
            // Filter by date range
            const allRefunds = refundsResponse.data?.refunds || [];
            const filteredRefunds = allRefunds.filter((refund: any) => {
              // Only count PROCESSED refunds
              if (refund.status !== 'PROCESSED') {
                return false;
              }
              // Filter by date range (use processed_at if available, otherwise created_at)
              const refundDate = new Date(refund.processed_at || refund.created_at);
              const fromDateObj = new Date(fromDate);
              const toDateObj = new Date(toDate);
              toDateObj.setHours(23, 59, 59, 999);
              return refundDate >= fromDateObj && refundDate <= toDateObj;
            });
            const totalRefunds = filteredRefunds.reduce(
              (sum: number, refund: any) => sum + (Number(refund.amount) || 0),
              0
            );

            // Calculate total revenue from monthly breakdown (more accurate than revenueData)
            // This ensures consistency between summary cards and monthly breakdown table
            const totalRevenueFromBreakdown = monthlyBreakdown.reduce(
              (sum, month) => sum + month.revenue,
              0
            );

            // Calculate total revenue from trends data (sum of all revenues)
            const totalRevenueFromTrends =
              trendsResponse?.success && trendsResponse.data?.revenues
                ? trendsResponse.data.revenues.reduce(
                    (sum: number, rev: number) => sum + (rev || 0),
                    0
                  )
                : 0;

            // Priority: breakdown > trends > revenueData
            // This ensures the total matches what's shown in the monthly breakdown table
            const totalRevenue =
              totalRevenueFromBreakdown > 0
                ? totalRevenueFromBreakdown // Use breakdown if available (most accurate for monthly view)
                : totalRevenueFromTrends > 0
                ? totalRevenueFromTrends // Fallback to trends sum
                : revenueData?.total_revenue || 0; // Last resort: revenueData

            const netRevenue = totalRevenue - totalSalaries; // Không trừ hoàn tiền

            setNetRevenueData({
              totalRevenue,
              trainerSalaries: totalSalaries,
              approvedRefunds: totalRefunds, // Keep field name for compatibility, but now contains PROCESSED refunds
              netRevenue,
              monthlyBreakdown,
            });
          } catch (error: any) {
            console.warn('Net revenue data not available:', error);
            setNetRevenueData(null);
          }
        } catch (error: any) {
          console.warn('Revenue data not available:', error);
          setRevenueData(null);
          setRevenueTrendData(null);
          setNetRevenueData(null);
        }
      } else if (activeTab === 'members') {
        try {
          const [statsResponse, growthResponse] = await Promise.all([
            dashboardService.getUserStats().catch((error: any) => {
              if (
                error.message?.includes('Failed to fetch') ||
                error.message?.includes('ERR_CONNECTION_REFUSED')
              ) {
                console.warn('Dashboard service not available');
                return { success: false, data: null };
              }
              return { success: false, data: null };
            }),
            dashboardService
              .getUserGrowthData({
                from: dateRange.from,
                to: dateRange.to,
              })
              .catch((error: any) => {
                if (
                  error.message?.includes('Failed to fetch') ||
                  error.message?.includes('ERR_CONNECTION_REFUSED')
                ) {
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
          const attendanceResponse = await scheduleService
            .getClassAttendanceData({
              from: dateRange.from,
              to: dateRange.to,
            })
            .catch((error: any) => {
              if (
                error.message?.includes('Failed to fetch') ||
                error.message?.includes('ERR_CONNECTION_REFUSED')
              ) {
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
          const usageResponse = await equipmentService
            .getEquipmentUsageData()
            .catch((error: any) => {
              if (
                error.message?.includes('Failed to fetch') ||
                error.message?.includes('ERR_CONNECTION_REFUSED')
              ) {
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
      if (
        !error.message?.includes('not found') &&
        !error.message?.includes('404') &&
        !error.message?.includes('Failed to fetch') &&
        !error.message?.includes('ERR_CONNECTION_REFUSED')
      ) {
        showToast(
          t('reportsManagement.messages.loadError', {
            tab: t(`reportsManagement.tabs.${activeTab}`),
          }),
          'error'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'excel') => {
    try {
      showToast(t('reportsManagement.messages.exporting'), 'info');

      let exportData: any[] = [];
      let columns: Array<{ key: string; label: string }> = [];

      if (activeTab === 'revenue' && revenueTrendData) {
        exportData =
          revenueTrendData.dates?.map((date: string, index: number) => ({
            Date: date,
            Revenue: revenueTrendData.revenues?.[index] || 0,
            Transactions: revenueTrendData.transactions?.[index] || 0,
          })) || [];
        columns = [
          { key: 'Date', label: t('reportsManagement.export.columns.date') },
          { key: 'Revenue', label: t('reportsManagement.export.columns.revenue') },
          { key: 'Transactions', label: t('reportsManagement.export.columns.transactions') },
        ];
      } else if (activeTab === 'members' && userGrowthData) {
        exportData =
          userGrowthData.dates?.map((date: string, index: number) => ({
            Date: date,
            'New Users': userGrowthData.newUsers?.[index] || 0,
            'Active Users': userGrowthData.activeUsers?.[index] || 0,
          })) || [];
        columns = [
          { key: 'Date', label: t('reportsManagement.export.columns.date') },
          { key: 'New Users', label: t('reportsManagement.export.columns.newUsers') },
          { key: 'Active Users', label: t('reportsManagement.export.columns.activeUsers') },
        ];
      } else if (activeTab === 'classes' && classAttendanceData) {
        // Flatten class attendance data
        exportData =
          classAttendanceData.classNames?.map((className: string, classIndex: number) => {
            const attendance = classAttendanceData.attendance?.[classIndex] || [];
            return {
              'Class Name': className,
              'Total Attendance': attendance.reduce((sum: number, val: number) => sum + val, 0),
              'Average Attendance':
                attendance.length > 0
                  ? Math.round(
                      attendance.reduce((sum: number, val: number) => sum + val, 0) /
                        attendance.length
                    )
                  : 0,
            };
          }) || [];
        columns = [
          { key: 'Class Name', label: t('reportsManagement.export.columns.className') },
          { key: 'Total Attendance', label: t('reportsManagement.export.columns.totalAttendance') },
          {
            key: 'Average Attendance',
            label: t('reportsManagement.export.columns.averageAttendance'),
          },
        ];
      } else if (activeTab === 'equipment' && equipmentUsageData) {
        exportData = Array.isArray(equipmentUsageData)
          ? equipmentUsageData.map((item: any) => ({
              Status: item.status,
              Count: item.count,
            }))
          : [];
        columns = [
          { key: 'Status', label: t('reportsManagement.export.columns.status') },
          { key: 'Count', label: t('reportsManagement.export.columns.count') },
        ];
      }

      if (exportData.length === 0) {
        showToast(t('reportsManagement.messages.noData'), 'warning');
        return;
      }

      const filename = `report_${activeTab}_${new Date().toISOString().split('T')[0]}`;
      const title = t('reportsManagement.export.title', {
        type: t(`reportsManagement.tabs.${activeTab}`),
      });

      if (format === 'excel') {
        ExportUtils.exportToExcel({
          format: 'excel',
          filename,
          data: exportData,
          columns,
          title,
        });
        showToast(t('reportsManagement.messages.exportExcelSuccess'), 'success');
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
      showToast(t('reportsManagement.messages.exportError'), 'error');
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
    <div className='p-3 space-y-3'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold font-heading text-gray-900 dark:text-white'>
            {t('reportsManagement.title')}
          </h1>
          <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
            {t('reportsManagement.subtitle')}
          </p>
        </div>
        <div className='flex gap-2'>
          <button
            onClick={() => exportReport('pdf')}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md'
          >
            <Download className='w-4 h-4' />
            {t('reportsManagement.actions.exportPDF')}
          </button>
          <button
            onClick={() => exportReport('excel')}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md'
          >
            <Download className='w-4 h-4' />
            {t('reportsManagement.actions.exportExcel')}
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md p-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 mb-1.5'>
              {t('reportsManagement.filters.fromDate')}
            </label>
            <input
              type='date'
              value={dateRange.from}
              onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
              className='w-full py-2 px-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            />
          </div>
          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 mb-1.5'>
              {t('reportsManagement.filters.toDate')}
            </label>
            <input
              type='date'
              value={dateRange.to}
              onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
              className='w-full py-2 px-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            />
          </div>
          <div className='flex items-end'>
            <button
              onClick={loadData}
              className='w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md'
            >
              <Filter className='w-4 h-4' />
              {t('reportsManagement.actions.filter')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-1'>
        <nav className='flex space-x-1'>
          {[
            { id: 'revenue', name: t('reportsManagement.tabs.revenue'), icon: DollarSign },
            { id: 'members', name: t('reportsManagement.tabs.members'), icon: Users },
            { id: 'classes', name: t('reportsManagement.tabs.classes'), icon: FileText },
            { id: 'equipment', name: t('reportsManagement.tabs.equipment'), icon: TrendingUp },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg font-semibold text-theme-xs font-heading transition-all ${
                activeTab === tab.id
                  ? 'bg-orange-600 text-white dark:bg-orange-500 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <tab.icon className='w-4 h-4' />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className='space-y-3'>
          {/* Stats Cards */}
          {isLoading ? (
            <TableLoading text={t('reportsManagement.messages.loadingRevenue')} />
          ) : revenueTrendData || revenueData || netRevenueData ? (
            <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
              <AdminCard padding='sm' className='relative overflow-hidden group'>
                <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl'></div>
                <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
                <div className='relative'>
                  <div className='flex items-center gap-3'>
                    <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                      <DollarSign className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-baseline gap-1.5 mb-0.5'>
                        <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                          {formatCurrency(
                            netRevenueData?.totalRevenue ||
                              (revenueTrendData?.revenues
                                ? revenueTrendData.revenues.reduce(
                                    (sum: number, rev: number) => sum + (rev || 0),
                                    0
                                  )
                                : revenueData?.total_revenue || 0)
                          )}
                        </div>
                      </div>
                      <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                        {t('reportsManagement.stats.totalRevenue')}
                      </div>
                    </div>
                  </div>
                </div>
              </AdminCard>
              <AdminCard padding='sm' className='relative overflow-hidden group'>
                <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl'></div>
                <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
                <div className='relative'>
                  <div className='flex items-center gap-3'>
                    <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                      <TrendingUp className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-baseline gap-1.5 mb-0.5'>
                        <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                          {(() => {
                            const totalRevenue =
                              netRevenueData?.totalRevenue ||
                              (revenueTrendData?.revenues
                                ? revenueTrendData.revenues.reduce(
                                    (sum: number, rev: number) => sum + (rev || 0),
                                    0
                                  )
                                : revenueData?.total_revenue || 0);
                            const totalTransactions = revenueTrendData?.transactions
                              ? revenueTrendData.transactions.reduce(
                                  (sum: number, trans: number) => sum + (trans || 0),
                                  0
                                )
                              : revenueData?.total_transactions || 0;
                            return formatCurrency(
                              totalTransactions > 0 ? totalRevenue / totalTransactions : 0
                            );
                          })()}
                        </div>
                      </div>
                      <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                        {t('reportsManagement.stats.averageRevenue')}
                      </div>
                    </div>
                  </div>
                </div>
              </AdminCard>
              <AdminCard padding='sm' className='relative overflow-hidden group'>
                <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl'></div>
                <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
                <div className='relative'>
                  <div className='flex items-center gap-3'>
                    <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                      <BarChart3 className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-baseline gap-1.5 mb-0.5'>
                        <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                          {revenueTrendData?.transactions
                            ? revenueTrendData.transactions.reduce(
                                (sum: number, trans: number) => sum + (trans || 0),
                                0
                              )
                            : revenueData?.total_transactions || 0}
                        </div>
                      </div>
                      <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                        {t('reportsManagement.stats.totalTransactions')}
                      </div>
                    </div>
                  </div>
                </div>
              </AdminCard>
            </div>
          ) : null}

          {/* Net Revenue Table - Doanh thu sau chi phí */}
          {netRevenueData && (
            <AdminCard className='overflow-hidden'>
              <div className='p-4'>
                <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white mb-4'>
                  Doanh thu sau chi phí
                </h3>

                {/* Summary Cards */}
                <div className='grid grid-cols-1 md:grid-cols-4 gap-3 mb-6'>
                  <AdminCard padding='sm' className='border border-gray-200 dark:border-gray-800'>
                    <p className='text-theme-xs font-medium text-gray-600 dark:text-gray-400 font-inter mb-1'>
                      Tổng doanh thu
                    </p>
                    <p className='text-xl font-bold font-heading text-gray-900 dark:text-white'>
                      {formatCurrency(netRevenueData.totalRevenue)}
                    </p>
                  </AdminCard>
                  <AdminCard padding='sm' className='border border-gray-200 dark:border-gray-800'>
                    <p className='text-theme-xs font-medium text-gray-600 dark:text-gray-400 font-inter mb-1'>
                      Lương trainer
                    </p>
                    <p className='text-xl font-bold font-heading text-red-600 dark:text-red-400'>
                      -{formatCurrency(netRevenueData.trainerSalaries)}
                    </p>
                  </AdminCard>
                  <AdminCard padding='sm' className='border border-gray-200 dark:border-gray-800'>
                    <p className='text-theme-xs font-medium text-gray-600 dark:text-gray-400 font-inter mb-1'>
                      Hoàn tiền đã xử lý
                    </p>
                    <p className='text-xl font-bold font-heading text-red-600 dark:text-red-400'>
                      -{formatCurrency(netRevenueData.approvedRefunds)}
                    </p>
                  </AdminCard>
                  <AdminCard
                    padding='sm'
                    className='border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20'
                  >
                    <p className='text-theme-xs font-medium text-gray-600 dark:text-gray-400 font-inter mb-1'>
                      Doanh thu sau chi
                    </p>
                    <p
                      className={`text-xl font-bold font-heading ${
                        netRevenueData.netRevenue >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatCurrency(netRevenueData.netRevenue)}
                    </p>
                  </AdminCard>
                </div>

                {/* Monthly Breakdown Table */}
                {netRevenueData.monthlyBreakdown.length > 0 && (
                  <div className='overflow-x-auto'>
                    <table className='w-full border-collapse'>
                      <thead>
                        <tr className='bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'>
                          <th className='text-left py-3 px-4 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                            Tháng
                          </th>
                          <th className='text-right py-3 px-4 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                            Doanh thu
                          </th>
                          <th className='text-right py-3 px-4 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                            Lương trainer
                          </th>
                          <th className='text-right py-3 px-4 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                            Hoàn tiền đã xử lý
                          </th>
                          <th className='text-right py-3 px-4 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                            Doanh thu sau chi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {netRevenueData.monthlyBreakdown.map((month, index) => (
                          <tr
                            key={index}
                            className='border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          >
                            <td className='py-3 px-4 text-theme-xs font-medium font-inter text-gray-900 dark:text-white'>
                              {month.month} {month.year}
                            </td>
                            <td className='py-3 px-4 text-theme-xs font-inter text-gray-700 dark:text-gray-300 text-right'>
                              {formatCurrency(month.revenue)}
                            </td>
                            <td className='py-3 px-4 text-theme-xs font-inter text-red-600 dark:text-red-400 text-right'>
                              -{formatCurrency(month.salaries)}
                            </td>
                            <td className='py-3 px-4 text-theme-xs font-inter text-red-600 dark:text-red-400 text-right'>
                              -{formatCurrency(month.refunds)}
                            </td>
                            <td
                              className={`py-3 px-4 text-theme-xs font-semibold font-inter text-right ${
                                month.net >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {formatCurrency(month.net)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className='bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-600 font-semibold'>
                          <td className='py-3 px-4 text-theme-xs font-heading text-gray-900 dark:text-white'>
                            Tổng cộng
                          </td>
                          <td className='py-3 px-4 text-theme-xs font-inter text-gray-900 dark:text-white text-right'>
                            {formatCurrency(netRevenueData.totalRevenue)}
                          </td>
                          <td className='py-3 px-4 text-theme-xs font-inter text-red-600 dark:text-red-400 text-right'>
                            -{formatCurrency(netRevenueData.trainerSalaries)}
                          </td>
                          <td className='py-3 px-4 text-theme-xs font-inter text-red-600 dark:text-red-400 text-right'>
                            -{formatCurrency(netRevenueData.approvedRefunds)}
                          </td>
                          <td
                            className={`py-3 px-4 text-theme-xs font-semibold font-inter text-right ${
                              netRevenueData.netRevenue >= 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {formatCurrency(netRevenueData.netRevenue)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </AdminCard>
          )}

          {/* Charts */}
          {revenueTrendData || netRevenueData ? (
            <div className='space-y-6'>
              {/* Revenue Charts Row */}
              {revenueTrendData && (
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                  <RevenueTrendChart data={revenueTrendData} loading={isLoading} height={350} />
                  <MonthlyRevenueBarChart
                    data={{
                      months: revenueTrendData.dates || [],
                      revenues: revenueTrendData.revenues || [],
                    }}
                    loading={isLoading}
                    height={350}
                  />
                </div>
              )}

              {/* Net Revenue Chart */}
              {netRevenueData && netRevenueData.monthlyBreakdown.length > 0 && (
                <div className='grid grid-cols-1 gap-6'>
                  <NetRevenueChart
                    data={netRevenueData.monthlyBreakdown}
                    loading={isLoading}
                    height={400}
                  />
                </div>
              )}
            </div>
          ) : (
            <AdminCard>
              <div className='text-center py-12'>
                <BarChart3 className='w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3' />
                <p className='text-theme-sm font-heading text-gray-700 dark:text-gray-300'>
                  Chưa có dữ liệu doanh thu
                </p>
                <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-1'>
                  Vui lòng đảm bảo billing service đang chạy hoặc chọn khoảng thời gian để xem báo
                  cáo
                </p>
              </div>
            </AdminCard>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className='space-y-3'>
          {/* Stats Cards */}
          {isLoading ? (
            <TableLoading text='Đang tải dữ liệu hội viên...' />
          ) : memberStats && Array.isArray(memberStats) && memberStats.length > 0 ? (
            <AdminCard>
              <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white mb-4'>
                Thống kê hội viên
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
                {memberStats.map((stat: any, index: number) => (
                  <AdminCard
                    key={index}
                    padding='sm'
                    className='border border-gray-200 dark:border-gray-800'
                  >
                    <p className='text-theme-xs font-medium text-gray-600 dark:text-gray-400 font-inter mb-1'>
                      {stat.role || 'N/A'}
                    </p>
                    <p className='text-xl font-bold font-heading text-gray-900 dark:text-white'>
                      {stat.count || 0}
                    </p>
                  </AdminCard>
                ))}
              </div>
            </AdminCard>
          ) : null}

          {/* Chart */}
          {isLoading ? (
            <TableLoading text='Đang tải biểu đồ...' />
          ) : userGrowthData ? (
            <UserGrowthChart data={userGrowthData} loading={isLoading} height={400} />
          ) : (
            <AdminCard>
              <div className='text-center py-12'>
                <Users className='w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3' />
                <p className='text-theme-sm font-heading text-gray-700 dark:text-gray-300'>
                  Chưa có dữ liệu hội viên
                </p>
                <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-1'>
                  Vui lòng đảm bảo dashboard service đang chạy hoặc chọn khoảng thời gian để xem báo
                  cáo
                </p>
              </div>
            </AdminCard>
          )}
        </div>
      )}

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <div className='space-y-3'>
          {/* Stats Cards */}
          {isLoading ? (
            <TableLoading text='Đang tải dữ liệu lớp học...' />
          ) : classAttendanceData ? (
            <>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                <AdminCard padding='sm' className='relative overflow-hidden group'>
                  <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl'></div>
                  <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
                  <div className='relative'>
                    <div className='flex items-center gap-3'>
                      <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                        <FileText className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-baseline gap-1.5 mb-0.5'>
                          <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                            {classAttendanceData?.classNames?.length || 0}
                          </div>
                        </div>
                        <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                          Tổng lớp học
                        </div>
                      </div>
                    </div>
                  </div>
                </AdminCard>
                <AdminCard padding='sm' className='relative overflow-hidden group'>
                  <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl'></div>
                  <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
                  <div className='relative'>
                    <div className='flex items-center gap-3'>
                      <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                        <Users className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-baseline gap-1.5 mb-0.5'>
                          <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                            {classAttendanceData?.attendance?.reduce(
                              (sum: number, arr: number[]) =>
                                sum + arr.reduce((a: number, b: number) => a + b, 0),
                              0
                            ) || 0}
                          </div>
                        </div>
                        <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                          Tổng tham gia
                        </div>
                      </div>
                    </div>
                  </div>
                </AdminCard>
                <AdminCard padding='sm' className='relative overflow-hidden group'>
                  <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl'></div>
                  <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
                  <div className='relative'>
                    <div className='flex items-center gap-3'>
                      <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0'>
                        <TrendingUp className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-baseline gap-1.5 mb-0.5'>
                          <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                            {classAttendanceData?.attendance?.length
                              ? Math.round(
                                  classAttendanceData.attendance.reduce(
                                    (sum: number, arr: number[]) =>
                                      sum + arr.reduce((a: number, b: number) => a + b, 0),
                                    0
                                  ) / classAttendanceData.attendance.length
                                )
                              : 0}
                          </div>
                        </div>
                        <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                          Trung bình/lớp
                        </div>
                      </div>
                    </div>
                  </div>
                </AdminCard>
              </div>

              {/* Chart */}
              <ClassAttendanceChart data={classAttendanceData} loading={isLoading} height={400} />
            </>
          ) : (
            <AdminCard>
              <div className='text-center py-12'>
                <FileText className='w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3' />
                <p className='text-theme-sm font-heading text-gray-700 dark:text-gray-300'>
                  Chưa có dữ liệu lớp học
                </p>
                <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-1'>
                  Vui lòng đảm bảo schedule service đang chạy hoặc chọn khoảng thời gian để xem báo
                  cáo
                </p>
              </div>
            </AdminCard>
          )}
        </div>
      )}

      {/* Equipment Tab */}
      {activeTab === 'equipment' && (
        <div className='space-y-3'>
          {isLoading ? (
            <TableLoading text='Đang tải dữ liệu thiết bị...' />
          ) : equipmentUsageData &&
            Array.isArray(equipmentUsageData) &&
            equipmentUsageData.length > 0 ? (
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
              {/* Chart */}
              <EquipmentUsageChart data={equipmentUsageData} loading={isLoading} height={400} />

              {/* Stats Cards */}
              <div className='space-y-3'>
                {equipmentUsageData.map((item: any, index: number) => {
                  const statusColors: { [key: string]: string } = {
                    AVAILABLE:
                      'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800',
                    IN_USE:
                      'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                    MAINTENANCE:
                      'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300 border-warning-200 dark:border-warning-800',
                    OUT_OF_ORDER:
                      'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300 border-error-200 dark:border-error-800',
                  };

                  const statusLabels: { [key: string]: string } = {
                    AVAILABLE: 'Sẵn sàng',
                    IN_USE: 'Đang sử dụng',
                    MAINTENANCE: 'Bảo trì',
                    OUT_OF_ORDER: 'Hỏng',
                  };

                  return (
                    <AdminCard key={index} padding='sm'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='text-theme-xs font-medium text-gray-600 dark:text-gray-400 font-inter mb-1'>
                            {statusLabels[item.status] || item.status}
                          </p>
                          <p className='text-xl font-bold font-heading text-gray-900 dark:text-white'>
                            {item.count || 0}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 inline-flex text-theme-xs font-semibold font-heading rounded-full border ${
                            statusColors[item.status] ||
                            'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                          }`}
                        >
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
                <TrendingUp className='w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3' />
                <p className='text-theme-sm font-heading text-gray-700 dark:text-gray-300'>
                  Chưa có dữ liệu thiết bị
                </p>
                <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-1'>
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
