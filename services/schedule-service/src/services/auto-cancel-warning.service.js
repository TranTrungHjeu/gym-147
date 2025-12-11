/**
 * Auto-Cancel Warning Service
 * Sends warning notifications 24 hours before auto-cancelling a class
 */

const { prisma } = require('../lib/prisma');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const notificationService = require('./notification.service.js');

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Service to send warning notifications before auto-cancelling classes
 */
class AutoCancelWarningService {
  /**
   * Send warning notification 24 hours before auto-cancel
   * This gives trainer and members a chance to find more participants
   */
  async sendWarningNotifications() {
    try {
      // Get current time in Vietnam timezone
      const vnTime = dayjs().tz('Asia/Ho_Chi_Minh');
      const now = vnTime.utc().toDate();

      // Calculate time range: schedules starting in 24 hours (23-25 hours from now)
      const twentyThreeHoursFromNow = vnTime.add(23, 'hour').utc().toDate();
      const twentyFiveHoursFromNow = vnTime.add(25, 'hour').utc().toDate();

      console.log(
        `[AUTO-CANCEL-WARNING] Checking for schedules to warn at ${vnTime.format('YYYY-MM-DD HH:mm:ss')} (GMT+7)`
      );

      // Find schedules that:
      // 1. Are SCHEDULED status
      // 2. Have minimum_participants set (not null and > 0)
      // 3. Start in approximately 24 hours (23-25 hours from now)
      // 4. Current bookings < minimum_participants
      const schedulesToWarn = await prisma.schedule.findMany({
        where: {
          status: 'SCHEDULED',
          minimum_participants: {
            not: null,
            gt: 0,
          },
          start_time: {
            gte: twentyThreeHoursFromNow,
            lte: twentyFiveHoursFromNow,
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

      let totalWarningsSent = 0;
      let totalWarningsFailed = 0;

      for (const schedule of schedulesToWarn) {
        const currentBookings = schedule.bookings.length;
        const minimumRequired = schedule.minimum_participants;

        // Only warn if current bookings < minimum required
        if (currentBookings < minimumRequired) {
          console.log(
            `[AUTO-CANCEL-WARNING] Schedule ${schedule.id} (${schedule.gym_class.name}): ${currentBookings}/${minimumRequired} participants - Sending warnings`
          );

          // Send warning to trainer
          if (schedule.trainer?.user_id) {
            try {
              await notificationService.sendNotification({
                user_id: schedule.trainer.user_id,
                type: 'CLASS_WARNING',
                title: 'Cảnh báo: Lớp học có thể bị hủy',
                message: `Lớp ${schedule.gym_class.name} hiện có ${currentBookings}/${minimumRequired} học viên. Lớp sẽ bị tự động hủy nếu không đủ học viên trong 24 giờ tới.`,
                data: {
                  schedule_id: schedule.id,
                  class_name: schedule.gym_class.name,
                  current_bookings: currentBookings,
                  minimum_participants: minimumRequired,
                  start_time: schedule.start_time,
                  warning_type: 'AUTO_CANCEL_24H',
                },
                channels: ['IN_APP', 'PUSH', 'EMAIL'],
              });
              totalWarningsSent++;
            } catch (error) {
              console.error(
                `[AUTO-CANCEL-WARNING] Failed to send warning to trainer ${schedule.trainer.user_id}:`,
                error
              );
              totalWarningsFailed++;
            }
          }

          // Send warning to all booked members
          for (const booking of schedule.bookings) {
            try {
              // Get member info to get user_id
              const memberService = require('./member.service.js');
              const member = await memberService.getMemberById(booking.member_id);

              if (member?.user_id) {
                await notificationService.sendNotification({
                  user_id: member.user_id,
                  type: 'CLASS_WARNING',
                  title: 'Cảnh báo: Lớp học có thể bị hủy',
                  message: `Lớp ${schedule.gym_class.name} hiện có ${currentBookings}/${minimumRequired} học viên. Lớp sẽ bị tự động hủy nếu không đủ học viên trong 24 giờ tới.`,
                  data: {
                    schedule_id: schedule.id,
                    booking_id: booking.id,
                    class_name: schedule.gym_class.name,
                    current_bookings: currentBookings,
                    minimum_participants: minimumRequired,
                    start_time: schedule.start_time,
                    warning_type: 'AUTO_CANCEL_24H',
                  },
                  channels: ['IN_APP', 'PUSH'],
                });
                totalWarningsSent++;
              }
            } catch (error) {
              console.error(
                `[AUTO-CANCEL-WARNING] Failed to send warning to member ${booking.member_id}:`,
                error
              );
              totalWarningsFailed++;
            }
          }
        }
      }

      if (totalWarningsSent > 0 || totalWarningsFailed > 0) {
        console.log(
          `[AUTO-CANCEL-WARNING] Sent ${totalWarningsSent} warning(s), ${totalWarningsFailed} failed`
        );
      }

      return {
        success: true,
        warningsSent: totalWarningsSent,
        warningsFailed: totalWarningsFailed,
      };
    } catch (error) {
      console.error('[ERROR] Auto-cancel warning service error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new AutoCancelWarningService();

