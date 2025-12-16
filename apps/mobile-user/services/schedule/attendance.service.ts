/**
 * Attendance Service
 * IMPROVEMENT: Service to handle class attendance check-in and check-out
 */

import { scheduleApiService } from './api.service';

class AttendanceService {
  private get baseUrl() {
    const { SERVICE_URLS } = require('@/config/environment');
    return SERVICE_URLS.SCHEDULE;
  }

  /**
   * IMPROVEMENT: Confirm checkout from a class schedule
   * POST /schedules/:schedule_id/attendance/check-out/confirm
   */
  async confirmCheckout(scheduleId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await scheduleApiService.post(
        `/schedules/${scheduleId}/attendance/check-out/confirm`
      );

      return {
        success: response.success || true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('[ATTENDANCE] Confirm checkout error:', error);
      return {
        success: false,
        error: error.message || 'Failed to confirm checkout',
      };
    }
  }

  /**
   * Get attendance for a schedule
   */
  async getScheduleAttendance(scheduleId: string): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const response = await scheduleApiService.get(
        `/schedules/${scheduleId}/attendance`
      );

      return {
        success: response.success || true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('[ATTENDANCE] Get attendance error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get attendance',
      };
    }
  }

  /**
   * Get member attendance for a schedule
   */
  async getMemberAttendance(
    scheduleId: string,
    memberId: string
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await scheduleApiService.get(
        `/schedules/${scheduleId}/attendance/member/${memberId}`
      );

      return {
        success: response.success || true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('[ATTENDANCE] Get member attendance error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get member attendance',
      };
    }
  }

  /**
   * Scan QR code to check-in/check-out
   * POST /attendance/qr-scan
   */
  async scanQRCodeCheckInOut(
    qrData: string,
    memberId: string
  ): Promise<{
    success: boolean;
    data?: {
      attendance: any;
      check_in_time?: string;
      check_out_time?: string;
      method: string;
    };
    error?: string;
  }> {
    try {
      const response = await scheduleApiService.post('/attendance/qr-scan', {
        qr_data: qrData,
        member_id: memberId,
      });

      return {
        success: response.success || true,
        data: response.data,
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to scan QR code';
      const isEarlyCheckoutError =
        errorMessage.includes('not available at this time') ||
        errorMessage.includes('Check-out is not available') ||
        errorMessage.includes('không khả dụng');

      // Don't log early checkout errors as errors (they're expected business logic)
      if (isEarlyCheckoutError) {
        console.log(
          '[ATTENDANCE] Early checkout attempt (expected):',
          errorMessage
        );
      } else {
        console.error('[ATTENDANCE] Scan QR code error:', error);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Submit rating for class and trainer
   * POST /schedules/:schedule_id/attendance/:member_id/rating
   */
  async submitRating(
    scheduleId: string,
    memberId: string,
    rating: {
      class_rating?: number | null;
      trainer_rating?: number | null;
      feedback_notes?: string | null;
    }
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await scheduleApiService.post(
        `/schedules/${scheduleId}/attendance/${memberId}/rating`,
        rating
      );

      return {
        success: response.success || true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('[ATTENDANCE] Submit rating error:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit rating',
      };
    }
  }
}

export const attendanceService = new AttendanceService();
