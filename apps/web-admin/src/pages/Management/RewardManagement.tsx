import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import {
  Calendar,
  DollarSign,
  Edit,
  Gift,
  Package,
  Plus,
  RefreshCw,
  Star,
  Tag,
  Trash2,
  Trophy,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminButton from '../../components/common/AdminButton';
import AdminCard from '../../components/common/AdminCard';
import AdminInput from '../../components/common/AdminInput';
import AdminModal from '../../components/common/AdminModal';
import AdvancedFilters from '../../components/common/AdvancedFilters';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CustomSelect from '../../components/common/CustomSelect';
import ExportButton from '../../components/common/ExportButton';
import Pagination from '../../components/common/Pagination';
import { EnumBadge } from '../../shared/components/ui';
import { TableLoading } from '../../components/ui/AppLoading';
import { useToast } from '../../context/ToastContext';
import useTranslation from '../../hooks/useTranslation';
import rewardService, {
  CreateRewardRequest,
  Reward,
  UpdateRewardRequest,
} from '../../services/reward.service';
import { formatVietnamDateTime } from '../../utils/dateTime';

const RewardManagement: React.FC = () => {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    min_points: '',
    max_points: '',
    is_active: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rewardToDelete, setRewardToDelete] = useState<Reward | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState<CreateRewardRequest>({
    title: '',
    description: '',
    category: 'DISCOUNT',
    points_cost: 100,
    image_url: '',
    discount_percent: undefined,
    discount_amount: undefined,
    reward_type: 'PERCENTAGE_DISCOUNT',
    stock_quantity: undefined,
    redemption_limit: undefined,
    valid_from: new Date().toISOString().split('T')[0] + 'T00:00:00',
    valid_until: undefined,
    terms_conditions: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const validFromPickerRef = useRef<HTMLInputElement>(null);
  const validUntilPickerRef = useRef<HTMLInputElement>(null);
  const validFromFlatpickrRef = useRef<any>(null);
  const validUntilFlatpickrRef = useRef<any>(null);

  // Load stats only once on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const statsResponse = await rewardService.getRewardStats();
        if (statsResponse.success) {
          setStats(statsResponse.data);
        }
      } catch (error: any) {
        console.error('Error loading stats:', error);
      }
    };
    loadStats();
  }, []);

  // Load rewards only once on mount
  const loadRewards = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await rewardService.getRewards({});

      if (response.success) {
        const rewardsList = Array.isArray(response.data) ? response.data : [];
        setRewards(rewardsList);
      }
    } catch (error: any) {
      showToast({ message: t('rewardManagement.messages.loadError'), type: 'error' });
      console.error('Error loading rewards:', error);
      setRewards([]);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  // Initialize flatpickr for date pickers
  useEffect(() => {
    if (!isFormModalOpen) {
      // Clean up when modal is closed
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
      // Initialize valid_from picker
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

      // Initialize valid_until picker
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
              setFormData(prev => ({ ...prev, valid_until: undefined }));
            }
          },
        });
        validUntilFlatpickrRef.current = Array.isArray(fp) ? fp[0] : fp;
      }

      // Set initial values
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

  // Client-side filtering - no API call needed
  const filteredRewards = useMemo(() => {
    let filtered = [...rewards];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        reward =>
          reward.title.toLowerCase().includes(searchLower) ||
          reward.description.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(reward => reward.category === filters.category);
    }

    // Points range filter
    if (filters.min_points) {
      const minPoints = parseInt(filters.min_points);
      if (!isNaN(minPoints)) {
        filtered = filtered.filter(reward => reward.points_cost >= minPoints);
      }
    }
    if (filters.max_points) {
      const maxPoints = parseInt(filters.max_points);
      if (!isNaN(maxPoints)) {
        filtered = filtered.filter(reward => reward.points_cost <= maxPoints);
      }
    }

    // Active status filter
    if (filters.is_active !== 'all') {
      const isActive = filters.is_active === 'true';
      filtered = filtered.filter(reward => {
        const now = new Date();
        const validFrom = reward.valid_from ? new Date(reward.valid_from) : null;
        const validUntil = reward.valid_until ? new Date(reward.valid_until) : null;
        const isCurrentlyActive =
          (!validFrom || validFrom <= now) && (!validUntil || validUntil >= now);
        return isCurrentlyActive === isActive;
      });
    }

    return filtered;
  }, [rewards, filters]);

  const paginatedRewards = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRewards.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRewards, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRewards.length / itemsPerPage);

  const handleCreate = () => {
    setEditingReward(null);
    setFormData({
      title: '',
      description: '',
      category: 'DISCOUNT',
      points_cost: 100,
      image_url: '',
      discount_percent: undefined,
      discount_amount: undefined,
      reward_type: 'PERCENTAGE_DISCOUNT',
      stock_quantity: undefined,
      redemption_limit: undefined,
      valid_from: new Date().toISOString().split('T')[0] + 'T00:00:00',
      valid_until: undefined,
      terms_conditions: '',
    });
    setFormErrors({});
    setImagePreview(null);
    setImageFile(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      title: reward.title,
      description: reward.description,
      category: reward.category,
      points_cost: reward.points_cost,
      image_url: reward.image_url || '',
      discount_percent: reward.discount_percent || undefined,
      discount_amount: reward.discount_amount ? Number(reward.discount_amount) : undefined,
      reward_type: reward.reward_type,
      stock_quantity: reward.stock_quantity || undefined,
      redemption_limit: reward.redemption_limit || undefined,
      valid_from: new Date(reward.valid_from).toISOString().split('T')[0] + 'T00:00:00',
      valid_until: reward.valid_until
        ? new Date(reward.valid_until).toISOString().split('T')[0] + 'T23:59:59'
        : undefined,
      terms_conditions: reward.terms_conditions || '',
    });
    setFormErrors({});
    setImagePreview(reward.image_url || null);
    setImageFile(null);
    setIsFormModalOpen(true);
  };

  const handleDelete = (reward: Reward) => {
    setRewardToDelete(reward);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!rewardToDelete) return;

    try {
      setIsDeleting(true);
      await rewardService.deleteReward(rewardToDelete.id);
      showToast({
        message: t('rewardManagement.messages.deleteSuccess', { name: rewardToDelete.title }),
        type: 'success',
      });
      loadRewards();
    } catch (error: any) {
      console.error('Error deleting reward:', error);
      showToast({
        message: error.message || t('rewardManagement.messages.deleteError'),
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setRewardToDelete(null);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = t('rewardManagement.form.titleRequired');
    }

    if (!formData.description.trim()) {
      errors.description = t('rewardManagement.form.descriptionRequired');
    }

    if (formData.points_cost <= 0) {
      errors.points_cost = t('rewardManagement.form.pointsCostRequired');
    }

    // Validate discount: chỉ được có một trong hai (percent hoặc amount)
    const hasPercent =
      formData.discount_percent !== undefined && formData.discount_percent !== null;
    const hasAmount = formData.discount_amount !== undefined && formData.discount_amount !== null;

    if (hasPercent && hasAmount) {
      errors.discount_percent = t('rewardManagement.form.onlyOneDiscountType');
      errors.discount_amount = t('rewardManagement.form.onlyOneDiscountType');
    }

    if (hasPercent && (formData.discount_percent! < 0 || formData.discount_percent! > 100)) {
      errors.discount_percent = t('rewardManagement.form.discountPercentRange');
    }

    if (hasAmount && formData.discount_amount! < 0) {
      errors.discount_amount = t('rewardManagement.form.discountAmountInvalid');
    }

    if (formData.stock_quantity != null && formData.stock_quantity < 0) {
      errors.stock_quantity = t('rewardManagement.form.stockQuantityInvalid');
    }

    if (formData.redemption_limit != null && formData.redemption_limit < 0) {
      errors.redemption_limit = t('rewardManagement.form.redemptionLimitInvalid');
    }

    if (formData.valid_until && new Date(formData.valid_from) >= new Date(formData.valid_until)) {
      errors.valid_until = t('rewardManagement.form.validUntilAfterValidFrom');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // If image is a base64 data URL (new upload), upload to S3 first
      let imageUrl = formData.image_url;
      if (imageFile && formData.image_url && formData.image_url.startsWith('data:image/')) {
        setIsUploadingImage(true);
        try {
          const uploadResponse = await rewardService.uploadRewardImage(formData.image_url);
          if (uploadResponse.success && uploadResponse.data) {
            imageUrl = uploadResponse.data.image_url;
          } else {
            throw new Error('Failed to upload image');
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          showToast({ message: t('rewardManagement.messages.uploadImageError'), type: 'error' });
          setIsUploadingImage(false);
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      const payload = {
        ...formData,
        image_url: imageUrl,
        discount_percent: formData.discount_percent || undefined,
        discount_amount: formData.discount_amount || undefined,
        stock_quantity: formData.stock_quantity || undefined,
        redemption_limit: formData.redemption_limit || undefined,
        valid_until: formData.valid_until || undefined,
      };

      let response;
      if (editingReward) {
        response = await rewardService.updateReward(editingReward.id, payload);
        if (response.success) {
          showToast({
            message: t('rewardManagement.messages.updateSuccess', { name: formData.title }),
            type: 'success',
          });
          setIsFormModalOpen(false);
          loadRewards();
        } else {
          showToast({
            message: response.message || t('rewardManagement.messages.updateError'),
            type: 'error',
          });
        }
      } else {
        response = await rewardService.createReward(payload);
        if (response.success) {
          showToast({
            message: t('rewardManagement.messages.createSuccess', { name: formData.title }),
            type: 'success',
          });
          setIsFormModalOpen(false);
          loadRewards();
        } else {
          showToast({
            message: response.message || t('rewardManagement.messages.createError'),
            type: 'error',
          });
        }
      }
    } catch (error: any) {
      console.error('Error saving reward:', error);
      const errorMessage =
        error.response?.data?.message || error.message || t('rewardManagement.messages.saveError');
      showToast({ message: errorMessage, type: 'error' });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setFormErrors(prev => ({ ...prev, image_url: 'File phải là hình ảnh' }));
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors(prev => ({ ...prev, image_url: 'File không được vượt quá 5MB' }));
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setFormData(prev => ({ ...prev, image_url: result }));
      };
      reader.readAsDataURL(file);

      if (formErrors.image_url) {
        setFormErrors(prev => ({ ...prev, image_url: '' }));
      }
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      DISCOUNT: t('rewardManagement.categories.DISCOUNT'),
      FREE_CLASS: t('rewardManagement.categories.FREE_CLASS'),
      MERCHANDISE: t('rewardManagement.categories.MERCHANDISE'),
      MEMBERSHIP_EXTENSION: t('rewardManagement.categories.MEMBERSHIP_EXTENSION'),
      PREMIUM_FEATURE: t('rewardManagement.categories.PREMIUM_FEATURE'),
      OTHER: t('rewardManagement.categories.OTHER'),
    };
    return labels[category] || category;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'DISCOUNT':
        return <Tag className='w-4 h-4' />;
      case 'FREE_CLASS':
        return <Trophy className='w-4 h-4' />;
      case 'MERCHANDISE':
        return <Package className='w-4 h-4' />;
      case 'MEMBERSHIP_EXTENSION':
        return <Star className='w-4 h-4' />;
      case 'PREMIUM_FEATURE':
        return <Star className='w-4 h-4' />;
      default:
        return <Gift className='w-4 h-4' />;
    }
  };

  const getRewardTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PERCENTAGE_DISCOUNT: t('rewardManagement.rewardTypes.PERCENTAGE_DISCOUNT'),
      FIXED_AMOUNT_DISCOUNT: t('rewardManagement.rewardTypes.FIXED_AMOUNT_DISCOUNT'),
      FREE_ITEM: t('rewardManagement.rewardTypes.FREE_ITEM'),
      MEMBERSHIP_UPGRADE: t('rewardManagement.rewardTypes.MEMBERSHIP_UPGRADE'),
      PREMIUM_FEATURE_ACCESS: t('rewardManagement.rewardTypes.PREMIUM_FEATURE_ACCESS'),
      CASHBACK: t('rewardManagement.rewardTypes.CASHBACK'),
      OTHER: t('rewardManagement.rewardTypes.OTHER'),
    };
    return labels[type] || type;
  };

  const rewardStats = useMemo(() => {
    return {
      total: rewards.length,
      active: rewards.filter(r => r.is_active).length,
      totalRedemptions: stats?.total_redemptions || 0,
      totalPointsSpent: rewards.reduce(
        (sum, r) => sum + (r._count?.redemptions || 0) * r.points_cost,
        0
      ),
    };
  }, [rewards, stats]);

  const getExportData = () => {
    return filteredRewards.map(reward => ({
      'Tiêu đề': reward.title,
      'Mô tả': reward.description,
      'Danh mục': getCategoryLabel(reward.category),
      Loại: getRewardTypeLabel(reward.reward_type),
      Điểm: reward.points_cost,
      'Giảm giá %': reward.discount_percent || '',
      'Giảm giá VND': reward.discount_amount || '',
      'Số lượng': reward.stock_quantity || t('common.unlimited'),
      'Giới hạn đổi': reward.redemption_limit || t('common.unlimited'),
      'Còn lại':
        reward.stock_quantity !== undefined && reward.stock_quantity !== null
          ? reward.stock_quantity - (reward._count?.redemptions || 0)
          : t('common.unlimited'),
      'Ngày bắt đầu': formatVietnamDateTime(reward.valid_from),
      'Ngày kết thúc': reward.valid_until
        ? formatVietnamDateTime(reward.valid_until)
        : t('common.unlimited'),
      'Trạng thái': reward.is_active ? t('common.status.active') : t('common.status.inactive'),
      'Số lần đổi': reward._count?.redemptions || 0,
      'Ngày tạo': formatVietnamDateTime(reward.created_at),
    }));
  };

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-start'>
        <div>
          <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
            {t('rewardManagement.title')}
          </h1>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
            {t('rewardManagement.subtitle')}
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <AdminButton onClick={loadRewards} icon={RefreshCw} variant='outline' size='sm'>
            {t('equipmentManagement.filter.refresh')}
          </AdminButton>
          <AdminButton onClick={handleCreate} icon={Plus} size='sm'>
            {t('rewardManagement.addReward')}
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
                <Gift className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {rewardStats.total}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  {t('rewardManagement.stats.total')}
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <Trophy className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {rewardStats.active}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  {t('rewardManagement.stats.active')}
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <Package className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {rewardStats.totalRedemptions}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  {t('rewardManagement.stats.totalRedemptions')}
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <DollarSign className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {rewardStats.totalPointsSpent.toLocaleString()}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  {t('rewardManagement.stats.totalPointsSpent')}
                </div>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters
        filters={{
          search: filters.search,
          category: filters.category !== 'all' ? filters.category : '',
          customFilters: {
            min_points: filters.min_points,
            max_points: filters.max_points,
            is_active: filters.is_active !== 'all' ? filters.is_active : '',
          },
        }}
        onFiltersChange={newFilters => {
          setFilters({
            search: newFilters.search || '',
            category: newFilters.category || 'all',
            min_points: newFilters.customFilters?.min_points || '',
            max_points: newFilters.customFilters?.max_points || '',
            is_active: newFilters.customFilters?.is_active || 'all',
          });
          setCurrentPage(1);
        }}
        availableCategories={[
          { value: 'DISCOUNT', label: t('rewardManagement.categories.DISCOUNT') },
          { value: 'FREE_CLASS', label: t('rewardManagement.categories.FREE_CLASS') },
          { value: 'MERCHANDISE', label: t('rewardManagement.categories.MERCHANDISE') },
          {
            value: 'MEMBERSHIP_EXTENSION',
            label: t('rewardManagement.categories.MEMBERSHIP_EXTENSION'),
          },
          { value: 'PREMIUM_FEATURE', label: t('rewardManagement.categories.PREMIUM_FEATURE') },
          { value: 'OTHER', label: t('rewardManagement.categories.OTHER') },
        ]}
        showDateRange={false}
        showCategory={true}
        customFilterFields={[
          {
            key: 'min_points',
            label: t('rewardManagement.filter.minPoints'),
            type: 'number',
          },
          {
            key: 'max_points',
            label: t('rewardManagement.filter.maxPoints'),
            type: 'number',
          },
          {
            key: 'is_active',
            label: t('rewardManagement.table.status'),
            type: 'select',
            options: [
              { value: 'true', label: t('common.status.active') },
              { value: 'false', label: t('common.status.inactive') },
            ],
          },
        ]}
      />

      {/* Export and Actions */}
      <div className='flex justify-between items-center'>
        <div className='text-sm text-gray-600 dark:text-gray-400'>
          {t('rewardManagement.stats.totalCount', { count: filteredRewards.length })}
        </div>
        {filteredRewards.length > 0 && (
          <ExportButton
            data={getExportData()}
            columns={[
              { key: 'Tiêu đề', label: t('rewardManagement.table.title') },
              { key: 'Danh mục', label: t('rewardManagement.table.category') },
              { key: 'Loại', label: t('rewardManagement.table.type') },
              { key: 'Điểm', label: t('rewardManagement.table.pointsCost') },
              { key: 'Trạng thái', label: t('rewardManagement.table.status') },
              { key: 'Số lần đổi', label: t('rewardManagement.table.redemptions') },
            ]}
            filename={t('rewardManagement.export.filename')}
            title={t('rewardManagement.export.title')}
            variant='outline'
            size='sm'
          />
        )}
      </div>

      {/* Rewards List */}
      {isLoading ? (
        <TableLoading text={t('rewardManagement.messages.loading')} />
      ) : filteredRewards.length === 0 ? (
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12'>
          <div className='flex flex-col items-center justify-center gap-3'>
            <Gift className='w-12 h-12 text-gray-300 dark:text-gray-600' />
            <div className='text-theme-xs font-heading text-gray-500 dark:text-gray-400'>
              {filters.search || filters.category !== 'all'
                ? t('rewardManagement.empty.noResults')
                : t('rewardManagement.empty.noRewards')}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Rewards Cards Grid - Voucher/Coupon Style */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
            {paginatedRewards.map(reward => (
              <div
                key={reward.id}
                className='group relative bg-white dark:bg-gray-900 rounded-xl border-2 border-orange-200 dark:border-orange-800/50 shadow-md hover:shadow-xl hover:shadow-orange-500/20 dark:hover:shadow-orange-500/30 transition-all duration-300 overflow-hidden hover:-translate-y-0.5 flex flex-col h-full'
              >
                {/* Voucher Card - Split Layout */}
                <div className='flex flex-col h-full'>
                  {/* Top Section: Image + Discount Value - Voucher Header Style */}
                  <div className='relative flex-shrink-0'>
                    {/* Voucher Header with Pattern */}
                    <div className='relative h-32 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 dark:from-orange-600 dark:via-orange-700 dark:to-orange-800 overflow-hidden'>
                      {/* Pattern Overlay */}
                      <div className='absolute inset-0 opacity-10'>
                        <div
                          className='absolute inset-0'
                          style={{
                            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)`,
                          }}
                        ></div>
                      </div>

                      {/* Image or Icon */}
                      {reward.image_url ? (
                        <div className='relative w-full h-full'>
                          <img
                            src={reward.image_url}
                            alt={reward.title}
                            className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-500'
                          />
                          <div className='absolute inset-0 bg-gradient-to-t from-orange-900/60 via-orange-800/30 to-transparent'></div>
                        </div>
                      ) : (
                        <div className='w-full h-full flex items-center justify-center'>
                          <Gift className='w-16 h-16 text-white/80 dark:text-white/70' />
                        </div>
                      )}

                      {/* Badges Overlay */}
                      <div className='absolute top-2 left-2 right-2 flex items-start justify-between gap-1.5 z-10'>
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-md backdrop-blur-sm shadow-md border ${
                            reward.category === 'DISCOUNT'
                              ? 'bg-green-500/90 text-white border-green-400/50'
                              : reward.category === 'FREE_CLASS'
                              ? 'bg-blue-500/90 text-white border-blue-400/50'
                              : reward.category === 'MERCHANDISE'
                              ? 'bg-purple-500/90 text-white border-purple-400/50'
                              : 'bg-gray-500/90 text-white border-gray-400/50'
                          }`}
                        >
                          {getCategoryIcon(reward.category)}
                          <span className='text-[8px] font-bold font-heading uppercase tracking-wide'>
                            {getCategoryLabel(reward.category)}
                          </span>
                        </div>
                        <EnumBadge
                          type='MEMBERSHIP_STATUS'
                          value={reward.is_active ? 'ACTIVE' : 'INACTIVE'}
                          size='sm'
                          showIcon={true}
                        />
                      </div>

                      {/* Discount Value Badge - Compact Display */}
                      <div className='absolute bottom-2 left-1/2 -translate-x-1/2 z-10'>
                        <div className='bg-white dark:bg-gray-900 rounded-xl px-3 py-2 shadow-xl border-2 border-white/50 dark:border-gray-800/50'>
                          {reward.discount_percent ? (
                            <div className='text-center'>
                              <div className='flex items-baseline justify-center gap-0.5'>
                                <span className='text-2xl font-black text-orange-600 dark:text-orange-500'>
                                  {reward.discount_percent}
                                </span>
                                <span className='text-base font-bold text-orange-600 dark:text-orange-500'>
                                  %
                                </span>
                              </div>
                              <div className='text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mt-0.5'>
                                Giảm
                              </div>
                            </div>
                          ) : reward.discount_amount ? (
                            <div className='text-center'>
                              <div className='flex items-baseline justify-center gap-0.5'>
                                <span className='text-xl font-black text-orange-600 dark:text-orange-500'>
                                  {Math.floor(reward.discount_amount / 1000)}K
                                </span>
                                <span className='text-xs font-bold text-orange-600 dark:text-orange-500'>
                                  VND
                                </span>
                              </div>
                              <div className='text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mt-0.5'>
                                Giảm
                              </div>
                            </div>
                          ) : (
                            <div className='text-center'>
                              <div className='text-sm font-bold text-orange-600 dark:text-orange-500'>
                                ĐẶC BIỆT
                              </div>
                              <div className='text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mt-0.5'>
                                Quà
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className='flex-1 flex flex-col p-3 bg-white dark:bg-gray-900'>
                    {/* Title & Description */}
                    <div className='mb-2'>
                      <h3 className='text-sm font-bold font-heading text-gray-900 dark:text-white mb-1 line-clamp-2 leading-tight'>
                        {reward.title}
                      </h3>
                      {reward.description && (
                        <p className='text-[11px] text-gray-600 dark:text-gray-400 font-inter line-clamp-2 leading-snug'>
                          {reward.description}
                        </p>
                      )}
                    </div>

                    {/* Points Cost - Orange Theme */}
                    <div className='flex items-center gap-1.5 px-2 py-1.5 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-md border border-orange-200 dark:border-orange-700/50 mb-2'>
                      <div className='w-6 h-6 bg-orange-500 dark:bg-orange-600 rounded-md flex items-center justify-center flex-shrink-0'>
                        <DollarSign className='w-3 h-3 text-white' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='text-[8px] font-semibold font-heading text-orange-700 dark:text-orange-300 mb-0.5 uppercase tracking-wide'>
                          Chi phí
                        </div>
                        <div className='text-xs font-bold font-heading text-orange-600 dark:text-orange-400'>
                          {reward.points_cost.toLocaleString()} điểm
                        </div>
                      </div>
                    </div>

                    {/* Stock & Info Grid */}
                    <div className='space-y-2 mb-2'>
                      {/* Stock Quantity - Orange Theme */}
                      {reward.stock_quantity != null ? (
                        <div className='px-2 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-md border border-orange-200 dark:border-orange-800/50'>
                          <div className='flex items-center justify-between mb-1'>
                            <div className='flex items-center gap-1'>
                              <div className='w-5 h-5 bg-orange-500 dark:bg-orange-600 rounded flex items-center justify-center'>
                                <Package className='w-2.5 h-2.5 text-white' />
                              </div>
                              <span className='text-[9px] font-semibold font-heading text-orange-700 dark:text-orange-300'>
                                Tồn kho
                              </span>
                            </div>
                            <div className='text-[10px] font-bold font-heading text-orange-600 dark:text-orange-400'>
                              {reward.stock_quantity! - (reward._count?.redemptions || 0)}/
                              {reward.stock_quantity}
                            </div>
                          </div>
                          <div className='w-full h-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-full overflow-hidden'>
                            <div
                              className='h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500'
                              style={{
                                width: `${Math.min(
                                  100,
                                  ((reward.stock_quantity! - (reward._count?.redemptions || 0)) /
                                    reward.stock_quantity!) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className='flex items-center gap-1.5 px-2 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-md border border-orange-200 dark:border-orange-800/50'>
                          <div className='w-5 h-5 bg-orange-500 dark:bg-orange-600 rounded flex items-center justify-center flex-shrink-0'>
                            <Package className='w-2.5 h-2.5 text-white' />
                          </div>
                          <div className='flex-1 min-w-0'>
                            <div className='text-[9px] font-semibold font-heading text-orange-700 dark:text-orange-300 mb-0.5'>
                              Tồn kho
                            </div>
                            <div className='text-[10px] font-bold font-heading text-orange-600 dark:text-orange-400'>
                              Vô hạn
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Info Row - Orange Theme */}
                      <div className='grid grid-cols-2 gap-1.5'>
                        {/* Valid Until */}
                        {reward.valid_until && (
                          <div className='flex items-center gap-1 px-2 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-md border border-orange-200 dark:border-orange-800/50'>
                            <div className='w-4 h-4 bg-orange-500 dark:bg-orange-600 rounded flex items-center justify-center flex-shrink-0'>
                              <Calendar className='w-2 h-2 text-white' />
                            </div>
                            <div className='min-w-0 flex-1'>
                              <div className='text-[8px] font-semibold font-heading text-orange-700 dark:text-orange-300 mb-0.5 uppercase tracking-wide'>
                                Hết hạn
                              </div>
                              <div className='text-[9px] font-bold font-inter text-orange-600 dark:text-orange-400 truncate'>
                                {formatVietnamDateTime(reward.valid_until, 'date')}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Redemption Count */}
                        {reward._count?.redemptions !== undefined &&
                          reward._count.redemptions > 0 && (
                            <div className='flex items-center gap-1 px-2 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-md border border-orange-200 dark:border-orange-800/50'>
                              <div className='w-4 h-4 bg-orange-500 dark:bg-orange-600 rounded flex items-center justify-center flex-shrink-0'>
                                <Trophy className='w-2 h-2 text-white' />
                              </div>
                              <div className='min-w-0 flex-1'>
                                <div className='text-[8px] font-semibold font-heading text-orange-700 dark:text-orange-300 mb-0.5 uppercase tracking-wide'>
                                  Đã đổi
                                </div>
                                <div className='text-[9px] font-bold font-heading text-orange-600 dark:text-orange-400'>
                                  {reward._count.redemptions}
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer - Actions */}
                  <div className='px-3 py-2.5 bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/20 border-t border-orange-200 dark:border-orange-800/50 flex items-center gap-2 mt-auto'>
                    <button
                      onClick={() => handleEdit(reward)}
                      className='flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 text-[11px] font-bold font-heading text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-md shadow-sm hover:shadow-md hover:shadow-orange-500/30 transition-all duration-200 active:scale-95'
                    >
                      <Edit className='w-3 h-3' />
                      {t('rewardManagement.actions.edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(reward)}
                      className='flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 text-[11px] font-bold font-heading text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-md shadow-sm hover:shadow-md hover:shadow-red-500/30 transition-all duration-200 active:scale-95'
                    >
                      <Trash2 className='w-3 h-3' />
                      {t('rewardManagement.actions.delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className='flex justify-center'>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredRewards.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Custom styles for compact professional flatpickr with orange theme */}
      <style>{`
        /* Compact Professional Flatpickr Calendar - Orange Theme */
        .flatpickr-calendar {
          font-family: 'Inter', sans-serif !important;
          font-size: 11px !important;
          border-radius: 10px !important;
          border: 1px solid rgba(249, 115, 22, 0.25) !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(249, 115, 22, 0.05) !important;
          background: #ffffff !important;
          overflow: hidden !important;
          width: 340px !important;
          padding: 10px !important;
          backdrop-filter: blur(10px) !important;
        }
        
        .dark .flatpickr-calendar {
          background: #1f2937 !important;
          border-color: rgba(249, 115, 22, 0.3) !important;
        }
        
        /* Month Header - Compact with Gradient */
        .flatpickr-months {
          padding: 8px 12px !important;
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%) !important;
          border-bottom: 1px solid rgba(249, 115, 22, 0.2) !important;
          margin-bottom: 6px !important;
          border-radius: 8px 8px 0 0 !important;
        }
        
        .dark .flatpickr-months {
          background: linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%) !important;
          border-bottom-color: rgba(249, 115, 22, 0.3) !important;
        }
        
        .flatpickr-current-month {
          font-size: 11px !important;
          font-weight: 700 !important;
          font-family: 'Inter', sans-serif !important;
          padding: 2px 0 !important;
        }
        
        .flatpickr-current-month .cur-month,
        .flatpickr-current-month input.cur-year {
          font-size: 11px !important;
          font-weight: 700 !important;
          font-family: 'Inter', sans-serif !important;
          color: #9a3412 !important;
          padding: 2px 4px !important;
        }
        
        .dark .flatpickr-current-month .cur-month,
        .dark .flatpickr-current-month input.cur-year {
          color: #fed7aa !important;
        }
        
        /* Navigation Arrows - Compact */
        .flatpickr-prev-month,
        .flatpickr-next-month {
          padding: 3px !important;
          border-radius: 4px !important;
          transition: all 0.2s ease !important;
          width: 20px !important;
          height: 20px !important;
          top: 6px !important;
        }
        
        .flatpickr-prev-month:hover,
        .flatpickr-next-month:hover {
          background: rgba(249, 115, 22, 0.15) !important;
        }
        
        .flatpickr-prev-month svg,
        .flatpickr-next-month svg {
          width: 10px !important;
          height: 10px !important;
          fill: #9a3412 !important;
        }
        
        .dark .flatpickr-prev-month svg,
        .dark .flatpickr-next-month svg {
          fill: #fed7aa !important;
        }
        
        /* Weekdays - Compact */
        .flatpickr-weekdays {
          padding: 6px 4px 4px !important;
          background: #fff7ed !important;
          margin-top: 2px !important;
        }
        
        .dark .flatpickr-weekdays {
          background: #7c2d12 !important;
        }
        
        .flatpickr-weekday {
          font-size: 9px !important;
          font-weight: 700 !important;
          font-family: 'Inter', sans-serif !important;
          color: #9a3412 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.3px !important;
          padding: 4px 0 !important;
        }
        
        .dark .flatpickr-weekday {
          color: #fed7aa !important;
        }
        
        /* Days Container - Compact */
        .flatpickr-days {
          padding: 4px 4px !important;
        }
        
        /* Individual Days - Compact */
        .flatpickr-day {
          font-size: 10px !important;
          font-family: 'Inter', sans-serif !important;
          height: 28px !important;
          line-height: 28px !important;
          border-radius: 6px !important;
          margin: 1.5px !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          font-weight: 500 !important;
          width: calc((100% - 21px) / 7) !important;
          color: #374151 !important;
          border: 1px solid transparent !important;
        }
        
        .dark .flatpickr-day {
          color: #f3f4f6 !important;
        }
        
        .flatpickr-day:hover {
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%) !important;
          border-color: #f97316 !important;
          color: #ea580c !important;
          transform: scale(1.08) translateY(-1px) !important;
          box-shadow: 0 2px 4px -1px rgba(249, 115, 22, 0.2) !important;
        }
        
        .dark .flatpickr-day:hover {
          background: linear-gradient(135deg, #9a3412 0%, #c2410c 100%) !important;
          border-color: #f97316 !important;
          color: #fed7aa !important;
          box-shadow: 0 2px 4px -1px rgba(249, 115, 22, 0.3) !important;
        }
        
        /* Selected Day - Gradient */
        .flatpickr-day.selected,
        .flatpickr-day.startRange,
        .flatpickr-day.endRange {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%) !important;
          border-color: #f97316 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          box-shadow: 0 4px 12px -2px rgba(249, 115, 22, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.1) !important;
          transform: scale(1.05) !important;
        }
        
        .flatpickr-day.selected:hover,
        .flatpickr-day.startRange:hover,
        .flatpickr-day.endRange:hover {
          background: linear-gradient(135deg, #ea580c 0%, #dc2626 50%, #c2410c 100%) !important;
          transform: scale(1.1) translateY(-1px) !important;
          box-shadow: 0 6px 16px -3px rgba(249, 115, 22, 0.6), 0 4px 6px -2px rgba(0, 0, 0, 0.15) !important;
        }
        
        /* Today - Compact */
        .flatpickr-day.today {
          border: 1.5px solid #f97316 !important;
          color: #f97316 !important;
          font-weight: 700 !important;
          background: #fff7ed !important;
        }
        
        .dark .flatpickr-day.today {
          background: #7c2d12 !important;
          border-color: #f97316 !important;
          color: #fed7aa !important;
        }
        
        .flatpickr-day.today:hover {
          background: #fff7ed !important;
          border-color: #ea580c !important;
          color: #ea580c !important;
        }
        
        .dark .flatpickr-day.today:hover {
          background: #9a3412 !important;
          border-color: #f97316 !important;
          color: #ffffff !important;
        }
        
        /* Disabled/Other Month Days */
        .flatpickr-day.flatpickr-disabled,
        .flatpickr-day.prevMonthDay,
        .flatpickr-day.nextMonthDay {
          color: #d1d5db !important;
          opacity: 0.4 !important;
          font-size: 9px !important;
        }
        
        .dark .flatpickr-day.flatpickr-disabled,
        .dark .flatpickr-day.prevMonthDay,
        .dark .flatpickr-day.nextMonthDay {
          color: #6b7280 !important;
        }
        
        /* Time Picker - Compact */
        .flatpickr-time {
          font-size: 10px !important;
          font-family: 'Inter', sans-serif !important;
          border-top: 1px solid rgba(249, 115, 22, 0.2) !important;
          background: #ffffff !important;
        }
        
        .dark .flatpickr-time {
          border-top-color: rgba(249, 115, 22, 0.3) !important;
          background: #1f2937 !important;
        }
        
        .flatpickr-time input {
          font-size: 11px !important;
          font-family: 'Inter', sans-serif !important;
          font-weight: 700 !important;
          width: 30px !important;
          height: 30px !important;
          line-height: 30px !important;
          padding: 0 !important;
          text-align: center !important;
          border-radius: 6px !important;
          border: 1.5px solid #e5e7eb !important;
          background: #ffffff !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          color: #374151 !important;
        }
        
        .dark .flatpickr-time input {
          background: #374151 !important;
          border-color: #4b5563 !important;
          color: #f3f4f6 !important;
        }
        
        .flatpickr-time input:hover,
        .flatpickr-time input:focus {
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%) !important;
          border-color: #f97316 !important;
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.2), 0 2px 4px -1px rgba(249, 115, 22, 0.3) !important;
          color: #ea580c !important;
          transform: scale(1.05) !important;
        }
        
        .dark .flatpickr-time input:hover,
        .dark .flatpickr-time input:focus {
          background: linear-gradient(135deg, #9a3412 0%, #c2410c 100%) !important;
          border-color: #f97316 !important;
          color: #fed7aa !important;
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.3), 0 2px 4px -1px rgba(249, 115, 22, 0.4) !important;
        }
        
        .flatpickr-time .flatpickr-time-separator {
          font-size: 12px !important;
          font-weight: 700 !important;
          color: #9a3412 !important;
          margin: 0 3px !important;
        }
        
        .dark .flatpickr-time .flatpickr-time-separator {
          color: #fed7aa !important;
        }
        
        .flatpickr-time .arrowUp,
        .flatpickr-time .arrowDown {
          display: none !important;
        }
        
        /* Calendar inner container */
        .flatpickr-innerContainer {
          padding: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        
        .flatpickr-rContainer {
          width: 100% !important;
          box-sizing: border-box !important;
        }
        
        /* Reduce spacing */
        .flatpickr-month {
          height: 28px !important;
        }
        
        /* Ensure proper spacing for all elements */
        .flatpickr-calendar .flatpickr-weekdays {
          margin-bottom: 2px !important;
        }
        
        .flatpickr-calendar .flatpickr-days {
          min-height: 200px !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        
        /* Arrow styling */
        .flatpickr-calendar.arrowTop:before,
        .flatpickr-calendar.arrowTop:after {
          border-bottom-color: #ffffff !important;
        }
        
        .dark .flatpickr-calendar.arrowTop:before,
        .dark .flatpickr-calendar.arrowTop:after {
          border-bottom-color: #1f2937 !important;
        }
      `}</style>

      {/* Create/Edit Modal */}
      <AdminModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={
          editingReward ? t('rewardManagement.form.editTitle') : t('rewardManagement.form.addTitle')
        }
        size='lg'
        footer={
          <div className='flex justify-end gap-3'>
            <AdminButton
              onClick={() => setIsFormModalOpen(false)}
              variant='outline'
              className='border-gray-300'
            >
              {t('common.cancel')}
            </AdminButton>
            <AdminButton
              onClick={handleSave}
              className='bg-gradient-to-r from-orange-500 to-red-500 text-white border-none'
            >
              {editingReward
                ? t('rewardManagement.actions.update')
                : t('rewardManagement.actions.create')}
            </AdminButton>
          </div>
        }
      >
        <div className='space-y-3'>
          <div>
            <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
              {t('rewardManagement.form.title')} <span className='text-red-500'>*</span>
            </label>
            <AdminInput
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              error={formErrors.title}
              className='font-inter'
            />
          </div>

          <div>
            <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
              {t('rewardManagement.form.description')} <span className='text-red-500'>*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className={`w-full px-3 py-1.5 text-[11px] border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                formErrors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {formErrors.description && (
              <p className='mt-1 text-[10px] text-red-600 dark:text-red-400 font-inter'>
                {formErrors.description}
              </p>
            )}
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
                {t('rewardManagement.form.category')}
              </label>
              <CustomSelect
                options={[
                  { value: 'DISCOUNT', label: t('rewardManagement.categories.DISCOUNT') },
                  { value: 'FREE_CLASS', label: t('rewardManagement.categories.FREE_CLASS') },
                  { value: 'MERCHANDISE', label: t('rewardManagement.categories.MERCHANDISE') },
                  {
                    value: 'MEMBERSHIP_EXTENSION',
                    label: t('rewardManagement.categories.MEMBERSHIP_EXTENSION'),
                  },
                  {
                    value: 'PREMIUM_FEATURE',
                    label: t('rewardManagement.categories.PREMIUM_FEATURE'),
                  },
                  { value: 'OTHER', label: t('rewardManagement.categories.OTHER') },
                ]}
                value={formData.category}
                onChange={value => setFormData({ ...formData, category: value as any })}
                placeholder={t('rewardManagement.form.selectCategory')}
                className='font-inter'
              />
            </div>

            <div>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
                {t('rewardManagement.form.rewardType')}
              </label>
              <CustomSelect
                options={[
                  {
                    value: 'PERCENTAGE_DISCOUNT',
                    label: t('rewardManagement.rewardTypes.PERCENTAGE_DISCOUNT'),
                  },
                  {
                    value: 'FIXED_AMOUNT_DISCOUNT',
                    label: t('rewardManagement.rewardTypes.FIXED_AMOUNT_DISCOUNT'),
                  },
                  { value: 'FREE_ITEM', label: t('rewardManagement.rewardTypes.FREE_ITEM') },
                  {
                    value: 'MEMBERSHIP_UPGRADE',
                    label: t('rewardManagement.rewardTypes.MEMBERSHIP_UPGRADE'),
                  },
                  {
                    value: 'PREMIUM_FEATURE_ACCESS',
                    label: t('rewardManagement.rewardTypes.PREMIUM_FEATURE_ACCESS'),
                  },
                  { value: 'CASHBACK', label: t('rewardManagement.rewardTypes.CASHBACK') },
                  { value: 'OTHER', label: t('rewardManagement.rewardTypes.OTHER') },
                ]}
                value={formData.reward_type}
                onChange={value => {
                  const newType = value as any;
                  // Clear discount fields when changing to non-discount types
                  if (newType === 'PERCENTAGE_DISCOUNT') {
                    setFormData({
                      ...formData,
                      reward_type: newType,
                      discount_amount: undefined, // Clear amount when selecting percent
                    });
                  } else if (newType === 'FIXED_AMOUNT_DISCOUNT') {
                    setFormData({
                      ...formData,
                      reward_type: newType,
                      discount_percent: undefined, // Clear percent when selecting amount
                    });
                  } else {
                    // Clear both discount fields for other types
                    setFormData({
                      ...formData,
                      reward_type: newType,
                      discount_percent: undefined,
                      discount_amount: undefined,
                    });
                  }
                }}
                placeholder={t('rewardManagement.form.selectType')}
                className='font-inter'
              />
            </div>
          </div>

          <div>
            <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
              {t('rewardManagement.form.pointsCost')} <span className='text-red-500'>*</span>
            </label>
            <AdminInput
              type='number'
              value={formData.points_cost.toString()}
              onChange={e =>
                setFormData({ ...formData, points_cost: parseInt(e.target.value) || 0 })
              }
              error={formErrors.points_cost}
              className='font-inter'
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <AdminInput
              label={t('rewardManagement.form.discountPercent')}
              type='number'
              value={formData.discount_percent?.toString() || ''}
              onChange={e => {
                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                setFormData({
                  ...formData,
                  discount_percent: value,
                  discount_amount:
                    value !== undefined && value !== null ? undefined : formData.discount_amount, // Clear amount if percent is set
                  reward_type:
                    value !== undefined && value !== null
                      ? 'PERCENTAGE_DISCOUNT'
                      : formData.reward_type,
                });
                // Clear error when user changes value
                if (formErrors.discount_percent || formErrors.discount_amount) {
                  setFormErrors(prev => ({ ...prev, discount_percent: '', discount_amount: '' }));
                }
              }}
              placeholder='0-100'
              error={formErrors.discount_percent}
              className='font-inter'
            />

            <AdminInput
              label={t('rewardManagement.form.discountAmount')}
              type='number'
              value={formData.discount_amount?.toString() || ''}
              onChange={e => {
                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                setFormData({
                  ...formData,
                  discount_amount: value,
                  discount_percent:
                    value !== undefined && value !== null ? undefined : formData.discount_percent, // Clear percent if amount is set
                  reward_type:
                    value !== undefined && value !== null
                      ? 'FIXED_AMOUNT_DISCOUNT'
                      : formData.reward_type,
                });
                // Clear error when user changes value
                if (formErrors.discount_percent || formErrors.discount_amount) {
                  setFormErrors(prev => ({ ...prev, discount_percent: '', discount_amount: '' }));
                }
              }}
              placeholder='0'
              error={formErrors.discount_amount}
              className='font-inter'
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <AdminInput
              label={t('rewardManagement.form.stockQuantity')}
              type='number'
              value={formData.stock_quantity?.toString() || ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  stock_quantity: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder={t('common.unlimited')}
              error={formErrors.stock_quantity}
              className='font-inter'
            />

            <AdminInput
              label={t('rewardManagement.form.redemptionLimit')}
              type='number'
              value={formData.redemption_limit?.toString() || ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  redemption_limit: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder={t('common.unlimited')}
              error={formErrors.redemption_limit}
              className='font-inter'
            />
          </div>

          <div className='grid grid-cols-2 gap-2.5'>
            <div className='flex flex-col'>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
                {t('rewardManagement.form.validFrom')} <span className='text-red-500'>*</span>
              </label>
              <div className='relative flex-1 group'>
                <input
                  ref={validFromPickerRef}
                  type='text'
                  placeholder='dd/mm/yyyy HH:mm'
                  readOnly
                  className='w-full h-[30px] px-3 py-1.5 pr-9 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer'
                />
                <Calendar className='absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200 pointer-events-none' />
              </div>
              {formErrors.valid_from && (
                <p className='mt-1 text-[10px] text-red-600 dark:text-red-400 font-inter'>
                  {formErrors.valid_from}
                </p>
              )}
            </div>

            <div className='flex flex-col'>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
                {t('rewardManagement.form.validUntil')}
              </label>
              <div className='relative flex-1 group'>
                <input
                  ref={validUntilPickerRef}
                  type='text'
                  placeholder='dd/mm/yyyy HH:mm'
                  readOnly
                  className={`w-full h-[30px] px-3 py-1.5 pr-9 text-[11px] border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${
                    formErrors.valid_until
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
                <Calendar className='absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200 pointer-events-none' />
              </div>
              {formErrors.valid_until && (
                <p className='mt-1 text-[10px] text-red-600 dark:text-red-400 font-inter'>
                  {formErrors.valid_until}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
              {t('rewardManagement.form.image')}
            </label>
            <div className='flex items-center gap-4'>
              {imagePreview ? (
                <div className='relative'>
                  <img
                    src={imagePreview}
                    alt='Preview'
                    className='w-32 h-32 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-700'
                  />
                  <button
                    type='button'
                    onClick={handleRemoveImage}
                    className='absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors'
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className='w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center cursor-pointer hover:border-orange-500 dark:hover:border-orange-500 transition-colors bg-gray-50 dark:bg-gray-900'
                >
                  <Gift className='w-8 h-8 text-gray-400 dark:text-gray-500' />
                </div>
              )}

              <div className='flex-1'>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  onChange={handleImageChange}
                  className='hidden'
                />
                <AdminButton
                  variant='outline'
                  onClick={() => fileInputRef.current?.click()}
                  icon={imagePreview ? Edit : Plus}
                  disabled={isUploadingImage}
                >
                  {imagePreview
                    ? t('rewardManagement.form.changeImage')
                    : t('rewardManagement.form.uploadImage')}
                </AdminButton>
                {formErrors.image_url && (
                  <p className='text-xs text-red-600 dark:text-red-400 mt-1'>
                    {formErrors.image_url}
                  </p>
                )}
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-2 font-inter'>
                  {t('rewardManagement.form.imageUploadHint')}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
              {t('rewardManagement.form.termsConditions')}
            </label>
            <textarea
              value={formData.terms_conditions || ''}
              onChange={e => setFormData({ ...formData, terms_conditions: e.target.value })}
              rows={2}
              placeholder={t('rewardManagement.form.termsConditionsPlaceholder')}
              className='w-full px-3 py-1.5 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            />
          </div>

          {editingReward && (
            <div>
              <label className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  checked={editingReward.is_active}
                  onChange={e => {
                    const updateData: UpdateRewardRequest = { is_active: e.target.checked };
                    const statusText = e.target.checked
                      ? t('rewardManagement.actions.activate')
                      : t('rewardManagement.actions.deactivate');
                    rewardService
                      .updateReward(editingReward.id, updateData)
                      .then(() => {
                        showToast({
                          message: t('rewardManagement.messages.statusUpdateSuccess', {
                            action: statusText,
                            name: editingReward.title,
                          }),
                          type: 'success',
                        });
                        loadRewards();
                      })
                      .catch(err => {
                        console.error('Error updating reward status:', err);
                        showToast({
                          message: err.message || t('rewardManagement.messages.statusUpdateError'),
                          type: 'error',
                        });
                      });
                  }}
                  className='w-4 h-4'
                />
                <span className='text-sm text-gray-700 dark:text-gray-300'>
                  {t('common.status.active')}
                </span>
              </label>
            </div>
          )}
        </div>
      </AdminModal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title={t('rewardManagement.delete.confirmTitle')}
        message={t('rewardManagement.delete.confirmMessage', { name: rewardToDelete?.title || '' })}
        confirmText={t('rewardManagement.actions.delete')}
        cancelText={t('common.cancel')}
        isLoading={isDeleting}
        variant='danger'
      />
    </div>
  );
};

export default RewardManagement;
