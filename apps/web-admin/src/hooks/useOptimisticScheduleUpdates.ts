import { useState, useEffect, useCallback, useRef } from 'react';
import { ScheduleItem } from '@/types/schedule';

interface BookingUpdateEvent {
  booking_id: string;
  schedule_id: string;
  class_name?: string;
  member_name?: string;
  member_id?: string;
  payment_status?: 'PENDING' | 'PAID';
  booked_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  current_bookings?: number;
  max_capacity?: number;
}

/**
 * Hook for optimistic schedule updates from socket events
 * Updates schedules in real-time without full page reload
 */
export function useOptimisticScheduleUpdates(
  schedules: ScheduleItem[],
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleItem[]>>
) {
  const [updatedScheduleIds, setUpdatedScheduleIds] = useState<Set<string>>(new Set());
  const processedEventsRef = useRef<Set<string>>(new Set());

  // Handle booking:new event - add booking to schedule
  const handleBookingNew = useCallback(
    (data: BookingUpdateEvent) => {
      if (!data.schedule_id) return;

      const eventId = `booking:new:${data.booking_id}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      setSchedules(prev => {
        return prev.map(schedule => {
          if (schedule.id !== data.schedule_id) return schedule;

          // Update current_bookings if provided
          const newCurrentBookings = data.current_bookings ?? schedule.current_bookings ?? 0;
          const updatedBookings = schedule.bookings || [];

          // Check if booking already exists
          const bookingExists = updatedBookings.some(
            (b: any) => b.id === data.booking_id || b.booking_id === data.booking_id
          );

          if (!bookingExists && data.booking_id) {
            // Add new booking optimistically
            updatedBookings.push({
              id: data.booking_id,
              booking_id: data.booking_id,
              member_id: data.member_id,
              member_name: data.member_name,
              payment_status: data.payment_status || 'PENDING',
              booked_at: data.booked_at || new Date().toISOString(),
              status: data.payment_status === 'PAID' ? 'CONFIRMED' : 'PENDING',
            });
          }

          return {
            ...schedule,
            current_bookings: newCurrentBookings,
            bookings: updatedBookings,
            // Mark as updated for animation
            _updated: true,
          };
        });
      });

      // Mark schedule for animation
      setUpdatedScheduleIds(prev => {
        const newSet = new Set(prev);
        newSet.add(data.schedule_id);
        return newSet;
      });

      // Remove animation class after animation completes
      setTimeout(() => {
        setUpdatedScheduleIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.schedule_id);
          return newSet;
        });
        processedEventsRef.current.delete(eventId);
      }, 2000);
    },
    [setSchedules]
  );

  // Handle booking:confirmed event - update booking status
  const handleBookingConfirmed = useCallback(
    (data: BookingUpdateEvent) => {
      if (!data.schedule_id) return;

      const eventId = `booking:confirmed:${data.booking_id}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      setSchedules(prev => {
        return prev.map(schedule => {
          if (schedule.id !== data.schedule_id) return schedule;

          const updatedBookings = (schedule.bookings || []).map((booking: any) => {
            if (booking.id === data.booking_id || booking.booking_id === data.booking_id) {
              return {
                ...booking,
                payment_status: 'PAID',
                status: 'CONFIRMED',
                _updated: true,
              };
            }
            return booking;
          });

          // Update current_bookings if provided
          const newCurrentBookings = data.current_bookings ?? schedule.current_bookings ?? 0;

          return {
            ...schedule,
            current_bookings: newCurrentBookings,
            bookings: updatedBookings,
            _updated: true,
          };
        });
      });

      // Mark schedule for animation
      setUpdatedScheduleIds(prev => {
        const newSet = new Set(prev);
        newSet.add(data.schedule_id);
        return newSet;
      });

      setTimeout(() => {
        setUpdatedScheduleIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.schedule_id);
          return newSet;
        });
        processedEventsRef.current.delete(eventId);
      }, 2000);
    },
    [setSchedules]
  );

  // Handle booking:cancelled event - remove booking from schedule
  const handleBookingCancelled = useCallback(
    (data: BookingUpdateEvent) => {
      if (!data.schedule_id) return;

      const eventId = `booking:cancelled:${data.booking_id}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      setSchedules(prev => {
        return prev.map(schedule => {
          if (schedule.id !== data.schedule_id) return schedule;

          // Remove cancelled booking
          const updatedBookings = (schedule.bookings || []).filter(
            (booking: any) =>
              booking.id !== data.booking_id && booking.booking_id !== data.booking_id
          );

          // Decrement current_bookings
          const newCurrentBookings = Math.max(
            0,
            (schedule.current_bookings ?? 0) - 1
          );

          return {
            ...schedule,
            current_bookings: newCurrentBookings,
            bookings: updatedBookings,
            _updated: true,
          };
        });
      });

      // Mark schedule for animation
      setUpdatedScheduleIds(prev => {
        const newSet = new Set(prev);
        newSet.add(data.schedule_id);
        return newSet;
      });

      setTimeout(() => {
        setUpdatedScheduleIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.schedule_id);
          return newSet;
        });
        processedEventsRef.current.delete(eventId);
      }, 2000);
    },
    [setSchedules]
  );

  // Handle member:checked_in event - update attendance
  const handleMemberCheckedIn = useCallback(
    (data: { schedule_id: string; member_id: string; member_name?: string }) => {
      if (!data.schedule_id) return;

      const eventId = `member:checked_in:${data.schedule_id}:${data.member_id}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      setSchedules(prev => {
        return prev.map(schedule => {
          if (schedule.id !== data.schedule_id) return schedule;

          // Update attendance if it exists
          const updatedAttendance = (schedule.attendance || []).map((attendance: any) => {
            if (attendance.member_id === data.member_id) {
              return {
                ...attendance,
                checked_in_at: new Date().toISOString(),
                _updated: true,
              };
            }
            return attendance;
          });

          // If attendance doesn't exist, we might need to add it
          // But for now, we'll just mark the schedule as updated
          const hasAttendance = updatedAttendance.some(
            (a: any) => a.member_id === data.member_id
          );

          if (!hasAttendance) {
            // Attendance will be updated when schedule is refetched
            // For now, just mark as updated
            return {
              ...schedule,
              _updated: true,
              _checked_in: true,
            };
          }

          return {
            ...schedule,
            attendance: updatedAttendance,
            _updated: true,
          };
        });
      });

      // Mark schedule for animation
      setUpdatedScheduleIds(prev => {
        const newSet = new Set(prev);
        newSet.add(data.schedule_id);
        return newSet;
      });

      setTimeout(() => {
        setUpdatedScheduleIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.schedule_id);
          return newSet;
        });
        processedEventsRef.current.delete(eventId);
      }, 2000);
    },
    [setSchedules]
  );

  // Setup event listeners
  useEffect(() => {
    const handleBookingUpdated = (event: CustomEvent) => {
      const data = event.detail as BookingUpdateEvent;
      console.log('[NOTIFY] [OPTIMISTIC_UPDATE] booking:updated event received:', data);

      // Determine which handler to use based on data
      if (data.cancelled_at || data.cancellation_reason) {
        handleBookingCancelled(data);
      } else if (data.payment_status === 'PAID' && data.booking_id) {
        // Check if this is a new booking or confirmed booking
        const schedule = schedules.find(s => s.id === data.schedule_id);
        const bookingExists = schedule?.bookings?.some(
          (b: any) => b.id === data.booking_id || b.booking_id === data.booking_id
        );

        if (bookingExists) {
          handleBookingConfirmed(data);
        } else {
          handleBookingNew({ ...data, payment_status: 'PAID' });
        }
      } else if (data.booking_id) {
        handleBookingNew(data);
      }
    };

    const handleBookingNewEvent = (event: CustomEvent) => {
      const data = event.detail as BookingUpdateEvent;
      console.log('[NOTIFY] [OPTIMISTIC_UPDATE] booking:new event received:', data);
      handleBookingNew(data);
    };

    const handleBookingConfirmedEvent = (event: CustomEvent) => {
      const data = event.detail as BookingUpdateEvent;
      console.log('[NOTIFY] [OPTIMISTIC_UPDATE] booking:confirmed event received:', data);
      handleBookingConfirmed(data);
    };

    const handleBookingCancelledEvent = (event: CustomEvent) => {
      const data = event.detail as BookingUpdateEvent;
      console.log('[NOTIFY] [OPTIMISTIC_UPDATE] booking:cancelled event received:', data);
      handleBookingCancelled(data);
    };

    const handleMemberCheckedInEvent = (event: CustomEvent) => {
      const data = event.detail as { schedule_id: string; member_id: string; member_name?: string };
      console.log('[NOTIFY] [OPTIMISTIC_UPDATE] member:checked_in event received:', data);
      handleMemberCheckedIn(data);
    };

    window.addEventListener('booking:updated', handleBookingUpdated as EventListener);
    window.addEventListener('booking:new', handleBookingNewEvent as EventListener);
    window.addEventListener('booking:confirmed', handleBookingConfirmedEvent as EventListener);
    window.addEventListener('booking:cancelled', handleBookingCancelledEvent as EventListener);
    window.addEventListener('member:checked_in', handleMemberCheckedInEvent as EventListener);

    return () => {
      window.removeEventListener('booking:updated', handleBookingUpdated as EventListener);
      window.removeEventListener('booking:new', handleBookingNewEvent as EventListener);
      window.removeEventListener('booking:confirmed', handleBookingConfirmedEvent as EventListener);
      window.removeEventListener('booking:cancelled', handleBookingCancelledEvent as EventListener);
      window.removeEventListener('member:checked_in', handleMemberCheckedInEvent as EventListener);
    };
  }, [
    schedules,
    handleBookingNew,
    handleBookingConfirmed,
    handleBookingCancelled,
    handleMemberCheckedIn,
  ]);

  return {
    updatedScheduleIds,
  };
}

