/**
 * Booking Improvements Service
 *
 * This service implements various improvements to the booking system:
 * - Cancellation policy with refund calculation
 * - Cancellation history tracking
 * - Booking reminders
 * - Waitlist auto-promote notifications
 */

const { prisma } = require('../lib/prisma.js');
const axios = require('axios');

const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:3003';

class BookingImprovementsService {
  /**
   * Calculate cancellation refund based on policy
   * Policy:
   * - Cancel before 24h: 100% refund
   * - Cancel before 12h: 50% refund
   * - Cancel after 12h: No refund
   */
  calculateCancellationRefund(booking, schedule) {
    const now = new Date();
    const scheduleStartTime = new Date(schedule.start_time);
    const hoursUntilStart = (scheduleStartTime - now) / (1000 * 60 * 60);

    let refundPercentage = 0;
    let refundPolicy = 'NO_REFUND';

    if (hoursUntilStart >= 24) {
      refundPercentage = 100;
      refundPolicy = 'FULL_REFUND';
    } else if (hoursUntilStart >= 12) {
      refundPercentage = 50;
      refundPolicy = 'PARTIAL_REFUND';
    } else {
      refundPercentage = 0;
      refundPolicy = 'NO_REFUND';
    }

    const originalAmount = booking.amount_paid || 0;
    const refundAmount = (originalAmount * refundPercentage) / 100;

    return {
      refundPercentage,
      refundAmount,
      refundPolicy,
      hoursUntilStart: Math.round(hoursUntilStart * 10) / 10,
      originalAmount,
    };
  }

  /**
   * Track cancellation history for a member
   */
  async trackCancellationHistory(memberId, bookingId, cancellationReason, refundInfo) {
    try {
      // Store cancellation history in a JSON field or separate table
      // For now, we'll use the existing cancellation_reason field
      // In the future, we can create a separate CancellationHistory table

      const cancellationRecord = {
        booking_id: bookingId,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: cancellationReason,
        refund_info: refundInfo,
      };

      // Get member's cancellation history (stored in member service)
      // For now, we'll just log it
      console.log('[CANCELLATION_HISTORY]', {
        member_id: memberId,
        ...cancellationRecord,
      });

      return cancellationRecord;
    } catch (error) {
      console.error('[ERROR] Failed to track cancellation history:', error);
      // Don't fail cancellation if history tracking fails
      return null;
    }
  }

  /**
   * Get cancellation history for a member
   */
  async getCancellationHistory(memberId, limit = 10) {
    try {
      const cancellations = await prisma.booking.findMany({
        where: {
          member_id: memberId,
          status: 'CANCELLED',
          cancelled_at: { not: null },
        },
        include: {
          schedule: {
            include: {
              gym_class: true,
            },
          },
        },
        orderBy: {
          cancelled_at: 'desc',
        },
        take: limit,
      });

      return cancellations.map(booking => ({
        booking_id: booking.id,
        schedule_id: booking.schedule_id,
        class_name: booking.schedule?.gym_class?.name || 'Unknown',
        cancelled_at: booking.cancelled_at,
        cancellation_reason: booking.cancellation_reason,
        refund_amount: booking.amount_paid || 0,
      }));
    } catch (error) {
      console.error('[ERROR] Failed to get cancellation history:', error);
      return [];
    }
  }

  /**
   * Check cancellation penalty for a member
   * Penalty rules:
   * - Cancel > 3 times in 30 days: -10 points
   * - Cancel > 5 times in 30 days: Block booking for 7 days
   */
  async checkCancellationPenalty(memberId) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentCancellations = await prisma.booking.count({
        where: {
          member_id: memberId,
          status: 'CANCELLED',
          cancelled_at: {
            gte: thirtyDaysAgo,
          },
        },
      });

