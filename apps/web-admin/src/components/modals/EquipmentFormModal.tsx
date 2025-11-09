import { Eye, Image as ImageIcon, Save, Upload, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import useTranslation from '../../hooks/useTranslation';
import { Equipment, equipmentService } from '../../services/equipment.service';
import Modal from '../Modal/Modal';
import CustomSelect from '../common/CustomSelect';

interface EquipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Equipment>) => Promise<void>;
  equipment?: Equipment | null;
}

const EquipmentFormModal: React.FC<EquipmentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  equipment,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<Equipment>>({
    name: '',
    category: 'CARDIO',
    status: 'AVAILABLE',
    location: '',
    photo: '',
    brand: '',
    model: '',
    serial_number: '',
    purchase_date: undefined,
    warranty_until: undefined,
    sensor_id: '',
    next_maintenance: undefined,
    max_weight: undefined,
    has_heart_monitor: false,
    has_calorie_counter: false,
    has_rep_counter: false,
    wifi_enabled: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isViewPhotoOpen, setIsViewPhotoOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (equipment) {
        setFormData({
          name: equipment.name || '',
          category: equipment.category || 'CARDIO',
          status: equipment.status || 'AVAILABLE',
          location: equipment.location || '',
          photo: equipment.photo || '',
          brand: equipment.brand || '',
          model: equipment.model || '',
          serial_number: equipment.serial_number || '',
          purchase_date: equipment.purchase_date,
          warranty_until: equipment.warranty_until,
          sensor_id: equipment.sensor_id || '',
          next_maintenance: equipment.next_maintenance,
          max_weight: equipment.max_weight,
          has_heart_monitor: equipment.has_heart_monitor || false,
          has_calorie_counter: equipment.has_calorie_counter || false,
          has_rep_counter: equipment.has_rep_counter || false,
          wifi_enabled: equipment.wifi_enabled || false,
        });
        setPhotoPreview(equipment.photo || null);
      } else {
        setFormData({
          name: '',
          category: 'CARDIO',
          status: 'AVAILABLE',
          location: '',
          photo: '',
          brand: '',
          model: '',
          serial_number: '',
          purchase_date: undefined,
          warranty_until: undefined,
          sensor_id: '',
          next_maintenance: undefined,
          max_weight: undefined,
          has_heart_monitor: false,
          has_calorie_counter: false,
          has_rep_counter: false,
          wifi_enabled: false,
        });
        setPhotoPreview(null);
      }
      setPhotoFile(null);
      setErrors({});
      setIsViewPhotoOpen(false);
    }
  }, [isOpen, equipment]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = t('equipmentManagement.form.nameRequired');
    } else if (formData.name.length > 100) {
      newErrors.name = t('equipmentManagement.form.nameMaxLength');
    }

    if (!formData.category) {
      newErrors.category = t('equipmentManagement.form.categoryRequired');
    }

    if (!formData.status) {
      newErrors.status = t('equipmentManagement.form.statusRequired');
    }

    if (formData.location && formData.location.length > 100) {
      newErrors.location = t('equipmentManagement.form.locationMaxLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      // If photo is a base64 data URL (new upload), upload to S3 first
      let photoUrl = formData.photo;
      if (photoFile && formData.photo && formData.photo.startsWith('data:image/')) {
        try {
          const uploadResponse = await equipmentService.uploadEquipmentPhoto(formData.photo);
          if (uploadResponse.success && uploadResponse.data) {
            photoUrl = uploadResponse.data.photo;
          } else {
            throw new Error('Failed to upload photo');
          }
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError);
          if (window.showToast) {
            window.showToast({
              type: 'error',
              message: t('equipmentManagement.form.photoUploadError'),
              duration: 3000,
            });
          }
          setIsLoading(false);
          return;
        }
      }

      // Save equipment with S3 photo URL
      await onSave({ ...formData, photo: photoUrl });
      onClose();
    } catch (error) {
      console.error('Error saving equipment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof Equipment, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, photo: t('equipmentManagement.form.photoInvalidType') }));
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, photo: t('equipmentManagement.form.photoTooLarge') }));
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);

      if (errors.photo) {
        setErrors(prev => ({ ...prev, photo: '' }));
      }
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setFormData(prev => ({ ...prev, photo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className='max-w-[900px] m-4'>
      <div className='relative w-full max-w-[900px] rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl max-h-[75vh] flex flex-col'>
        {/* Header */}
        <div className='flex-shrink-0 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-b border-orange-200 dark:border-orange-700 px-6 py-4 rounded-t-2xl'>
          <h2 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
            {equipment
              ? t('equipmentManagement.form.editTitle')
              : t('equipmentManagement.form.addTitle')}
          </h2>
        </div>

        {/* Form Content */}
        <form 
          onSubmit={handleSubmit} 
          className='flex-1 overflow-y-auto p-5'
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#d1d5db transparent'
          }}
        >
          <style>{`
            form::-webkit-scrollbar {
              width: 4px;
            }
            form::-webkit-scrollbar-track {
              background: transparent;
            }
            form::-webkit-scrollbar-thumb {
              background-color: #d1d5db;
              border-radius: 2px;
            }
            form::-webkit-scrollbar-thumb:hover {
              background-color: #9ca3af;
            }
            .dark form::-webkit-scrollbar-thumb {
              background-color: #4b5563;
            }
            .dark form::-webkit-scrollbar-thumb:hover {
              background-color: #6b7280;
            }
          `}</style>
          <div className='grid grid-cols-2 gap-3'>
            {/* Name and Category */}
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                {t('equipmentManagement.form.name')} *
              </label>
              <input
                type='text'
                value={formData.name || ''}
                onChange={e => handleInputChange('name', e.target.value)}
                placeholder={t('equipmentManagement.form.name')}
                className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                  errors.name
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {errors.name && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                {t('equipmentManagement.form.category')} *
              </label>
              <CustomSelect
                options={[
                  { value: 'CARDIO', label: t('equipmentManagement.categories.CARDIO') },
                  { value: 'STRENGTH', label: t('equipmentManagement.categories.STRENGTH') },
                  {
                    value: 'FREE_WEIGHTS',
                    label: t('equipmentManagement.categories.FREE_WEIGHTS'),
                  },
                  { value: 'FUNCTIONAL', label: t('equipmentManagement.categories.FUNCTIONAL') },
                  { value: 'STRETCHING', label: t('equipmentManagement.categories.STRETCHING') },
                  { value: 'RECOVERY', label: t('equipmentManagement.categories.RECOVERY') },
                  { value: 'SPECIALIZED', label: t('equipmentManagement.categories.SPECIALIZED') },
                ]}
                value={formData.category || 'CARDIO'}
                onChange={value => handleInputChange('category', value)}
                placeholder={t('equipmentManagement.form.category')}
                className={errors.category ? 'border-red-500 dark:border-red-500' : ''}
              />
              {errors.category && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                  {errors.category}
                </p>
              )}
            </div>

            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                {t('equipmentManagement.form.status')} *
              </label>
              <CustomSelect
                options={[
                  { value: 'AVAILABLE', label: t('equipmentManagement.statuses.AVAILABLE') },
                  { value: 'IN_USE', label: t('equipmentManagement.statuses.IN_USE') },
                  { value: 'MAINTENANCE', label: t('equipmentManagement.statuses.MAINTENANCE') },
                  { value: 'OUT_OF_ORDER', label: t('equipmentManagement.statuses.OUT_OF_ORDER') },
                  { value: 'RESERVED', label: t('equipmentManagement.statuses.RESERVED') },
                ]}
                value={formData.status || 'AVAILABLE'}
                onChange={value => handleInputChange('status', value)}
                placeholder={t('equipmentManagement.form.status')}
                className={errors.status ? 'border-red-500 dark:border-red-500' : ''}
              />
              {errors.status && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                  {errors.status}
                </p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                {t('equipmentManagement.form.location')}
              </label>
              <input
                type='text'
                value={formData.location || ''}
                onChange={e => handleInputChange('location', e.target.value)}
                placeholder={t('equipmentManagement.form.location')}
                className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                  errors.location
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {errors.location && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                  {errors.location}
                </p>
              )}
            </div>

            {/* Photo Upload */}
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                {t('equipmentManagement.form.photo')}
              </label>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                onChange={handlePhotoChange}
                className='hidden'
              />
              {photoPreview ? (
                <div className='relative'>
                  <div className='relative w-full h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800'>
                    <img
                      src={photoPreview}
                      alt='Equipment preview'
                      className='w-full h-full object-cover'
                    />
                    <button
                      type='button'
                      onClick={handleRemovePhoto}
                      className='absolute top-2 right-2 p-2 bg-error-500 hover:bg-error-600 text-white rounded-lg shadow-md transition-all duration-200 z-10'
                    >
                      <X className='w-4 h-4' />
                    </button>
                    <button
                      type='button'
                      onClick={() => setIsViewPhotoOpen(true)}
                      className='absolute top-2 left-2 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition-all duration-200 z-10'
                      title={t('equipmentManagement.form.viewPhoto')}
                    >
                      <Eye className='w-4 h-4' />
                    </button>
                  </div>
                  <button
                    type='button'
                    onClick={() => setIsViewPhotoOpen(true)}
                    className='mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold font-heading text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200'
                  >
                    <Eye className='w-3.5 h-3.5' />
                    {t('equipmentManagement.form.viewPhoto')}
                  </button>
                  {errors.photo && (
                    <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                      {errors.photo}
                    </p>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className='relative w-full h-32 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-2'
                >
                  <ImageIcon className='w-8 h-8 text-gray-400 dark:text-gray-500' />
                  <div className='text-center'>
                    <p className='text-[11px] font-medium font-heading text-gray-700 dark:text-gray-300'>
                      {t('equipmentManagement.form.photoPlaceholder')}
                    </p>
                    <p className='text-[10px] text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                      {t('equipmentManagement.form.photoHint')}
                    </p>
                  </div>
                  <button
                    type='button'
                    className='inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold font-heading text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all duration-200'
                  >
                    <Upload className='w-3.5 h-3.5' />
                    {t('equipmentManagement.form.uploadPhoto')}
                  </button>
                  {errors.photo && (
                    <p className='text-[10px] text-red-600 dark:text-red-400 font-inter'>
                      {errors.photo}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Brand */}
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Thương hiệu
              </label>
              <input
                type='text'
                value={formData.brand || ''}
                onChange={e => handleInputChange('brand', e.target.value)}
                placeholder='VD: Life Fitness, Technogym'
                className='w-full px-4 py-2.5 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
              />
            </div>

            {/* Model */}
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Model
              </label>
              <input
                type='text'
                value={formData.model || ''}
                onChange={e => handleInputChange('model', e.target.value)}
                placeholder='VD: T5x-5, Element+'
                className='w-full px-4 py-2.5 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
              />
            </div>

            {/* Serial Number */}
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Số serial
              </label>
              <input
                type='text'
                value={formData.serial_number || ''}
                onChange={e => handleInputChange('serial_number', e.target.value)}
                placeholder='VD: SN12345678'
                className='w-full px-4 py-2.5 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
              />
            </div>

            {/* Sensor ID */}
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Mã cảm biến IoT
              </label>
              <input
                type='text'
                value={formData.sensor_id || ''}
                onChange={e => handleInputChange('sensor_id', e.target.value)}
                placeholder='VD: SENSOR-001'
                className='w-full px-4 py-2.5 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
              />
            </div>

            {/* Purchase Date */}
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Ngày mua
              </label>
              <input
                type='date'
                value={
                  formData.purchase_date
                    ? new Date(formData.purchase_date).toISOString().split('T')[0]
                    : ''
                }
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    purchase_date: e.target.value || undefined,
                  }))
                }
                className='w-full px-4 py-2.5 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
              />
            </div>

            {/* Warranty Until */}
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Bảo hành đến
              </label>
              <input
                type='date'
                value={
                  formData.warranty_until
                    ? new Date(formData.warranty_until).toISOString().split('T')[0]
                    : ''
                }
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    warranty_until: e.target.value || undefined,
                  }))
                }
                className='w-full px-4 py-2.5 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
              />
            </div>

            {/* Next Maintenance */}
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Bảo trì tiếp theo
              </label>
              <input
                type='date'
                value={
                  formData.next_maintenance
                    ? new Date(formData.next_maintenance).toISOString().split('T')[0]
                    : ''
                }
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    next_maintenance: e.target.value || undefined,
                  }))
                }
                className='w-full px-4 py-2.5 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
              />
            </div>

            {/* Max Weight */}
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Trọng lượng tối đa (kg)
              </label>
              <input
                type='number'
                step='0.1'
                value={formData.max_weight || ''}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    max_weight: e.target.value ? parseFloat(e.target.value) : undefined,
                  }))
                }
                placeholder='VD: 200'
                className='w-full px-4 py-2.5 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
              />
            </div>

            {/* Smart Features - Full width section */}
            <div className='col-span-2'>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-3'>
                Tính năng thông minh
              </label>
              <div className='grid grid-cols-2 gap-3'>
                <label className='flex items-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={formData.has_heart_monitor || false}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, has_heart_monitor: e.target.checked }))
                    }
                    className='w-4 h-4 accent-orange-600 bg-white dark:bg-gray-900 rounded focus:ring-2 focus:ring-orange-500/30'
                  />
                  <span className='text-theme-xs font-medium text-gray-700 dark:text-gray-300'>
                    Đo nhịp tim
                  </span>
                </label>

                <label className='flex items-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={formData.has_calorie_counter || false}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, has_calorie_counter: e.target.checked }))
                    }
                    className='w-4 h-4 accent-orange-600 bg-white dark:bg-gray-900 rounded focus:ring-2 focus:ring-orange-500/30'
                  />
                  <span className='text-theme-xs font-medium text-gray-700 dark:text-gray-300'>
                    Đếm calo
                  </span>
                </label>

                <label className='flex items-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={formData.has_rep_counter || false}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, has_rep_counter: e.target.checked }))
                    }
                    className='w-4 h-4 accent-orange-600 bg-white dark:bg-gray-900 rounded focus:ring-2 focus:ring-orange-500/30'
                  />
                  <span className='text-theme-xs font-medium text-gray-700 dark:text-gray-300'>
                    Đếm số lần tập
                  </span>
                </label>

                <label className='flex items-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={formData.wifi_enabled || false}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, wifi_enabled: e.target.checked }))
                    }
                    className='w-4 h-4 accent-orange-600 bg-white dark:bg-gray-900 rounded focus:ring-2 focus:ring-orange-500/30'
                  />
                  <span className='text-theme-xs font-medium text-gray-700 dark:text-gray-300'>
                    Kết nối WiFi
                  </span>
                </label>
              </div>
            </div>
          </div>
        </form>

        {/* View Photo Modal */}
        {photoPreview && (
          <Modal
            isOpen={isViewPhotoOpen}
            onClose={() => setIsViewPhotoOpen(false)}
            className='max-w-4xl m-4'
          >
            <div className='relative w-full max-w-4xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl'>
              <div className='p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between'>
                <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
                  {t('equipmentManagement.form.viewPhoto')}
                </h3>
                <button
                  type='button'
                  onClick={() => setIsViewPhotoOpen(false)}
                  className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200'
                >
                  <X className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                </button>
              </div>
              <div className='p-6 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50'>
                <img
                  src={photoPreview}
                  alt='Equipment photo'
                  className='max-w-full max-h-[70vh] object-contain rounded-lg'
                />
              </div>
            </div>
          </Modal>
        )}

        {/* Footer */}
        <div className='flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-4 rounded-b-2xl flex justify-end gap-3'>
          <button
            type='button'
            onClick={onClose}
            disabled={isLoading}
            className='px-5 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {t('equipmentManagement.form.cancel')}
          </button>
          <button
            type='submit'
            onClick={handleSubmit}
            disabled={isLoading}
            className='inline-flex items-center gap-2 px-5 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
          >
            <Save className='w-4 h-4' />
            {isLoading
              ? t('common.loading')
              : equipment
              ? t('equipmentManagement.form.update')
              : t('equipmentManagement.form.create')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EquipmentFormModal;
