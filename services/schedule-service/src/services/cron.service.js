const cron = require('node-cron');
const autoStatusUpdateService = require('./auto-status-update.service.js');
const certificationExpiryWarningService = require('./certification-expiry-warning.service.js');
const autoCancelLowParticipantsService = require('./auto-cancel-low-participants.service.js');
const autoCancelWarningService = require('./auto-cancel-warning.service.js');

/**
 * Cron service for scheduled tasks
 */
class CronService {
  constructor() {
    this.intervals = new Map();
    this.isRunning = false;
  }

  /**
   * Start the auto-update cron job
   * @param {number} intervalMinutes - Interval in minutes (default: 1)
   */
  startAutoUpdateCron(intervalMinutes = 1) {
    if (this.intervals.has('autoUpdate')) {
      console.log('[WARNING]  Auto-update cron is already running');
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000; // Convert to milliseconds
    
    console.log(`[START] Starting auto-update cron job (every ${intervalMinutes} minute(s))`);
    
    // Run immediately on start
    this.runAutoUpdate();
    
    // Then run at intervals
    const intervalId = setInterval(() => {
      this.runAutoUpdate();
    }, intervalMs);

    this.intervals.set('autoUpdate', intervalId);
    this.isRunning = true;
    
    console.log('[SUCCESS] Auto-update cron job started successfully');
  }

  /**
   * Stop the auto-update cron job
   */
  stopAutoUpdateCron() {
    const intervalId = this.intervals.get('autoUpdate');
    
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete('autoUpdate');
      if (this.intervals.size === 0) {
        this.isRunning = false;
      }
      console.log('[STOP] Auto-update cron job stopped');
    } else {
      console.log('[WARNING]  Auto-update cron job is not running');
    }
  }

  /**
   * Run the auto-update process
   */
  async runAutoUpdate() {
    try {
      await autoStatusUpdateService.runAutoUpdate();
    } catch (error) {
      console.error('[ERROR] Error in auto-update cron:', error);
    }
  }

  /**
   * Start the certification expiry warning cron job
   * Runs daily at the specified hour (default: 9 AM) or at specified interval for testing
   * @param {number} hour - Hour of day to run (0-23, default: 9). Set to -1 to use interval mode
   * @param {number} minutes - Minutes past the hour (0-59, default: 0)
   * @param {number} daysBeforeExpiry - Number of days before expiry to warn (default: 30)
   * @param {number} intervalSeconds - Interval in seconds for testing mode (default: null, uses daily schedule)
   */
  startCertificationExpiryWarningCron(
    hour = 9,
    minutes = 0,
    daysBeforeExpiry = 30,
    intervalSeconds = null
  ) {
    if (this.intervals.has('certificationExpiryWarning')) {
      console.log('[WARNING]  Certification expiry warning cron is already running');
      return;
    }

    // Testing mode: run at interval
    if (intervalSeconds !== null && intervalSeconds > 0) {
      const intervalMs = intervalSeconds * 1000;
      console.log(
        `[START] Starting certification expiry warning cron job (TEST MODE: every ${intervalSeconds} second(s), ${daysBeforeExpiry} days before expiry)`
      );

      // Run immediately on start
      this.runCertificationExpiryWarning(daysBeforeExpiry);

      // Then run at intervals
      const intervalId = setInterval(() => {
        this.runCertificationExpiryWarning(daysBeforeExpiry);
      }, intervalMs);

      this.intervals.set('certificationExpiryWarning', intervalId);
      console.log('[SUCCESS] Certification expiry warning cron job started successfully (TEST MODE)');
      return;
    }

    // Production mode: run daily at specified time
    console.log(
      `[START] Starting certification expiry warning cron job (daily at ${hour}:${minutes.toString().padStart(2, '0')}, ${daysBeforeExpiry} days before expiry)`
    );

    // Calculate milliseconds until next run
    const getNextRunTime = () => {
      const now = new Date();
      const nextRun = new Date();
      nextRun.setHours(hour, minutes, 0, 0);

      // If the time has passed today, schedule for tomorrow
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      return nextRun.getTime() - now.getTime();
    };

    // Run immediately on start (optional - can be removed if you only want scheduled runs)
    // this.runCertificationExpiryWarning(daysBeforeExpiry);

    // Schedule first run
    const scheduleNextRun = () => {
      const msUntilNextRun = getNextRunTime();
      console.log(
        `[TIMER] Next certification expiry check scheduled in ${Math.round(msUntilNextRun / (1000 * 60 * 60))} hour(s)`
      );

      setTimeout(() => {
        this.runCertificationExpiryWarning(daysBeforeExpiry);
        // Schedule subsequent runs (every 24 hours)
        const dailyInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        const intervalId = setInterval(() => {
          this.runCertificationExpiryWarning(daysBeforeExpiry);
        }, dailyInterval);
        this.intervals.set('certificationExpiryWarning', intervalId);
      }, msUntilNextRun);
    };

    scheduleNextRun();

    console.log('[SUCCESS] Certification expiry warning cron job started successfully');
  }

