import React, { useEffect, useState } from 'react';
import { Building2, Users, Ruler, CheckCircle2, XCircle, Wrench, Sparkles, Calendar } from 'lucide-react';
import AdminModal from '../common/AdminModal';
import AdminCard from '../common/AdminCard';
import { scheduleService } from '../../services/schedule.service';

interface Room {
  id: string;
  name: string;
  capacity: number;
  area_sqm?: number;
  equipment: string[];
  amenities: string[];
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'CLEANING' | 'RESERVED';
  maintenance_notes?: string;
}

interface Schedule {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  gym_class?: {
    name: string;
  };
  trainer?: {
    full_name?: string;
  };
}

interface RoomDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
}

const AMENITY_LABELS: { [key: string]: string } = {
  MIRRORS: 'Gương',
  PROJECTOR: 'Máy chiếu',
  SOUND_SYSTEM: 'Hệ thống âm thanh',
  AIR_CONDITIONING: 'Điều hòa',
  VENTILATION: 'Thông gió',
  LIGHTING: 'Ánh sáng',
  FLOORING: 'Sàn chuyên dụng',
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'AVAILABLE':
      return 'Sẵn sàng';
    case 'OCCUPIED':
      return 'Đang sử dụng';
    case 'MAINTENANCE':
      return 'Bảo trì';
    case 'CLEANING':
      return 'Đang dọn dẹp';
    case 'RESERVED':
      return 'Đã đặt';
    default:
      return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800';
    case 'OCCUPIED':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'MAINTENANCE':
      return 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300 border-warning-200 dark:border-warning-800';
    case 'CLEANING':
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    case 'RESERVED':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  }
};

