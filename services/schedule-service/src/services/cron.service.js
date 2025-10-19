const autoStatusUpdateService = require('./auto-status-update.service.js');

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
    if (this.isRunning) {
      console.log('⚠️  Auto-update cron is already running');
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000; // Convert to milliseconds
    
    console.log(`🕐 Starting auto-update cron job (every ${intervalMinutes} minute(s))`);
    
    // Run immediately on start
    this.runAutoUpdate();
    
    // Then run at intervals
    const intervalId = setInterval(() => {
      this.runAutoUpdate();
    }, intervalMs);

    this.intervals.set('autoUpdate', intervalId);
    this.isRunning = true;
    
    console.log('✅ Auto-update cron job started successfully');
  }

  /**
   * Stop the auto-update cron job
   */
  stopAutoUpdateCron() {
    const intervalId = this.intervals.get('autoUpdate');
    
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete('autoUpdate');
      this.isRunning = false;
      console.log('🛑 Auto-update cron job stopped');
    } else {
      console.log('⚠️  Auto-update cron job is not running');
    }
  }

  /**
   * Run the auto-update process
   */
  async runAutoUpdate() {
    try {
      await autoStatusUpdateService.runAutoUpdate();
    } catch (error) {
      console.error('❌ Error in auto-update cron:', error);
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
      console.log(`🛑 Stopped cron job: ${jobName}`);
    });
    
    this.intervals.clear();
    this.isRunning = false;
    console.log('🛑 All cron jobs stopped');
  }
}

module.exports = new CronService();

