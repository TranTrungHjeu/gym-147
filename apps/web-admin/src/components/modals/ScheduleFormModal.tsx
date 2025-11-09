import { Calendar, Clock, Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { GymClass, ScheduleItem, scheduleService } from '../../services/schedule.service';
import { trainerService } from '../../services/trainer.service';
import AdminButton from '../common/AdminButton';
import AdminInput from '../common/AdminInput';
import AdminModal from '../common/AdminModal';

interface ScheduleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<ScheduleItem>) => Promise<void>;
  schedule?: ScheduleItem | null;
}

const SCHEDULE_STATUSES = [
  { value: 'SCHEDULED', label: 'Đã lên lịch' },
  { value: 'IN_PROGRESS', label: 'Đang diễn ra' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'POSTPONED', label: 'Hoãn lại' },
];

const ScheduleFormModal: React.FC<ScheduleFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  schedule,
}) => {
  const [formData, setFormData] = useState<Partial<ScheduleItem>>({
    class_id: '',
    trainer_id: '',
    room_id: '',
    date: '',
    start_time: '',
    end_time: '',
    max_capacity: 20,
    price_override: undefined,
    special_notes: '',
    status: 'SCHEDULED',
  });
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      if (schedule) {
        setFormData({
          class_id: schedule.gym_class?.id || '',
          trainer_id: schedule.trainer_id || '',
          room_id: schedule.room?.id || '',
          date: schedule.date ? new Date(schedule.date).toISOString().split('T')[0] : '',
          start_time: schedule.start_time
            ? new Date(schedule.start_time).toTimeString().slice(0, 5)
            : '',
          end_time: schedule.end_time ? new Date(schedule.end_time).toTimeString().slice(0, 5) : '',
          max_capacity: schedule.max_capacity || 20,
          price_override: schedule.price_override || undefined,
          special_notes: schedule.special_notes || '',
          status: schedule.status || 'SCHEDULED',
        });
      } else {
        setFormData({
          class_id: '',
          trainer_id: '',
          room_id: '',
          date: '',
          start_time: '',
          end_time: '',
          max_capacity: 20,
          price_override: undefined,
          special_notes: '',
          status: 'SCHEDULED',
        });
      }
      setErrors({});
    }
  }, [isOpen, schedule]);

  const loadInitialData = async () => {
    setIsLoadingData(true);
    try {
      const [classesRes, roomsRes, trainersRes] = await Promise.all([
        scheduleService.getAllClasses(),
        scheduleService.getAllRooms(),
        trainerService.getAllTrainers(),
      ]);

      if (classesRes.success) {
        setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
      }
      if (roomsRes.success) {
        setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : []);
      }
      if (trainersRes.success) {
        setTrainers(Array.isArray(trainersRes.data) ? trainersRes.data : []);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.class_id) {
      newErrors.class_id = 'Lớp học là bắt buộc';
    }

    if (!formData.room_id) {
      newErrors.room_id = 'Phòng là bắt buộc';
    }

    if (!formData.date) {
      newErrors.date = 'Ngày là bắt buộc';
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Giờ bắt đầu là bắt buộc';
    }

    if (!formData.end_time) {
      newErrors.end_time = 'Giờ kết thúc là bắt buộc';
    }

    if (formData.start_time && formData.end_time) {
      const start = new Date(`2000-01-01T${formData.start_time}`);
      const end = new Date(`2000-01-01T${formData.end_time}`);
      if (start >= end) {
        newErrors.end_time = 'Giờ kết thúc phải sau giờ bắt đầu';
      }
    }

    if (!formData.max_capacity || formData.max_capacity < 1) {
      newErrors.max_capacity = 'Sức chứa phải ít nhất 1 người';
    }

    if (formData.price_override !== undefined && formData.price_override < 0) {
      newErrors.price_override = 'Giá không được âm';
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
    setErrors({}); // Clear previous errors
    try {
      const submitData: any = {
        class_id: formData.class_id,
        room_id: formData.room_id,
        date: formData.date,
        start_time:
          formData.date && formData.start_time
            ? `${formData.date}T${formData.start_time}:00`
            : undefined,
        end_time:
          formData.date && formData.end_time
            ? `${formData.date}T${formData.end_time}:00`
            : undefined,
        max_capacity: formData.max_capacity,
        special_notes: formData.special_notes || null,
        status: formData.status,
      };

      if (formData.trainer_id) {
        submitData.trainer_id = formData.trainer_id;
      } else {
        submitData.trainer_id = null;
      }

      if (formData.price_override !== undefined) {
        submitData.price_override = formData.price_override;
      }

      await onSave(submitData);
      onClose();
    } catch (error: any) {
      // Extract error message from API response
      let errorMessage = 'Có lỗi xảy ra khi lưu lịch tập';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Extract detailed errors if available
      if (error.response?.data?.data?.errors && Array.isArray(error.response.data.data.errors)) {
        const errorDetails = error.response.data.data.errors.join('\n• ');
        errorMessage += `\n\nChi tiết lỗi:\n• ${errorDetails}`;
      }

      setErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ScheduleItem, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    // Clear submit error when user starts editing
    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: '' }));
    }
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={schedule ? 'Chỉnh sửa Lịch tập' : 'Tạo Lịch tập Mới'}
      size='lg'
      footer={
        <div className='flex justify-end gap-3'>
          <AdminButton variant='outline' onClick={onClose} disabled={isLoading}>
            Hủy
          </AdminButton>
          <AdminButton variant='primary' onClick={handleSubmit} isLoading={isLoading} icon={Save}>
            {schedule ? 'Cập nhật' : 'Tạo mới'}
          </AdminButton>
        </div>
      }
    >
      {isLoadingData ? (
        <div className='text-center py-8 text-gray-500 dark:text-gray-400 font-inter'>
          Đang tải dữ liệu...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
                Lớp học *
              </label>
              <select
                value={formData.class_id || ''}
                onChange={e => handleInputChange('class_id', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 font-inter ${
                  errors.class_id ? 'border-error-500' : 'border-gray-300 dark:border-gray-700'
                }`}
              >
                <option value=''>Chọn lớp học</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.category})
                  </option>
                ))}
              </select>
              {errors.class_id && (
                <p className='mt-1 text-sm text-error-600 dark:text-error-400 font-inter'>
                  {errors.class_id}
                </p>
              )}
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
                Phòng *
              </label>
              <select
                value={formData.room_id || ''}
                onChange={e => handleInputChange('room_id', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 font-inter ${
                  errors.room_id ? 'border-error-500' : 'border-gray-300 dark:border-gray-700'
                }`}
              >
                <option value=''>Chọn phòng</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {room.name} (Sức chứa: {room.capacity})
                  </option>
                ))}
              </select>
              {errors.room_id && (
                <p className='mt-1 text-sm text-error-600 dark:text-error-400 font-inter'>
                  {errors.room_id}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
              Huấn luyện viên
            </label>
            <select
              value={formData.trainer_id || ''}
              onChange={e => handleInputChange('trainer_id', e.target.value || undefined)}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 font-inter'
            >
              <option value=''>Không có huấn luyện viên</option>
              {trainers.map(trainer => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className='grid grid-cols-3 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
                <Calendar className='inline w-4 h-4 mr-1' />
                Ngày *
              </label>
              <input
                type='date'
                value={formData.date || ''}
                onChange={e => handleInputChange('date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 font-inter ${
                  errors.date ? 'border-error-500' : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {errors.date && (
                <p className='mt-1 text-sm text-error-600 dark:text-error-400 font-inter'>
                  {errors.date}
                </p>
              )}
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
                <Clock className='inline w-4 h-4 mr-1' />
                Bắt đầu *
              </label>
              <input
                type='time'
                value={formData.start_time || ''}
                onChange={e => handleInputChange('start_time', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 font-inter ${
                  errors.start_time ? 'border-error-500' : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {errors.start_time && (
                <p className='mt-1 text-sm text-error-600 dark:text-error-400 font-inter'>
                  {errors.start_time}
                </p>
              )}
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
                <Clock className='inline w-4 h-4 mr-1' />
                Kết thúc *
              </label>
              <input
                type='time'
                value={formData.end_time || ''}
                onChange={e => handleInputChange('end_time', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 font-inter ${
                  errors.end_time ? 'border-error-500' : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {errors.end_time && (
                <p className='mt-1 text-sm text-error-600 dark:text-error-400 font-inter'>
                  {errors.end_time}
                </p>
              )}
            </div>
          </div>

          <div className='grid grid-cols-3 gap-4'>
            <AdminInput
              label='Sức chứa *'
              type='number'
              min='1'
              value={formData.max_capacity?.toString() || '20'}
              onChange={e => handleInputChange('max_capacity', parseInt(e.target.value) || 20)}
              error={errors.max_capacity}
            />

            <AdminInput
              label='Giá (VNĐ)'
              type='number'
              min='0'
              value={formData.price_override?.toString() || ''}
              onChange={e =>
                handleInputChange(
                  'price_override',
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              error={errors.price_override}
              placeholder='Để trống để dùng giá mặc định'
            />

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
                Trạng thái
              </label>
              <select
                value={formData.status || 'SCHEDULED'}
                onChange={e => handleInputChange('status', e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 font-inter'
              >
                {SCHEDULE_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
              Ghi chú đặc biệt
            </label>
            <textarea
              value={formData.special_notes || ''}
              onChange={e => handleInputChange('special_notes', e.target.value)}
              rows={3}
              placeholder='Nhập ghi chú đặc biệt (tùy chọn)'
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 font-inter resize-none'
            />
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className='flex items-start p-3 border rounded-xl bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'>
              <div className='flex-1'>
                <div className='text-[11px] font-medium font-inter text-red-600 dark:text-red-400 whitespace-pre-line'>
                  {errors.submit.split('\n').map((line, index) => (
                    <div key={index} className={index > 0 ? 'mt-1' : ''}>
                      {line.startsWith('•') || line.startsWith('Chi tiết') ? (
                        <span className='text-gray-600 dark:text-gray-400 font-normal'>{line}</span>
                      ) : (
                        <span>{line}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </form>
      )}
    </AdminModal>
  );
};

export default ScheduleFormModal;
