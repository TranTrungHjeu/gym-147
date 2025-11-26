import { useState, useEffect, useCallback, useRef } from 'react';
import { eventManager } from '@/services/event-manager.service';

export interface Booking {
  id: string;
  booking_id?: string;
  schedule_id: string;
  member_id: string;
  member_name?: string;
  payment_status: 'PENDING' | 'PAID' | 'REFUNDED';
  status?: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  booked_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  [key: string]: any;
}

export interface BookingUpdateEvent {
  booking_id?: string;
  id?: string;
  schedule_id?: string;
  member_id?: string;
  member_name?: string;
  payment_status?: 'PENDING' | 'PAID' | 'REFUNDED';
  status?: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  booked_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  current_bookings?: number;
  max_capacity?: number;
  class_name?: string;
  data?: {
    booking_id?: string;
    id?: string;
    schedule_id?: string;
    member_id?: string;
    payment_status?: 'PENDING' | 'PAID' | 'REFUNDED';
    [key: string]: any;
  };
  timestamp?: string;
}

/**
 * Hook for optimistic booking updates from socket events
 * Updates bookings in real-time without full page reload
 */
export function useOptimisticBookingUpdates(
  bookings: Booking[],
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>
) {
  const [updatedBookingIds, setUpdatedBookingIds] = useState<Set<string>>(new Set());
  const processedEventsRef = useRef<Set<string>>(new Set());

  // Handle booking:new event
  const handleBookingNew = useCallback(
    (data: BookingUpdateEvent) => {
      const bookingId = data.booking_id || data.id || data.data?.booking_id || data.data?.id;
      if (!bookingId) return;

      const eventId = `booking:new:${bookingId}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      setBookings(prev => {
        // Check if booking already exists
        const exists = prev.some(b => b.id === bookingId || b.booking_id === bookingId);
        if (exists) return prev;

        // Create new booking from data
        const newBooking: Booking = {
          id: bookingId,
          booking_id: bookingId,
          schedule_id: data.schedule_id || data.data?.schedule_id || '',
          member_id: data.member_id || data.data?.member_id || '',
          member_name: data.member_name || data.data?.member_name,
          payment_status: data.payment_status || data.data?.payment_status || 'PENDING',
          status: data.status || (data.payment_status === 'PAID' ? 'CONFIRMED' : 'PENDING'),
          booked_at: data.booked_at || data.timestamp || new Date().toISOString(),
        };

        return [newBooking, ...prev];
      });

      // Mark booking for animation
      setUpdatedBookingIds(prev => {
        const newSet = new Set(prev);
        newSet.add(bookingId);
        return newSet;
      });

      setTimeout(() => {
        setUpdatedBookingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookingId);
          return newSet;
        });
        processedEventsRef.current.delete(eventId);
      }, 2000);
    },
    [setBookings]
  );

  // Handle booking:confirmed event
  const handleBookingConfirmed = useCallback(
    (data: BookingUpdateEvent) => {
      const bookingId = data.booking_id || data.id || data.data?.booking_id || data.data?.id;
      if (!bookingId) return;

      const eventId = `booking:confirmed:${bookingId}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      setBookings(prev => {
        return prev.map(booking => {
          if (booking.id !== bookingId && booking.booking_id !== bookingId) return booking;

          return {
            ...booking,
            payment_status: 'PAID',
            status: 'CONFIRMED',
            updated_at: data.timestamp || new Date().toISOString(),
            _updated: true,
          };
        });
      });

      setUpdatedBookingIds(prev => {
        const newSet = new Set(prev);
        newSet.add(bookingId);
        return newSet;
      });

      setTimeout(() => {
        setUpdatedBookingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookingId);
          return newSet;
        });
        processedEventsRef.current.delete(eventId);
      }, 2000);
    },
    [setBookings]
  );

  // Handle booking:cancelled event
  const handleBookingCancelled = useCallback(
    (data: BookingUpdateEvent) => {
      const bookingId = data.booking_id || data.id || data.data?.booking_id || data.data?.id;
      if (!bookingId) return;

      const eventId = `booking:cancelled:${bookingId}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      setBookings(prev => {
        return prev.filter(booking => 
          booking.id !== bookingId && booking.booking_id !== bookingId
        );
      });

      processedEventsRef.current.delete(eventId);
    },
    [setBookings]
  );

  // Handle booking:status_changed event
  const handleBookingStatusChanged = useCallback(
    (data: BookingUpdateEvent) => {
      const bookingId = data.booking_id || data.id || data.data?.booking_id || data.data?.id;
      if (!bookingId) return;

      const eventId = `booking:status_changed:${bookingId}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      const newStatus = data.status || data.data?.status;
      const newPaymentStatus = data.payment_status || data.data?.payment_status;

      setBookings(prev => {
        return prev.map(booking => {
          if (booking.id !== bookingId && booking.booking_id !== bookingId) return booking;

          return {
            ...booking,
            status: newStatus || booking.status,
            payment_status: newPaymentStatus || booking.payment_status,
            updated_at: data.timestamp || new Date().toISOString(),
            _updated: true,
          };
        });
      });

      setUpdatedBookingIds(prev => {
        const newSet = new Set(prev);
        newSet.add(bookingId);
        return newSet;
      });

      setTimeout(() => {
        setUpdatedBookingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookingId);
          return newSet;
        });
        processedEventsRef.current.delete(eventId);
      }, 2000);
    },
    [setBookings]
  );

  // Handle booking:updated event (generic update)
  const handleBookingUpdated = useCallback(
    (data: BookingUpdateEvent) => {
      const bookingId = data.booking_id || data.id || data.data?.booking_id || data.data?.id;
      if (!bookingId) return;

      // Determine which handler to use
      if (data.cancelled_at || data.cancellation_reason) {
        handleBookingCancelled(data);
      } else if (data.payment_status === 'PAID' || data.status === 'CONFIRMED') {
        handleBookingConfirmed(data);
      } else if (data.status || data.payment_status) {
        handleBookingStatusChanged(data);
      } else {
        // Generic update
        setBookings(prev => {
          return prev.map(booking => {
            if (booking.id !== bookingId && booking.booking_id !== bookingId) return booking;

            return {
              ...booking,
              ...data.data,
              updated_at: data.timestamp || new Date().toISOString(),
              _updated: true,
            };
          });
        });
      }
    },
    [setBookings, handleBookingCancelled, handleBookingConfirmed, handleBookingStatusChanged]
  );

  // Setup event listeners using event manager
  useEffect(() => {
    const subscriptionIds: string[] = [];

    subscriptionIds.push(
      eventManager.subscribe('booking:new', (data) => {
        handleBookingNew(data as BookingUpdateEvent);
      })
    );

    subscriptionIds.push(
      eventManager.subscribe('booking:confirmed', (data) => {
        handleBookingConfirmed(data as BookingUpdateEvent);
      })
    );

    subscriptionIds.push(
      eventManager.subscribe('booking:cancelled', (data) => {
        handleBookingCancelled(data as BookingUpdateEvent);
      })
    );

    subscriptionIds.push(
      eventManager.subscribe('booking:status_changed', (data) => {
        handleBookingStatusChanged(data as BookingUpdateEvent);
      })
    );

    subscriptionIds.push(
      eventManager.subscribe('booking:updated', (data) => {
        handleBookingUpdated(data as BookingUpdateEvent);
      })
    );

    // Cleanup
    return () => {
      subscriptionIds.forEach(id => {
        if (id) eventManager.unsubscribe(id);
      });
    };
  }, [
    handleBookingNew,
    handleBookingConfirmed,
    handleBookingCancelled,
    handleBookingStatusChanged,
    handleBookingUpdated,
  ]);

  return {
    updatedBookingIds,
  };
}

