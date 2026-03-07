import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  BookOpen,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import AdminModal from '../common/AdminModal';
import { CalendarEvent } from '../../services/schedule.service';
import Button from '../ui/Button/Button';

const DISPLAY_TIME_ZONE = 'Asia/Ho_Chi_Minh';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onAttendance?: () => void;
  onEdit?: () => void;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  onClose,
  event,
  onAttendance,
  onEdit,
}) => {
  if (!event) return null;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return {
          label: 'Đã lên lịch',
          color:
            'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800',
          icon: Calendar,
          dotColor: 'bg-orange-500',
        };
      case 'IN_PROGRESS':
        return {
          label: 'Đang diễn ra',
          color:
            'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800',
          icon: Loader2,
          dotColor: 'bg-orange-500',
        };
      case 'COMPLETED':
        return {
          label: 'Hoàn thành',
          color:
            'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800',
          icon: CheckCircle2,
          dotColor: 'bg-orange-500',
        };
      case 'CANCELLED':
        return {
          label: 'Đã hủy',
          color:
            'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
          icon: XCircle,
          dotColor: 'bg-red-500',
        };
      default:
        return {
          label: status,
          color:
            'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
          icon: AlertCircle,
          dotColor: 'bg-gray-500',
        };
    }
  };

  const statusInfo = getStatusInfo(event.status);
  const StatusIcon = statusInfo.icon;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: DISPLAY_TIME_ZONE,
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: DISPLAY_TIME_ZONE,
    });
  };

  const getDuration = () => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours > 0) {
      return `${hours} giờ ${mins > 0 ? `${mins} phút` : ''}`;
    }
    return `${mins} phút`;
  };

  const attendancePercentage =
    event.max_capacity > 0 ? Math.round((event.attendees / event.max_capacity) * 100) : 0;

  const getAttendanceColor = () => {
    if (attendancePercentage >= 80) return 'text-orange-700 dark:text-orange-300';
    if (attendancePercentage >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const footer = (
    <div className='flex items-center justify-end gap-3'>
      {onEdit && (
        <Button
          variant='outline'
          onClick={onEdit}
          className='text-[11px] font-heading px-4 py-2 rounded-none'
        >
          Chỉnh sửa
        </Button>
      )}
      {onAttendance && event.status !== 'CANCELLED' && (
        <Button
          variant='primary'
          onClick={onAttendance}
          className='text-[11px] font-heading px-4 py-2 rounded-none'
        >
          Điểm danh
        </Button>
      )}
      <Button
        variant='outline'
        onClick={onClose}
        className='text-[11px] font-heading px-4 py-2 rounded-none'
      >
        Đóng
      </Button>
    </div>
  );

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title='Chi tiết lịch dạy'
      size='lg'
      square
      footer={footer}
    >
      <div className='space-y-5'>
        {/* Header with Title and Status */}
        <div className='flex items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800'>
          <div className='flex-1'>
            <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white mb-2 leading-tight'>
              {event.class_name || event.title || 'Lớp học'}
            </h3>
            {event.class_name && event.title && event.class_name !== event.title && (
              <div className='flex items-center gap-2'>
                <BookOpen className='w-4 h-4 text-orange-500 dark:text-orange-400' />
                <span className='text-xs text-gray-600 dark:text-gray-400 font-inter'>
                  {event.title}
                </span>
              </div>
            )}
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold font-heading tracking-wide flex-shrink-0 ${statusInfo.color}`}
          >
            <StatusIcon
              className={`w-3.5 h-3.5 ${statusInfo.icon === Loader2 ? 'animate-spin' : ''}`}
            />
            {statusInfo.label}
          </span>
        </div>

        {/* Main Information Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {/* Date */}
          <div className='p-4 bg-white dark:bg-gray-900 rounded-none border border-gray-200 dark:border-gray-800'>
            <div className='flex items-center gap-3 mb-2'>
              <Calendar className='w-4 h-4 text-orange-500 dark:text-orange-400' />
              <span className='text-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                Ngày diễn ra
              </span>
            </div>
            <p className='text-sm font-semibold font-heading text-gray-900 dark:text-white'>
              {formatDate(event.start)}
            </p>
          </div>

          {/* Time */}
          <div className='p-4 bg-white dark:bg-gray-900 rounded-none border border-gray-200 dark:border-gray-800'>
            <div className='flex items-center gap-3 mb-2'>
              <Clock className='w-4 h-4 text-orange-500 dark:text-orange-400' />
              <span className='text-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                Thời gian
              </span>
            </div>
            <p className='text-sm font-semibold font-heading text-gray-900 dark:text-white mb-1'>
              {formatTime(event.start)} - {formatTime(event.end)}
            </p>
            <p className='text-xs text-gray-500 dark:text-gray-400 font-inter'>
              ({getDuration()})
            </p>
          </div>

          {/* Room */}
          <div className='p-4 bg-white dark:bg-gray-900 rounded-none border border-gray-200 dark:border-gray-800'>
            <div className='flex items-center gap-3 mb-2'>
              <MapPin className='w-4 h-4 text-orange-500 dark:text-orange-400' />
              <span className='text-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                Phòng học
              </span>
            </div>
            <p className='text-base font-semibold font-heading text-gray-900 dark:text-white'>
              {event.room || 'Chưa xác định'}
            </p>
          </div>

          {/* Attendance */}
          <div className='p-4 bg-white dark:bg-gray-900 rounded-none border border-gray-200 dark:border-gray-800'>
            <div className='flex items-center gap-3 mb-2'>
              <Users className='w-4 h-4 text-orange-500 dark:text-orange-400' />
              <span className='text-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                Số lượng học viên
              </span>
            </div>
            <div className='flex items-baseline gap-2 mb-2'>
              <p className='text-base font-semibold font-heading text-gray-900 dark:text-white'>
                {event.attendees}/{event.max_capacity}
              </p>
              <span className={`text-sm font-semibold font-heading ${getAttendanceColor()}`}>
                ({attendancePercentage}%)
              </span>
            </div>
            {/* Progress bar */}
            <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-none h-1.5'>
              <div
                className='h-1.5 rounded-none transition-all duration-300 bg-orange-500'
                style={{ width: `${Math.min(attendancePercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div className='pt-4 border-t border-gray-200 dark:border-gray-800'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='flex items-center gap-2'>
              <span className='text-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                Mã lớp:
              </span>
              <span className='text-xs text-gray-600 dark:text-gray-400 font-mono font-inter'>
                {event.id}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                Trạng thái:
              </span>
              <span
                className={`${statusInfo.color} px-2 py-0.5 rounded-none text-xs font-semibold font-heading`}
              >
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </AdminModal>
  );
};

export default EventDetailsModal;
