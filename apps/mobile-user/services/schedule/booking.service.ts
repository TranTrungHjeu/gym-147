import {
  Booking,
  BookingFilters,
  BookingStats,
  CancelBookingRequest,
  CreateBookingRequest,
} from '@/types/classTypes';
import { scheduleApiService } from './api.service';

class BookingService {
  // Get base URL from centralized config
  private get baseUrl() {
    const { SERVICE_URLS } = require('@/config/environment');
    return `${SERVICE_URLS.SCHEDULE}/bookings`;
  }

  /**
   * Get all bookings for a member
   * @param memberId - Member ID
   * @param filters - Optional filters for bookings
   */
  async getMemberBookings(
    memberId: string,
    filters?: BookingFilters
  ): Promise<{
    success: boolean;
    data?: Booking[];
    error?: string;
  }> {
    try {
      console.log('[DATA] Getting bookings for member:', memberId);
      console.log('[DATE] Filters:', filters);

      const response = await scheduleApiService.get(
        `/bookings/members/${memberId}`,
        {
          params: filters,
        }
      );

      console.log('[DATE] Bookings API response:', {
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        fullResponse: JSON.stringify(response.data, null, 2),
      });

      // Handle different response structures
      // Backend returns: { success: true, data: { bookings: [...], pagination: {...} } }
      let bookings = [];
      if (response.data?.data?.bookings) {
        // Standard backend format: { success: true, data: { bookings: [...] } }
        bookings = response.data.data.bookings;
      } else if (response.data?.bookings) {
        // Alternative format: { bookings: [...] }
        bookings = response.data.bookings;
      } else if (Array.isArray(response.data?.data)) {
        // Direct array in data.data
        bookings = response.data.data;
      } else if (Array.isArray(response.data)) {
        // Direct array in data
        bookings = response.data;
      } else {
        console.warn('[WARNING] Unexpected response structure:', response.data);
        bookings = [];
      }

      console.log('[DATE] Extracted bookings:', bookings.length, 'bookings');

      return {
        success: true,
        data: bookings,
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching member bookings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get booking by ID
   */
  async getBookingById(id: string): Promise<{
    success: boolean;
    data?: Booking;
    error?: string;
  }> {
    try {
      console.log('[DATE] Getting booking by ID:', id);

      const response = await scheduleApiService.get(`/bookings/${id}`);

      console.log('[DATE] Booking by ID API response:', {
        hasData: !!response.data,
        dataType: typeof response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        fullResponse: JSON.stringify(response.data, null, 2),
      });

      // Handle different response structures
      let booking: Booking | undefined;
      if (response.data?.data) {
        booking = response.data.data;
      } else if (response.data?.booking) {
        booking = response.data.booking;
      } else if (response.data?.id) {
        // response.data is the booking itself
        booking = response.data;
      } else {
        booking = response.data;
      }

      console.log('[DATE] Extracted booking:', {
        id: booking?.id,
        payment_status: booking?.payment_status,
        status: booking?.status,
      });

      return {
        success: true,
        data: booking,
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching booking:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(bookingData: CreateBookingRequest): Promise<{
    success: boolean;
    data?: Booking | any;
    payment?: any;
    paymentRequired?: boolean;
    paymentInitiation?: any;
    error?: string;
  }> {
    try {
      const response = await scheduleApiService.post('/bookings', bookingData);

      // Handle response structure
      const responseData = response.data?.data || response.data;
      const booking = responseData?.booking || responseData;
      
      return {
        success: true,
        data: booking,
        payment: responseData?.payment,
        paymentRequired: responseData?.paymentRequired || false,
        paymentInitiation: responseData?.paymentInitiation,
      };
    } catch (error: any) {
      console.error('[ERROR] Error creating booking:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(
    bookingId: string,
    cancellationData?: CancelBookingRequest
  ): Promise<{
    success: boolean;
    data?: Booking;
    refund?: any; // Refund info if available
    error?: string;
  }> {
    try {
      console.log('[DATE] Cancelling booking:', bookingId);
      console.log('[DATE] Cancellation data:', cancellationData);

      const response = await scheduleApiService.put(
        `/bookings/${bookingId}/cancel`,
        cancellationData
      );

      console.log('[DATE] Booking cancelled successfully:', response.data);

      // Handle different response structures
      const responseData = response.data?.data || response.data;
      const booking = responseData?.booking || responseData;
      const refund = responseData?.refund || null;

      return {
        success: true,
        data: booking,
        refund: refund, // Include refund info in response
      };
    } catch (error: any) {
      console.error('[ERROR] Error cancelling booking:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        fullError: error,
      });

      // Extract error message from response if available
      let errorMessage = error.message || 'Không thể hủy đặt lớp';
      
      if (error.response?.data) {
        // Backend returns structured error response
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }

      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  /**
   * Get bookings for a specific schedule
   */
  async getScheduleBookings(scheduleId: string): Promise<{
    success: boolean;
    data?: Booking[];
    error?: string;
  }> {
    try {
      console.log('[DATE] Getting bookings for schedule:', scheduleId);

      const response = await scheduleApiService.get(
        `/bookings/schedule/${scheduleId}`
      );

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching schedule bookings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get waitlist for a schedule
   */
  async getScheduleWaitlist(scheduleId: string): Promise<{
    success: boolean;
    data?: Booking[];
    error?: string;
  }> {
    try {
      console.log('[DATE] Getting waitlist for schedule:', scheduleId);

      const response = await scheduleApiService.get(
        `/bookings/schedule/${scheduleId}/waitlist`
      );

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching schedule waitlist:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove from waitlist
   */
  async removeFromWaitlist(bookingId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('[DATE] Removing from waitlist:', bookingId);

      await scheduleApiService.delete(`/bookings/${bookingId}/waitlist`);

      console.log('[DATE] Removed from waitlist successfully');

      return { success: true };
    } catch (error: any) {
      console.error('[ERROR] Error removing from waitlist:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Promote from waitlist (admin only)
   */
  async promoteFromWaitlist(bookingId: string): Promise<{
    success: boolean;
    data?: Booking;
    error?: string;
  }> {
    try {
      console.log('[DATE] Promoting from waitlist:', bookingId);

      const response = await scheduleApiService.post(
        `/bookings/${bookingId}/promote`
      );

      console.log('[DATE] Promoted from waitlist successfully:', response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('[ERROR] Error promoting from waitlist:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get booking statistics for a member
   */
  async getMemberBookingStats(memberId: string): Promise<{
    success: boolean;
    data?: BookingStats;
    error?: string;
  }> {
    try {
      console.log('[DATE] Getting booking stats for member:', memberId);

      const response = await scheduleApiService.get(
        `/bookings/members/${memberId}/stats`
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching booking stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if member can book a schedule
   */
  async canBookSchedule(
    memberId: string,
    scheduleId: string
  ): Promise<{
    success: boolean;
    canBook: boolean;
    reason?: string;
    error?: string;
  }> {
    try {
      console.log('[DATE] Checking if member can book schedule:', {
        memberId,
        scheduleId,
      });

      const response = await scheduleApiService.get(
        `/bookings/check-availability/${scheduleId}`,
        { params: { member_id: memberId } }
      );

      return {
        success: true,
        canBook: response.data.can_book,
        reason: response.data.reason,
      };
    } catch (error: any) {
      console.error('[ERROR] Error checking booking availability:', error);
      return { success: false, canBook: false, error: error.message };
    }
  }

  /**
   * Get upcoming bookings for a member
   */
  async getUpcomingBookings(memberId: string): Promise<{
    success: boolean;
    data?: Booking[];
    error?: string;
  }> {
    try {
      console.log('[DATE] Getting upcoming bookings for member:', memberId);

      const response = await scheduleApiService.get(
        `/bookings/members/${memberId}`,
        {
          params: {
            status: 'CONFIRMED',
            date_from: new Date().toISOString(),
          },
        }
      );

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching upcoming bookings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get past bookings for a member
   */
  async getPastBookings(memberId: string): Promise<{
    success: boolean;
    data?: Booking[];
    error?: string;
  }> {
    try {
      console.log('[DATE] Getting past bookings for member:', memberId);

      const response = await scheduleApiService.get(
        `/bookings/members/${memberId}`,
        {
          params: {
            status: 'COMPLETED',
            date_to: new Date().toISOString(),
          },
        }
      );

      return {
        success: true,
        data: response.data?.data || response.data || [],
      };
    } catch (error: any) {
      console.error('[ERROR] Error fetching past bookings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Initiate payment for waitlist booking
   * POST /bookings/:id/initiate-payment
   */
  async initiateWaitlistPayment(bookingId: string, memberId?: string): Promise<{
    success: boolean;
    data?: {
      booking: Booking;
      payment?: any;
      paymentInitiation?: any;
      paymentRequired?: boolean;
    };
    error?: string;
  }> {
    try {
      console.log('[DATE] Initiating payment for waitlist booking:', bookingId);

      const response = await scheduleApiService.post(
        `/bookings/${bookingId}/initiate-payment`,
        memberId ? { member_id: memberId } : {}
      );

      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      console.error('[ERROR] Error initiating payment for waitlist booking:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * IMPROVEMENT: Get cancellation history for a member
   * GET /bookings/members/:member_id/cancellation-history
   */
  async getCancellationHistory(
    memberId: string,
    limit: number = 20
  ): Promise<{
    success: boolean;
    data?: Array<{
      booking_id: string;
      schedule_id: string;
      class_name: string;
      cancelled_at: string;
      cancellation_reason: string;
      refund_amount: number;
    }>;
    error?: string;
  }> {
    try {
      const response = await scheduleApiService.get(
        `/bookings/members/${memberId}/cancellation-history`,
        {
          params: { limit },
        }
      );

      return {
        success: response.success || true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('[BOOKING] Get cancellation history error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get cancellation history',
      };
    }
  }
}

export const bookingService = new BookingService();
export default bookingService;
