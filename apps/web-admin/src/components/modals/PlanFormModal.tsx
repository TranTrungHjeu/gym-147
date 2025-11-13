import React, { useEffect, useState } from 'react';
import { Save, X, Package, DollarSign, Clock, Users, Sparkles } from 'lucide-react';
import AdminModal from '../common/AdminModal';
import CustomSelect from '../common/CustomSelect';
import { ButtonSpinner } from '../ui/AppLoading';
import { MembershipPlan } from '../../services/billing.service';

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<MembershipPlan>) => Promise<void>;
  plan?: MembershipPlan | null;
}

const PLAN_TYPES = [
  { value: 'BASIC', label: 'Cơ bản' },
  { value: 'PREMIUM', label: 'Phổ biến' },
  { value: 'VIP', label: 'Cao cấp' },
  { value: 'STUDENT', label: 'Sinh viên' },
];

const PlanFormModal: React.FC<PlanFormModalProps> = ({ isOpen, onClose, onSave, plan }) => {
  const [formData, setFormData] = useState<Partial<MembershipPlan & { duration_months?: number; benefits?: string[] }>>({
    name: '',
    description: '',
    type: 'BASIC',
    duration_months: 1,
    price: 0,
    benefits: [],
    is_active: true,
  });
  const [benefitInput, setBenefitInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (plan) {
        setFormData({
          name: plan.name || '',
          description: plan.description || '',
          type: (plan as any).type || 'BASIC',
          duration_months: (plan as any).duration_months || plan.duration_days ? Math.ceil(plan.duration_days / 30) : 1,
          price: plan.price || 0,
          benefits: (plan as any).benefits || plan.features || [],
          is_active: plan.is_active !== undefined ? plan.is_active : true,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          type: 'BASIC',
          duration_months: 1,
          price: 0,
          benefits: [],
          is_active: true,
        });
      }
      setBenefitInput('');
      setErrors({});
    }
  }, [isOpen, plan]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddBenefit = () => {
    if (benefitInput.trim()) {
      setFormData(prev => ({
        ...prev,
        benefits: [...(prev.benefits || []), benefitInput.trim()],
      }));
      setBenefitInput('');
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits?.filter((_, i) => i !== index) || [],
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Tên gói là bắt buộc';
    }

    if (!formData.price || formData.price < 0) {
      newErrors.price = 'Giá phải lớn hơn hoặc bằng 0';
    }

    if (!formData.duration_months || formData.duration_months < 1) {
      newErrors.duration_months = 'Thời hạn phải lớn hơn 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      // Convert to backend format
      const submitData: any = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        duration_months: formData.duration_months,
        price: formData.price,
        benefits: formData.benefits || [],
        is_active: formData.is_active,
      };

      await onSave(submitData);
      onClose();
    } catch (error: any) {
      console.error('Error saving plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title={plan ? 'Chỉnh sửa gói tập' : 'Tạo gói tập mới'} size='lg'>
      <form onSubmit={handleSubmit} className='p-6 space-y-4'>
        <div className='space-y-4'>
          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
              <Package className='w-4 h-4 text-orange-600 dark:text-orange-400' />
              Tên gói *
            </label>
            <input
              type='text'
              value={formData.name || ''}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder='Nhập tên gói tập'
              className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                errors.name
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.name && (
              <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>{errors.name}</p>
            )}
          </div>

          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
              Mô tả
            </label>
            <textarea
              value={formData.description || ''}
              onChange={e => handleInputChange('description', e.target.value)}
              placeholder='Nhập mô tả gói tập'
              rows={3}
              className='w-full px-4 py-2.5 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 resize-none'
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
                <Package className='w-4 h-4 text-orange-600 dark:text-orange-400' />
                Loại gói *
              </label>
              <CustomSelect
                options={PLAN_TYPES}
                value={formData.type || 'BASIC'}
                onChange={value => handleInputChange('type', value)}
                placeholder='Chọn loại gói'
              />
            </div>

            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
                <Clock className='w-4 h-4 text-orange-600 dark:text-orange-400' />
                Thời hạn (tháng) *
              </label>
              <input
                type='number'
                value={formData.duration_months || ''}
                onChange={e => handleInputChange('duration_months', parseInt(e.target.value) || 1)}
                placeholder='Nhập số tháng'
                min={1}
                className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                  errors.duration_months
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {errors.duration_months && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                  {errors.duration_months}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
              <DollarSign className='w-4 h-4 text-orange-600 dark:text-orange-400' />
              Giá (VNĐ) *
            </label>
            <input
              type='number'
              value={formData.price || ''}
              onChange={e => handleInputChange('price', parseFloat(e.target.value) || 0)}
              placeholder='Nhập giá gói tập'
              min={0}
              step={1000}
              className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                errors.price
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.price && (
              <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>{errors.price}</p>
            )}
          </div>

          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
              <Sparkles className='w-4 h-4 text-orange-600 dark:text-orange-400' />
              Quyền lợi
            </label>
            <div className='flex gap-2 mb-2'>
              <input
                type='text'
                value={benefitInput}
                onChange={e => setBenefitInput(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddBenefit();
                  }
                }}
                placeholder='Nhập quyền lợi và nhấn Enter'
                className='flex-1 px-4 py-2.5 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
              />
              <button
                type='button'
                onClick={handleAddBenefit}
                className='px-4 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200'
              >
                Thêm
              </button>
            </div>
            {formData.benefits && formData.benefits.length > 0 && (
              <div className='flex flex-wrap gap-2'>
                {formData.benefits.map((benefit, index) => (
                  <span
                    key={index}
                    className='inline-flex items-center gap-1.5 px-3 py-1.5 text-theme-xs font-heading text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg'
                  >
                    {benefit}
                    <button
                      type='button'
                      onClick={() => handleRemoveBenefit(index)}
                      className='text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors'
                    >
                      <X className='w-3 h-3' />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id='is_active'
              checked={formData.is_active || false}
              onChange={e => handleInputChange('is_active', e.target.checked)}
              className='w-4 h-4 rounded accent-orange-600 focus:ring-orange-500 dark:bg-gray-900'
            />
            <label
              htmlFor='is_active'
              className='text-theme-xs font-heading text-gray-900 dark:text-white cursor-pointer'
            >
              Gói đang hoạt động
            </label>
          </div>
        </div>

        <div className='flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800'>
          <button
            type='button'
            onClick={onClose}
            disabled={isLoading}
            className='px-5 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
          >
            Hủy
          </button>
          <button
            type='submit'
            disabled={isLoading}
            className='inline-flex items-center gap-2 px-5 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
          >
            {isLoading ? (
              <>
                <ButtonSpinner />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className='w-4 h-4' />
                {plan ? 'Cập nhật' : 'Tạo mới'}
              </>
            )}
          </button>
        </div>
      </form>
    </AdminModal>
  );
};

export default PlanFormModal;


