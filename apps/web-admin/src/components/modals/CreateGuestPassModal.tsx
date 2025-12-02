import React, { useState, useEffect } from 'react';
import AdminModal from '../common/AdminModal';
import Button from '../ui/Button/Button';
import Input from '../form/input/InputField';
import { guestService, CreateGuestPassData } from '../../services/guest.service';
import { MemberService } from '../../services/member.service';

interface CreateGuestPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Member {
  id: string;
  full_name: string;
  email: string;
  membership_number: string;
}

const CreateGuestPassModal: React.FC<CreateGuestPassModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CreateGuestPassData>({
    member_id: '',
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    guest_id_number: '',
    pass_type: 'SINGLE_DAY',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    max_uses: 1,
    notes: '',
    price: undefined,
  });

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMembers();
      // Reset form
      setFormData({
        member_id: '',
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        guest_id_number: '',
        pass_type: 'SINGLE_DAY',
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: '',
        max_uses: 1,
        notes: '',
        price: undefined,
      });
      setErrors({});
    }
  }, [isOpen]);

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const response = await MemberService.getAllMembers({ page: 1, limit: 100 });
      if (response.success && response.data) {
        const membersList = Array.isArray(response.data)
          ? response.data
          : response.data.members || [];
        setMembers(membersList);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleInputChange = (field: keyof CreateGuestPassData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Auto-calculate valid_until and max_uses based on pass_type
    if (field === 'pass_type') {
      const validFrom = formData.valid_from
        ? new Date(formData.valid_from)
        : new Date();
      let validUntil = new Date(validFrom);
      let maxUses = 1;

      switch (value) {
        case 'SINGLE_DAY':
          validUntil.setDate(validFrom.getDate() + 1);
          maxUses = 1;
          break;
        case 'WEEK':
          validUntil.setDate(validFrom.getDate() + 7);
          maxUses = 7;
          break;
        case 'MONTH':
          validUntil.setMonth(validFrom.getMonth() + 1);
          maxUses = 30;
          break;
      }

      setFormData(prev => ({
        ...prev,
        pass_type: value,
        valid_until: validUntil.toISOString().split('T')[0],
        max_uses: maxUses,
      }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.member_id) {
      newErrors.member_id = 'Vui lòng chọn thành viên';
    }
    if (!formData.guest_name.trim()) {
      newErrors.guest_name = 'Vui lòng nhập tên khách';
    }
    if (!formData.pass_type) {
      newErrors.pass_type = 'Vui lòng chọn loại thẻ';
    }
    if (!formData.valid_from) {
      newErrors.valid_from = 'Vui lòng chọn ngày bắt đầu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await guestService.createGuestPass(formData);

      if (response.success) {
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: 'Tạo thẻ khách thành công',
            duration: 3000,
          });
        }
        onSuccess();
        onClose();
      } else {
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: response.message || 'Không thể tạo thẻ khách',
            duration: 3000,
          });
        }
      }
    } catch (error: any) {
      console.error('Error creating guest pass:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: error.message || 'Lỗi khi tạo thẻ khách',
          duration: 3000,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title='Tạo thẻ khách' size='lg'>
      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Member Selection */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            Thành viên phát hành <span className='text-red-500'>*</span>
          </label>
          {loadingMembers ? (
            <div className='text-sm text-gray-500'>Đang tải danh sách thành viên...</div>
          ) : (
            <select
              value={formData.member_id}
              onChange={e => handleInputChange('member_id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.member_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value=''>Chọn thành viên</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.full_name} ({member.membership_number})
                </option>
              ))}
            </select>
          )}
          {errors.member_id && (
            <p className='mt-1 text-sm text-red-500'>{errors.member_id}</p>
          )}
        </div>

        {/* Guest Name */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            Tên khách <span className='text-red-500'>*</span>
          </label>
          <Input
            type='text'
            value={formData.guest_name}
            onChange={e => handleInputChange('guest_name', e.target.value)}
            placeholder='Nhập tên khách'
            className={errors.guest_name ? 'border-red-500' : ''}
          />
          {errors.guest_name && (
            <p className='mt-1 text-sm text-red-500'>{errors.guest_name}</p>
          )}
        </div>

        {/* Guest Email */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            Email khách
          </label>
          <Input
            type='email'
            value={formData.guest_email || ''}
            onChange={e => handleInputChange('guest_email', e.target.value)}
            placeholder='email@example.com'
          />
        </div>

        {/* Guest Phone */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            Số điện thoại khách
          </label>
          <Input
            type='tel'
            value={formData.guest_phone || ''}
            onChange={e => handleInputChange('guest_phone', e.target.value)}
            placeholder='0123456789'
          />
        </div>

        {/* Guest ID Number */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            CMND/CCCD
          </label>
          <Input
            type='text'
            value={formData.guest_id_number || ''}
            onChange={e => handleInputChange('guest_id_number', e.target.value)}
            placeholder='Số CMND/CCCD'
          />
        </div>

        {/* Pass Type */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            Loại thẻ <span className='text-red-500'>*</span>
          </label>
          <select
            value={formData.pass_type}
            onChange={e => handleInputChange('pass_type', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.pass_type ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value='SINGLE_DAY'>1 ngày</option>
            <option value='WEEK'>1 tuần</option>
            <option value='MONTH'>1 tháng</option>
          </select>
          {errors.pass_type && (
            <p className='mt-1 text-sm text-red-500'>{errors.pass_type}</p>
          )}
        </div>

        {/* Valid From */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            Ngày bắt đầu <span className='text-red-500'>*</span>
          </label>
          <Input
            type='date'
            value={formData.valid_from}
            onChange={e => handleInputChange('valid_from', e.target.value)}
            className={errors.valid_from ? 'border-red-500' : ''}
          />
          {errors.valid_from && (
            <p className='mt-1 text-sm text-red-500'>{errors.valid_from}</p>
          )}
        </div>

        {/* Valid Until */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            Ngày kết thúc
          </label>
          <Input
            type='date'
            value={formData.valid_until || ''}
            onChange={e => handleInputChange('valid_until', e.target.value)}
            disabled
            className='bg-gray-100 dark:bg-gray-700'
          />
          <p className='mt-1 text-xs text-gray-500'>
            Tự động tính dựa trên loại thẻ
          </p>
        </div>

        {/* Max Uses */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            Số lần sử dụng tối đa
          </label>
          <Input
            type='number'
            min='1'
            value={formData.max_uses || 1}
            onChange={e => handleInputChange('max_uses', parseInt(e.target.value) || 1)}
          />
          <p className='mt-1 text-xs text-gray-500'>
            Tự động tính dựa trên loại thẻ
          </p>
        </div>

        {/* Price (Optional) */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            Giá (VND) - Tùy chọn
          </label>
          <Input
            type='number'
            min='0'
            value={formData.price || ''}
            onChange={e =>
              handleInputChange('price', e.target.value ? parseFloat(e.target.value) : undefined)
            }
            placeholder='Để trống nếu miễn phí từ membership'
          />
          <p className='mt-1 text-xs text-gray-500'>
            Để trống nếu thẻ khách được bao gồm trong gói membership
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            Ghi chú
          </label>
          <textarea
            value={formData.notes || ''}
            onChange={e => handleInputChange('notes', e.target.value)}
            rows={3}
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
            placeholder='Ghi chú về thẻ khách...'
          />
        </div>

        {/* Actions */}
        <div className='flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700'>
          <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type='submit' variant='primary' disabled={isSubmitting}>
            {isSubmitting ? 'Đang tạo...' : 'Tạo thẻ khách'}
          </Button>
        </div>
      </form>
    </AdminModal>
  );
};

export default CreateGuestPassModal;

