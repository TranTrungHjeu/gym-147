// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

class AutoStatusUpdateService {
  /**
   * Cập nhật: SCHEDULED → IN_PROGRESS
   */
  async updateScheduledToInProgress() {
    try {
      // Get current time in Vietnam timezone
      const vnTime = dayjs().tz('Asia/Ho_Chi_Minh');
      // Convert to UTC for database comparison (PostgreSQL stores DateTime as UTC)
      // Use .toDate() which returns a JavaScript Date object in UTC
      const now = vnTime.utc().toDate();

      console.log(
        `[SYNC] Auto Status Update: Checking SCHEDULED -> IN_PROGRESS at ${vnTime.format(
          'YYYY-MM-DD HH:mm:ss'
        )} (GMT+7)`
      );
      console.log(`[SYNC] Now UTC: ${now.toISOString()}`);

      // Debug: Check how many SCHEDULED schedules exist
      const scheduledCount = await prisma.schedule.count({
        where: { status: 'SCHEDULED' },
      });
      console.log(`[SYNC] Found ${scheduledCount} SCHEDULED schedules`);

      // Debug: Check specific schedule
      const testSchedule = await prisma.schedule.findFirst({
        where: { status: 'SCHEDULED' },
        select: { id: true, start_time: true, end_time: true },
      });
      if (testSchedule) {
        const startTimeVN = dayjs(testSchedule.start_time).tz('Asia/Ho_Chi_Minh');
        console.log(
          `[SYNC] Test schedule: ${
            testSchedule.id
          }, start (UTC): ${testSchedule.start_time.toISOString()}, start (GMT+7): ${startTimeVN.format(
            'YYYY-MM-DD HH:mm:ss'
          )}, now (UTC): ${now.toISOString()}, comparison: ${testSchedule.start_time <= now}`
        );
      }

      // First, get schedules that need to be updated
      const schedulesToUpdate = await prisma.schedule.findMany({
        where: {
          status: 'SCHEDULED',
          start_time: { lte: now },
        },
        include: {
          gym_class: true,
          trainer: true,
          room: true,
          bookings: {
            where: {
              status: {
                not: 'CANCELLED',
              },
            },
          },
        },
      });

      const result = await prisma.schedule.updateMany({
        where: {
          status: 'SCHEDULED',
          start_time: { lte: now },
        },
        data: { status: 'IN_PROGRESS' },
      });

      if (result.count > 0) {
        console.log(`[SUCCESS] Updated ${result.count} schedules from SCHEDULED to IN_PROGRESS`);

        // Emit socket events for each updated schedule
        if (global.io && schedulesToUpdate.length > 0) {
          for (const schedule of schedulesToUpdate) {
            try {
              // Emit to schedule room (for all connected clients viewing this schedule)
              const scheduleRoom = `schedule:${schedule.id}`;
              const socketPayload = {
                schedule_id: schedule.id,
                status: 'IN_PROGRESS',
                updated_at: new Date().toISOString(),
                schedule: {
                  id: schedule.id,
                  status: 'IN_PROGRESS',
                  start_time: schedule.start_time,
                  end_time: schedule.end_time,
                  gym_class: schedule.gym_class,
                  trainer: schedule.trainer,
                  room: schedule.room,
                },
              };

              global.io.to(scheduleRoom).emit('schedule:updated', socketPayload);
              console.log(
                `[SOCKET] Emitted schedule:updated to room ${scheduleRoom} for schedule ${schedule.id}`
              );

              // Emit to trainer if exists
              if (schedule.trainer?.user_id) {
                global.io
                  .to(`user:${schedule.trainer.user_id}`)
                  .emit('schedule:updated', socketPayload);
                console.log(
                  `[SOCKET] Emitted schedule:updated to trainer user:${schedule.trainer.user_id}`
                );
              }

              // Emit to all members who booked this schedule
              if (schedule.bookings && schedule.bookings.length > 0) {
                for (const booking of schedule.bookings) {
                  if (booking.member_id) {
                    global.io
                      .to(`member:${booking.member_id}`)
                      .emit('schedule:updated', socketPayload);
                    console.log(`[SOCKET] Emitted schedule:updated to member:${booking.member_id}`);
                  }
                }
              }
            } catch (socketError) {
              console.error(
                `[ERROR] Failed to emit socket event for schedule ${schedule.id}:`,
                socketError
              );
            }
          }
        }
      }

      return result.count;
    } catch (error) {
      console.error('Error updating SCHEDULED to IN_PROGRESS:', error);
      return 0;
    }
  }