const RoomDetailModal: React.FC<RoomDetailModalProps> = ({ isOpen, onClose, room }) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);

  useEffect(() => {
    if (isOpen && room) {
      loadSchedules();
    } else {
      setSchedules([]);
    }
  }, [isOpen, room]);

  const loadSchedules = async () => {
    if (!room) return;

    try {
      setIsLoadingSchedules(true);
      const response = await scheduleService.getRoomById(room.id);
      if (response.success && response.data?.room?.schedules) {
        setSchedules(response.data.room.schedules);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
      setSchedules([]);
    } finally {
      setIsLoadingSchedules(false);
    }
  };

  if (!room) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title='Chi tiết Phòng tập'
      size='lg'
    >
      <div className='space-y-3 p-3'>
        {/* Basic Information */}
        <div className='grid grid-cols-2 gap-2'>
          <AdminCard padding='sm'>
            <div className='flex items-center justify-between gap-1.5'>
              <div className='min-w-0 flex-1'>
                <p className='text-[9px] font-medium text-gray-600 dark:text-gray-400 font-inter leading-tight'>
                  Tên phòng
                </p>
                <p className='text-[11px] font-bold font-heading text-gray-900 dark:text-white mt-0.5 truncate leading-tight'>
                  {room.name}
                </p>
              </div>
              <div className='flex h-7 w-7 items-center justify-center rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0'>
                <Building2 className='w-3.5 h-3.5 text-orange-600 dark:text-orange-400' />
              </div>
            </div>
          </AdminCard>

          <AdminCard padding='sm'>
            <div className='flex items-center justify-between gap-1.5'>
              <div className='min-w-0 flex-1'>
                <p className='text-[9px] font-medium text-gray-600 dark:text-gray-400 font-inter leading-tight'>
                  Sức chứa
                </p>
                <p className='text-[11px] font-bold font-heading text-gray-900 dark:text-white mt-0.5 leading-tight'>
                  {room.capacity} người
                </p>
              </div>
              <div className='flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30 flex-shrink-0'>
                <Users className='w-3.5 h-3.5 text-blue-600 dark:text-blue-400' />
              </div>
            </div>
          </AdminCard>

          {room.area_sqm && (
            <AdminCard padding='sm'>
              <div className='flex items-center justify-between gap-1.5'>
                <div className='min-w-0 flex-1'>
                  <p className='text-[9px] font-medium text-gray-600 dark:text-gray-400 font-inter leading-tight'>
                    Diện tích
                  </p>
                  <p className='text-[11px] font-bold font-heading text-gray-900 dark:text-white mt-0.5 leading-tight'>
                    {room.area_sqm} m²
                  </p>
                </div>
                <div className='flex h-7 w-7 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30 flex-shrink-0'>
                  <Ruler className='w-3.5 h-3.5 text-green-600 dark:text-green-400' />
                </div>
              </div>
            </AdminCard>
          )}

          <AdminCard padding='sm'>
            <div className='flex items-center justify-between gap-1.5'>
              <div className='min-w-0 flex-1'>
                <p className='text-[9px] font-medium text-gray-600 dark:text-gray-400 font-inter leading-tight'>
                  Trạng thái
                </p>
                <div className='mt-0.5'>
                  <span className={`px-1.5 py-0.5 inline-flex text-[9px] font-semibold font-heading rounded-full border ${getStatusColor(room.status)}`}>
                    {getStatusLabel(room.status)}
                  </span>
                </div>
              </div>
              <div className='flex h-7 w-7 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/30 flex-shrink-0'>
                <CheckCircle2 className='w-3.5 h-3.5 text-purple-600 dark:text-purple-400' />
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Equipment & Amenities */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
          {/* Equipment */}
          {room.equipment && room.equipment.length > 0 && (
            <div className='p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700'>
              <div className='flex items-center gap-2 mb-2'>
                <Wrench className='w-3.5 h-3.5 text-orange-600 dark:text-orange-400' />
                <h3 className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                  Thiết bị
                </h3>
              </div>
              <div className='flex flex-wrap gap-1.5'>
                {room.equipment.map((item, idx) => (
                  <span
                    key={idx}
                    className='inline-flex items-center px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full text-[10px] font-inter border border-orange-200 dark:border-orange-800'
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Amenities */}
          {room.amenities && room.amenities.length > 0 && (
            <div className='p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700'>
              <div className='flex items-center gap-2 mb-2'>
                <Sparkles className='w-3.5 h-3.5 text-blue-600 dark:text-blue-400' />
                <h3 className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                  Tiện ích
                </h3>
              </div>
              <div className='flex flex-wrap gap-1.5'>
                {room.amenities.map((amenity, idx) => (
                  <span
                    key={idx}
                    className='inline-flex items-center px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-[10px] font-inter border border-blue-200 dark:border-blue-800'
                  >
                    {AMENITY_LABELS[amenity] || amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Maintenance Notes */}
        {room.maintenance_notes && (
          <div className='p-2.5 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-200 dark:border-warning-800'>
            <div className='flex items-center gap-1.5 mb-1.5'>
              <XCircle className='w-3.5 h-3.5 text-warning-600 dark:text-warning-400' />
              <h3 className='text-[10px] font-semibold font-heading text-gray-900 dark:text-white'>
                Ghi chú bảo trì
              </h3>
            </div>
            <p className='text-[10px] text-gray-700 dark:text-gray-300 font-inter whitespace-pre-wrap leading-relaxed'>
              {room.maintenance_notes}
            </p>
          </div>
        )}

        {/* Schedules */}
        <div>
          <div className='flex items-center gap-2 mb-2'>
            <Calendar className='w-3.5 h-3.5 text-gray-600 dark:text-gray-400' />
            <h3 className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
              Lịch học ({schedules.length})
            </h3>
          </div>
          {isLoadingSchedules ? (
            <div className='text-center py-6 text-[10px] text-gray-500 dark:text-gray-400 font-inter'>
              Đang tải...
            </div>
          ) : schedules.length === 0 ? (
            <div className='text-center py-6 text-[10px] text-gray-500 dark:text-gray-400 font-inter'>
              Chưa có lịch học nào
            </div>
          ) : (
            <div className='space-y-1.5 max-h-48 overflow-y-auto'>
              {schedules.map(schedule => (
                <div
                  key={schedule.id}
                  className='p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex-1 min-w-0'>
                      <p className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white truncate'>
                        {schedule.gym_class?.name || 'Lớp học không xác định'}
                      </p>
                      <p className='text-[10px] text-gray-600 dark:text-gray-400 font-inter mt-0.5'>
                        {formatDate(schedule.date)} • {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                      </p>
                      {schedule.trainer?.full_name && (
                        <p className='text-[10px] text-gray-500 dark:text-gray-500 font-inter mt-0.5'>
                          HLV: {schedule.trainer.full_name}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold font-heading rounded-full border flex-shrink-0 ${getStatusColor(schedule.status)}`}>
                      {schedule.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminModal>
  );
};

export default RoomDetailModal;