  /**
   * Stop the certification expiry warning cron job
   */
  stopCertificationExpiryWarningCron() {
    const intervalId = this.intervals.get('certificationExpiryWarning');
    
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete('certificationExpiryWarning');
      if (this.intervals.size === 0) {
        this.isRunning = false;
      }
      console.log('[STOP] Certification expiry warning cron job stopped');
    } else {
      console.log('[WARNING]  Certification expiry warning cron job is not running');
    }
  }

  /**
   * Run the certification expiry warning process
   * @param {number} daysBeforeExpiry - Number of days before expiry to warn
   */
  async runCertificationExpiryWarning(daysBeforeExpiry = 30) {
    try {
      // Only log detailed messages if in test mode or if there are expiring certifications
      // In production mode, reduce logging to avoid spam
      const isTestMode = !!process.env.CERTIFICATION_EXPIRY_WARNING_INTERVAL_SECONDS;
      
      if (isTestMode) {
        console.log(`[SEARCH] Running certification expiry warning check (${daysBeforeExpiry} days before expiry)...`);
      }
      
      const result = await certificationExpiryWarningService.checkExpiringCertifications(daysBeforeExpiry);
      
      if (result.success) {
        // Only log if in test mode or if there are expiring certifications
        if (isTestMode || result.expiringCount > 0) {
          console.log(
            `[SUCCESS] Expiry warning check completed: ${result.expiringCount} certification(s) expiring, ${result.trainersNotified} trainer(s) notified, admins notified`
          );
        }
        // In production mode with no expiring certifications, log silently (or not at all)
      } else {
        console.error(`[ERROR] Expiry warning check failed: ${result.error}`);
      }
    } catch (error) {
      console.error('[ERROR] Error in certification expiry warning cron:', error);
    }
  }

  /**
   * Start the auto-cancel low participants cron job
   * TC-AUTO-CANCEL-013: Optimized to run 3 times per day (9:00 AM, 2:00 PM, 6:00 PM)
   * instead of every hour to reduce server load
   * @param {Array<string>} scheduleTimes - Array of times in format "HH:mm" (default: ["09:00", "14:00", "18:00"])
   * @param {boolean} useIntervalMode - If true, use interval mode (for testing). If false, use schedule mode (production)
   * @param {number} intervalMinutes - Interval in minutes (only used if useIntervalMode = true, default: 60)
   */
  startAutoCancelLowParticipantsCron(
    scheduleTimes = ['09:00', '14:00', '18:00'],
    useIntervalMode = false,
    intervalMinutes = 60
  ) {
    if (this.intervals.has('autoCancelLowParticipants')) {
      console.log('[WARNING] Auto-cancel low participants cron is already running');
      return;
    }

    // Test mode: Use interval (for development/testing)
    if (useIntervalMode || process.env.AUTO_CANCEL_USE_INTERVAL === 'true') {
      const intervalMs = intervalMinutes * 60 * 1000; // Convert to milliseconds

      console.log(
        `[START] Starting auto-cancel low participants cron job (TEST MODE: every ${intervalMinutes} minute(s))`
      );

      // Run immediately on start
      this.runAutoCancelLowParticipants();

      // Then run at intervals
      const intervalId = setInterval(() => {
        this.runAutoCancelLowParticipants();
      }, intervalMs);

      this.intervals.set('autoCancelLowParticipants', intervalId);
      this.isRunning = true;

      console.log('[SUCCESS] Auto-cancel low participants cron job started successfully (TEST MODE)');
      return;
    }

    // Production mode: Use scheduled times (3 times per day)
    console.log(
      `[START] Starting auto-cancel low participants cron job (PRODUCTION MODE: daily at ${scheduleTimes.join(', ')})`
    );

    const cronJobs = [];

    // Create a cron job for each scheduled time
    scheduleTimes.forEach(time => {
      const [hour, minute] = time.split(':').map(Number);
      if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        console.error(
          `[ERROR] Invalid time format: ${time}. Expected format: "HH:mm" (e.g., "09:00")`
        );
        return;
      }

      // Cron pattern: minute hour * * * (runs at specified hour:minute every day)
      const cronPattern = `${minute} ${hour} * * *`;

      const cronJob = cron.schedule(
        cronPattern,
        async () => {
          console.log(
            `[AUTO-CANCEL] Scheduled run triggered at ${time} (GMT+7)`
          );
          await this.runAutoCancelLowParticipants();
        },
        {
          scheduled: true,
          timezone: 'Asia/Ho_Chi_Minh', // Vietnam timezone
        }
      );

      cronJobs.push(cronJob);
      console.log(`[SCHEDULE] Auto-cancel scheduled for ${time} (GMT+7) daily`);
    });

    // Store all cron jobs in intervals map (using array to store multiple jobs)
    this.intervals.set('autoCancelLowParticipants', cronJobs);
    this.isRunning = true;

    console.log(
      `[SUCCESS] Auto-cancel low participants cron job started successfully (PRODUCTION MODE: ${scheduleTimes.length} scheduled time(s) per day)`
    );
  }

  /**
   * Stop the auto-cancel low participants cron job
   */
  stopAutoCancelLowParticipantsCron() {
    const stored = this.intervals.get('autoCancelLowParticipants');

    if (stored) {
      // Check if it's an array (scheduled cron jobs) or a single interval
      if (Array.isArray(stored)) {
        // Stop all scheduled cron jobs
        stored.forEach(cronJob => {
          if (cronJob && typeof cronJob.stop === 'function') {
            cronJob.stop();
          }
        });
      } else {
        // Stop interval
        clearInterval(stored);
      }

      this.intervals.delete('autoCancelLowParticipants');
      if (this.intervals.size === 0) {
        this.isRunning = false;
      }
      console.log('[STOP] Auto-cancel low participants cron job stopped');
    } else {
      console.log('[WARNING] Auto-cancel low participants cron job is not running');
    }
  }

  /**
   * Run the auto-cancel low participants process
   */
  async runAutoCancelLowParticipants() {
    try {
      await autoCancelLowParticipantsService.checkAndCancelLowParticipantSchedules();
    } catch (error) {
      console.error('[ERROR] Error in auto-cancel low participants cron:', error);
    }
  }

  /**
   * IMPROVEMENT: Start booking reminder cron job
   * Runs every minute to send reminders 1 hour before class starts
   */
  startBookingReminderCron() {
    if (this.intervals.has('bookingReminder')) {
      console.log('[WARNING] Booking reminder cron is already running');
      return;
    }

    console.log('[START] Starting booking reminder cron job (every 1 minute)');

    // Run immediately on start
    this.runBookingReminder();

    // Then run every minute
    const cronPattern = '* * * * *'; // Every minute
    const cronJob = cron.schedule(
      cronPattern,
      async () => {
        await this.runBookingReminder();
      },
      {
        scheduled: true,
        timezone: 'Asia/Ho_Chi_Minh',
      }
    );

    this.intervals.set('bookingReminder', cronJob);
    this.isRunning = true;

    console.log('[SUCCESS] Booking reminder cron job started successfully');
  }

  /**
   * Stop booking reminder cron job
   */
  stopBookingReminderCron() {
    const cronJob = this.intervals.get('bookingReminder');

    if (cronJob) {
      if (typeof cronJob.stop === 'function') {
        cronJob.stop();
      }
      this.intervals.delete('bookingReminder');
      if (this.intervals.size === 0) {
        this.isRunning = false;
      }
      console.log('[STOP] Booking reminder cron job stopped');
    } else {
      console.log('[WARNING] Booking reminder cron job is not running');
    }
  }

  /**
   * Run booking reminder process
   */
  async runBookingReminder() {
    try {
      const bookingImprovementsService = require('./booking-improvements.service.js');
      const { prisma } = require('../lib/prisma.js');

      // Find bookings that start in approximately 1 hour (55-65 minutes)
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const fiftyFiveMinutesFromNow = new Date(now.getTime() + 55 * 60 * 1000); // 55 minutes from now
      const sixtyFiveMinutesFromNow = new Date(now.getTime() + 65 * 60 * 1000); // 65 minutes from now

      const bookings = await prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          is_waitlist: false,
          schedule: {
            start_time: {
              gte: fiftyFiveMinutesFromNow,
              lte: sixtyFiveMinutesFromNow,
            },
            status: 'SCHEDULED',
          },
        },
        include: {
          schedule: {
            include: {
              gym_class: true,
              room: true,
            },
          },
        },
      });

      // Send reminder for each booking
      for (const booking of bookings) {
        try {
          await bookingImprovementsService.sendBookingReminder(booking, booking.schedule);
        } catch (error) {
          console.error(`[ERROR] Failed to send reminder for booking ${booking.id}:`, error);
          // Continue with next booking
        }
      }

      if (bookings.length > 0) {
        console.log(`[BOOKING_REMINDER] Sent ${bookings.length} reminder(s)`);
      }
    } catch (error) {
      console.error('[ERROR] Error in booking reminder cron:', error);
    }
  }

  /**
   * Get cron job status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.intervals.keys()),
    };
  }

  /**
   * IMPROVEMENT: Start auto-cancel warning cron job
   * Runs every hour to send warnings 24h before auto-cancel
   */
  startAutoCancelWarningCron() {
    if (this.intervals.has('autoCancelWarning')) {
      console.log('[WARNING] Auto-cancel warning cron is already running');
      return;
    }

    console.log('[START] Starting auto-cancel warning cron job (every 1 hour)');

    // Run immediately on start
    this.runAutoCancelWarning();

    // Then run every hour
    const cronPattern = '0 * * * *'; // Every hour at minute 0
    const cronJob = cron.schedule(
      cronPattern,
      async () => {
        await this.runAutoCancelWarning();
      },
      {
        scheduled: true,
        timezone: 'Asia/Ho_Chi_Minh',
      }
    );

    this.intervals.set('autoCancelWarning', cronJob);
    this.isRunning = true;

    console.log('[SUCCESS] Auto-cancel warning cron job started successfully');
  }

  /**
   * Stop auto-cancel warning cron job
   */
  stopAutoCancelWarningCron() {
    const cronJob = this.intervals.get('autoCancelWarning');

    if (cronJob) {
      if (typeof cronJob.stop === 'function') {
        cronJob.stop();
      }
      this.intervals.delete('autoCancelWarning');
      if (this.intervals.size === 0) {
        this.isRunning = false;
      }
      console.log('[STOP] Auto-cancel warning cron job stopped');
    } else {
      console.log('[WARNING] Auto-cancel warning cron job is not running');
    }
  }

  /**
   * Run auto-cancel warning process
   */
  async runAutoCancelWarning() {
    try {
      await autoCancelWarningService.sendWarningNotifications();
    } catch (error) {
      console.error('[ERROR] Error in auto-cancel warning cron:', error);
    }
  }

  /**
   * Stop all cron jobs
   */
  stopAll() {
    this.intervals.forEach((intervalId, jobName) => {
      if (Array.isArray(intervalId)) {
        intervalId.forEach(cronJob => {
          if (cronJob && typeof cronJob.stop === 'function') {
            cronJob.stop();
          }
        });
      } else if (typeof intervalId === 'object' && intervalId !== null && typeof intervalId.stop === 'function') {
        intervalId.stop();
      } else {
        clearInterval(intervalId);
      }
      console.log(`[STOP] Stopped cron job: ${jobName}`);
    });
    
    this.intervals.clear();
    this.isRunning = false;
    console.log('[STOP] All cron jobs stopped');
  }
}

module.exports = new CronService();

