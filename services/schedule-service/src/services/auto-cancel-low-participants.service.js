// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const notificationService = require('./notification.service.js');

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Service để tự động hủy lớp khi không đủ học viên tối thiểu
 */
class AutoCancelLowParticipantsService {
  /**
   * Send notification with retry mechanism and exponential backoff
   * @param {string} userId - User ID to send notification to
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @param {number} maxRetries - Maximum number of retries (default: 3)
   * @returns {Promise<boolean>} True if notification sent successfully
   */
  async sendNotificationWithRetry(userId, type, data, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await notificationService.sendNotification(userId, type, data);
        if (attempt > 0) {
          console.log(
            `[AUTO-CANCEL] Successfully sent notification to user ${userId} after ${attempt + 1} attempt(s)`
          );
        }
        return true;
      } catch (error) {
        if (attempt === maxRetries - 1) {
          console.error(
            `[AUTO-CANCEL] Failed to send notification to user ${userId} after ${maxRetries} attempts:`,
            error.message
          );
          return false;
        }
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt) * 1000;
        console.warn(
          `[AUTO-CANCEL] Notification attempt ${attempt + 1} failed for user ${userId}, retrying in ${delayMs}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    return false;
  }

  /**
   * Kiểm tra và hủy các lớp không đủ học viên tối thiểu
   * Chạy trước 1 ngày so với thời gian bắt đầu lớp
   */
  async checkAndCancelLowParticipantSchedules() {
    const startTime = Date.now();
    let totalChecked = 0;
    let totalCancelled = 0;
    let totalNotificationsSent = 0;
    let totalNotificationsFailed = 0;

    try {
      // Get current time in Vietnam timezone
      const vnTime = dayjs().tz('Asia/Ho_Chi_Minh');
      const now = vnTime.utc().toDate();

      // Calculate time range: schedules starting tomorrow
      // Add buffer time: at least 1 hour before class starts (TC-AUTO-CANCEL-008)
      const bufferHours = 1; // Minimum 1 hour before class starts
      const oneDayFromNow = vnTime.add(1, 'day').startOf('day').add(bufferHours, 'hour').utc().toDate();
      const oneDayFromNowEnd = vnTime.add(1, 'day').endOf('day').utc().toDate();

      console.log(
        `[AUTO-CANCEL] ========================================`
      );
      console.log(
        `[AUTO-CANCEL] Starting check at ${vnTime.format('YYYY-MM-DD HH:mm:ss')} (GMT+7)`
      );
      console.log(
        `[AUTO-CANCEL] Checking schedules starting between ${oneDayFromNow.toISOString()} and ${oneDayFromNowEnd.toISOString()}`
      );
      console.log(
        `[AUTO-CANCEL] Buffer time: ${bufferHours} hour(s) before class starts`
      );

      // Find schedules that:
      // 1. Are SCHEDULED status
      // 2. Have minimum_participants set (not null and > 0)
      // 3. Start tomorrow (1 day from now, with buffer time)
      const schedulesToCheck = await prisma.schedule.findMany({
        where: {
          status: 'SCHEDULED',
          minimum_participants: {
            not: null,
            gt: 0, // Ensure minimum_participants > 0 (TC-AUTO-CANCEL-009)
          },
          start_time: {
            gte: oneDayFromNow,
            lte: oneDayFromNowEnd,
          },
        },
        include: {
          gym_class: {
            select: {
              id: true,
              name: true,
            },
          },
          trainer: {
            select: {
              id: true,
              user_id: true,
              full_name: true,
            },
          },
          bookings: {
            where: {
              status: 'CONFIRMED',
            },
            select: {
              id: true,
              member_id: true,
            },
          },
        },
      });

      totalChecked = schedulesToCheck.length;
      console.log(
        `[AUTO-CANCEL] Found ${totalChecked} schedule(s) with minimum_participants requirement to check`
      );

      const cancellationReason =
        'Lớp học đã bị tự động hủy do không đủ số học viên tối thiểu trước 1 ngày diễn ra';

      // Process each schedule
      for (const schedule of schedulesToCheck) {
        const currentBookings = schedule.bookings.length;
        const minimumRequired = schedule.minimum_participants;

        console.log(
          `[AUTO-CANCEL] Checking schedule ${schedule.id} (${schedule.gym_class.name}): ${currentBookings}/${minimumRequired} participants`
        );

        if (currentBookings < minimumRequired) {
          console.log(
            `[AUTO-CANCEL] ⚠️  Schedule ${schedule.id} (${schedule.gym_class.name}) has ${currentBookings} bookings but requires ${minimumRequired}. Proceeding with cancellation...`
          );

          try {
            // TC-AUTO-CANCEL-001: Double-check with transaction to avoid race condition
            // TC-AUTO-CANCEL-012: Use transaction for atomicity
            const result = await prisma.$transaction(
              async tx => {
                // Double-check: Lock schedule and re-count bookings
                const lockedSchedule = await tx.schedule.findUnique({
                  where: { id: schedule.id },
                  select: {
                    id: true,
                    status: true,
                    current_bookings: true,
                    special_notes: true,
                  },
                });

                // TC-AUTO-CANCEL-006: Check if already cancelled
                if (!lockedSchedule || lockedSchedule.status !== 'SCHEDULED') {
                  console.log(
                    `[AUTO-CANCEL] Schedule ${schedule.id} is no longer SCHEDULED (status: ${lockedSchedule?.status || 'NOT_FOUND'}), skipping...`
                  );
                  return { cancelled: false, reason: 'already_processed' };
                }

                // Re-count bookings to avoid race condition
                const finalBookingsCount = await tx.booking.count({
                  where: {
                    schedule_id: schedule.id,
                    status: 'CONFIRMED',
                  },
                });

                // Double-check: If bookings increased, don't cancel
                if (finalBookingsCount >= minimumRequired) {
                  console.log(
                    `[AUTO-CANCEL] Schedule ${schedule.id} now has ${finalBookingsCount} bookings (required: ${minimumRequired}), cancellation cancelled`
                  );
                  return { cancelled: false, reason: 'sufficient_participants' };
                }

                // Get count of bookings to cancel (for current_bookings update)
                const bookingsToCancelCount = finalBookingsCount;

                // Update schedule status to CANCELLED
                await tx.schedule.update({
                  where: { id: schedule.id },
                  data: {
                    status: 'CANCELLED',
                    // TC-AUTO-CANCEL-002: Update current_bookings
                    current_bookings: {
                      decrement: bookingsToCancelCount,
                    },
                    special_notes: lockedSchedule.special_notes
                      ? `${lockedSchedule.special_notes}\n\n[Auto-cancelled] ${cancellationReason}`
                      : `[Auto-cancelled] ${cancellationReason}`,
                  },
                });

                // Cancel all CONFIRMED bookings for this schedule
                const cancelledBookings = await tx.booking.updateMany({
                  where: {
                    schedule_id: schedule.id,
                    status: 'CONFIRMED',
                  },
                  data: {
                    status: 'CANCELLED',
                    cancelled_at: new Date(),
                    cancellation_reason: cancellationReason,
                  },
                });

                return {
                  cancelled: true,
                  bookingsCancelled: cancelledBookings.count,
                };
              },
              {
                isolationLevel: 'Serializable', // Highest isolation level to prevent race conditions
                timeout: 30000, // 30 seconds timeout
              }
            );

            if (!result.cancelled) {
              console.log(
                `[AUTO-CANCEL] Schedule ${schedule.id} was not cancelled: ${result.reason}`
              );
              continue;
            }

            // Get waitlist bookings (TC-AUTO-CANCEL-005)
            const waitlistBookings = await prisma.booking.findMany({
              where: {
                schedule_id: schedule.id,
                status: 'WAITLIST',
              },
              select: {
                id: true,
                member_id: true,
              },
            });

            console.log(
              `[AUTO-CANCEL] ✅ Schedule ${schedule.id} cancelled successfully. ${result.bookingsCancelled} booking(s) cancelled, ${waitlistBookings.length} waitlist member(s) found`
            );

            // TC-AUTO-CANCEL-004: Send notifications with retry
            // Notify trainer
            if (schedule.trainer && schedule.trainer.user_id) {
              const trainerNotified = await this.sendNotificationWithRetry(
                schedule.trainer.user_id,
                'SCHEDULE_CANCELLED',
                {
                  schedule_id: schedule.id,
                  class_id: schedule.gym_class.id,
                  class_name: schedule.gym_class.name,
                  trainer_id: schedule.trainer.id,
                  trainer_name: schedule.trainer.full_name,
                  cancellation_reason: cancellationReason,
                  current_bookings: currentBookings,
                  minimum_participants: minimumRequired,
                  role: 'TRAINER',
                }
              );

              if (trainerNotified) {
                totalNotificationsSent++;
              } else {
                totalNotificationsFailed++;
                console.error(
                  `[AUTO-CANCEL] ❌ Failed to notify trainer ${schedule.trainer.user_id} after retries`
                );
              }
            } else {
              console.warn(
                `[AUTO-CANCEL] ⚠️  Trainer ${schedule.trainer?.id || 'unknown'} has no user_id, skipping notification`
              );
            }

            // Notify all CONFIRMED members who booked this schedule
            const memberIds = schedule.bookings.map(booking => booking.member_id);
            for (const memberId of memberIds) {
              try {
                const memberNotified = await this.sendNotificationWithRetry(
                  memberId,
                  'SCHEDULE_CANCELLED',
                  {
                    schedule_id: schedule.id,
                    class_id: schedule.gym_class.id,
                    class_name: schedule.gym_class.name,
                    trainer_id: schedule.trainer?.id,
                    trainer_name: schedule.trainer?.full_name || 'Huấn luyện viên',
                    cancellation_reason: cancellationReason,
                    role: 'MEMBER',
                  }
                );

                if (memberNotified) {
                  totalNotificationsSent++;
                } else {
                  totalNotificationsFailed++;
                  console.error(
                    `[AUTO-CANCEL] ❌ Failed to notify member ${memberId} after retries`
                  );
                }
              } catch (error) {
                totalNotificationsFailed++;
                console.error(
                  `[AUTO-CANCEL] ❌ Error notifying member ${memberId}:`,
                  error.message
                );
              }
            }

            // TC-AUTO-CANCEL-005: Notify waitlist members
            for (const waitlistBooking of waitlistBookings) {
              try {
                const waitlistNotified = await this.sendNotificationWithRetry(
                  waitlistBooking.member_id,
                  'SCHEDULE_CANCELLED',
                  {
                    schedule_id: schedule.id,
                    class_id: schedule.gym_class.id,
                    class_name: schedule.gym_class.name,
                    trainer_id: schedule.trainer?.id,
                    trainer_name: schedule.trainer?.full_name || 'Huấn luyện viên',
                    cancellation_reason: cancellationReason,
                    role: 'MEMBER',
                    is_waitlist: true,
                  }
                );

                if (waitlistNotified) {
                  totalNotificationsSent++;
                } else {
                  totalNotificationsFailed++;
                  console.error(
                    `[AUTO-CANCEL] ❌ Failed to notify waitlist member ${waitlistBooking.member_id} after retries`
                  );
                }
              } catch (error) {
                totalNotificationsFailed++;
                console.error(
                  `[AUTO-CANCEL] ❌ Error notifying waitlist member ${waitlistBooking.member_id}:`,
                  error.message
                );
              }
            }

            totalCancelled++;
            console.log(
              `[AUTO-CANCEL] ✅ Schedule ${schedule.id} processed: ${result.bookingsCancelled} booking(s) cancelled, ${memberIds.length} member(s) + ${waitlistBookings.length} waitlist member(s) notified`
            );
          } catch (error) {
            console.error(
              `[AUTO-CANCEL] ❌ Error cancelling schedule ${schedule.id}:`,
              error.message
            );
            console.error(`[AUTO-CANCEL] Error stack:`, error.stack);
          }
        } else {
          console.log(
            `[AUTO-CANCEL] ✓ Schedule ${schedule.id} has ${currentBookings} bookings (required: ${minimumRequired}). No action needed.`
          );
        }
      }

      // Summary logging (TC-AUTO-CANCEL-014)
      const duration = Date.now() - startTime;
      console.log(
        `[AUTO-CANCEL] ========================================`
      );
      console.log(`[AUTO-CANCEL] Summary:`);
      console.log(`[AUTO-CANCEL]   - Total checked: ${totalChecked}`);
      console.log(`[AUTO-CANCEL]   - Total cancelled: ${totalCancelled}`);
      console.log(`[AUTO-CANCEL]   - Notifications sent: ${totalNotificationsSent}`);
      console.log(`[AUTO-CANCEL]   - Notifications failed: ${totalNotificationsFailed}`);
      console.log(`[AUTO-CANCEL]   - Duration: ${duration}ms`);
      console.log(
        `[AUTO-CANCEL] ========================================`
      );

      if (totalCancelled > 0) {
        console.log(
          `[SUCCESS] Auto-cancel completed. Cancelled ${totalCancelled} schedule(s) due to low participants`
        );
      } else {
        console.log(
          `[SUCCESS] Auto-cancel completed. No schedules needed to be cancelled`
        );
      }

      return {
        success: true,
        totalChecked,
        totalCancelled,
        totalNotificationsSent,
        totalNotificationsFailed,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[ERROR] Error in auto-cancel low participants service:', error);
      console.error('[ERROR] Error stack:', error.stack);
      console.error(`[ERROR] Duration before error: ${duration}ms`);

      return {
        success: false,
        error: error.message,
        totalChecked,
        totalCancelled,
        totalNotificationsSent,
        totalNotificationsFailed,
        duration,
      };
    }
  }
}

module.exports = new AutoCancelLowParticipantsService();
