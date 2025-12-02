const autoStatusUpdateService = require('./auto-status-update.service.js');
const certificationExpiryWarningService = require('./certification-expiry-warning.service.js');

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
   * Get cron job status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.intervals.keys()),
    };
  }

  /**
   * Stop all cron jobs
   */
  stopAll() {
    this.intervals.forEach((intervalId, jobName) => {
      clearInterval(intervalId);
      console.log(`[STOP] Stopped cron job: ${jobName}`);
    });
    
    this.intervals.clear();
    this.isRunning = false;
    console.log('[STOP] All cron jobs stopped');
  }
}

module.exports = new CronService();

