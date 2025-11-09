import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { billingService, MembershipPlan, Subscription, Payment, BillingStats } from '../../services/billing.service';
import { CreditCard, Plus, Search, RefreshCw, DollarSign, Users, TrendingUp, FileText } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import AdminButton from '../../components/common/AdminButton';
import AdminInput from '../../components/common/AdminInput';
import { AdminTable, AdminTableHeader, AdminTableBody, AdminTableRow, AdminTableCell } from '../../components/common/AdminTable';

const BillingManagement: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'subscriptions' | 'payments'>('overview');
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      if (activeTab === 'overview') {
        const statsResponse = await billingService.getStats();
        if (statsResponse.success) {
          setStats(statsResponse.data);
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
          const subsList = Array.isArray(subsResponse.data)
            ? subsResponse.data
            : (subsResponse.data?.subscriptions || []);
          setSubscriptions(subsList);
        }
      } else if (activeTab === 'payments') {
        const paymentsResponse = await billingService.getAllPayments();
        if (paymentsResponse.success) {
          const paymentsList = Array.isArray(paymentsResponse.data)
            ? paymentsResponse.data
            : (paymentsResponse.data?.payments || []);
          setPayments(paymentsList);
        }
      }
    } catch (error: any) {
      showToast(`Không thể tải dữ liệu ${activeTab}`, 'error');
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
        return 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300';
      case 'PENDING':
        return 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300';
      case 'EXPIRED':
      case 'FAILED':
      case 'OVERDUE':
        return 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300';
      case 'CANCELLED':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
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
            Quản lý Thanh toán
          </h1>
          <p className='text-gray-600 dark:text-gray-400 mt-1 font-inter'>
            Quản lý gói tập, đăng ký và thanh toán
          </p>
        </div>
        <AdminButton variant='primary' icon={Plus}>
          {activeTab === 'plans' ? 'Tạo gói mới' : 'Thêm mới'}
        </AdminButton>
      </div>

      {/* Tabs */}
      <div className='border-b border-gray-200 dark:border-gray-800'>
        <nav className='-mb-px flex space-x-8'>
          {[
            { id: 'overview', name: 'Tổng quan', icon: TrendingUp },
            { id: 'plans', name: 'Gói tập', icon: FileText },
            { id: 'subscriptions', name: 'Đăng ký', icon: Users },
            { id: 'payments', name: 'Thanh toán', icon: CreditCard },
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className='space-y-6'>
          {isLoading ? (
            <AdminCard>
              <div className='text-center py-12 text-gray-500 dark:text-gray-400 font-inter'>
                Đang tải...
              </div>
            </AdminCard>
          ) : stats ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
              <AdminCard>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-400 font-inter'>
                      Tổng doanh thu
                    </p>
                    <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white mt-2'>
                      {formatCurrency(stats.total_revenue || 0)}
                    </p>
                  </div>
                  <DollarSign className='w-8 h-8 text-success-500 dark:text-success-400' />
                </div>
              </AdminCard>
              <AdminCard>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-400 font-inter'>
                      Doanh thu tháng
                    </p>
                    <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white mt-2'>
                      {formatCurrency(stats.monthly_revenue || 0)}
                    </p>
                  </div>
                  <TrendingUp className='w-8 h-8 text-blue-500 dark:text-blue-400' />
                </div>
              </AdminCard>
              <AdminCard>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-400 font-inter'>
                      Đăng ký đang hoạt động
                    </p>
                    <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white mt-2'>
                      {stats.active_subscriptions || 0}
                    </p>
                  </div>
                  <Users className='w-8 h-8 text-orange-500 dark:text-orange-400' />
                </div>
              </AdminCard>
              <AdminCard>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-400 font-inter'>
                      Thanh toán chờ xử lý
                    </p>
                    <p className='text-2xl font-bold font-heading text-gray-900 dark:text-white mt-2'>
                      {stats.pending_payments || 0}
                    </p>
                  </div>
                  <CreditCard className='w-8 h-8 text-warning-500 dark:text-warning-400' />
                </div>
              </AdminCard>
            </div>
          ) : (
            <AdminCard>
              <div className='text-center py-12 text-gray-500 dark:text-gray-400 font-inter'>
                Không có dữ liệu
              </div>
            </AdminCard>
          )}
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className='space-y-4'>
          <AdminCard>
            <div className='flex gap-4'>
              <AdminInput
                icon={Search}
                iconPosition='left'
                placeholder='Tìm kiếm gói tập...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='flex-1'
              />
              <AdminButton
                variant='secondary'
                icon={RefreshCw}
                onClick={loadData}
              >
                Làm mới
              </AdminButton>
            </div>
          </AdminCard>

          {isLoading ? (
            <AdminCard>
              <div className='text-center py-12 text-gray-500 dark:text-gray-400 font-inter'>
                Đang tải...
              </div>
            </AdminCard>
          ) : (
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell header>Tên gói</AdminTableCell>
                  <AdminTableCell header>Giá</AdminTableCell>
                  <AdminTableCell header>Thời hạn</AdminTableCell>
                  <AdminTableCell header>Trạng thái</AdminTableCell>
                  <AdminTableCell header className='text-right'>Thao tác</AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {plans.filter(plan => plan.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                  <AdminTableRow>
                    <AdminTableCell colSpan={5} className='text-center py-12 text-gray-500 dark:text-gray-400'>
                      Không có gói tập nào
                    </AdminTableCell>
                  </AdminTableRow>
                ) : (
                  plans
                    .filter(plan => plan.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(plan => (
                      <AdminTableRow key={plan.id}>
                        <AdminTableCell>
                          <div className='text-sm font-medium text-gray-900 dark:text-white font-inter'>
                            {plan.name}
                          </div>
                          {plan.description && (
                            <div className='text-sm text-gray-500 dark:text-gray-400 font-inter'>
                              {plan.description}
                            </div>
                          )}
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className='text-sm text-gray-900 dark:text-white font-inter'>
                            {formatCurrency(plan.price)}
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className='text-sm text-gray-500 dark:text-gray-400 font-inter'>
                            {plan.duration_days} ngày
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full font-inter ${
                              plan.is_active
                                ? 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                            }`}
                          >
                            {plan.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                          </span>
                        </AdminTableCell>
                        <AdminTableCell className='text-right'>
                          <AdminButton
                            variant='outline'
                            size='sm'
                            className='text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300'
                          >
                            Chỉnh sửa
                          </AdminButton>
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
        <div className='space-y-4'>
          <AdminCard>
            <div className='flex gap-4'>
              <AdminInput
                icon={Search}
                iconPosition='left'
                placeholder='Tìm kiếm đăng ký...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='flex-1'
              />
              <AdminButton
                variant='secondary'
                icon={RefreshCw}
                onClick={loadData}
              >
                Làm mới
              </AdminButton>
            </div>
          </AdminCard>

          {isLoading ? (
            <AdminCard>
              <div className='text-center py-12 text-gray-500 dark:text-gray-400 font-inter'>
                Đang tải...
              </div>
            </AdminCard>
          ) : (
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell header>Thành viên</AdminTableCell>
                  <AdminTableCell header>Gói tập</AdminTableCell>
                  <AdminTableCell header>Ngày bắt đầu</AdminTableCell>
                  <AdminTableCell header>Ngày kết thúc</AdminTableCell>
                  <AdminTableCell header>Trạng thái</AdminTableCell>
                  <AdminTableCell header className='text-right'>Thao tác</AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {subscriptions.filter(sub =>
                  sub.member?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  sub.plan?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                ).length === 0 ? (
                  <AdminTableRow>
                    <AdminTableCell colSpan={6} className='text-center py-12 text-gray-500 dark:text-gray-400'>
                      Không có đăng ký nào
                    </AdminTableCell>
                  </AdminTableRow>
                ) : (
                  subscriptions
                    .filter(sub =>
                      sub.member?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      sub.plan?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(sub => (
                      <AdminTableRow key={sub.id}>
                        <AdminTableCell>
                          <div className='text-sm font-medium text-gray-900 dark:text-white font-inter'>
                            {sub.member?.full_name || 'N/A'}
                          </div>
                          <div className='text-sm text-gray-500 dark:text-gray-400 font-inter'>
                            {sub.member?.email || ''}
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className='text-sm text-gray-900 dark:text-white font-inter'>
                            {sub.plan?.name || 'N/A'}
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className='text-sm text-gray-500 dark:text-gray-400 font-inter'>
                            {new Date(sub.start_date).toLocaleDateString('vi-VN')}
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className='text-sm text-gray-500 dark:text-gray-400 font-inter'>
                            {new Date(sub.end_date).toLocaleDateString('vi-VN')}
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full font-inter ${getStatusColor(sub.status)}`}>
                            {sub.status}
                          </span>
                        </AdminTableCell>
                        <AdminTableCell className='text-right'>
                          <AdminButton
                            variant='outline'
                            size='sm'
                            className='text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300'
                          >
                            Xem chi tiết
                          </AdminButton>
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
        <div className='space-y-4'>
          <AdminCard>
            <div className='flex gap-4'>
              <AdminInput
                icon={Search}
                iconPosition='left'
                placeholder='Tìm kiếm thanh toán...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='flex-1'
              />
              <AdminButton
                variant='secondary'
                icon={RefreshCw}
                onClick={loadData}
              >
                Làm mới
              </AdminButton>
            </div>
          </AdminCard>

          {isLoading ? (
            <AdminCard>
              <div className='text-center py-12 text-gray-500 dark:text-gray-400 font-inter'>
                Đang tải...
              </div>
            </AdminCard>
          ) : (
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell header>Thành viên</AdminTableCell>
                  <AdminTableCell header>Số tiền</AdminTableCell>
                  <AdminTableCell header>Phương thức</AdminTableCell>
                  <AdminTableCell header>Ngày thanh toán</AdminTableCell>
                  <AdminTableCell header>Trạng thái</AdminTableCell>
                  <AdminTableCell header className='text-right'>Thao tác</AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {payments.filter(payment =>
                  payment.member?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase())
                ).length === 0 ? (
                  <AdminTableRow>
                    <AdminTableCell colSpan={6} className='text-center py-12 text-gray-500 dark:text-gray-400'>
                      Không có thanh toán nào
                    </AdminTableCell>
                  </AdminTableRow>
                ) : (
                  payments
                    .filter(payment =>
                      payment.member?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(payment => (
                      <AdminTableRow key={payment.id}>
                        <AdminTableCell>
                          <div className='text-sm font-medium text-gray-900 dark:text-white font-inter'>
                            {payment.member?.full_name || 'N/A'}
                          </div>
                          <div className='text-sm text-gray-500 dark:text-gray-400 font-inter'>
                            {payment.member?.email || ''}
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className='text-sm font-medium text-gray-900 dark:text-white font-inter'>
                            {formatCurrency(payment.amount)}
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className='text-sm text-gray-500 dark:text-gray-400 font-inter'>
                            {payment.payment_method}
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className='text-sm text-gray-500 dark:text-gray-400 font-inter'>
                            {new Date(payment.payment_date).toLocaleDateString('vi-VN')}
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full font-inter ${getStatusColor(payment.status)}`}>
                            {payment.status}
                          </span>
                        </AdminTableCell>
                        <AdminTableCell className='text-right'>
                          <AdminButton
                            variant='outline'
                            size='sm'
                            className='text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300'
                          >
                            Xem chi tiết
                          </AdminButton>
                        </AdminTableCell>
                      </AdminTableRow>
                    ))
                )}
              </AdminTableBody>
            </AdminTable>
          )}
        </div>
      )}
    </div>
  );
};

export default BillingManagement;
