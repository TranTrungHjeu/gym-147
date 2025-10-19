const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
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
      const vnTime = dayjs().tz('Asia/Ho_Chi_Minh');
      // Create Vietnam time manually for comparison
      const now = new Date(vnTime.format('YYYY-MM-DD HH:mm:ss'));

      console.log(
        `🔄 Auto Status Update: Checking SCHEDULED -> IN_PROGRESS at ${vnTime.format('YYYY-MM-DD HH:mm:ss')}`
      );
      console.log(`🔄 Now object: ${now.toISOString()}`);

      // Debug: Check how many SCHEDULED schedules exist
      const scheduledCount = await prisma.schedule.count({
        where: { status: 'SCHEDULED' },
      });
      console.log(`🔄 Found ${scheduledCount} SCHEDULED schedules`);

      // Debug: Check specific schedule
      const testSchedule = await prisma.schedule.findFirst({
        where: { status: 'SCHEDULED' },
        select: { id: true, start_time: true, end_time: true },
      });
      if (testSchedule) {
        console.log(
          `🔄 Test schedule: ${testSchedule.id}, start: ${testSchedule.start_time}, now: ${now}, comparison: ${testSchedule.start_time <= now}`
        );
      }

      const result = await prisma.schedule.updateMany({
        where: {
          status: 'SCHEDULED',
          start_time: { lte: now },
        },
        data: { status: 'IN_PROGRESS' },
      });

      if (result.count > 0) {
        console.log(`✅ Updated ${result.count} schedules from SCHEDULED to IN_PROGRESS`);
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
      const vnTime = dayjs().tz('Asia/Ho_Chi_Minh');
      // Create Vietnam time manually for comparison
      const now = new Date(vnTime.format('YYYY-MM-DD HH:mm:ss'));

      console.log(
        `🔄 Auto Status Update: Checking IN_PROGRESS -> COMPLETED at ${vnTime.format('YYYY-MM-DD HH:mm:ss')}`
      );

      const result = await prisma.schedule.updateMany({
        where: {
          status: 'IN_PROGRESS',
          end_time: { lt: now },
        },
        data: { status: 'COMPLETED' },
      });

      if (result.count > 0) {
        console.log(`✅ Updated ${result.count} schedules from IN_PROGRESS to COMPLETED`);
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
      `🚀 Auto Status Update: Starting at ${dayjs().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss')}`
    );
    const scheduledToInProgress = await this.updateScheduledToInProgress();
    const inProgressToCompleted = await this.updateInProgressToCompleted();
    const total = scheduledToInProgress + inProgressToCompleted;
    console.log(`🏁 Auto Status Update: Completed. Total updates: ${total}`);
    return total;
  }
}

module.exports = new AutoStatusUpdateService();
