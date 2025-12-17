import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import {
  Edit,
  History,
  Plus,
  RefreshCw,
  Trash2,
  Tag,
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  Info,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminButton from '../../components/common/AdminButton';
import AdminCard from '../../components/common/AdminCard';
import AdminInput from '../../components/common/AdminInput';
import AdminModal from '../../components/common/AdminModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CustomSelect from '../../components/common/CustomSelect';
import Pagination from '../../components/common/Pagination';
import { EnumBadge, Badge } from '../../shared/components/ui';
import { TableLoading } from '../../components/ui/AppLoading';
import { useToast } from '../../context/ToastContext';
import useTranslation from '../../hooks/useTranslation';
import couponService, {
  CreateDiscountCodeRequest,
  DiscountCode,
  DiscountUsage,
  UpdateDiscountCodeRequest,
  DiscountType,
} from '../../services/coupon.service';
import { formatVietnamDateTime } from '../../utils/dateTime';
import {
  AdminTable,
  AdminTableHeader,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
} from '../../components/common/AdminTable';

const CouponManagement: React.FC = () => {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [coupons, setCoupons] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    is_active: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<DiscountCode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isUsageHistoryModalOpen, setIsUsageHistoryModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<DiscountCode | null>(null);
  const [usageHistory, setUsageHistory] = useState<DiscountUsage[]>([]);
  const [isLoadingUsageHistory, setIsLoadingUsageHistory] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<DiscountCode | null>(null);
  const [formData, setFormData] = useState<CreateDiscountCodeRequest>({
    code: '',
    name: '',
    description: '',
    type: 'PERCENTAGE',
    value: 0,
    max_discount: null,
    usage_limit: null,
    usage_limit_per_member: null,
    valid_from: new Date().toISOString().split('T')[0] + 'T00:00:00',
    valid_until: null,
    is_active: true,
    applicable_plans: [],
    minimum_amount: null,
    first_time_only: false,
    referrer_member_id: null,
    bonus_days: null,
    referral_reward: null,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const validFromPickerRef = useRef<HTMLInputElement>(null);
  const validUntilPickerRef = useRef<HTMLInputElement>(null);
  const validFromFlatpickrRef = useRef<any>(null);
  const validUntilFlatpickrRef = useRef<any>(null);

  // Load coupons
  const loadCoupons = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await couponService.getDiscountCodes({
        search: filters.search || undefined,
        is_active: filters.is_active !== 'all' ? filters.is_active === 'true' : undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      });

      if (response.success) {
        const couponsList = Array.isArray(response.data) ? response.data : [];
        setCoupons(couponsList);
        if (response.pagination) {
          setTotalItems(response.pagination.total);
          setTotalPages(Math.ceil(response.pagination.total / itemsPerPage));
        }
      }
    } catch (error: any) {
      showToast({
        message: error.message || 'Lỗi khi tải danh sách mã giảm giá',
        type: 'error',
      });
      console.error('Error loading coupons:', error);
      setCoupons([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, itemsPerPage, showToast]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  // Initialize flatpickr for date pickers
  useEffect(() => {
    if (!isFormModalOpen) {
      if (validFromFlatpickrRef.current) {
        validFromFlatpickrRef.current.destroy();
        validFromFlatpickrRef.current = null;
      }
      if (validUntilFlatpickrRef.current) {
        validUntilFlatpickrRef.current.destroy();
        validUntilFlatpickrRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (validFromPickerRef.current && !validFromFlatpickrRef.current) {
        const fp = flatpickr(validFromPickerRef.current, {
          dateFormat: 'd/m/Y H:i',
          altFormat: 'd/m/Y H:i',
          altInput: false,
          allowInput: true,
          clickOpens: true,
          static: false,
          inline: false,
          appendTo: document.body,
          enableTime: true,
          time_24hr: true,
          locale: {
            firstDayOfWeek: 1,
            weekdays: {
              shorthand: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
              longhand: [
                'Chủ nhật',
                'Thứ hai',
                'Thứ ba',
                'Thứ tư',
                'Thứ năm',
                'Thứ sáu',
                'Thứ bảy',
              ],
            },
            months: {
              shorthand: [
                'T1',
                'T2',
                'T3',
                'T4',
                'T5',
                'T6',
                'T7',
                'T8',
                'T9',
                'T10',
                'T11',
                'T12',
              ],
              longhand: [
                'Tháng 1',
                'Tháng 2',
                'Tháng 3',
                'Tháng 4',
                'Tháng 5',
                'Tháng 6',
                'Tháng 7',
                'Tháng 8',
                'Tháng 9',
                'Tháng 10',
                'Tháng 11',
                'Tháng 12',
              ],
            },
          },
          onChange: selectedDates => {
            if (selectedDates.length > 0) {
              const date = selectedDates[0];
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              const selectedDateISO = `${year}-${month}-${day}T${hours}:${minutes}:00`;
              setFormData(prev => ({ ...prev, valid_from: selectedDateISO }));
            }
          },
        });
        validFromFlatpickrRef.current = Array.isArray(fp) ? fp[0] : fp;
      }

      if (validUntilPickerRef.current && !validUntilFlatpickrRef.current) {
        const fp = flatpickr(validUntilPickerRef.current, {
          dateFormat: 'd/m/Y H:i',
          altFormat: 'd/m/Y H:i',
          altInput: false,
          allowInput: true,
          clickOpens: true,
          static: false,
          inline: false,
          appendTo: document.body,
          enableTime: true,
          time_24hr: true,
          locale: {
            firstDayOfWeek: 1,
            weekdays: {
              shorthand: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
              longhand: [
                'Chủ nhật',
                'Thứ hai',
                'Thứ ba',
                'Thứ tư',
                'Thứ năm',
                'Thứ sáu',
                'Thứ bảy',
              ],
            },
            months: {
              shorthand: [
                'T1',
                'T2',
                'T3',
                'T4',
                'T5',
                'T6',
                'T7',
                'T8',
                'T9',
                'T10',
                'T11',
                'T12',
              ],
              longhand: [
                'Tháng 1',
                'Tháng 2',
                'Tháng 3',
                'Tháng 4',
                'Tháng 5',
                'Tháng 6',
                'Tháng 7',
                'Tháng 8',
                'Tháng 9',
                'Tháng 10',
                'Tháng 11',
                'Tháng 12',
              ],
            },
          },
          onChange: selectedDates => {
            if (selectedDates.length > 0) {
              const date = selectedDates[0];
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              const selectedDateISO = `${year}-${month}-${day}T${hours}:${minutes}:00`;
              setFormData(prev => ({ ...prev, valid_until: selectedDateISO }));
            } else {
              setFormData(prev => ({ ...prev, valid_until: null }));
            }
          },
        });
        validUntilFlatpickrRef.current = Array.isArray(fp) ? fp[0] : fp;
      }

      if (formData.valid_from && validFromFlatpickrRef.current) {
        const [datePart, timePart] = formData.valid_from.split('T');
        const [year, month, day] = datePart.split('-');
        const [hours, minutes] = timePart ? timePart.split(':') : ['00', '00'];
        const displayDate = `${day}/${month}/${year} ${hours}:${minutes}`;
        validFromFlatpickrRef.current.setDate(displayDate, false);
      }
      if (formData.valid_until && validUntilFlatpickrRef.current) {
        const [datePart, timePart] = formData.valid_until.split('T');
        const [year, month, day] = datePart.split('-');
        const [hours, minutes] = timePart ? timePart.split(':') : ['00', '00'];
        const displayDate = `${day}/${month}/${year} ${hours}:${minutes}`;
        validUntilFlatpickrRef.current.setDate(displayDate, false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [isFormModalOpen, formData.valid_from, formData.valid_until]);

  const handleCreate = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'PERCENTAGE',
      value: 0,
      max_discount: null,
      usage_limit: null,
      usage_limit_per_member: null,
      valid_from: new Date().toISOString().split('T')[0] + 'T00:00:00',
      valid_until: null,
      is_active: true,
      applicable_plans: [],
      minimum_amount: null,
      first_time_only: false,
      referrer_member_id: null,
      bonus_days: null,
      referral_reward: null,
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const handleEdit = (coupon: DiscountCode) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      type: coupon.type,
      value: Number(coupon.value),
      max_discount: coupon.max_discount ? Number(coupon.max_discount) : null,
      usage_limit: coupon.usage_limit || null,
      usage_limit_per_member: coupon.usage_limit_per_member || null,
      valid_from: new Date(coupon.valid_from).toISOString(),
      valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString() : null,
      is_active: coupon.is_active,
      applicable_plans: coupon.applicable_plans || [],
      minimum_amount: coupon.minimum_amount ? Number(coupon.minimum_amount) : null,
      first_time_only: coupon.first_time_only,
      referrer_member_id: coupon.referrer_member_id || null,
      bonus_days: coupon.bonus_days || null,
      referral_reward: coupon.referral_reward ? Number(coupon.referral_reward) : null,
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const handleDelete = (coupon: DiscountCode) => {
    setCouponToDelete(coupon);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!couponToDelete) return;

    try {
      setIsDeleting(true);
      await couponService.deleteDiscountCode(couponToDelete.id);
      showToast({
        message: `Đã xóa mã giảm giá ${couponToDelete.code}`,
        type: 'success',
      });
      loadCoupons();
    } catch (error: any) {
      console.error('Error deleting coupon:', error);
      showToast({
        message: error.message || 'Lỗi khi xóa mã giảm giá',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setCouponToDelete(null);
    }
  };

  const handleViewUsageHistory = async (coupon: DiscountCode) => {
    setSelectedCoupon(coupon);
    setIsUsageHistoryModalOpen(true);
    setIsLoadingUsageHistory(true);

    try {
      const response = await couponService.getUsageHistory(coupon.id, { limit: 100 });
      if (response.success) {
        setUsageHistory(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error: any) {
      console.error('Error loading usage history:', error);
      showToast({
        message: error.message || 'Lỗi khi tải lịch sử sử dụng',
        type: 'error',
      });
      setUsageHistory([]);
    } finally {
      setIsLoadingUsageHistory(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.code.trim()) {
      errors.code = 'Mã giảm giá là bắt buộc';
    }

    if (!formData.name.trim()) {
      errors.name = 'Tên mã giảm giá là bắt buộc';
    }

    if (formData.value <= 0) {
      errors.value = 'Giá trị giảm giá phải lớn hơn 0';
    }

    if (formData.type === 'PERCENTAGE' && (formData.value < 0 || formData.value > 100)) {
      errors.value = 'Phần trăm giảm giá phải từ 0 đến 100';
    }

    if (formData.valid_until && new Date(formData.valid_from) >= new Date(formData.valid_until)) {
      errors.valid_until = 'Ngày kết thúc phải sau ngày bắt đầu';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (editingCoupon) {
        await couponService.updateDiscountCode(editingCoupon.id, formData);
        showToast({
          message: `Đã cập nhật mã giảm giá ${formData.code}`,
          type: 'success',
        });
      } else {
        await couponService.createDiscountCode(formData);
        showToast({
          message: `Đã tạo mã giảm giá ${formData.code}`,
          type: 'success',
        });
      }
      setIsFormModalOpen(false);
      loadCoupons();
    } catch (error: any) {
      console.error('Error saving coupon:', error);
      showToast({
        message: error.message || 'Lỗi khi lưu mã giảm giá',
        type: 'error',
      });
    }
  };

  const getDiscountTypeLabel = (type: DiscountType): string => {
    const labels: Record<DiscountType, string> = {
      PERCENTAGE: 'Phần trăm',
      FIXED_AMOUNT: 'Số tiền cố định',
      FREE_TRIAL: 'Dùng thử miễn phí',
      FIRST_MONTH_FREE: 'Tháng đầu miễn phí',
    };
    return labels[type] || type;
  };

  const formatDiscountValue = (coupon: DiscountCode): string => {
    if (coupon.type === 'PERCENTAGE') {
      return `${coupon.value}%${
        coupon.max_discount
          ? ` (tối đa ${Number(coupon.max_discount).toLocaleString('vi-VN')}đ)`
          : ''
      }`;
    } else if (coupon.type === 'FIXED_AMOUNT') {
      return `${Number(coupon.value).toLocaleString('vi-VN')}đ`;
    } else {
      return getDiscountTypeLabel(coupon.type);
    }
  };

  const getStatusBadge = (coupon: DiscountCode) => {
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

    if (!coupon.is_active) {
      return (
        <Badge variant='error' size='sm'>
          Đã vô hiệu hóa
        </Badge>
      );
    }

    if (now < validFrom) {
      return (
        <Badge variant='warning' size='sm'>
          Chưa có hiệu lực
        </Badge>
      );
    }

    if (validUntil && now > validUntil) {
      return (
        <Badge variant='error' size='sm'>
          Đã hết hạn
        </Badge>
      );
    }

    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return (
        <Badge variant='error' size='sm'>
          Đã hết lượt
        </Badge>
      );
    }

    return (
      <Badge variant='success' size='sm'>
        Đang hoạt động
      </Badge>
    );
  };

  // Calculate stats
  const couponStats = useMemo(() => {
    const now = new Date();
    const active = coupons.filter(c => {
      if (!c.is_active) return false;
      const validFrom = new Date(c.valid_from);
      const validUntil = c.valid_until ? new Date(c.valid_until) : null;
      const isExpired = validUntil && now > validUntil;
      const isNotStarted = now < validFrom;
      const isExhausted = c.usage_limit && c.usage_count >= c.usage_limit;
      return !isExpired && !isNotStarted && !isExhausted;
    }).length;

    const totalUsage = coupons.reduce((sum, c) => sum + c.usage_count, 0);
    const totalDiscountAmount = coupons.reduce((sum, c) => {
      // Estimate: average discount per usage
      const avgDiscount =
        c.type === 'PERCENTAGE'
          ? (Number(c.value) / 100) * (c.max_discount ? Number(c.max_discount) : 100000)
          : Number(c.value);
      return sum + c.usage_count * avgDiscount;
    }, 0);

    return {
      total: coupons.length,
      active,
      totalUsage,
      totalDiscountAmount,
    };
  }, [coupons]);

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-start'>
        <div>
          <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
            Quản lý Mã giảm giá
          </h1>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
            Tạo và quản lý các mã giảm giá, khuyến mãi cho hệ thống
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <AdminButton onClick={loadCoupons} variant='outline' icon={RefreshCw} size='sm'>
            Làm mới
          </AdminButton>
          <AdminButton onClick={handleCreate} icon={Plus} size='sm'>
            Tạo mã giảm giá
          </AdminButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <Tag className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {couponStats.total}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Tổng số mã
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-green-100 dark:bg-green-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-green-100 dark:bg-green-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-green-500/20'>
                <div className='absolute inset-0 bg-green-100 dark:bg-green-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <TrendingUp className='relative w-[18px] h-[18px] text-green-600 dark:text-green-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {couponStats.active}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Đang hoạt động
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-blue-100 dark:bg-blue-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-blue-100 dark:bg-blue-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-blue-500/20'>
                <div className='absolute inset-0 bg-blue-100 dark:bg-blue-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <Users className='relative w-[18px] h-[18px] text-blue-600 dark:text-blue-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {couponStats.totalUsage}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Tổng lượt sử dụng
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-purple-100 dark:bg-purple-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-purple-100 dark:bg-purple-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-purple-500/20'>
                <div className='absolute inset-0 bg-purple-100 dark:bg-purple-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <DollarSign className='relative w-[18px] h-[18px] text-purple-600 dark:text-purple-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {Math.round(couponStats.totalDiscountAmount / 1000)}k
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Tổng tiền giảm (ước tính)
                </div>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Filters */}
      <AdminCard>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='md:col-span-2'>
            <AdminInput
              label='Tìm kiếm'
              placeholder='Tìm theo mã, tên, mô tả...'
              value={filters.search}
              onChange={e => {
                setFilters(prev => ({ ...prev, search: e.target.value }));
                setCurrentPage(1);
              }}
            />
          </div>
          <CustomSelect
            label='Trạng thái'
            value={filters.is_active}
            onChange={value => {
              setFilters(prev => ({ ...prev, is_active: value }));
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'true', label: 'Đang hoạt động' },
              { value: 'false', label: 'Đã vô hiệu hóa' },
            ]}
          />
        </div>
      </AdminCard>

      {/* Coupons Table */}
      <AdminCard>
        {isLoading ? (
          <TableLoading />
        ) : coupons.length === 0 ? (
          <div className='text-center py-12 text-gray-500 dark:text-gray-400'>
            Không có mã giảm giá nào
          </div>
        ) : (
          <>
            <div className='overflow-x-auto'>
              <AdminTable>
                <AdminTableHeader>
                  <AdminTableRow>
                    <AdminTableCell header className='w-[120px] text-left'>
                      Mã
                    </AdminTableCell>
                    <AdminTableCell header className='w-[250px] text-left'>
                      Tên & Mô tả
                    </AdminTableCell>
                    <AdminTableCell header className='w-[130px] text-center'>
                      Loại
                    </AdminTableCell>
                    <AdminTableCell header className='w-[150px] text-left'>
                      Giá trị
                    </AdminTableCell>
                    <AdminTableCell header className='w-[120px] text-center'>
                      Sử dụng
                    </AdminTableCell>
                    <AdminTableCell header className='w-[200px] text-left'>
                      Thời hạn
                    </AdminTableCell>
                    <AdminTableCell header className='w-[140px] text-center'>
                      Trạng thái
                    </AdminTableCell>
                    <AdminTableCell header className='w-[220px] text-center'>
                      Thao tác
                    </AdminTableCell>
                  </AdminTableRow>
                </AdminTableHeader>
                <AdminTableBody>
                  {coupons.map(coupon => (
                    <AdminTableRow key={coupon.id}>
                      <AdminTableCell className='align-middle'>
                        <div className='flex items-center gap-2'>
                          <Tag className='w-4 h-4 text-orange-500 flex-shrink-0' />
                          <span className='font-mono font-semibold text-gray-900 dark:text-white break-all'>
                            {coupon.code}
                          </span>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell className='align-top'>
                        <div className='py-1'>
                          <div className='font-medium text-gray-900 dark:text-white mb-1 break-words'>
                            {coupon.name}
                          </div>
                          {coupon.description && (
                            <div className='text-sm text-gray-500 dark:text-gray-400 line-clamp-2'>
                              {coupon.description}
                            </div>
                          )}
                          {coupon.applicable_plans && coupon.applicable_plans.length > 0 && (
                            <div className='mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400'>
                              <Info className='w-3 h-3' />
                              <span>Áp dụng cho {coupon.applicable_plans.length} gói</span>
                            </div>
                          )}
                          {coupon.first_time_only && (
                            <div className='mt-1'>
                              <Badge variant='warning' size='sm'>
                                Chỉ khách hàng mới
                              </Badge>
                            </div>
                          )}
                        </div>
                      </AdminTableCell>
                      <AdminTableCell className='align-middle text-center'>
                        <div className='flex justify-center'>
                          <Badge
                            variant={
                              coupon.type === 'PERCENTAGE'
                                ? 'info'
                                : coupon.type === 'FIXED_AMOUNT'
                                ? 'warning'
                                : coupon.type === 'FREE_TRIAL'
                                ? 'success'
                                : 'default'
                            }
                            size='sm'
                          >
                            {getDiscountTypeLabel(coupon.type)}
                          </Badge>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell className='align-middle'>
                        <div className='font-semibold text-orange-600 dark:text-orange-400'>
                          {formatDiscountValue(coupon)}
                        </div>
                        {coupon.minimum_amount && (
                          <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                            Tối thiểu: {Number(coupon.minimum_amount).toLocaleString('vi-VN')}đ
                          </div>
                        )}
                      </AdminTableCell>
                      <AdminTableCell className='align-middle text-center'>
                        <div className='flex flex-col items-center gap-1.5'>
                          <div className='text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap'>
                            {coupon.usage_count}
                            {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ' / ∞'}
                          </div>
                          {coupon.usage_limit && (
                            <div className='w-full max-w-[80px] h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                              <div
                                className='h-full bg-orange-500 transition-all'
                                style={{
                                  width: `${Math.min(
                                    (coupon.usage_count / coupon.usage_limit) * 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          )}
                          {coupon.usage_limit_per_member && (
                            <div className='text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap'>
                              {coupon.usage_limit_per_member} lần/người
                            </div>
                          )}
                        </div>
                      </AdminTableCell>
                      <AdminTableCell className='align-middle'>
                        <div className='space-y-1'>
                          <div className='flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400'>
                            <Calendar className='w-3 h-3 flex-shrink-0' />
                            <span className='whitespace-nowrap'>
                              {formatVietnamDateTime(coupon.valid_from, 'date')}
                            </span>
                          </div>
                          {coupon.valid_until && (
                            <div className='text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap'>
                              → {formatVietnamDateTime(coupon.valid_until, 'date')}
                            </div>
                          )}
                        </div>
                      </AdminTableCell>
                      <AdminTableCell className='align-middle text-center'>
                        {getStatusBadge(coupon)}
                      </AdminTableCell>
                      <AdminTableCell className='align-middle text-center'>
                        <div className='flex flex-wrap justify-center gap-2'>
                          <AdminButton
                            variant='outline'
                            size='sm'
                            icon={History}
                            onClick={() => handleViewUsageHistory(coupon)}
                            title='Xem lịch sử sử dụng'
                          >
                            Lịch sử
                          </AdminButton>
                          <AdminButton
                            variant='outline'
                            size='sm'
                            icon={Edit}
                            onClick={() => handleEdit(coupon)}
                            title='Chỉnh sửa'
                          >
                            Sửa
                          </AdminButton>
                          <AdminButton
                            variant='outline'
                            size='sm'
                            icon={Trash2}
                            onClick={() => handleDelete(coupon)}
                            className='text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                            title='Xóa'
                          >
                            Xóa
                          </AdminButton>
                        </div>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </AdminCard>

      {/* Create/Edit Modal */}
      <AdminModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCoupon ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}
        size='large'
      >
        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <AdminInput
              label='Mã giảm giá *'
              value={formData.code}
              onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              error={formErrors.code}
              placeholder='VD: WELCOME20'
            />
            <AdminInput
              label='Tên mã giảm giá *'
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              error={formErrors.name}
            />
          </div>

          <AdminInput
            label='Mô tả'
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            type='textarea'
            rows={3}
          />

          <div className='grid grid-cols-2 gap-4'>
            <CustomSelect
              label='Loại giảm giá *'
              value={formData.type}
              onChange={value => setFormData(prev => ({ ...prev, type: value as DiscountType }))}
              options={[
                { value: 'PERCENTAGE', label: 'Phần trăm' },
                { value: 'FIXED_AMOUNT', label: 'Số tiền cố định' },
                { value: 'FREE_TRIAL', label: 'Dùng thử miễn phí' },
                { value: 'FIRST_MONTH_FREE', label: 'Tháng đầu miễn phí' },
              ]}
            />
            <AdminInput
              label='Giá trị *'
              type='number'
              value={formData.value}
              onChange={e =>
                setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))
              }
              error={formErrors.value}
              placeholder={formData.type === 'PERCENTAGE' ? '0-100' : 'Số tiền'}
            />
          </div>

          {formData.type === 'PERCENTAGE' && (
            <AdminInput
              label='Giảm tối đa (VND)'
              type='number'
              value={formData.max_discount || ''}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  max_discount: e.target.value ? parseFloat(e.target.value) : null,
                }))
              }
              placeholder='Không giới hạn nếu để trống'
            />
          )}

          <div className='grid grid-cols-2 gap-4'>
            <AdminInput
              label='Giới hạn sử dụng'
              type='number'
              value={formData.usage_limit || ''}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  usage_limit: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
              placeholder='Không giới hạn nếu để trống'
            />
            <AdminInput
              label='Giới hạn mỗi người'
              type='number'
              value={formData.usage_limit_per_member || ''}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  usage_limit_per_member: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
              placeholder='Không giới hạn nếu để trống'
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Ngày bắt đầu *
              </label>
              <input
                ref={validFromPickerRef}
                type='text'
                className='w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white'
                placeholder='dd/mm/yyyy HH:mm'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Ngày kết thúc
              </label>
              <input
                ref={validUntilPickerRef}
                type='text'
                className='w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white'
                placeholder='dd/mm/yyyy HH:mm (tùy chọn)'
              />
              {formErrors.valid_until && (
                <p className='text-red-500 text-sm mt-1'>{formErrors.valid_until}</p>
              )}
            </div>
          </div>

          <AdminInput
            label='Số tiền tối thiểu (VND)'
            type='number'
            value={formData.minimum_amount || ''}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                minimum_amount: e.target.value ? parseFloat(e.target.value) : null,
              }))
            }
            placeholder='Không yêu cầu nếu để trống'
          />

          <div className='flex items-center gap-4'>
            <label className='flex items-center gap-2'>
              <input
                type='checkbox'
                checked={formData.is_active}
                onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className='rounded'
              />
              <span className='text-sm text-gray-700 dark:text-gray-300'>Đang hoạt động</span>
            </label>
            <label className='flex items-center gap-2'>
              <input
                type='checkbox'
                checked={formData.first_time_only}
                onChange={e =>
                  setFormData(prev => ({ ...prev, first_time_only: e.target.checked }))
                }
                className='rounded'
              />
              <span className='text-sm text-gray-700 dark:text-gray-300'>
                Chỉ cho khách hàng mới
              </span>
            </label>
          </div>

          <div className='flex justify-end gap-2 pt-4'>
            <AdminButton variant='outline' onClick={() => setIsFormModalOpen(false)}>
              Hủy
            </AdminButton>
            <AdminButton onClick={handleSave}>Lưu</AdminButton>
          </div>
        </div>
      </AdminModal>

      {/* Usage History Modal */}
      <AdminModal
        isOpen={isUsageHistoryModalOpen}
        onClose={() => setIsUsageHistoryModalOpen(false)}
        title={`Lịch sử sử dụng - ${selectedCoupon?.code}`}
        size='large'
      >
        {isLoadingUsageHistory ? (
          <TableLoading />
        ) : usageHistory.length === 0 ? (
          <div className='text-center py-12 text-gray-500 dark:text-gray-400'>
            Chưa có lịch sử sử dụng
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell>Thời gian</AdminTableCell>
                  <AdminTableCell>Member ID</AdminTableCell>
                  <AdminTableCell>Số tiền giảm</AdminTableCell>
                  <AdminTableCell>Subscription ID</AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {usageHistory.map(usage => (
                  <AdminTableRow key={usage.id}>
                    <AdminTableCell>{formatVietnamDateTime(usage.used_at)}</AdminTableCell>
                    <AdminTableCell>
                      <span className='font-mono text-sm'>{usage.member_id}</span>
                    </AdminTableCell>
                    <AdminTableCell>
                      {Number(usage.amount_discounted).toLocaleString('vi-VN')}đ
                    </AdminTableCell>
                    <AdminTableCell>
                      {usage.subscription_id ? (
                        <span className='font-mono text-sm'>{usage.subscription_id}</span>
                      ) : (
                        <span className='text-gray-400'>-</span>
                      )}
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          </div>
        )}
      </AdminModal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title='Xác nhận xóa'
        message={`Bạn có chắc chắn muốn xóa mã giảm giá "${couponToDelete?.code}"?`}
        confirmText='Xóa'
        cancelText='Hủy'
        isLoading={isDeleting}
        variant='danger'
      />
    </div>
  );
};

export default CouponManagement;







