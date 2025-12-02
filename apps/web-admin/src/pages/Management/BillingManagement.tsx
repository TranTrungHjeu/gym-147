import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useToast } from '../../hooks/useToast';
import { billingService, MembershipPlan, Subscription, Payment, BillingStats } from '../../services/billing.service';
import { CreditCard, Plus, Search, RefreshCw, DollarSign, Users, TrendingUp, FileText, Edit, Eye, Calendar, Package, Clock } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import { AdminTable, AdminTableHeader, AdminTableBody, AdminTableRow, AdminTableCell } from '../../components/common/AdminTable';
import { TableLoading } from '../../components/ui/AppLoading';
import CustomSelect from '../../components/common/CustomSelect';
import PlanFormModal from '../../components/modals/PlanFormModal';
import SubscriptionDetailModal from '../../components/modals/SubscriptionDetailModal';
import PaymentDetailModal from '../../components/modals/PaymentDetailModal';
import RevenueTrendChart from '../../components/charts/RevenueTrendChart';
import RevenueByPlanChart from '../../components/charts/RevenueByPlanChart';
import SubscriptionsByStatusChart from '../../components/charts/SubscriptionsByStatusChart';
import PaymentMethodsChart from '../../components/charts/PaymentMethodsChart';
import ExportButton from '../../components/common/ExportButton';
import { formatVietnamDateTime } from '../../utils/dateTime';

