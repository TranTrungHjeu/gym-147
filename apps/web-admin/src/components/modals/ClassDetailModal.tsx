import { motion } from 'framer-motion';
import { X, Users, User, Calendar, Clock, MapPin } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { scheduleService, GymClass } from '../../services/schedule.service';
import AdminModal from '../common/AdminModal';

interface Schedule {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  trainer?: {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
  };
  room?: {
    id: string;
    name: string;
  };
  bookings?: Array<{
    id: string;
    member_id: string;
    status: string;
    member?: {
      id: string;
      user_id: string;
      full_name: string;
      email: string;
      phone: string;
    } | null;
  }>;
}

interface ClassDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  gymClass: GymClass | null;
}

const ClassDetailModal: React.FC<ClassDetailModalProps> = ({ isOpen, onClose, gymClass }) => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && gymClass) {
      loadClassDetails();
    } else {
      setSchedules([]);
      setError(null);
    }
  }, [isOpen, gymClass]);

  const loadClassDetails = async () => {
    if (!gymClass?.id) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await scheduleService.getClassById(gymClass.id);
      console.log('[LIST] Class detail response:', response);
      
      if (response.success && response.data) {
        const classData = response.data as any;
        // Backend returns { class: { schedules: [...] } }
        // Backend now hydrates member details for bookings
        const schedulesData = classData.class?.schedules || classData.schedules || [];
        console.log('[DATE] Schedules data:', schedulesData);
        console.log('[DATE] First schedule:', schedulesData[0]);
        console.log('[DATE] First schedule bookings:', schedulesData[0]?.bookings);
        console.log('[DATE] First booking member:', schedulesData[0]?.bookings?.[0]?.member);
        
        setSchedules(schedulesData);
      }
    } catch (err: any) {
      setError('Không thể tải thông tin lớp học');
      console.error('Error loading class details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique trainers from all schedules
  const trainers = useMemo(() => {
    const trainerMap = new Map<string, Schedule['trainer']>();
    schedules.forEach(schedule => {
      if (schedule.trainer && schedule.trainer.id) {
        trainerMap.set(schedule.trainer.id, schedule.trainer);
      }
    });
    const trainersList = Array.from(trainerMap.values()).filter(Boolean);
    console.log('👨‍🏫 Trainers extracted:', trainersList);
    return trainersList;
  }, [schedules]);

  // Get all members from all bookings
  const members = useMemo(() => {
    const memberMap = new Map<string, NonNullable<Schedule['bookings']>[0]['member']>();
    schedules.forEach(schedule => {
      if (schedule.bookings && Array.isArray(schedule.bookings)) {
        schedule.bookings.forEach(booking => {
          if (booking.member && booking.member.id && booking.status === 'CONFIRMED') {
            memberMap.set(booking.member.id, booking.member);
          }
        });
      }
    });
    const membersList = Array.from(memberMap.values()).filter(Boolean);
    console.log('👥 Members extracted:', membersList);
    return membersList;
  }, [schedules]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chi tiết lớp học: ${gymClass?.name || ''}`}
      size='lg'
    >
      <div className='space-y-6'>
        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <div className='w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin' />
          </div>
        ) : error ? (
          <div className='text-center py-12 text-theme-xs text-red-600 dark:text-red-400 font-inter'>
            {error}
          </div>
        ) : (
          <>
            {/* Trainers Section */}
            <div>
              <div className='flex items-center gap-2 mb-4'>
                <User className='w-5 h-5 text-orange-600 dark:text-orange-400' />
                <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white'>
                  Huấn luyện viên ({trainers.length})
                </h3>
              </div>
              {trainers.length === 0 ? (
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter py-4'>
                  Chưa có huấn luyện viên
                </div>
              ) : (
                <div className='space-y-2'>
                  {trainers.map(trainer => (
                    <div
                      key={trainer?.id}
                      role='button'
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('👨‍🏫 Trainer clicked:', trainer);
                        if (trainer?.user_id || trainer?.full_name) {
                          const searchName = trainer.full_name || '';
                          const url = `/management/users?search=${encodeURIComponent(searchName)}&role=TRAINER`;
                          console.log('[LINK] Navigating to:', url);
                          navigate(url);
                          onClose();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('👨‍🏫 Trainer key pressed:', trainer);
                          if (trainer?.user_id || trainer?.full_name) {
                            const searchName = trainer.full_name || '';
                            const url = `/management/users?search=${encodeURIComponent(searchName)}&role=TRAINER`;
                            console.log('[LINK] Navigating to:', url);
                            navigate(url);
                            onClose();
                          }
                        }
                      }}
                      className={`p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 ${
                        trainer?.user_id || trainer?.full_name ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2' : ''
                      }`}
                    >
                      <div className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                        {trainer?.full_name || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Members Section */}
            <div>
              <div className='flex items-center gap-2 mb-4'>
                <Users className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white'>
                  Thành viên đã đăng ký ({members.length})
                </h3>
              </div>
              {members.length === 0 ? (
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter py-4'>
                  Chưa có thành viên đăng ký
                </div>
              ) : (
                <div className='space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar'>
                  {members.map(member => (
                    <div
                      key={member?.id}
                      role='button'
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('👥 Member clicked:', member);
                        if (member?.user_id || member?.id || member?.full_name) {
                          const searchName = member.full_name || '';
                          const url = `/management/users?search=${encodeURIComponent(searchName)}&role=MEMBER`;
                          console.log('[LINK] Navigating to:', url);
                          navigate(url);
                          onClose();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('👥 Member key pressed:', member);
                          if (member?.user_id || member?.id || member?.full_name) {
                            const searchName = member.full_name || '';
                            const url = `/management/users?search=${encodeURIComponent(searchName)}&role=MEMBER`;
                            console.log('[LINK] Navigating to:', url);
                            navigate(url);
                            onClose();
                          }
                        }
                      }}
                      className={`p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 ${
                        member?.user_id || member?.id || member?.full_name ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2' : ''
                      }`}
                    >
                      <div className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                        {member?.full_name || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminModal>
  );
};

export default ClassDetailModal;

