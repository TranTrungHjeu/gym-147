import { AlertCircle, MapPin, Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { trainerService } from '../../services/trainer.service';
import AdminModal from '../common/AdminModal';
import CustomSelect from '../common/CustomSelect';
import DatePicker from '../common/DatePicker';
import Button from '../ui/Button/Button';
import { ScheduleItem, scheduleService } from '../../services/schedule.service';

interface EditScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schedule: ScheduleItem | null;
  userId: string;
}

interface FormData {
  class_name: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  room_id: string;
  max_capacity: number;
  special_notes: string;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  status: string;
}

const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  schedule,
  userId,
}) => {
  const [formData, setFormData] = useState<FormData>({
    class_name: '',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
    room_id: '',
    max_capacity: 1,
    special_notes: '',
  });
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper to format date to YYYY-MM-DD (Vietnam timezone)
  const formatDateForInput = (dateString: string | Date): string => {
    if (!dateString) return '';
    try {
      let date: Date;
      
      // Handle different input formats
      if (typeof dateString === 'string') {
        // If it's already YYYY-MM-DD format, parse it as UTC to avoid timezone issues
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateString.split('-').map(Number);
          date = new Date(Date.UTC(year, month - 1, day));
        } else {
          // It's a datetime string, parse it
          date = new Date(dateString);
        }
      } else {
        date = dateString;
      }
      
      if (isNaN(date.getTime())) return '';
      
      // Convert to Vietnam timezone and format as YYYY-MM-DD
      const vnDateStr = date.toLocaleDateString('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
      }); // Returns YYYY-MM-DD format
      return vnDateStr;
    } catch (error) {
      console.error('[ERROR] Error formatting date for input:', error, 'Input:', dateString);
      return '';
    }
  };

  // Helper to format time to HH:MM (Vietnam timezone)
  // Backend returns ISO datetime strings in UTC, we need to convert to Vietnam timezone
  const formatTimeForInput = (timeString: string): string => {
    if (!timeString) return '';
    // Check if it's already in HH:MM format
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    try {
      // Backend returns ISO datetime strings like "2025-12-12T05:00:00.000Z" (UTC)
      // We need to convert to Vietnam timezone (UTC+7)
      let date: Date;

      if (timeString.includes('T') || timeString.includes('Z') || timeString.includes('+')) {
        // ISO datetime string - parse it
        date = new Date(timeString);
      } else if (timeString.includes(' ')) {
        // Space-separated datetime
        date = new Date(timeString);
      } else {
        // Just time part (HH:MM:SS or HH:MM)
        return timeString.slice(0, 5);
      }

      if (isNaN(date.getTime())) {
        console.warn('[WARNING] Invalid date string:', timeString);
        return '';
      }

      // Convert to Vietnam timezone and extract time components
      // Use toLocaleTimeString with Vietnam timezone to get correct local time
      const vnTimeString = date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      });

      return vnTimeString;
    } catch (error) {
      console.error('[ERROR] Error formatting time:', error, timeString);
      return '';
    }
  };

  // Load available rooms
  const loadAvailableRooms = async () => {
    try {
      if (formData.date && formData.start_time && formData.end_time) {
        // Create datetime strings for API
        const startDateTime = `${formData.date}T${formData.start_time}:00.000Z`;
        const endDateTime = `${formData.date}T${formData.end_time}:00.000Z`;

        const response = await scheduleService.getAvailableRooms(startDateTime, endDateTime);
        if (response.success && response.data) {
          // Response might be array or object with rooms property
          const rooms = Array.isArray(response.data) ? response.data : response.data.rooms || [];
          setAvailableRooms(rooms);
          return;
        }
      }

      // Fallback: Load all available rooms
      const allRoomsResponse = await scheduleService.getAllRooms();
      if (allRoomsResponse.success && allRoomsResponse.data) {
        const rooms = Array.isArray(allRoomsResponse.data)
          ? allRoomsResponse.data
          : allRoomsResponse.data.rooms || [];
        // Filter out rooms that are not available
        setAvailableRooms(rooms.filter((room: Room) => room.status === 'AVAILABLE'));
      }
    } catch (error) {
      console.error('Error loading available rooms:', error);
      setAvailableRooms([]);
    }
  };

  // Load schedule data when modal opens
  useEffect(() => {
    if (isOpen && schedule) {
      // Debug: log original time values
      console.log('[EditScheduleModal] Original schedule data:', {
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        date: schedule.date,
        start_time_type: typeof schedule.start_time,
        end_time_type: typeof schedule.end_time,
      });

      // Format times with Vietnam timezone conversion
      const formattedStartTime = formatTimeForInput(schedule.start_time || '');
      const formattedEndTime = formatTimeForInput(schedule.end_time || '');
      const formattedDate = formatDateForInput(schedule.date || schedule.start_time || '');

      // Debug: log formatted time values
      console.log('[EditScheduleModal] Formatted values (VN timezone):', {
        date: formattedDate,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        original_start_parsed: schedule.start_time ? new Date(schedule.start_time).toISOString() : null,
        original_end_parsed: schedule.end_time ? new Date(schedule.end_time).toISOString() : null,
      });

      setFormData({
        class_name: schedule.gym_class?.name || '',
        description: schedule.gym_class?.description || '',
        date: formattedDate,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        room_id: schedule.room?.id || '',
        max_capacity: schedule.max_capacity || 1,
        special_notes: schedule.special_notes || '',
      });
      setErrors({});
    }
  }, [isOpen, schedule]);

  // Load available rooms when modal opens or date/time changes
  useEffect(() => {
    if (isOpen) {
      loadAvailableRooms();
    }
  }, [isOpen, formData.date, formData.start_time, formData.end_time]);

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.class_name.trim()) {
      newErrors.class_name = 'Tên lớp là bắt buộc';
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
    if (!formData.room_id) {
      newErrors.room_id = 'Phòng học là bắt buộc';
    }
    if (formData.max_capacity < 1) {
      newErrors.max_capacity = 'Số lượng học viên phải lớn hơn 0';
    }

    // Room capacity validation
    const selectedRoom = availableRooms.find(room => room.id === formData.room_id);
    if (selectedRoom && formData.max_capacity > selectedRoom.capacity) {
      newErrors.max_capacity = `Số lượng học viên không được vượt quá sức chứa phòng (${selectedRoom.capacity})`;
    }

    // Time validation - use actual date if available, otherwise use a reference date
    if (formData.start_time && formData.end_time) {
      // Use actual date from form if available, otherwise use a reference date
      const dateStr = formData.date || '2000-01-01';
      const startTime = new Date(`${dateStr}T${formData.start_time}`);
      const endTime = new Date(`${dateStr}T${formData.end_time}`);

      if (startTime >= endTime) {
        newErrors.end_time = 'Giờ kết thúc phải sau giờ bắt đầu';
      } else {
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        if (durationMinutes < 15) {
          newErrors.end_time = 'Thời lượng lớp học tối thiểu 15 phút';
        } else if (durationMinutes > 180) {
          newErrors.end_time = 'Thời lượng lớp học tối đa 180 phút (3 giờ)';
        }
      }
    }

    // Date validation - must be at least 7 days from now
    if (formData.date) {
      const selectedDate = new Date(formData.date);
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      if (selectedDate < sevenDaysFromNow) {
        newErrors.date = 'Chỉ có thể cập nhật lịch dạy trước ít nhất 7 ngày';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!schedule) {
      setErrors({ submit: 'Không tìm thấy thông tin lịch dạy' });
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {};
      if (formData.class_name !== schedule.gym_class?.name) {
        updateData.class_name = formData.class_name;
      }
      if (formData.description !== schedule.gym_class?.description) {
        updateData.description = formData.description;
      }
      if (formData.date !== formatDateForInput(schedule.date || '')) {
        updateData.date = formData.date;
      }
      if (formData.start_time !== formatTimeForInput(schedule.start_time || '')) {
        updateData.start_time = formData.start_time;
      }
      if (formData.end_time !== formatTimeForInput(schedule.end_time || '')) {
        updateData.end_time = formData.end_time;
      }
      if (formData.room_id && formData.room_id !== schedule.room?.id) {
        updateData.room_id = formData.room_id;
      }
      if (formData.max_capacity !== schedule.max_capacity) {
        updateData.max_capacity = formData.max_capacity;
      }
      if (formData.special_notes !== (schedule.special_notes || '')) {
        updateData.special_notes = formData.special_notes;
      }

      // Only update if there are changes
      if (Object.keys(updateData).length === 0) {
        if (window.showToast) {
          window.showToast({
            type: 'info',
            message: 'Không có thay đổi nào',
            duration: 3000,
          });
        }
        setLoading(false);
        return;
      }

      await trainerService.updateTrainerSchedule(userId, schedule.id, updateData);

      if (window.showToast) {
        window.showToast({
          type: 'success',
          message: 'Cập nhật lịch dạy thành công',
          duration: 3000,
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      setErrors({
        submit: error.message || 'Có lỗi xảy ra khi cập nhật lịch dạy',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!schedule) {
    return null;
  }

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title='Cập nhật lịch dạy' size='md'>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <div className='space-y-4'>
          {/* Class Name */}
          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
              Tên lớp học *
            </label>
            <input
              type='text'
              value={formData.class_name}
              onChange={e => handleInputChange('class_name', e.target.value)}
              placeholder='Nhập tên lớp học'
              className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                errors.class_name
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.class_name && (
              <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                {errors.class_name}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
              Mô tả lớp học
            </label>
            <textarea
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              placeholder='Nhập mô tả lớp học (tùy chọn)'
              rows={3}
              className='w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter resize-none shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 border-gray-300 dark:border-gray-700'
            />
          </div>

          {/* Date and Time */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {/* Date */}
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Ngày học *
              </label>
              <DatePicker
                value={formData.date}
                onChange={date => {
                  if (typeof date === 'string') {
                    handleInputChange('date', date);
                  }
                }}
                minDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
                placeholder='Chọn ngày'
                className={errors.date ? 'border-red-500 dark:border-red-500' : ''}
              />
              {errors.date && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                  {errors.date}
                </p>
              )}
            </div>

            {/* Start Time */}
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Giờ bắt đầu *
              </label>
              <DatePicker
                mode='time'
                noCalendar={true}
                enableTime={true}
                time_24hr={true}
                dateFormat='H:i'
                value={formData.start_time ? `2000-01-01 ${formData.start_time}` : ''}
                onChange={value => {
                  if (typeof value === 'string' && value) {
                    // DatePicker returns "YYYY-MM-DD HH:mm" format
                    // Extract time part (HH:MM)
                    const parts = value.split(' ');
                    if (parts.length >= 2) {
                      const timePart = parts[1]; // "HH:mm"
                      handleInputChange('start_time', timePart);
                    } else {
                      // Try to extract from ISO format or other formats
                      const timeMatch = value.match(/(\d{2}):(\d{2})/);
                      if (timeMatch) {
                        handleInputChange('start_time', `${timeMatch[1]}:${timeMatch[2]}`);
                      }
                    }
                  }
                }}
                placeholder='Chọn giờ bắt đầu'
                className={`w-full ${
                  errors.start_time ? 'border-red-500 dark:border-red-500' : ''
                }`}
              />
              {errors.start_time && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                  {errors.start_time}
                </p>
              )}
            </div>

            {/* End Time */}
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Giờ kết thúc *
              </label>
              <DatePicker
                mode='time'
                noCalendar={true}
                enableTime={true}
                time_24hr={true}
                dateFormat='H:i'
                value={formData.end_time ? `2000-01-01 ${formData.end_time}` : ''}
                onChange={value => {
                  if (typeof value === 'string' && value) {
                    // DatePicker returns "YYYY-MM-DD HH:mm" format
                    // Extract time part (HH:MM)
                    const parts = value.split(' ');
                    if (parts.length >= 2) {
                      const timePart = parts[1]; // "HH:mm"
                      handleInputChange('end_time', timePart);
                    } else {
                      // Try to extract from ISO format or other formats
                      const timeMatch = value.match(/(\d{2}):(\d{2})/);
                      if (timeMatch) {
                        handleInputChange('end_time', `${timeMatch[1]}:${timeMatch[2]}`);
                      }
                    }
                  }
                }}
                placeholder='Chọn giờ kết thúc'
                className={`w-full ${errors.end_time ? 'border-red-500 dark:border-red-500' : ''}`}
              />
              {errors.end_time && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                  {errors.end_time}
                </p>
              )}
            </div>
          </div>

          {/* Room */}
          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
              Phòng học *
            </label>
            <CustomSelect
              options={availableRooms.map(room => ({
                value: room.id,
                label: `${room.name} (Sức chứa: ${room.capacity})`,
              }))}
              value={formData.room_id}
              onChange={value => handleInputChange('room_id', value)}
              placeholder={
                availableRooms.length === 0 ? 'Đang tải danh sách phòng...' : 'Chọn phòng'
              }
              icon={<MapPin className='w-3.5 h-3.5' />}
              disabled={availableRooms.length === 0}
              className={errors.room_id ? 'border-red-500 dark:border-red-500' : ''}
            />
            {errors.room_id && (
              <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                {errors.room_id}
              </p>
            )}
          </div>

          {/* Max Capacity */}
          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
              Số lượng học viên *
            </label>
            <input
              type='number'
              min='1'
              value={formData.max_capacity}
              onChange={e => handleInputChange('max_capacity', parseInt(e.target.value) || 1)}
              className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                errors.max_capacity
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.max_capacity && (
              <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                {errors.max_capacity}
              </p>
            )}
          </div>

          {/* Special Notes */}
          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
              Ghi chú đặc biệt
            </label>
            <textarea
              value={formData.special_notes}
              onChange={e => handleInputChange('special_notes', e.target.value)}
              placeholder='Ghi chú đặc biệt cho lớp học (tùy chọn)'
              rows={3}
              className='w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter resize-none shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 border-gray-300 dark:border-gray-700'
            />
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className='flex items-start p-2.5 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg'>
              <AlertCircle
                size={14}
                className='mr-2 mt-0.5 flex-shrink-0 text-red-500 dark:text-red-400'
              />
              <p className='text-[11px] text-red-600 dark:text-red-400 font-inter'>
                {errors.submit}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className='flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700'>
          <Button
            type='button'
            variant='outline'
            onClick={onClose}
            disabled={loading}
            className='text-theme-xs'
          >
            Hủy
          </Button>
          <Button type='submit' variant='primary' disabled={loading} className='text-theme-xs'>
            {loading ? (
              <span className='flex items-center gap-2'>
                <span className='animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full'></span>
                Đang cập nhật...
              </span>
            ) : (
              <span className='flex items-center gap-2'>
                <Save className='w-3.5 h-3.5' />
                Cập nhật
              </span>
            )}
          </Button>
        </div>
      </form>
    </AdminModal>
  );
};

export default EditScheduleModal;
