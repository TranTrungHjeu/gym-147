const cron = require('node-cron');
const { cleanupExpiredNotifications } = require('../controllers/queue.controller');

// ============================================
//  QUEUE CLEANUP CRON JOB
// ============================================

// Run every 2 minutes to check for expired queue notifications
const queueCleanupJob = cron.schedule('*/2 * * * *', async () => {
  try {
    console.log('[CLEANUP] [CRON] Running queue cleanup job...');
    const result = await cleanupExpiredNotifications();
    
    if (result.expired_count > 0) {
      console.log(`[SUCCESS] [CRON] Cleaned up ${result.expired_count} expired notifications`);
      result.entries?.forEach(entry => {
        console.log(`  - ${entry.member} for ${entry.equipment}`);
      });
    } else {
      console.log('[INFO]  [CRON] No expired notifications to clean up');
    }
  } catch (error) {
    console.error('[ERROR] [CRON] Queue cleanup job error:', error);
  }
});

// Start the cron job
function startQueueCleanupJob() {
  console.log('[START] Queue cleanup cron job started (runs every 2 minutes)');
  queueCleanupJob.start();
}

// Stop the cron job
function stopQueueCleanupJob() {
  console.log('[STOP] Queue cleanup cron job stopped');
  queueCleanupJob.stop();
}

module.exports = {
  startQueueCleanupJob,
  stopQueueCleanupJob,
  queueCleanupJob,
};







