const cron = require('node-cron');
const { prisma } = require('../lib/prisma.js');
const scheduledReportsController = require('../controllers/scheduled-reports.controller.js');

/**
 * Scheduled Reports Job
 * Runs scheduled reports automatically based on their schedule configuration
 */
class ScheduledReportsJob {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
  }

  /**
   * Start the scheduled reports job
   * Checks every minute for reports that need to be run
   */
  start() {
    console.log('[SCHEDULED-REPORTS] Starting scheduled reports job...');

    // Run check every minute
    this.checkInterval = setInterval(async () => {
      await this.checkAndRunReports();
    }, 60 * 1000); // 1 minute

    // Also run immediately on startup
    this.checkAndRunReports().catch(error => {
      console.error('[SCHEDULED-REPORTS] Error in initial check:', error);
    });
  }

  /**
   * Stop the scheduled reports job
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[SCHEDULED-REPORTS] Scheduled reports job stopped');
    }
  }

  /**
   * Check for reports that need to be run and execute them
   */
  async checkAndRunReports() {
    if (this.isRunning) {
      return; // Prevent concurrent executions
    }

    try {
      this.isRunning = true;

      const now = new Date();

      // Find active reports that are due to run
      const dueReports = await prisma.scheduledReport.findMany({
        where: {
          is_active: true,
          OR: [
            // Reports with next_run_at that has passed
            {
              next_run_at: {
                lte: now,
              },
            },
            // Reports that have never been run (next_run_at is null)
            {
              next_run_at: null,
            },
          ],
        },
      });

      if (dueReports.length === 0) {
        return; // No reports to run
      }

      console.log(`[SCHEDULED-REPORTS] Found ${dueReports.length} report(s) due to run`);

      // Run each report asynchronously
      for (const report of dueReports) {
        try {
          console.log(`[SCHEDULED-REPORTS] Running report: ${report.name} (ID: ${report.id})`);

          // Update last_run_at immediately
          await prisma.scheduledReport.update({
            where: { id: report.id },
            data: { last_run_at: now },
          });

          // Generate report asynchronously (don't await to allow parallel execution)
          scheduledReportsController.generateReport(report).catch(error => {
            console.error(`[SCHEDULED-REPORTS] Error generating report ${report.id}:`, error);
          });
        } catch (error) {
          console.error(`[SCHEDULED-REPORTS] Error processing report ${report.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[SCHEDULED-REPORTS] Error checking for due reports:', error);
    } finally {
      this.isRunning = false;
    }
  }
}

// Create singleton instance
const scheduledReportsJob = new ScheduledReportsJob();

module.exports = {
  start: () => scheduledReportsJob.start(),
  stop: () => scheduledReportsJob.stop(),
};