      let penalty = null;
      if (recentCancellations > 5) {
        penalty = {
          type: 'BLOCK_BOOKING',
          duration_days: 7,
          message:
            'Bạn đã hủy quá nhiều lớp trong 30 ngày. Bạn sẽ không thể đặt lớp trong 7 ngày tới.',
        };
      } else if (recentCancellations > 3) {
        penalty = {
          type: 'DEDUCT_POINTS',
          points: -10,
          message: 'Bạn đã hủy nhiều lớp. Bị trừ 10 điểm.',
        };
      }

      return {
        recentCancellations,
        penalty,
      };
    } catch (error) {
      console.error('[ERROR] Failed to check cancellation penalty:', error);
      return {
        recentCancellations: 0,
        penalty: null,
      };
    }
  }

  /**
   * Send booking reminder notification
   * Sends reminder at 3 times: 1 hour, 30 minutes, and 15 minutes before class starts
   * Only sends once per time window to avoid duplicates
   */
  async sendBookingReminder(booking, schedule, reminderMinutes) {
    try {
      const notificationService = require('./notification.service.js');

      const scheduleStartTime = new Date(schedule.start_time);
      const now = new Date();
      const minutesUntilStart = (scheduleStartTime - now) / (1000 * 60);

      // Define time windows for each reminder (with 2-minute buffer to account for cron timing)
      const timeWindows = {
        60: { min: 58, max: 62 }, // 1 hour: 58-62 minutes
        30: { min: 28, max: 32 }, // 30 minutes: 28-32 minutes
        15: { min: 13, max: 17 }, // 15 minutes: 13-17 minutes
      };

      const window = timeWindows[reminderMinutes];
      if (!window) {
        console.warn(
          `[WARNING] Invalid reminder minutes: ${reminderMinutes}. Only 60, 30, or 15 are supported.`
        );
        return;
      }

      // Only send if within the time window
      if (minutesUntilStart >= window.min && minutesUntilStart <= window.max) {
        // Check if reminder has already been sent for this booking and time window
        // Query identity service to check for existing notification
        try {
          const identityServiceUrl = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';
          const memberService = require('./member.service.js');
          const member = await memberService.getMemberById(booking.member_id);

          if (!member?.user_id) {
            console.warn(
              `[WARNING] Cannot send reminder: member ${booking.member_id} has no user_id`
            );
            return;
          }

          // Check if notification already exists for this booking and reminder time
          const checkResponse = await axios.get(
            `${identityServiceUrl}/notifications/user/${member.user_id}`,
            {
              params: {
                type: 'CLASS_REMINDER',
                limit: 100,
              },
              timeout: 5000,
            }
          );

          if (checkResponse.data?.success && checkResponse.data?.data) {
            const notifications = Array.isArray(checkResponse.data.data)
              ? checkResponse.data.data
              : checkResponse.data.data.notifications || [];

            // Check if reminder for this schedule and time window already exists
            const existingReminder = notifications.find(
              notif =>
                notif.type === 'CLASS_REMINDER' &&
                notif.data?.schedule_id === schedule.id &&
                notif.data?.reminder_minutes === reminderMinutes &&
                // Check if notification was created recently (within last 10 minutes)
                new Date(notif.created_at) > new Date(now.getTime() - 10 * 60 * 1000)
            );

            if (existingReminder) {
              console.log(
                `[SKIP] Reminder for booking ${booking.id} at ${reminderMinutes} minutes already sent`
              );
              return;
            }
          }
        } catch (checkError) {
          // If check fails, continue to send reminder (fail-safe)
          console.warn(
            `[WARNING] Failed to check existing reminders, proceeding to send:`,
            checkError.message
          );
        }

        // Get member info
        const memberService = require('./member.service.js');
        const member = await memberService.getMemberById(booking.member_id);

        if (member?.user_id) {
          const timeText =
            reminderMinutes === 60 ? '1 giờ' : reminderMinutes === 30 ? '30 phút' : '15 phút';

          await notificationService.sendNotification({
            user_id: member.user_id,
            type: 'CLASS_REMINDER',
            title: `Nhắc nhở lớp học - ${timeText}`,
            message: `Lớp ${
              schedule.gym_class?.name || 'Lớp học'
            } sẽ bắt đầu sau ${timeText}. Vui lòng đến đúng giờ!`,
            data: {
              booking_id: booking.id,
              schedule_id: schedule.id,
              class_name: schedule.gym_class?.name || 'Lớp học',
              start_time: schedule.start_time,
              room_name: schedule.room?.name || 'Phòng tập',
              reminder_minutes: reminderMinutes,
            },
            channels: ['IN_APP', 'PUSH', 'EMAIL'],
          });

          console.log(
            `[SUCCESS] Sent ${reminderMinutes}-minute reminder for booking ${booking.id}`
          );
        }
      }
    } catch (error) {
      console.error('[ERROR] Failed to send booking reminder:', error);
      // Don't fail if reminder fails
    }
  }

  /**
   * Send waitlist auto-promote notification
   */
  async sendWaitlistPromoteNotification(booking, schedule) {
    try {
      const notificationService = require('./notification.service.js');

      // Get member info
      const memberService = require('./member.service.js');
      const member = await memberService.getMemberById(booking.member_id);

      if (member?.user_id) {
        await notificationService.sendNotification({
          user_id: member.user_id,
          type: 'WAITLIST_PROMOTED',
          title: 'Chúc mừng! Bạn đã được nâng cấp từ danh sách chờ',
          message: `Bạn đã được nâng cấp từ danh sách chờ cho lớp ${
            schedule.gym_class?.name || 'Lớp học'
          }. Vui lòng xác nhận tham gia!`,
          data: {
            booking_id: booking.id,
            schedule_id: schedule.id,
            class_name: schedule.gym_class?.name || 'Lớp học',
            start_time: schedule.start_time,
            promoted_at: new Date().toISOString(),
          },
          channels: ['IN_APP', 'PUSH', 'SMS'],
        });
      }
    } catch (error) {
      console.error('[ERROR] Failed to send waitlist promote notification:', error);
      // Don't fail if notification fails
    }
  }

  /**
   * Process refund for cancelled booking
   */
  async processRefund(booking, refundInfo) {
    try {
      console.log('[REFUND] processRefund called:', {
        bookingId: booking.id,
        refundAmount: refundInfo.refundAmount,
        refundPolicy: refundInfo.refundPolicy,
      });

      if (refundInfo.refundAmount <= 0) {
        console.log('[REFUND] No refund required - refundAmount is 0 or negative');
        return {
          success: true,
          message: 'No refund required',
          refundAmount: 0,
          refundStatus: 'NO_REFUND',
        };
      }

      // Get payment_id from billing service using reference_id (booking.id)
      let paymentId = null;
      try {
        console.log('[REFUND] Looking up payment for booking:', booking.id);

        // Try multiple approaches to find payment
        // Approach 1: Search by reference_id and payment_type (try PAID first)
        let paymentResponse = null;
        let payments = [];

        // Try with COMPLETED status first (billing-service uses COMPLETED, not PAID)
        // Also try PENDING status in case payment was just created
        try {
          paymentResponse = await axios.get(`${BILLING_SERVICE_URL}/payments`, {
            params: {
              reference_id: booking.id,
              payment_type: 'CLASS_BOOKING',
              // Don't filter by status - get all payments for this booking
            },
          });

          // Handle response
          console.log('[REFUND] Payment response structure:', {
            success: paymentResponse.data?.success,
            hasData: !!paymentResponse.data?.data,
            dataType: Array.isArray(paymentResponse.data?.data)
              ? 'array'
              : typeof paymentResponse.data?.data,
            dataLength: Array.isArray(paymentResponse.data?.data)
              ? paymentResponse.data.data.length
              : 'N/A',
            fullResponse: JSON.stringify(paymentResponse.data, null, 2).substring(0, 500),
          });

          if (paymentResponse.data?.success) {
            if (Array.isArray(paymentResponse.data.data)) {
              payments = paymentResponse.data.data;
              console.log('[REFUND] Found payments array with', payments.length, 'items');
            } else if (
              paymentResponse.data.data?.payments &&
              Array.isArray(paymentResponse.data.data.payments)
            ) {
              payments = paymentResponse.data.data.payments;
              console.log(
                '[REFUND] Found payments in data.payments with',
                payments.length,
                'items'
              );
            } else if (paymentResponse.data.data && typeof paymentResponse.data.data === 'object') {
              payments = [paymentResponse.data.data];
              console.log('[REFUND] Found single payment object');
            } else {
              console.log('[REFUND] No payments found in response');
            }
          } else {
            console.log('[REFUND] Response not successful:', paymentResponse.data?.message);
          }
        } catch (completedError) {
          console.log(
            '[REFUND] No payment found with COMPLETED status, trying without status filter...'
          );
        }

        // If still not found, try without status filter (to find any payment for this booking)
        if (payments.length === 0) {
          try {
            paymentResponse = await axios.get(`${BILLING_SERVICE_URL}/payments`, {
              params: {
                reference_id: booking.id,
                payment_type: 'CLASS_BOOKING',
              },
            });

            if (paymentResponse.data?.success) {
              if (Array.isArray(paymentResponse.data.data)) {
                payments = paymentResponse.data.data;
              } else if (
                paymentResponse.data.data?.payments &&
                Array.isArray(paymentResponse.data.data.payments)
              ) {
                payments = paymentResponse.data.data.payments;
              } else if (
                paymentResponse.data.data &&
                typeof paymentResponse.data.data === 'object'
              ) {
                payments = [paymentResponse.data.data];
              }
            }
          } catch (noStatusError) {
            console.log('[REFUND] No payment found without status filter');
          }
        }

        // If still not found, try searching by member_id and reference_id
        if (payments.length === 0 && booking.member_id) {
          try {
            console.log('[REFUND] Trying to find payment by member_id and reference_id...');
            paymentResponse = await axios.get(`${BILLING_SERVICE_URL}/payments`, {
              params: {
                member_id: booking.member_id,
                reference_id: booking.id,
                payment_type: 'CLASS_BOOKING',
              },
            });

            if (paymentResponse.data?.success) {
              if (Array.isArray(paymentResponse.data.data)) {
                payments = paymentResponse.data.data;
              } else if (
                paymentResponse.data.data?.payments &&
                Array.isArray(paymentResponse.data.data.payments)
              ) {
                payments = paymentResponse.data.data.payments;
              } else if (
                paymentResponse.data.data &&
                typeof paymentResponse.data.data === 'object'
              ) {
                payments = [paymentResponse.data.data];
              }
            }
          } catch (memberError) {
            console.log('[REFUND] No payment found by member_id');
          }
        }

        console.log('[REFUND] Parsed payments:', payments.length);
        if (paymentResponse?.data) {
          console.log(
            '[REFUND] Full payment response:',
            JSON.stringify(paymentResponse.data, null, 2).substring(0, 1000)
          );
        }
        console.log(
          '[REFUND] Payment details:',
          payments.map(p => ({
            id: p.id,
            reference_id: p.reference_id,
            payment_type: p.payment_type,
            status: p.status,
            amount: p.amount,
            member_id: p.member_id,
          }))
        );

        // Log if no payments found
        if (payments.length === 0) {
          console.warn('[REFUND] WARNING: No payments found in response!');
          console.warn('[REFUND] This could mean:');
          console.warn('[REFUND] 1. Payment was not created when booking was made');
          console.warn('[REFUND] 2. Payment reference_id does not match booking.id');
          console.warn('[REFUND] 3. Payment was deleted or moved');
          console.warn('[REFUND] Booking details:', {
            bookingId: booking.id,
            memberId: booking.member_id,
            paymentStatus: booking.payment_status,
            amountPaid: booking.amount_paid,
          });
        }

        // Find payment with matching reference_id and acceptable status
        // Note: billing-service may use COMPLETED or PAID for successful payments
        // Also accept PENDING status in case payment was just created but not yet confirmed
        let payment = payments.find(
          p =>
            p.reference_id === booking.id &&
            p.payment_type === 'CLASS_BOOKING' &&
            (p.status === 'COMPLETED' ||
              p.status === 'PAID' ||
              p.status === 'PROCESSING' ||
              p.status === 'PENDING')
        );

        // If not found with status filter, try without status filter
        if (!payment && payments.length > 0) {
          const paymentWithoutStatus = payments.find(
            p => p.reference_id === booking.id && p.payment_type === 'CLASS_BOOKING'
          );
          if (paymentWithoutStatus) {
            console.log(
              '[REFUND] Found payment but with unexpected status:',
              paymentWithoutStatus.status
            );
            // Only use if status is not FAILED or CANCELLED
            // Accept PAID, COMPLETED, PROCESSING, PENDING for refund
            if (
              paymentWithoutStatus.status !== 'FAILED' &&
              paymentWithoutStatus.status !== 'CANCELLED' &&
              (paymentWithoutStatus.status === 'PAID' ||
                paymentWithoutStatus.status === 'COMPLETED' ||
                paymentWithoutStatus.status === 'PROCESSING' ||
                paymentWithoutStatus.status === 'PENDING')
            ) {
              payment = paymentWithoutStatus;
              console.log('[REFUND] Using payment with status:', payment.status);
            } else {
              console.warn(
                '[REFUND] Payment found but status is not eligible for refund:',
                paymentWithoutStatus.status
              );
            }
          }
        }

        if (payment?.id) {
          paymentId = payment.id;
          console.log('[REFUND] Found payment ID:', paymentId, 'Status:', payment.status);
        } else {
          console.log('[REFUND] No matching payment found for booking:', booking.id);
          console.log(
            '[REFUND] Available payments:',
            payments.map(p => ({
              id: p.id,
              reference_id: p.reference_id,
              payment_type: p.payment_type,
              status: p.status,
            }))
          );
        }

        // If still not found, try searching all payments for this member and match by amount (last resort)
        if (!paymentId && payments.length === 0 && booking.member_id && booking.amount_paid) {
          try {
            console.log('[REFUND] Trying to find payment by member_id and amount (last resort)...');
            const allPaymentsResponse = await axios.get(`${BILLING_SERVICE_URL}/payments`, {
              params: {
                member_id: booking.member_id,
                payment_type: 'CLASS_BOOKING',
                limit: 100, // Get more results
              },
            });

            if (allPaymentsResponse.data?.success) {
              let allPayments = [];
              if (Array.isArray(allPaymentsResponse.data.data)) {
                allPayments = allPaymentsResponse.data.data;
              } else if (
                allPaymentsResponse.data.data?.payments &&
                Array.isArray(allPaymentsResponse.data.data.payments)
              ) {
                allPayments = allPaymentsResponse.data.data.payments;
              } else if (
                allPaymentsResponse.data.data &&
                typeof allPaymentsResponse.data.data === 'object'
              ) {
                allPayments = [allPaymentsResponse.data.data];
              }

              // Try to find payment by matching amount and status
              // Note: billing-service may use COMPLETED or PAID for successful payments
              const matchingPayment = allPayments.find(
                p =>
                  parseFloat(p.amount) === parseFloat(booking.amount_paid) &&
                  (p.status === 'COMPLETED' || p.status === 'PAID' || p.status === 'PROCESSING') &&
                  p.payment_type === 'CLASS_BOOKING'
              );

              if (matchingPayment?.id) {
                paymentId = matchingPayment.id;
                console.log('[REFUND] Found payment by amount matching:', paymentId, {
                  reference_id: matchingPayment.reference_id,
                  booking_id: booking.id,
                });
              } else {
                console.log('[REFUND] No payment found matching amount:', booking.amount_paid);
              }
            }
          } catch (allPaymentsError) {
            console.log('[REFUND] Error searching all member payments:', allPaymentsError.message);
          }
        }

        console.log('[REFUND] Final payment lookup result:', {
          paymentId,
          bookingId: booking.id,
          memberId: booking.member_id,
          paymentStatus: booking.payment_status,
          amountPaid: booking.amount_paid,
        });
      } catch (paymentError) {
        console.error('[ERROR] Failed to get payment by reference_id:', paymentError.message);
        console.error('[ERROR] Payment error details:', {
          status: paymentError.response?.status,
          statusText: paymentError.response?.statusText,
          data: paymentError.response?.data,
          url: paymentError.config?.url,
        });
        // If payment lookup fails, we can't create refund
        // Don't throw - return error result instead
        return {
          success: false,
          message: `Payment lookup failed: ${paymentError.message}`,
          refundAmount: refundInfo.refundAmount,
          refundStatus: 'FAILED',
          error: 'PAYMENT_LOOKUP_FAILED',
        };
      }

      if (!paymentId) {
        console.error('[ERROR] Payment ID is null - cannot create refund');
        console.error('[ERROR] Booking details:', {
          bookingId: booking.id,
          memberId: booking.member_id,
          paymentStatus: booking.payment_status,
          amountPaid: booking.amount_paid,
        });

        // If booking is marked as PAID but payment not found, try to create payment record
        // This handles the case where payment was confirmed but payment record was not created in billing service
        if (booking.payment_status === 'PAID' && booking.amount_paid > 0) {
          console.log('[REFUND] Attempting to create missing payment record...');
          try {
            const createPaymentResponse = await axios.post(
              `${BILLING_SERVICE_URL}/payments`,
              {
                member_id: booking.member_id,
                amount: booking.amount_paid,
                currency: 'VND',
                status: 'COMPLETED',
                payment_method: 'BANK_TRANSFER', // Default assumption
                payment_type: 'CLASS_BOOKING',
                reference_id: booking.id,
                description: `Payment for booking ${booking.id}`,
                net_amount: booking.amount_paid,
                processed_at: booking.cancelled_at || new Date(), // Use cancelled_at or now
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                },
                timeout: 10000,
              }
            );

            if (createPaymentResponse.data?.success && createPaymentResponse.data?.data?.id) {
              paymentId = createPaymentResponse.data.data.id;
              console.log('[REFUND] Created missing payment record:', paymentId);
            } else {
              console.error('[ERROR] Failed to create payment record:', createPaymentResponse.data);
            }
          } catch (createPaymentError) {
            console.error('[ERROR] Error creating payment record:', {
              message: createPaymentError.message,
              status: createPaymentError.response?.status,
              data: createPaymentError.response?.data,
            });
          }
        }

        // If still no paymentId, return error
        if (!paymentId) {
          return {
            success: false,
            message: 'Payment not found for this booking. Please ensure payment was completed.',
            refundAmount: refundInfo.refundAmount,
            refundStatus: 'FAILED',
            error: 'PAYMENT_NOT_FOUND',
          };
        }
      }

      // Call billing service to create refund request
      console.log('[REFUND] Creating refund request:', {
        url: `${BILLING_SERVICE_URL}/refunds`,
        payment_id: paymentId,
        amount: refundInfo.refundAmount,
        reason: 'CANCELLATION',
        requested_by: 'SYSTEM',
        bookingId: booking.id,
      });

      try {
        const refundResponse = await axios.post(
          `${BILLING_SERVICE_URL}/refunds`,
          {
            payment_id: paymentId,
            amount: refundInfo.refundAmount,
            reason: 'CANCELLATION',
            requested_by: 'SYSTEM', // System-initiated refund
            notes: `Refund for booking cancellation. Policy: ${refundInfo.refundPolicy}`,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 seconds timeout
          }
        );

        console.log('[REFUND] Refund creation response status:', refundResponse.status);
        console.log(
          '[REFUND] Refund creation response data:',
          JSON.stringify(refundResponse.data, null, 2)
        );

        if (refundResponse.data?.success) {
          const refundData = refundResponse.data.data;
          console.log('[REFUND] Refund created successfully:', {
            refundId: refundData?.id,
            status: refundData?.status,
            amount: refundData?.amount,
            payment_id: refundData?.payment_id,
          });
          return {
            success: true,
            message: 'Refund request created successfully. Waiting for admin approval.',
            refundAmount: refundInfo.refundAmount,
            refundId: refundData?.id,
            refundStatus: refundData?.status || 'PENDING',
            refundPolicy: refundInfo.refundPolicy,
          };
        } else {
          console.error('[ERROR] Refund creation failed - response not successful:', {
            message: refundResponse.data?.message,
            data: refundResponse.data,
          });
          return {
            success: false,
            message: refundResponse.data?.message || 'Refund processing failed',
            refundAmount: refundInfo.refundAmount,
            refundStatus: 'FAILED',
            error: 'REFUND_CREATION_FAILED',
          };
        }
      } catch (refundError) {
        console.error('[ERROR] Refund creation axios error:', {
          message: refundError.message,
          status: refundError.response?.status,
          statusText: refundError.response?.statusText,
          data: refundError.response?.data,
          url: refundError.config?.url,
          method: refundError.config?.method,
        });
        return {
          success: false,
          message: `Failed to create refund: ${refundError.message}`,
          refundAmount: refundInfo.refundAmount,
          refundStatus: 'FAILED',
          error: 'REFUND_CREATION_ERROR',
          errorDetails: refundError.response?.data,
        };
      }
    } catch (error) {
      console.error('[ERROR] Failed to process refund:', error);
      // Return error but don't fail cancellation
      return {
        success: false,
        message: error.message || 'Refund processing failed',
        refundAmount: refundInfo.refundAmount,
        refundStatus: 'FAILED',
      };
    }
  }

  /**
   * Get refund info for a booking
   */
  async getRefundInfo(bookingId) {
    try {
      // First, get payment by reference_id
      let paymentId = null;
      try {
        const paymentResponse = await axios.get(`${BILLING_SERVICE_URL}/payments`, {
          params: {
            reference_id: bookingId,
            payment_type: 'CLASS_BOOKING',
          },
        });

        if (paymentResponse.data?.success) {
          const payments = Array.isArray(paymentResponse.data.data)
            ? paymentResponse.data.data
            : paymentResponse.data.data?.payments || [];

          const payment = payments.find(
            p => p.reference_id === bookingId && p.payment_type === 'CLASS_BOOKING'
          );

          if (payment?.id) {
            paymentId = payment.id;
          }
        }
      } catch (paymentError) {
        console.error('[ERROR] Payment lookup failed:', paymentError);
        return null;
      }

      if (!paymentId) {
        return null;
      }

      // Get refunds for this payment
      const refundsResponse = await axios.get(
        `${BILLING_SERVICE_URL}/refunds/payment/${paymentId}`
      );

      if (refundsResponse.data?.success && refundsResponse.data?.data) {
        const refunds = Array.isArray(refundsResponse.data.data)
          ? refundsResponse.data.data
          : [refundsResponse.data.data];

        // Get the most recent refund for this payment
        const refund = refunds.find(r => r.payment_id === paymentId) || refunds[0];
        return refund;
      }

      return null;
    } catch (error) {
      console.error('[ERROR] Failed to get refund info:', error);
      return null;
    }
  }
}

module.exports = new BookingImprovementsService();