const BillingManagement: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'subscriptions' | 'payments'>('overview');
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Analytics data for charts
  const [revenueTrendData, setRevenueTrendData] = useState<{ dates: string[]; revenues: number[] } | null>(null);
  const [revenueByPlanData, setRevenueByPlanData] = useState<{ plans: string[]; revenues: number[] } | null>(null);
  const [subscriptionsByStatusData, setSubscriptionsByStatusData] = useState<{ statuses: string[]; counts: number[] } | null>(null);
  const [paymentMethodsData, setPaymentMethodsData] = useState<{ methods: string[]; amounts: number[] } | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  
  // Context menu states
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState<any>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [actionType, setActionType] = useState<'plan' | 'subscription' | 'payment'>('plan');
  
  // Modal states
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [isSubscriptionDetailOpen, setIsSubscriptionDetailOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isPaymentDetailOpen, setIsPaymentDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      if (activeTab === 'overview') {
        setIsLoadingAnalytics(true);
        try {
          const [statsResponse, trendsResponse, revenueByPlanResponse, analyticsResponse, subsResponse, paymentsResponse] = await Promise.all([
            billingService.getStats(),
            billingService.getRevenueTrends({ from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] }).catch(() => ({ success: false, data: null })),
            billingService.getRevenueByPlan({ period: 30 }).catch(() => ({ success: false, data: null })),
            billingService.getDashboardAnalytics().catch(() => ({ success: false, data: null })),
            billingService.getAllSubscriptions().catch(() => ({ success: false, data: [] })),
            billingService.getAllPayments().catch(() => ({ success: false, data: [] })),
          ]);
          
          if (statsResponse.success) {
            setStats(statsResponse.data);
          }
          
          // Process revenue trends
          if (trendsResponse?.success && trendsResponse.data) {
            const trendData = trendsResponse.data;
            setRevenueTrendData({
              dates: trendData.dates || [],
              revenues: trendData.revenues || [],
            });
          }
          
          // Process revenue by plan
          if (revenueByPlanResponse?.success && revenueByPlanResponse.data?.plans) {
            const plans = revenueByPlanResponse.data.plans;
            setRevenueByPlanData({
              plans: plans.map((p: any) => p.planName || 'Unknown'),
              revenues: plans.map((p: any) => Number(p.revenue || 0)),
            });
          }
          
          // Process analytics data
          if (analyticsResponse?.success && analyticsResponse.data?.dashboard) {
            const dashboard = analyticsResponse.data.dashboard;
          }
          
          // Process subscriptions by status
          if (subsResponse?.success) {
            const subsList = Array.isArray(subsResponse.data)
              ? subsResponse.data
              : (subsResponse.data?.subscriptions || []);
            const statusCounts: Record<string, number> = {};
            subsList.forEach((sub: Subscription) => {
              statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;
            });
            if (Object.keys(statusCounts).length > 0) {
              setSubscriptionsByStatusData({
                statuses: Object.keys(statusCounts),
                counts: Object.values(statusCounts),
              });
            }
          }
          
          // Process payment methods
          if (paymentsResponse?.success) {
            const paymentsList = Array.isArray(paymentsResponse.data)
              ? paymentsResponse.data
              : (paymentsResponse.data?.payments || []);
            const methodAmounts: Record<string, number> = {};
            paymentsList.forEach((payment: Payment) => {
              const method = payment.payment_method || 'UNKNOWN';
              methodAmounts[method] = (methodAmounts[method] || 0) + Number(payment.amount || 0);
            });
            if (Object.keys(methodAmounts).length > 0) {
              setPaymentMethodsData({
                methods: Object.keys(methodAmounts),
                amounts: Object.values(methodAmounts),
              });
            }
          }
        } catch (error: any) {
          console.error('Error loading analytics:', error);
          
          // Show user-friendly error message for service unavailable
          if (error.status === 503 || error.isServiceUnavailable) {
            showToast(
              error.message || 'Dịch vụ cơ sở dữ liệu tạm thời không khả dụng. Vui lòng thử lại sau.',
              'warning'
            );
          } else if (error.status === 504 || error.isTimeout) {
            showToast(
              error.message || 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại sau.',
              'warning'
            );
          } else {
            showToast('Không thể tải dữ liệu phân tích. Vui lòng thử lại sau.', 'error');
          }
        } finally {
          setIsLoadingAnalytics(false);
        }
      } else if (activeTab === 'plans') {
        const plansResponse = await billingService.getAllPlans();
        if (plansResponse.success) {
          const plansList = Array.isArray(plansResponse.data)
            ? plansResponse.data
            : (plansResponse.data?.plans || []);
          setPlans(plansList);
        }
      } else if (activeTab === 'subscriptions') {
        const subsResponse = await billingService.getAllSubscriptions();
        if (subsResponse.success) {
          // Backend returns array directly, not wrapped in subscriptions
          const subsList = Array.isArray(subsResponse.data)
            ? subsResponse.data
            : (subsResponse.data?.subscriptions || []);
          setSubscriptions(subsList);
          
          // Process subscriptions by status for chart
          const statusCounts: Record<string, number> = {};
          subsList.forEach((sub: Subscription) => {
            statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;
          });
          if (Object.keys(statusCounts).length > 0) {
            setSubscriptionsByStatusData({
              statuses: Object.keys(statusCounts),
              counts: Object.values(statusCounts),
            });
          }
        }
      } else if (activeTab === 'payments') {
        const paymentsResponse = await billingService.getAllPayments();
        if (paymentsResponse.success) {
          // Backend returns array directly, not wrapped in payments
          const paymentsList = Array.isArray(paymentsResponse.data)
            ? paymentsResponse.data
            : (paymentsResponse.data?.payments || []);
          setPayments(paymentsList);
          
          // Process payment methods for chart
          const methodAmounts: Record<string, number> = {};
          paymentsList.forEach((payment: Payment) => {
            const method = payment.payment_method || 'UNKNOWN';
            methodAmounts[method] = (methodAmounts[method] || 0) + Number(payment.amount || 0);
          });
          if (Object.keys(methodAmounts).length > 0) {
            setPaymentMethodsData({
              methods: Object.keys(methodAmounts),
              amounts: Object.values(methodAmounts),
            });
          }
        }
      }
    } catch (error: any) {
      // Show user-friendly error message based on error type
      if (error.status === 503 || error.isServiceUnavailable) {
        showToast(
          error.message || 'Dịch vụ cơ sở dữ liệu tạm thời không khả dụng. Vui lòng thử lại sau.',
          'warning'
        );
      } else if (error.status === 504 || error.isTimeout) {
        showToast(
          error.message || 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại sau.',
          'warning'
        );
      } else {
        showToast(`Không thể tải dữ liệu ${activeTab}`, 'error');
      }
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'COMPLETED':
      case 'PAID':
        return 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800';
      case 'PENDING':
        return 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300 border-warning-200 dark:border-warning-800';
      case 'EXPIRED':
      case 'FAILED':
      case 'OVERDUE':
        return 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300 border-error-200 dark:border-error-800';
      case 'CANCELLED':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDateVN = (dateString: string | Date): string => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return formatVietnamDateTime(date, 'date');
  };

  // Filter options
  const subscriptionStatusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'ACTIVE', label: 'Đang hoạt động' },
    { value: 'EXPIRED', label: 'Hết hạn' },
    { value: 'CANCELLED', label: 'Đã hủy' },
    { value: 'SUSPENDED', label: 'Tạm ngưng' },
  ];

  const paymentStatusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'PAID', label: 'Đã thanh toán' },
    { value: 'PENDING', label: 'Chờ xử lý' },
    { value: 'FAILED', label: 'Thất bại' },
    { value: 'REFUNDED', label: 'Đã hoàn tiền' },
  ];

  // Filtered data
  const filteredPlans = useMemo(() => {
    return plans.filter(plan => 
      plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [plans, searchTerm]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const matchesSearch = 
        sub.member?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.member?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.plan?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, searchTerm, statusFilter]);

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const matchesSearch = 
        payment.member?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.member?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = paymentStatusFilter === 'all' || payment.status === paymentStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [payments, searchTerm, paymentStatusFilter]);

  // Prepare export data for plans
  const getPlansExportData = useCallback(() => {
    return filteredPlans.map(plan => ({
      'Tên gói': plan.name || 'N/A',
      'Mô tả': plan.description || 'N/A',
      'Giá (VND)': plan.price || 0,
      'Giá (đã format)': formatCurrency(plan.price),
      'Thời hạn (ngày)': plan.duration_days || 0,
      'Tính năng': plan.features?.join(', ') || 'N/A',
      'Trạng thái': plan.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động',
      'Ngày tạo': plan.created_at ? formatVietnamDateTime(plan.created_at, 'datetime') : 'N/A',
    }));
  }, [filteredPlans]);

  // Prepare export data for subscriptions
  const getSubscriptionsExportData = useCallback(() => {
    return filteredSubscriptions.map(sub => ({
      'Thành viên': sub.member?.full_name || 'N/A',
      'Email': sub.member?.email || 'N/A',
      'Gói tập': sub.plan?.name || 'N/A',
      'Ngày bắt đầu': sub.start_date ? formatVietnamDateTime(sub.start_date, 'date') : 'N/A',
      'Ngày kết thúc': sub.end_date ? formatVietnamDateTime(sub.end_date, 'date') : 'N/A',
      'Trạng thái': sub.status === 'ACTIVE' ? 'Đang hoạt động' : 
                    sub.status === 'EXPIRED' ? 'Hết hạn' : 
                    sub.status === 'CANCELLED' ? 'Đã hủy' : 
                    sub.status === 'SUSPENDED' ? 'Tạm ngưng' : sub.status,
      'Tự động gia hạn': sub.auto_renew ? 'Có' : 'Không',
      'Trạng thái thanh toán': sub.payment_status || 'N/A',
      'Ngày tạo': sub.created_at ? formatVietnamDateTime(sub.created_at, 'datetime') : 'N/A',
    }));
  }, [filteredSubscriptions]);

  // Prepare export data for payments
  const getPaymentsExportData = useCallback(() => {
    return filteredPayments.map(payment => ({
      'Thành viên': payment.member?.full_name || 'N/A',
      'Email': payment.member?.email || 'N/A',
      'Số tiền (VND)': payment.amount || 0,
      'Số tiền (đã format)': formatCurrency(payment.amount),
      'Phương thức': payment.payment_method || 'N/A',
      'Trạng thái': payment.status === 'COMPLETED' ? 'Hoàn thành' : 
                    payment.status === 'PENDING' ? 'Chờ xử lý' : 
                    payment.status === 'FAILED' ? 'Thất bại' : 
                    payment.status === 'REFUNDED' ? 'Đã hoàn tiền' : payment.status,
      'Ngày thanh toán': payment.payment_date ? formatVietnamDateTime(payment.payment_date, 'datetime') : 'N/A',
      'Mã giao dịch': payment.transaction_id || 'N/A',
      'Ngày tạo': payment.created_at ? formatVietnamDateTime(payment.created_at, 'datetime') : 'N/A',
    }));
  }, [filteredPayments]);

  // Export columns definitions
  const plansExportColumns = [
    { key: 'Tên gói', label: 'Tên gói' },
    { key: 'Mô tả', label: 'Mô tả' },
    { key: 'Giá (VND)', label: 'Giá (VND)' },
    { key: 'Giá (đã format)', label: 'Giá (đã format)' },
    { key: 'Thời hạn (ngày)', label: 'Thời hạn (ngày)' },
    { key: 'Tính năng', label: 'Tính năng' },
    { key: 'Trạng thái', label: 'Trạng thái' },
    { key: 'Ngày tạo', label: 'Ngày tạo' },
  ];

  const subscriptionsExportColumns = [
    { key: 'Thành viên', label: 'Thành viên' },
    { key: 'Email', label: 'Email' },
    { key: 'Gói tập', label: 'Gói tập' },
    { key: 'Ngày bắt đầu', label: 'Ngày bắt đầu' },
    { key: 'Ngày kết thúc', label: 'Ngày kết thúc' },
    { key: 'Trạng thái', label: 'Trạng thái' },
    { key: 'Tự động gia hạn', label: 'Tự động gia hạn' },
    { key: 'Trạng thái thanh toán', label: 'Trạng thái thanh toán' },
    { key: 'Ngày tạo', label: 'Ngày tạo' },
  ];

  const paymentsExportColumns = [
    { key: 'Thành viên', label: 'Thành viên' },
    { key: 'Email', label: 'Email' },
    { key: 'Số tiền (VND)', label: 'Số tiền (VND)' },
    { key: 'Số tiền (đã format)', label: 'Số tiền (đã format)' },
    { key: 'Phương thức', label: 'Phương thức' },
    { key: 'Trạng thái', label: 'Trạng thái' },
    { key: 'Ngày thanh toán', label: 'Ngày thanh toán' },
    { key: 'Mã giao dịch', label: 'Mã giao dịch' },
    { key: 'Ngày tạo', label: 'Ngày tạo' },
  ];

  return (
    <div className='p-3 space-y-3'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold font-heading text-gray-900 dark:text-white'>
            Quản lý Thanh toán
          </h1>
          <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
            Quản lý gói tập, đăng ký và thanh toán
          </p>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'plans') {
              setSelectedPlan(null);
              setIsPlanModalOpen(true);
            } else {
              showToast('Tính năng đang phát triển', 'info');
            }
          }}
          className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200'
        >
          <Plus className='w-4 h-4' />
          {activeTab === 'plans' ? 'Tạo gói mới' : 'Thêm mới'}
        </button>
      </div>

      {/* Tabs */}
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-1'>
        <nav className='flex space-x-1'>
          {[
            { id: 'overview', name: 'Tổng quan', icon: TrendingUp },
            { id: 'plans', name: 'Gói tập', icon: FileText },
            { id: 'subscriptions', name: 'Đăng ký', icon: Users },
            { id: 'payments', name: 'Thanh toán', icon: CreditCard },
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className='space-y-3'>
          {isLoading ? (
            <TableLoading text='Đang tải dữ liệu tổng quan...' />
          ) : stats ? (
            <>
              {/* Stats Cards */}
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'>
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
                          {formatCurrency(stats.total_revenue || 0)}
                        </div>
                      </div>
                      <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                        Tổng doanh thu
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
                          {formatCurrency(stats.monthly_revenue || 0)}
                        </div>
                      </div>
                      <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                        Doanh thu tháng
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
                          {stats.active_subscriptions || 0}
                        </div>
                      </div>
                      <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                        Đăng ký đang hoạt động
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
                      <CreditCard className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-baseline gap-1.5 mb-0.5'>
                        <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                          {stats.pending_payments || 0}
                        </div>
                      </div>
                      <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                        Thanh toán chờ xử lý
                      </div>
                    </div>
                  </div>
                </div>
              </AdminCard>
            </div>
            
            {/* Charts Section */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
              {/* Revenue Trends Chart */}
              <RevenueTrendChart
                data={revenueTrendData || undefined}
                loading={isLoadingAnalytics}
                height={320}
              />
              
              {/* Revenue by Plan Chart */}
              <RevenueByPlanChart
                data={revenueByPlanData || undefined}
                loading={isLoadingAnalytics}
                height={320}
              />
            </div>
            
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
              {/* Subscriptions by Status Chart */}
              <SubscriptionsByStatusChart
                data={subscriptionsByStatusData || undefined}
                loading={isLoadingAnalytics}
                height={320}
              />
              
              {/* Payment Methods Chart */}
              <PaymentMethodsChart
                data={paymentMethodsData || undefined}
                loading={isLoadingAnalytics}
                height={320}
              />
            </div>
            </>
          ) : (
            <AdminCard>
              <div className='text-center py-12 text-gray-500 dark:text-gray-400 font-inter'>
                <DollarSign className='w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500' />
                <p className='text-theme-sm font-heading text-gray-700 dark:text-gray-300'>
                  Không có dữ liệu
                </p>
              </div>
            </AdminCard>
          )}
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className='space-y-3'>
          {/* Search and Filters */}
          <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4'>
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
              <div className='flex items-center gap-3 flex-1 max-w-md'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
                  <input
                    type='text'
                    placeholder='Tìm kiếm gói tập...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className='w-full px-4 py-2.5 pl-10 pr-4 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 transition-all duration-200'
                  />
                </div>
                <button
                  onClick={loadData}
                  className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition-all duration-200'
                >
                  <RefreshCw className='w-4 h-4' />
                  Làm mới
                </button>
              </div>
              {filteredPlans.length > 0 && (
                <ExportButton
                  data={getPlansExportData()}
                  columns={plansExportColumns}
                  filename='danh-sach-goi-tap'
                  title='Danh sách Gói tập'
                  variant='outline'
                  size='sm'
                />
              )}
            </div>
          </div>

          {isLoading ? (
            <TableLoading text='Đang tải danh sách gói tập...' />
          ) : (
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell header>Tên gói</AdminTableCell>
                  <AdminTableCell header>Giá</AdminTableCell>
                  <AdminTableCell header>Thời hạn</AdminTableCell>
                  <AdminTableCell header>Trạng thái</AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {filteredPlans.length === 0 ? (
                  <AdminTableRow>
                    <AdminTableCell colSpan={4} className='text-center py-12'>
                      <FileText className='w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500' />
                      <p className='text-theme-sm font-heading text-gray-700 dark:text-gray-300'>
                        Không có gói tập nào
                      </p>
                      <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-1'>
                        Tạo gói tập mới để bắt đầu
                      </p>
                    </AdminTableCell>
                  </AdminTableRow>
                ) : (
                  filteredPlans.map((plan, index) => (
                    <AdminTableRow
                      key={plan.id}
                      className={`group relative border-l-4 border-l-transparent hover:border-l-orange-500 transition-all duration-200 cursor-pointer ${
                        index % 2 === 0
                          ? 'bg-white dark:bg-gray-900'
                          : 'bg-gray-50/50 dark:bg-gray-800/50'
                      } hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 dark:hover:from-orange-900/20 dark:hover:to-orange-800/10`}
                      onClick={(e?: React.MouseEvent) => {
                        if (e) {
                          e.stopPropagation();
                          setSelectedItemForAction(plan);
                          setActionType('plan');
                          setMenuPosition({ x: e.clientX, y: e.clientY });
                          setActionMenuOpen(true);
                        }
                      }}
                    >
                      <AdminTableCell className='overflow-hidden'>
                        <div className='min-w-0 flex-1'>
                          <div className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200'>
                            {plan.name}
                          </div>
                          {plan.description && (
                            <div className='text-[10px] text-gray-500 dark:text-gray-400 font-inter mt-0.5 line-clamp-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200'>
                              {plan.description}
                            </div>
                          )}
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className='flex items-center gap-1.5'>
                          <DollarSign className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200' />
                          <span className='text-theme-xs font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                            {formatCurrency(plan.price)}
                          </span>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className='flex items-center gap-1.5'>
                          <Clock className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200' />
                          <span className='text-theme-xs font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                            {(plan as any).duration_months ? `${(plan as any).duration_months} tháng` : plan.duration_days ? `${plan.duration_days} ngày` : 'N/A'}
                          </span>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span
                          className={`px-2.5 py-1 inline-flex text-theme-xs font-semibold font-heading rounded-full border transition-all duration-200 group-hover:scale-105 ${
                            plan.is_active
                              ? 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          {plan.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                        </span>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))
                )}
              </AdminTableBody>
            </AdminTable>
          )}
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className='space-y-3'>
          {/* Search and Filters */}
          <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4'>
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
              <div className='flex items-center gap-3 flex-1 max-w-md'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
                  <input
                    type='text'
                    placeholder='Tìm kiếm đăng ký...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className='w-full px-4 py-2.5 pl-10 pr-4 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 transition-all duration-200'
                  />
                </div>
                <CustomSelect
                  options={subscriptionStatusOptions}
                  value={statusFilter}
                  onChange={value => setStatusFilter(value)}
                  placeholder='Lọc theo trạng thái'
                  className='w-full sm:w-[200px]'
                />
                <button
                  onClick={loadData}
                  className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition-all duration-200'
                >
                  <RefreshCw className='w-4 h-4' />
                  Làm mới
                </button>
              </div>
              {filteredSubscriptions.length > 0 && (
                <ExportButton
                  data={getSubscriptionsExportData()}
                  columns={subscriptionsExportColumns}
                  filename='danh-sach-dang-ky'
                  title='Danh sách Đăng ký'
                  variant='outline'
                  size='sm'
                />
              )}
            </div>
          </div>

          {isLoading ? (
            <TableLoading text='Đang tải danh sách đăng ký...' />
          ) : (
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell header>Thành viên</AdminTableCell>
                  <AdminTableCell header>Gói tập</AdminTableCell>
                  <AdminTableCell header>Ngày bắt đầu</AdminTableCell>
                  <AdminTableCell header>Ngày kết thúc</AdminTableCell>
                  <AdminTableCell header>Trạng thái</AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {filteredSubscriptions.length === 0 ? (
                  <AdminTableRow>
                    <AdminTableCell colSpan={5} className='text-center py-12'>
                      <Users className='w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500' />
                      <p className='text-theme-sm font-heading text-gray-700 dark:text-gray-300'>
                        Không có đăng ký nào
                      </p>
                      <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-1'>
                        {searchTerm || statusFilter !== 'all' ? 'Thử tìm kiếm hoặc lọc khác' : 'Chưa có đăng ký nào trong hệ thống'}
                      </p>
                    </AdminTableCell>
                  </AdminTableRow>
                ) : (
                  filteredSubscriptions.map((sub, index) => (
                    <AdminTableRow
                      key={sub.id}
                      className={`group relative border-l-4 border-l-transparent hover:border-l-orange-500 transition-all duration-200 cursor-pointer ${
                        index % 2 === 0
                          ? 'bg-white dark:bg-gray-900'
                          : 'bg-gray-50/50 dark:bg-gray-800/50'
                      } hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 dark:hover:from-orange-900/20 dark:hover:to-orange-800/10`}
                      onClick={(e?: React.MouseEvent) => {
                        if (e) {
                          e.stopPropagation();
                          setSelectedItemForAction(sub);
                          setActionType('subscription');
                          setMenuPosition({ x: e.clientX, y: e.clientY });
                          setActionMenuOpen(true);
                        }
                      }}
                    >
                      <AdminTableCell className='overflow-hidden'>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-1.5'>
                            <Users className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200 flex-shrink-0' />
                            <div className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200'>
                              {sub.member?.full_name || 'N/A'}
                            </div>
                          </div>
                          {sub.member?.email && (
                            <div className='text-[10px] text-gray-500 dark:text-gray-400 font-inter mt-0.5 line-clamp-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200'>
                              {sub.member.email}
                            </div>
                          )}
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className='flex items-center gap-1.5'>
                          <Package className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200 flex-shrink-0' />
                          <span className='text-theme-xs font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                            {sub.plan?.name || 'N/A'}
                          </span>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className='flex items-center gap-1.5'>
                          <Calendar className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200 flex-shrink-0' />
                          <span className='text-theme-xs font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                            {formatDateVN(sub.start_date)}
                          </span>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className='flex items-center gap-1.5'>
                          <Calendar className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200 flex-shrink-0' />
                          <span className='text-theme-xs font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                            {formatDateVN(sub.end_date)}
                          </span>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className={`px-2.5 py-1 inline-flex text-theme-xs font-semibold font-heading rounded-full border transition-all duration-200 group-hover:scale-105 ${getStatusColor(sub.status)}`}>
                          {sub.status === 'ACTIVE' ? 'Đang hoạt động' : 
                           sub.status === 'EXPIRED' ? 'Hết hạn' :
                           sub.status === 'CANCELLED' ? 'Đã hủy' :
                           sub.status === 'SUSPENDED' ? 'Tạm ngưng' : sub.status}
                        </span>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))
                )}
              </AdminTableBody>
            </AdminTable>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className='space-y-3'>
          {/* Search and Filters */}
          <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4'>
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
              <div className='flex items-center gap-3 flex-1 max-w-md'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
                  <input
                    type='text'
                    placeholder='Tìm kiếm thanh toán...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className='w-full px-4 py-2.5 pl-10 pr-4 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 transition-all duration-200'
                  />
                </div>
                <CustomSelect
                  options={paymentStatusOptions}
                  value={paymentStatusFilter}
                  onChange={value => setPaymentStatusFilter(value)}
                  placeholder='Lọc theo trạng thái'
                  className='w-full sm:w-[200px]'
                />
                <button
                  onClick={loadData}
                  className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition-all duration-200'
                >
                  <RefreshCw className='w-4 h-4' />
                  Làm mới
                </button>
              </div>
              {filteredPayments.length > 0 && (
                <ExportButton
                  data={getPaymentsExportData()}
                  columns={paymentsExportColumns}
                  filename='danh-sach-thanh-toan'
                  title='Danh sách Thanh toán'
                  variant='outline'
                  size='sm'
                />
              )}
            </div>
          </div>

          {isLoading ? (
            <TableLoading text='Đang tải danh sách thanh toán...' />
          ) : (
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell header>Thành viên</AdminTableCell>
                  <AdminTableCell header>Số tiền</AdminTableCell>
                  <AdminTableCell header>Phương thức</AdminTableCell>
                  <AdminTableCell header>Ngày thanh toán</AdminTableCell>
                  <AdminTableCell header>Trạng thái</AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {filteredPayments.length === 0 ? (
                  <AdminTableRow>
                    <AdminTableCell colSpan={5} className='text-center py-12'>
                      <CreditCard className='w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500' />
                      <p className='text-theme-sm font-heading text-gray-700 dark:text-gray-300'>
                        Không có thanh toán nào
                      </p>
                      <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-1'>
                        {searchTerm || paymentStatusFilter !== 'all' ? 'Thử tìm kiếm hoặc lọc khác' : 'Chưa có thanh toán nào trong hệ thống'}
                      </p>
                    </AdminTableCell>
                  </AdminTableRow>
                ) : (
                  filteredPayments.map((payment, index) => (
                    <AdminTableRow
                      key={payment.id}
                      className={`group relative border-l-4 border-l-transparent hover:border-l-orange-500 transition-all duration-200 cursor-pointer ${
                        index % 2 === 0
                          ? 'bg-white dark:bg-gray-900'
                          : 'bg-gray-50/50 dark:bg-gray-800/50'
                      } hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 dark:hover:from-orange-900/20 dark:hover:to-orange-800/10`}
                      onClick={(e?: React.MouseEvent) => {
                        if (e) {
                          e.stopPropagation();
                          setSelectedItemForAction(payment);
                          setActionType('payment');
                          setMenuPosition({ x: e.clientX, y: e.clientY });
                          setActionMenuOpen(true);
                        }
                      }}
                    >
                      <AdminTableCell className='overflow-hidden'>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-1.5'>
                            <Users className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200 flex-shrink-0' />
                            <div className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200'>
                              {payment.member?.full_name || 'N/A'}
                            </div>
                          </div>
                          {payment.member?.email && (
                            <div className='text-[10px] text-gray-500 dark:text-gray-400 font-inter mt-0.5 line-clamp-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200'>
                              {payment.member.email}
                            </div>
                          )}
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className='flex items-center gap-1.5'>
                          <DollarSign className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200 flex-shrink-0' />
                          <span className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className='flex items-center gap-1.5'>
                          <CreditCard className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200 flex-shrink-0' />
                          <span className='text-theme-xs font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                            {payment.payment_method}
                          </span>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className='flex items-center gap-1.5'>
                          <Calendar className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200 flex-shrink-0' />
                          <span className='text-theme-xs font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                            {formatDateVN(payment.payment_date)}
                          </span>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className={`px-2.5 py-1 inline-flex text-theme-xs font-semibold font-heading rounded-full border transition-all duration-200 group-hover:scale-105 ${getStatusColor(payment.status)}`}>
                          {payment.status === 'PAID' ? 'Đã thanh toán' :
                           payment.status === 'PENDING' ? 'Chờ xử lý' :
                           payment.status === 'FAILED' ? 'Thất bại' :
                           payment.status === 'REFUNDED' ? 'Đã hoàn tiền' : payment.status}
                        </span>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))
                )}
              </AdminTableBody>
            </AdminTable>
          )}
        </div>
      )}

      {/* Context Menu */}
      {actionMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 z-40'
            onClick={() => {
              setActionMenuOpen(false);
              setSelectedItemForAction(null);
            }}
          />
          {/* Popup */}
          <div
            className='fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl py-2 w-[180px]'
            style={{
              left: `${Math.min(menuPosition.x, window.innerWidth - 200)}px`,
              top: `${Math.min(menuPosition.y + 10, window.innerHeight - 150)}px`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className='px-3 py-2 border-b border-gray-200 dark:border-gray-800'>
              <p className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white truncate max-w-[200px]' style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {actionType === 'plan' && selectedItemForAction?.name}
                {actionType === 'subscription' && `${selectedItemForAction?.member?.full_name || 'N/A'} - ${selectedItemForAction?.plan?.name || 'N/A'}`}
                {actionType === 'payment' && `${selectedItemForAction?.member?.full_name || 'N/A'} - ${formatCurrency(selectedItemForAction?.amount || 0)}`}
              </p>
            </div>
            <div className='py-1'>
              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  if (actionType === 'subscription') {
                    setSelectedSubscription(selectedItemForAction);
                    setIsSubscriptionDetailOpen(true);
                  } else if (actionType === 'payment') {
                    setSelectedPayment(selectedItemForAction);
                    setIsPaymentDetailOpen(true);
                  } else {
                    showToast('Tính năng đang phát triển', 'info');
                  }
                }}
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150 min-h-[36px]'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                <Eye className='w-3.5 h-3.5 flex-shrink-0' />
                <span>Xem chi tiết</span>
              </button>
              {actionType === 'plan' && (
                <button
                  onClick={() => {
                    setActionMenuOpen(false);
                    setSelectedPlan(selectedItemForAction);
                    setIsPlanModalOpen(true);
                  }}
                  className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150 min-h-[36px]'
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  <Edit className='w-3.5 h-3.5 flex-shrink-0' />
                  <span>Sửa</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Plan Form Modal */}
      <PlanFormModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setSelectedPlan(null);
        }}
        onSave={async (data) => {
          try {
            if (selectedPlan) {
              await billingService.updatePlan(selectedPlan.id, data);
              showToast('Cập nhật gói tập thành công', 'success');
            } else {
              await billingService.createPlan(data as any);
              showToast('Tạo gói tập thành công', 'success');
            }
            loadData();
          } catch (error: any) {
            showToast(error.message || 'Có lỗi xảy ra', 'error');
            throw error;
          }
        }}
        plan={selectedPlan}
      />

      {/* Subscription Detail Modal */}
      <SubscriptionDetailModal
        isOpen={isSubscriptionDetailOpen}
        onClose={() => {
          setIsSubscriptionDetailOpen(false);
          setSelectedSubscription(null);
        }}
        subscription={selectedSubscription}
      />

      {/* Payment Detail Modal */}
      <PaymentDetailModal
        isOpen={isPaymentDetailOpen}
        onClose={() => {
          setIsPaymentDetailOpen(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
      />
    </div>
  );
};

export default BillingManagement;