  /**
   * Cập nhật: IN_PROGRESS → COMPLETED
   */
  async updateInProgressToCompleted() {
    try {
      // Get current time in Vietnam timezone
      const vnTime = dayjs().tz('Asia/Ho_Chi_Minh');
      // Convert to UTC for database comparison (PostgreSQL stores DateTime as UTC)
      // Use .toDate() which returns a JavaScript Date object in UTC
      const now = vnTime.utc().toDate();

      console.log(
        `[SYNC] Auto Status Update: Checking IN_PROGRESS -> COMPLETED at ${vnTime.format(
          'YYYY-MM-DD HH:mm:ss'
        )} (GMT+7)`
      );
      console.log(`[SYNC] Now UTC: ${now.toISOString()}`);

      // First, get schedules that need to be updated
      const schedulesToUpdate = await prisma.schedule.findMany({
        where: {
          status: 'IN_PROGRESS',
          end_time: { lt: now },
        },
        include: {
          gym_class: true,
          trainer: true,
          room: true,
          bookings: {
            where: {
              status: {
                not: 'CANCELLED',
              },
            },
          },
        },
      });

      const result = await prisma.schedule.updateMany({
        where: {
          status: 'IN_PROGRESS',
          end_time: { lt: now },
        },
        data: { status: 'COMPLETED' },
      });

      if (result.count > 0) {
        console.log(`[SUCCESS] Updated ${result.count} schedules from IN_PROGRESS to COMPLETED`);

        // Emit socket events for each updated schedule
        if (global.io && schedulesToUpdate.length > 0) {
          for (const schedule of schedulesToUpdate) {
            try {
              // Emit to schedule room (for all connected clients viewing this schedule)
              const scheduleRoom = `schedule:${schedule.id}`;
              const socketPayload = {
                schedule_id: schedule.id,
                status: 'COMPLETED',
                updated_at: new Date().toISOString(),
                schedule: {
                  id: schedule.id,
                  status: 'COMPLETED',
                  start_time: schedule.start_time,
                  end_time: schedule.end_time,
                  gym_class: schedule.gym_class,
                  trainer: schedule.trainer,
                  room: schedule.room,
                },
              };

              global.io.to(scheduleRoom).emit('schedule:updated', socketPayload);
              console.log(
                `[SOCKET] Emitted schedule:updated to room ${scheduleRoom} for schedule ${schedule.id}`
              );

              // Emit to trainer if exists
              if (schedule.trainer?.user_id) {
                global.io
                  .to(`user:${schedule.trainer.user_id}`)
                  .emit('schedule:updated', socketPayload);
                console.log(
                  `[SOCKET] Emitted schedule:updated to trainer user:${schedule.trainer.user_id}`
                );
              }

              // Emit to all members who booked this schedule
              if (schedule.bookings && schedule.bookings.length > 0) {
                for (const booking of schedule.bookings) {
                  if (booking.member_id) {
                    global.io
                      .to(`member:${booking.member_id}`)
                      .emit('schedule:updated', socketPayload);
                    console.log(`[SOCKET] Emitted schedule:updated to member:${booking.member_id}`);
                  }
                }
              }
            } catch (socketError) {
              console.error(
                `[ERROR] Failed to emit socket event for schedule ${schedule.id}:`,
                socketError
              );
            }
          }
        }
      }

      return result.count;
    } catch (error) {
      console.error('Error updating IN_PROGRESS to COMPLETED:', error);
      return 0;
    }
  }

  /**
   * Chạy toàn bộ auto update
   */
  async runAutoUpdate() {
    console.log(
      `[START] Auto Status Update: Starting at ${dayjs()
        .tz('Asia/Ho_Chi_Minh')
        .format('YYYY-MM-DD HH:mm:ss')}`
    );
    const scheduledToInProgress = await this.updateScheduledToInProgress();
    const inProgressToCompleted = await this.updateInProgressToCompleted();
    const total = scheduledToInProgress + inProgressToCompleted;
    console.log(`[SUCCESS] Auto Status Update: Completed. Total updates: ${total}`);
    return total;
  }
}

module.exports = new AutoStatusUpdateService();
