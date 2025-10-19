const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');

const prisma = new PrismaClient();

/**
 * Auto Check-out Service
 * Automatically checks out all members 10 minutes after class ends
 */
class AutoCheckoutService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
  }

  /**
   * Start the auto check-out cron job
   * Runs every minute to check for classes that ended 10+ minutes ago
   */
  start() {
    if (this.isRunning) {
      console.log('Auto check-out service is already running');
      return;
    }

    console.log('🕐 Starting auto check-out service...');

    // Run every minute
    this.cronJob = cron.schedule(
      '* * * * *',
      async () => {
        await this.processAutoCheckout();
      },
      {
        scheduled: true,
        timezone: 'Asia/Ho_Chi_Minh',
      }
    );

    this.isRunning = true;
    console.log('✅ Auto check-out service started successfully');
  }

  /**
   * Stop the auto check-out cron job
   */
  stop() {
    if (!this.isRunning) {
      console.log('Auto check-out service is not running');
      return;
    }

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    this.isRunning = false;
    console.log('🛑 Auto check-out service stopped');
  }

  /**
   * Process auto check-out for all eligible schedules
   */
  async processAutoCheckout() {
    try {
      // Get current time (server is already in GMT+7)
      const now = new Date();

      // Convert to UTC for database comparison (database stores times as UTC)
      const nowUTC = new Date(now.getTime() - 7 * 60 * 60 * 1000);
      const tenMinutesAgoUTC = new Date(nowUTC.getTime() - 10 * 60 * 1000);

      console.log(`🔄 Processing auto check-out at ${now.toISOString()} (GMT+7)`);
      console.log(`🔄 Processing auto check-out at ${nowUTC.toISOString()} (UTC)`);

      // Find schedules that ended 10+ minutes ago and haven't been auto-checked-out
      const schedules = await prisma.schedule.findMany({
        where: {
          end_time: { lte: tenMinutesAgoUTC },
          auto_checkout_completed: false,
          check_in_enabled: true, // Only process schedules that had check-in enabled
        },
        include: {
          attendance: {
            where: {
              checked_in_at: { not: null },
              checked_out_at: null, // Only members who haven't checked out
            },
          },
          gym_class: true,
          trainer: true,
        },
      });

      console.log(`📋 Found ${schedules.length} schedules eligible for auto check-out`);

      if (schedules.length === 0) {
        return;
      }

      // Process each schedule
      for (const schedule of schedules) {
        await this.autoCheckoutSchedule(schedule);
      }

      console.log(`✅ Auto check-out processing completed for ${schedules.length} schedules`);
    } catch (error) {
      console.error('❌ Error in auto check-out processing:', error);
    }
  }

  /**
   * Auto check-out all members for a specific schedule
   * @param {Object} schedule - Schedule with attendance data
   */
  async autoCheckoutSchedule(schedule) {
    try {
      console.log(`🔄 Auto check-out for schedule: ${schedule.id} (${schedule.gym_class.name})`);

      if (schedule.attendance.length === 0) {
        console.log(`📝 No checked-in members to auto check-out for schedule ${schedule.id}`);

        // Mark as completed even if no members
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: {
            auto_checkout_completed: true,
            auto_checkout_at: new Date(),
          },
        });
        return;
      }

      // Calculate auto check-out time (10 minutes after class end)
      const autoCheckoutTime = new Date(schedule.end_time.getTime() + 10 * 60 * 1000);

      // Auto check-out all members who haven't checked out
      const updatedAttendances = await Promise.all(
        schedule.attendance.map(attendance =>
          prisma.attendance.update({
            where: { id: attendance.id },
            data: {
              checked_out_at: autoCheckoutTime,
              check_out_method: 'AUTO',
              is_auto_checkout: true,
            },
          })
        )
      );

      // Mark schedule as auto check-out completed
      await prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          auto_checkout_completed: true,
          auto_checkout_at: new Date(),
        },
      });

      console.log(
        `✅ Auto check-out completed for ${updatedAttendances.length} members in schedule ${schedule.id}`
      );
      console.log(`   - Class: ${schedule.gym_class.name}`);
      console.log(`   - Trainer: ${schedule.trainer?.full_name || 'N/A'}`);
      console.log(`   - Auto check-out time: ${autoCheckoutTime.toISOString()}`);
      console.log(`   - Members checked out: ${updatedAttendances.length}`);

      // Log member details
      updatedAttendances.forEach((attendance, index) => {
        console.log(
          `   - Member ${index + 1}: ${attendance.member_id} (checked in: ${attendance.checked_in_at?.toISOString()})`
        );
      });
    } catch (error) {
      console.error(`❌ Error auto check-out for schedule ${schedule.id}:`, error);
    }
  }

  /**
   * Manually trigger auto check-out for a specific schedule (for testing)
   * @param {string} scheduleId - Schedule ID
   */
  async manualAutoCheckout(scheduleId) {
    try {
      console.log(`🔄 Manual auto check-out for schedule: ${scheduleId}`);

      const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId },
        include: {
          attendance: {
            where: {
              checked_in_at: { not: null },
              checked_out_at: null,
            },
          },
          gym_class: true,
          trainer: true,
        },
      });

      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      if (schedule.auto_checkout_completed) {
        throw new Error(`Schedule ${scheduleId} has already been auto check-out completed`);
      }

      await this.autoCheckoutSchedule(schedule);

      return {
        success: true,
        message: `Auto check-out completed for schedule ${scheduleId}`,
        data: {
          schedule_id: scheduleId,
          members_checked_out: schedule.attendance.length,
        },
      };
    } catch (error) {
      console.error(`❌ Manual auto check-out error for schedule ${scheduleId}:`, error);
      throw error;
    }
  }

  /**
   * Get auto check-out statistics
   */
  async getAutoCheckoutStats() {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get schedules that were auto check-out in the last 24 hours
      const autoCheckoutSchedules = await prisma.schedule.findMany({
        where: {
          auto_checkout_completed: true,
          auto_checkout_at: { gte: oneDayAgo },
        },
        include: {
          attendance: {
            where: {
              is_auto_checkout: true,
            },
          },
          gym_class: true,
        },
      });

      const totalSchedules = autoCheckoutSchedules.length;
      const totalMembers = autoCheckoutSchedules.reduce(
        (sum, schedule) => sum + schedule.attendance.length,
        0
      );

      return {
        success: true,
        data: {
          last_24_hours: {
            schedules_auto_checkout: totalSchedules,
            members_auto_checkout: totalMembers,
          },
          service_status: {
            is_running: this.isRunning,
            last_check: now.toISOString(),
          },
        },
      };
    } catch (error) {
      console.error('❌ Error getting auto check-out stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
const autoCheckoutService = new AutoCheckoutService();

module.exports = autoCheckoutService;
